const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const isTestEnv = process.env.NODE_ENV === 'test' || 
                  (process.argv && process.argv.some(arg => arg.includes('test') || arg.includes('mjs'))) ||
                  (process.execArgv && process.execArgv.includes('--test'));

let currentDb = null;
let currentDbPath = null;
let hasFts5 = true;

function handleDbCorruption(filePath) {
  if (currentDb) {
    try {
      currentDb.close();
    } catch (e) {}
    currentDb = null;
  }
  
  const timestamp = Date.now();
  const corruptPath = `${filePath}.corrupt.${timestamp}`;
  console.warn(`[SQLITE] Critical database corruption detected! Renaming corrupt database file to ${corruptPath}`);
  
  try {
    if (fs.existsSync(filePath)) {
      fs.renameSync(filePath, corruptPath);
    }
    const walFile = `${filePath}-wal`;
    if (fs.existsSync(walFile)) {
      fs.renameSync(walFile, `${walFile}.corrupt.${timestamp}`);
    }
    const shmFile = `${filePath}-shm`;
    if (fs.existsSync(shmFile)) {
      fs.renameSync(shmFile, `${shmFile}.corrupt.${timestamp}`);
    }
  } catch (e) {
    console.error("[SQLITE] Failed to rename corrupt database files:", e.message);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      const walFile = `${filePath}-wal`;
      if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
      const shmFile = `${filePath}-shm`;
      if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
    } catch (unlinkErr) {
      console.error("[SQLITE] Failed to delete corrupt database files:", unlinkErr.message);
    }
  }
}

function getDb() {
  let targetPath = process.env.SOS_DB_PATH;
  if (!targetPath) {
    if (isTestEnv) {
      targetPath = path.join(__dirname, 'test_fallback.db');
    } else {
      targetPath = path.join(__dirname, 'sos_database.db');
    }
  }

  if (currentDb && currentDbPath === targetPath) {
    return currentDb;
  }
  
  currentDbPath = targetPath;
  let attempts = 0;
  
  while (attempts < 2) {
    attempts++;
    try {
      if (!currentDb) {
        currentDb = new DatabaseSync(targetPath);
        
        // Optimize for concurrency and performance
        currentDb.exec("PRAGMA busy_timeout = 10000;");
        currentDb.exec("PRAGMA journal_mode = WAL;");
      }
      
      // Perform a quick verification check
      const check = currentDb.prepare("PRAGMA integrity_check(1)").get();
      if (check && check.integrity_check !== 'ok' && !check.integrity_check.includes('rowid')) {
        throw new Error(`Integrity check failed: ${check.integrity_check}`);
      }
      
      // Initialize Tables
      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS documents (
          path TEXT PRIMARY KEY,
          title TEXT,
          summary TEXT,
          category TEXT
        );
      `);

      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS indexed_docs (
          path TEXT PRIMARY KEY,
          indexed_at TEXT
        );
      `);

      // Settings database table
      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      // EBG v6 Schema tables initialization
      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS raw_observations (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          sensor_id TEXT NOT NULL,
          value REAL NOT NULL,
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS ebg_nodes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          layer TEXT CHECK(layer IN ('policy', 'goal', 'decision', 'belief', 'interpretation', 'observation')),
          content TEXT UNIQUE,
          execution_payload TEXT,
          embedding BLOB,
          importance REAL DEFAULT 0.5 CHECK(importance BETWEEN 0.0 AND 1.0),
          valid_from TEXT DEFAULT CURRENT_TIMESTAMP,
          valid_until TEXT,
          confidence_decay_rate REAL DEFAULT 0.0,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_accessed TEXT DEFAULT CURRENT_TIMESTAMP
        );
      `);

      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS ebg_edges (
          source_id INTEGER,
          target_id INTEGER,
          predicate TEXT CHECK(predicate IN (
            'contains', 'located_at', 'treats', 'contradicts', 
            'causes', 'prevents', 'enables', 'requires', 'depends_on', 'subgoal_of'
          )),
          weight REAL DEFAULT 0.15 CHECK(weight BETWEEN 0.0 AND 1.0),
          confidence REAL DEFAULT 0.25 CHECK(confidence BETWEEN 0.0 AND 1.0),
          status TEXT CHECK(status IN ('confirmed', 'provisional', 'superseded')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (source_id, target_id, predicate),
          FOREIGN KEY (source_id) REFERENCES ebg_nodes(id) ON DELETE CASCADE,
          FOREIGN KEY (target_id) REFERENCES ebg_nodes(id) ON DELETE CASCADE
        );
      `);

      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS mental_models (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE,
          description TEXT,
          execution_type TEXT CHECK(execution_type IN ('deterministic_script', 'llm_prompt', 'sql_rule')),
          execution_payload TEXT,
          trust_score REAL DEFAULT 0.5 CHECK(trust_score BETWEEN 0.0 AND 1.0),
          last_evaluated TEXT
        );
      `);

      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS model_predictions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          model_id INTEGER,
          target_metric TEXT NOT NULL,
          condition_operator TEXT NOT NULL,
          condition_value REAL NOT NULL,
          target_timestamp TEXT NOT NULL,
          confidence REAL DEFAULT 0.5,
          status TEXT CHECK(status IN ('pending', 'correct', 'incorrect')),
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (model_id) REFERENCES mental_models(id) ON DELETE CASCADE
        );
      `);

      currentDb.exec(`
        CREATE TABLE IF NOT EXISTS ebg_evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          edge_source_id INTEGER,
          edge_target_id INTEGER,
          edge_predicate TEXT,
          source_type TEXT CHECK(source_type IN ('user_statement', 'document_chunk', 'sensor', 'camera', 'filesystem', 'reflection')),
          source_reference TEXT,
          base_reliability REAL DEFAULT 0.5 CHECK(base_reliability BETWEEN 0.0 AND 1.0),
          adaptive_trust_score REAL DEFAULT 1.0 CHECK(adaptive_trust_score BETWEEN 0.0 AND 1.0),
          timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (edge_source_id, edge_target_id, edge_predicate) 
            REFERENCES ebg_edges(source_id, target_id, predicate) ON DELETE CASCADE
        );
      `);

      // Migration Check: If document_chunks exists but lacks is_ocr column, drop it so it gets recreated.
      let hasIsOcr = false;
      try {
        const info = currentDb.prepare("PRAGMA table_info(document_chunks)").all();
        hasIsOcr = info.some(col => col.name === 'is_ocr');
      } catch (e) {}

      if (hasIsOcr === false) {
        try {
          currentDb.exec("DROP TABLE IF EXISTS document_chunks");
        } catch (e) {}
      }

      // FTS5 Virtual Table check
      try {
        currentDb.exec(`
          CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks USING fts5(
            document_path,
            chunk_index,
            content,
            is_ocr UNINDEXED
          );
        `);
        hasFts5 = true;
      } catch (e) {
        hasFts5 = false;
        currentDb.exec(`
          CREATE TABLE IF NOT EXISTS document_chunks (
            document_path TEXT,
            chunk_index INTEGER,
            content TEXT,
            is_ocr INTEGER DEFAULT 0
          );
        `);
      }
      
      // Perform FTS5 sanity query to catch virtual table corruption
      if (hasFts5) {
        currentDb.exec("SELECT count(*) FROM document_chunks LIMIT 1");
      }
      
      // Success, exit initialization loop
      break;
    } catch (err) {
      console.error(`[SQLITE] Database initialization error (attempt ${attempts}/2):`, err.message);
      if (attempts < 2 && (err.message.includes('malformed') || err.message.includes('corrupt') || err.code === 'ERR_SQLITE_ERROR' || err.message.includes('database disk image'))) {
        handleDbCorruption(targetPath);
      } else {
        throw err;
      }
    }
  }
  
  return currentDb;
}

function closeDb() {
  if (currentDb) {
    try {
      currentDb.close();
    } catch (e) {
      console.error('[db] Error closing database:', e.message);
    }
    currentDb = null;
    currentDbPath = null;
  }
}

// Export a proxy that delegates to the active DB connection
const dbProxy = new Proxy({}, {
  get(target, prop) {
    const activeDb = getDb();
    const val = activeDb[prop];
    if (typeof val === 'function') {
      return val.bind(activeDb);
    }
    return val;
  }
});

module.exports = { 
  db: dbProxy,
  closeDb,
  get hasFts5() {
    getDb(); // Ensure database is initialized to set hasFts5
    return hasFts5;
  }
};

