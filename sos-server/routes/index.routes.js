const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const ai = require('../ai');
const { auditIndex, repairIndex } = require('../services/indexIntegrityService');
const { webPathToMaterialAbsolutePath, checkDocumentIndexedStatus, checkDocumentIndexedStatusAsync } = require('../services/documentIndexingService');

const { MANIFEST_FILE } = require('../services/manifestService');

// GET /api/index/status?path=/materials/...
router.get('/status', async (req, res) => {
  try {
    const { path: webPath } = req.query;
    if (!webPath) return res.status(400).json({ error: "path parameter is required" });
    
    // Traversal validation
    webPathToMaterialAbsolutePath(webPath);
    
    const status = await checkDocumentIndexedStatusAsync(webPath);
    res.json(status);
  } catch (err) {
    console.error("[INDEX ROUTE] Status check failed:", err);
    res.status(400).json({ error: "Invalid request or access denied." });
  }
});

// Helper function to index a single document and update manifest cache flag
const performDocumentIndexing = async (webPath) => {
  // Safe normalization & traversal validation
  const absolutePath = webPathToMaterialAbsolutePath(webPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`File not found.`);
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
    res.status(400).json({ error: "Failed to index document." });
  }
});

// POST /api/index/audit
router.post('/audit', (req, res) => {
  try {
    const report = auditIndex();
    res.json(report);
  } catch (err) {
    console.error("[INDEX ROUTE] Audit failed:", err);
    res.status(500).json({ error: "Failed to audit index." });
  }
});

// POST /api/index/repair-status
router.post('/repair-status', (req, res) => {
  try {
    const result = repairIndex();
    res.json(result);
  } catch (err) {
    console.error("[INDEX ROUTE] Repair failed:", err);
    res.status(500).json({ error: "Failed to repair index." });
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
    console.error("[INDEX ROUTE] Compatibility index failed:", err);
    res.status(400).json({ error: "Failed to index document." });
  }
});

module.exports = router;
