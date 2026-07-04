const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const crawler = require('../crawler');
const { db } = require('../db');
const ALLOWED_CRAWLER_MODES = new Set(['inventory', 'index', 'extract-zips']);

// API endpoint to get background sync status
router.get('/status', (req, res) => {
  res.json(crawler.getStatus());
});

// API endpoint to manually trigger crawler scan
router.post('/start', (req, res) => {
  const status = crawler.getStatus();
  if (status.isCrawling) {
    return res.status(400).json({ error: "Crawler is already active." });
  }
  
  const mode = (req.body && req.body.mode) || 'inventory';
  const confirmation = req.body && req.body.confirmation;
  const dryRun = req.body && req.body.dryRun === true;
  const rebuild = req.body && req.body.rebuild === true;

  if (!ALLOWED_CRAWLER_MODES.has(mode)) {
    return res.status(400).json({
      error: 'Invalid crawler mode. Allowed modes: inventory, index, extract-zips.'
    });
  }
  
  if (mode === 'extract-zips') {
    if (!dryRun && confirmation !== 'EXTRACT ZIP ARCHIVES') {
      return res.status(400).json({ error: "Confirmation phrase required to extract ZIP archives. Please type: EXTRACT ZIP ARCHIVES" });
    }
  }

  if (rebuild && mode !== 'index') {
    return res.status(400).json({ error: 'Index rebuild is only allowed in index mode.' });
  }

  if (rebuild && confirmation !== 'REBUILD INDEX') {
    return res.status(400).json({ error: 'Confirmation phrase required to rebuild index. Please type: REBUILD INDEX' });
  }
  
  if (rebuild) {
    const dbPath = process.env.SOS_DB_PATH || path.join(__dirname, '..', 'sos_database.db');
    const metadataPath = path.join(__dirname, '..', 'metadata.json');
    const dbBackupPath = dbPath + '.bak';
    const metadataBackupPath = metadataPath + '.bak';
    
    console.log("[SQLITE] Index rebuild requested. Creating backups of database and metadata...");
    try {
      if (fs.existsSync(dbPath)) {
        fs.copyFileSync(dbPath, dbBackupPath);
      }
      if (fs.existsSync(metadataPath)) {
        fs.copyFileSync(metadataPath, metadataBackupPath);
      }
    } catch (backupErr) {
      console.error("[SQLITE] Backup failed, aborting rebuild:", backupErr);
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
  crawler.start({ mode, confirmation, dryRun });
  console.log(`[SQLITE] Crawler triggered manually (mode: ${mode}, dryRun: ${dryRun}).`);
  res.json({ status: `Crawler started in ${mode} mode.`, mode, dryRun });
});

module.exports = router;
