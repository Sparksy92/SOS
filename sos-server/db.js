const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'sos_database.db');
const db = new DatabaseSync(DB_PATH);

// Initialize Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS documents (
    path TEXT PRIMARY KEY,
    title TEXT,
    summary TEXT,
    category TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS indexed_docs (
    path TEXT PRIMARY KEY,
    indexed_at TEXT
  );
`);

// FTS5 Virtual Table for Lightning Fast Keyword Search, falling back to a standard table if FTS5 is unsupported
let hasFts5 = true;
try {
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks USING fts5(
      document_path,
      chunk_index,
      content
    );
  `);
} catch (e) {
  console.warn("[SQLITE] FTS5 extension is not supported by this Node.js binary. Falling back to standard table.");
  hasFts5 = false;
  db.exec(`
    CREATE TABLE IF NOT EXISTS document_chunks (
      document_path TEXT,
      chunk_index INTEGER,
      content TEXT
    );
  `);
}

module.exports = { db, hasFts5 };
