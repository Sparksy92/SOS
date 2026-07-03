const express = require('express');
const router = express.Router();
const { loadManifest, rebuildManifest } = require('../services/manifestService');

// Get all materials (loads from manifest/cache first, falls back to scan)
router.get('/', (req, res) => {
  try {
    const manifest = loadManifest();
    res.json({ categories: manifest.categories });
  } catch (err) {
    console.error("[MATERIALS] Load failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// Refresh material manifest manually (incremental directory scan only, no deep index)
router.post('/refresh', (req, res) => {
  try {
    const manifest = rebuildManifest();
    res.json({
      status: "Manifest rebuilt successfully.",
      totalFiles: manifest.totalFiles,
      timestamp: manifest.timestamp
    });
  } catch (err) {
    console.error("[MATERIALS] Refresh failed:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
