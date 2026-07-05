const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ai = require('../ai');
const { auditIndex, repairIndex } = require('../services/indexIntegrityService');
const { webPathToMaterialAbsolutePath, checkDocumentIndexedStatus } = require('../services/documentIndexingService');

const { MANIFEST_FILE } = require('../services/manifestService');

// GET /api/index/status?path=/materials/...
router.get('/status', (req, res) => {
  try {
    const { path: webPath } = req.query;
    if (!webPath) return res.status(400).json({ error: "path parameter is required" });
    
    // Traversal validation
    webPathToMaterialAbsolutePath(webPath);
    
    const status = checkDocumentIndexedStatus(webPath);
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Helper function to index a single document and update manifest cache flag
const performDocumentIndexing = async (webPath) => {
  // Safe normalization & traversal validation
  const absolutePath = webPathToMaterialAbsolutePath(webPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found: ${absolutePath}`);
  }

  const result = await ai.indexFile(absolutePath);
  
  if (result.success) {
    // Dynamically update manifest cached flag so UI updates immediately
    if (fs.existsSync(MANIFEST_FILE)) {
      try {
        const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
        const categories = manifest.categories || {};
        let updated = false;

        Object.entries(categories).forEach(([catName, filesList]) => {
          filesList.forEach(file => {
            if (file.path === webPath) {
              file.indexed = true;
              updated = true;
            }
          });
        });

        if (updated) {
          fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
        }
      } catch (e) {
        console.error("[INDEX ROUTE] Manifest flag cache update failed:", e);
      }
    }
  }

  return result;
};

// POST /api/index/document
router.post('/document', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "filePath is required" });

    const result = await performDocumentIndexing(filePath);
    res.json(result);
  } catch (err) {
    console.error("[INDEX ROUTE] Error indexing document:", err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/index/audit
router.post('/audit', (req, res) => {
  try {
    const report = auditIndex();
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/index/repair-status
router.post('/repair-status', (req, res) => {
  try {
    const result = repairIndex();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/index (compatibility alias for legacy index requests)
router.post('/', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "filePath is required" });

    const result = await performDocumentIndexing(filePath);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
