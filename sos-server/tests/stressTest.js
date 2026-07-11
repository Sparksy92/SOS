const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

console.log("🚀 STARTING SCALABILITY AND STRESS-TEST BENCHMARK...");

const dbPath = path.join(__dirname, 'stress_test_db.db');
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const db = new DatabaseSync(dbPath);

// Initialize EBG tables
db.exec(`
  CREATE TABLE raw_observations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sensor_id TEXT NOT NULL,
    value REAL NOT NULL,
    timestamp TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE ebg_nodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer TEXT CHECK(layer IN ('policy', 'goal', 'decision', 'belief', 'interpretation', 'observation')),
    content TEXT UNIQUE,
    execution_payload TEXT,
    embedding BLOB,
    importance REAL DEFAULT 0.5,
    valid_from TEXT,
    valid_until TEXT,
    confidence_decay_rate REAL DEFAULT 0.0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_accessed TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE ebg_edges (
    source_id INTEGER,
    target_id INTEGER,
    predicate TEXT,
    weight REAL DEFAULT 1.0,
    confidence REAL DEFAULT 1.0,
    status TEXT CHECK(status IN ('active', 'decayed', 'invalidated')) DEFAULT 'active',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    last_updated TEXT DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (source_id, target_id, predicate),
    FOREIGN KEY(source_id) REFERENCES ebg_nodes(id),
    FOREIGN KEY(target_id) REFERENCES ebg_nodes(id)
  );
  CREATE TABLE model_predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_id INTEGER,
    target_metric TEXT,
    condition_operator TEXT,
    condition_value REAL,
    target_timestamp TEXT,
    confidence REAL,
    status TEXT CHECK(status IN ('pending', 'correct', 'incorrect')) DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

console.log("✅ EBG tables created.");

const t0 = performance.now();

// 1. Bulk insert 1,000 sensor observations inside a single transaction (best practice)
db.exec("BEGIN TRANSACTION;");
const insertObs = db.prepare("INSERT INTO raw_observations (sensor_id, value, timestamp) VALUES (?, ?, ?)");
for (let i = 0; i < 1000; i++) {
  insertObs.run(`sensor_${i % 5}`, Math.random() * 100, new Date(Date.now() - i * 60000).toISOString());
}
db.exec("COMMIT;");

const t1 = performance.now();
console.log(`✅ Bulk inserted 1,000 raw observations in ${(t1 - t0).toFixed(2)}ms`);

// 2. Bulk insert 1,000 nodes inside a transaction
db.exec("BEGIN TRANSACTION;");
const insertNode = db.prepare("INSERT INTO ebg_nodes (layer, content, importance) VALUES (?, ?, ?)");
for (let i = 0; i < 1000; i++) {
  insertNode.run('belief', `Simulated belief node content index #${i}`, Math.random());
}
db.exec("COMMIT;");

const t2 = performance.now();
console.log(`✅ Bulk inserted 1,000 graph nodes in ${(t2 - t1).toFixed(2)}ms`);

// 3. Bulk insert 1,000 predictions inside a transaction
db.exec("BEGIN TRANSACTION;");
const insertPred = db.prepare("INSERT INTO model_predictions (model_id, target_metric, condition_operator, condition_value, confidence, status) VALUES (?, ?, ?, ?, ?, ?)");
for (let i = 0; i < 1000; i++) {
  insertPred.run(1, 'battery_sensor', '<=', 20.0, Math.random(), 'pending');
}
db.exec("COMMIT;");

const t3 = performance.now();
console.log(`✅ Bulk inserted 1,000 predictions in ${(t3 - t2).toFixed(2)}ms`);

// 4. Run queries to measure retrieval speeds under load
const q0 = performance.now();
const resObs = db.prepare("SELECT * FROM raw_observations ORDER BY timestamp DESC LIMIT 100").all();
const q1 = performance.now();
console.log(`📊 Query raw observations (last 100): ${resObs.length} items fetched in ${(q1 - q0).toFixed(4)}ms`);

const q2 = performance.now();
const resNodes = db.prepare("SELECT * FROM ebg_nodes WHERE importance > 0.8").all();
const q3 = performance.now();
console.log(`📊 Query highly important nodes (> 0.8): ${resNodes.length} items fetched in ${(q3 - q2).toFixed(4)}ms`);

// Cleanup
db.close();
fs.unlinkSync(dbPath);
console.log("🏁 BENCHMARK COMPLETE. CLEANED UP TEMPORARY DATABASE.");
