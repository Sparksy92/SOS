const express = require('express');
const router = express.Router();
const fs = require('fs');
const { streamVideo } = require('../services/mediaStreamService');
const { resolveMaterialPath } = require('../services/materialRootService');

router.get('/stream', (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).send("Path query parameter is required.");
  
  try {
    // Safety check and path resolution (prevents traversal & denied directories)
    const absolutePath = resolveMaterialPath(relPath);
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).send("File not found.");
    }
    
    streamVideo(req, res, absolutePath);
  } catch (err) {
    return res.status(403).send(`Access denied: ${err.message}`);
  }
});

module.exports = router;
