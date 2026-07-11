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
  const fastIndex = req.body && (req.body.fastIndex === true || req.body.fastIndex === 'true');

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
      // Close database connection first to release file lock on Windows
      const dbModule = require('../db');
      dbModule.closeDb();
      
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
      console.log("[SQLITE] Deleting database file and metadata for a fresh rebuild...");
      if (fs.existsSync(dbPath)) {
        fs.unlinkSync(dbPath);
      }
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }
      
      // Re-initialize DB connection and tables by triggering database proxy
      const dbModule = require('../db');
      dbModule.db.exec("SELECT 1;"); // Forces database re-creation and schema initialization!
      
    } catch (err) {
      console.error("[SQLITE] Error recreating database, restoring from backups...", err);
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
      return res.status(500).json({ error: "Failed to recreate database." });
    }
  }
  
  // Start crawler asynchronously
  crawler.start({ mode, confirmation, dryRun, fastIndex });
  console.log(`[SQLITE] Crawler triggered manually (mode: ${mode}, dryRun: ${dryRun}, fastIndex: ${fastIndex}).`);
  res.json({ status: `Crawler started in ${mode} mode.`, mode, dryRun, fastIndex });
});

const { spawn } = require('child_process');
const { getMaterialRoot, isBlockedMaterialPath } = require('../services/materialRootService');
const { indexDocumentToSqliteByWebPath } = require('../services/documentIndexingService');

// API endpoint to manually trigger local OCR on a scanned PDF document
router.post('/ocr', async (req, res) => {
  const { filePath } = req.body; // e.g. /materials/ATL/manual.pdf
  if (!filePath) {
    return res.status(400).json({ error: "filePath is required" });
  }

  try {
    const materialsRoot = getMaterialRoot();
    let relPath = filePath;
    if (filePath.startsWith('/materials/')) {
      relPath = filePath.replace(/^\/materials\//, '');
    } else if (filePath.startsWith('/')) {
      relPath = filePath.substring(1);
    }

    const absolutePath = path.resolve(materialsRoot, relPath);

    // Boundary check
    if (isBlockedMaterialPath(absolutePath)) {
      return res.status(403).json({ error: "Access denied to blocked path" });
    }

    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "File not found." });
    }

    const ext = path.extname(absolutePath).toLowerCase();
    if (ext !== '.pdf') {
      return res.status(400).json({ error: "OCR is only supported for PDF documents." });
    }

    console.log(`[OCR ROUTE] Spawning local OCR pipeline subprocess for: ${absolutePath}`);

    const isWin = process.platform === 'win32';
    const pythonExec = isWin
      ? path.join(__dirname, '..', 'venv', 'Scripts', 'python.exe')
      : path.join(__dirname, '..', 'venv', 'bin', 'python3');
    const ocrScript = path.join(__dirname, '..', '..', 'scripts', 'ocr_library.py');

    const ocrProcess = spawn(pythonExec, [ocrScript, absolutePath]);

    let outputLog = '';
    let errLog = '';

    ocrProcess.stdout.on('data', (data) => {
      const text = data.toString();
      outputLog += text;
      console.log(`[OCR SUBPROCESS STDOUT] ${text.trim()}`);
    });

    ocrProcess.stderr.on('data', (data) => {
      const text = data.toString();
      errLog += text;
      console.error(`[OCR SUBPROCESS STDERR] ${text.trim()}`);
    });

    ocrProcess.on('close', async (code) => {
      if (code === 0) {
        console.log(`[OCR ROUTE] OCR complete. Re-indexing document chunks for RAG: ${filePath}`);
        try {
          // Re-index the document so that the generated markdown gets parsed
          await indexDocumentToSqliteByWebPath(filePath);
          res.json({ success: true, message: "OCR transcription and database re-indexing complete." });
        } catch (indexErr) {
          console.error(`[OCR ROUTE] Re-indexing failed post-OCR:`, indexErr);
          res.status(500).json({ error: "OCR complete, but re-indexing failed." });
        }
      } else {
        console.error(`[OCR ROUTE] OCR subprocess exited with non-zero code ${code}`);
        res.status(500).json({ error: `OCR pipeline subprocess failed with exit status.` });
      }
    });

  } catch (err) {
    console.error("[OCR ROUTE] Failure:", err);
    res.status(500).json({ error: "Internal server error." });
  }
});

module.exports = router;
