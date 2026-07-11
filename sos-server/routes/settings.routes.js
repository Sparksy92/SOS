const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { db } = require('../db');
const fs = require('fs');

// GET /api/settings/library-path
router.get('/library-path', (req, res) => {
  try {
    const row = db.prepare("SELECT value FROM settings WHERE key = ?").get('library_path');
    res.json({ path: row ? row.value : null });
  } catch (err) {
    console.error("[SETTINGS ROUTE] Failed to get library path:", err);
    res.status(500).json({ error: "Failed to retrieve setting." });
  }
});

// POST /api/settings/library-path
router.post('/library-path', (req, res) => {
  try {
    const { path: targetPath } = req.body;
    if (targetPath === undefined) {
      return res.status(400).json({ error: "path parameter is required" });
    }
    
    // Save to settings table
    const stmt = db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)");
    stmt.run('library_path', targetPath);
    
    console.log(`[SETTINGS ROUTE] Saved library path setting: ${targetPath}`);
    res.json({ success: true, path: targetPath });
  } catch (err) {
    console.error("[SETTINGS ROUTE] Failed to save library path:", err);
    res.status(500).json({ error: "Failed to save setting." });
  }
});

// POST /api/settings/browse-folder
router.post('/browse-folder', (req, res) => {
  const ip = req.ip || req.connection.remoteAddress;
  const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
  if (!isLocal) {
    return res.status(403).json({ error: "Access denied: Graphical folder browser is restricted to localhost requests." });
  }

  const isWin = process.platform === 'win32';
  
  if (isWin) {
    // Run native Windows FolderBrowserDialog via non-admin powershell
    const cmd = `powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = 'Select your SurvivalOS Reference Library Folder'; [void]$f.ShowDialog(); $f.SelectedPath"`;
    
    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error("[SETTINGS ROUTE] Folder Browser Dialog failed:", error);
        return res.status(500).json({ error: "Failed to open folder browser." });
      }
      
      const selectedPath = stdout.trim();
      res.json({ path: selectedPath || null });
    });
  } else {
    // Non-Windows fallback (Linux/macOS): Check if zenity is installed for graphical picker
    exec('which zenity', (err, stdout, stderr) => {
      if (!err && stdout.trim()) {
        exec('zenity --file-selection --directory --title="Select Library Folder"', (zenityErr, zenityStdout, zenityStderr) => {
          const selectedPath = zenityStdout ? zenityStdout.trim() : null;
          res.json({ path: selectedPath });
        });
      } else {
        // Safe console mock fallback for sandbox headless environments
        res.json({ path: null, warning: "Graphical folder picker is only supported on Windows or Linux with zenity installed." });
      }
    });
  }
});

module.exports = router;
