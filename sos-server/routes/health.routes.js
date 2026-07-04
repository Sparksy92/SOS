const express = require('express');
const router = express.Router();
const fs = require('fs');
const { db } = require('../db');
const crawler = require('../crawler');
const { MANIFEST_FILE, METADATA_FILE } = require('../services/manifestService');
const http = require('http');

function checkOllama() {
  return new Promise((resolve) => {
    const req = http.request({
      host: '127.0.0.1',
      port: 11434,
      path: '/',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      resolve(true);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
    req.end();
  });
}

router.get('/', async (req, res) => {
  let docCount = 0;
  try {
    const row = db.prepare("SELECT COUNT(*) as count FROM indexed_docs").get();
    docCount = row ? row.count : 0;
  } catch (e) {
    console.error("[HEALTH] Error getting document count:", e.message);
  }

  const ollamaReachable = await checkOllama();

  res.json({
    ok: true,
    app: "SurvivalOS",
    server: "sos-server",
    checkedAt: new Date().toISOString(),
    materialRootConfigured: !!process.env.SOS_MATERIALS_DIR,
    autoCrawlEnabled: process.env.SOS_AUTO_CRAWL === 'true',
    environment: {
      node: process.version,
      platform: process.platform
    },
    // Keep backward compatible properties:
    status: "healthy",
    timestamp: Date.now(),
    autoCrawl: process.env.SOS_AUTO_CRAWL === 'true',
    crawlerStatus: crawler.getStatus(),
    indexedDocumentCount: docCount,
    manifestExists: fs.existsSync(MANIFEST_FILE),
    metadataExists: fs.existsSync(METADATA_FILE),
    ollama: ollamaReachable ? 'reachable' : 'unreachable',
    appVersion: "1.0.0"
  });
});

module.exports = router;
