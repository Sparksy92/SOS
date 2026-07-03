const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crawler = require('../crawler');
const { db } = require('../db');

// API endpoint to get background sync status
router.get('/status', (req, res) => {
  res.json(crawler.getStatus());
});

// API endpoint to manually trigger crawler scan
router.post('/start', (req, res) => {
  const status = crawler.getStatus();
  if (status.statusText.includes("Syncing") || status.statusText.includes("scanning") || status.isCrawling) {
    return res.status(400).json({ error: "Crawler is already active." });
  }
  
  const mode = req.body && req.body.mode;
  const isDeep = mode === 'deep';
  
  if (isDeep) {
    const dbPath = path.join(__dirname, '..', 'sos_database.db');
    const metadataPath = path.join(__dirname, '..', 'metadata.json');
    const dbBackupPath = dbPath + '.bak';
    const metadataBackupPath = metadataPath + '.bak';
    
    console.log("[SQLITE] Deep index requested. Creating backups of database and metadata...");
    try {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, dbBackupPath);
      }
      if (fs.existsSync(metadataPath)) {
        fs.copyFileSync(metadataPath, metadataBackupPath);
      }
    } catch (backupErr) {
      console.error("[SQLITE] Backup failed, aborting rebuild operation:", backupErr);
      return res.status(500).json({ error: "Rebuild aborted: Database backup failed." });
    }
    
    try {
      console.log("[SQLITE] Clearing document_chunks and indexed_docs tables for rebuild...");
      db.prepare("DELETE FROM document_chunks").run();
      db.prepare("DELETE FROM indexed_docs").run();
    } catch (err) {
      console.error("[SQLITE] Error clearing database tables, restoring from backups...", err);
      // Restore backups
      try {
        if (fs.existsSync(dbBackupPath)) {
          fs.copyFileSync(dbBackupPath, dbPath);
        }
        if (fs.existsSync(metadataBackupPath)) {
          fs.copyFileSync(metadataBackupPath, metadataPath);
        }
      } catch (restoreErr) {
        console.error("[SQLITE] Critical restore failure:", restoreErr);
      }
      return res.status(500).json({ error: "Failed to clear index tables: " + err.message });
    }
  }
  
  // Start crawler asynchronously
  crawler.start();
  console.log(`[SQLITE] Crawler triggered manually (mode: ${mode}).`);
  res.json({ status: "Crawler started manually.", mode });
});

module.exports = router;
