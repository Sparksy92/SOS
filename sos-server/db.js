const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

let currentDb = null;
let currentDbPath = null;
let hasFts5 = true;

function getDb() {
  const targetPath = process.env.SOS_DB_PATH || path.join(__dirname, 'sos_database.db');
  if (currentDb && currentDbPath === targetPath) {
    return currentDb;
  }
  
  // Initialize new connection
  currentDbPath = targetPath;
  currentDb = new DatabaseSync(targetPath);
  
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

  // FTS5 Virtual Table check
  try {
    currentDb.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks USING fts5(
        document_path,
        chunk_index,
        content
      );
    `);
    hasFts5 = true;
  } catch (e) {
    hasFts5 = false;
    currentDb.exec(`
      CREATE TABLE IF NOT EXISTS document_chunks (
        document_path TEXT,
        chunk_index INTEGER,
        content TEXT
      );
    `);
  }
  
  return currentDb;
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
  get hasFts5() {
    getDb(); // Ensure database is initialized to set hasFts5
    return hasFts5;
  }
};
