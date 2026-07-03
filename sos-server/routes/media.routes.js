const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { streamVideo } = require('../services/mediaStreamService');

const MATERIALS_DIR = path.join(__dirname, '..', '..'); // Points to the root survival folder

router.get('/stream', (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).send("Path query parameter is required.");
  
  // Resolve absolute path safely
  const cleanRelPath = relPath.replace('/materials/', '');
  const absolutePath = path.resolve(MATERIALS_DIR, cleanRelPath);
  
  // Security check: ensure path is inside MATERIALS_DIR
  if (!absolutePath.startsWith(path.resolve(MATERIALS_DIR))) {
    return res.status(403).send("Access denied: Out of bounds path.");
  }
  
  if (!fs.existsSync(absolutePath)) {
    return res.status(404).send("File not found.");
  }
  
  streamVideo(req, res, absolutePath);
});

module.exports = router;
