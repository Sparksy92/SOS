const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.resolve(__dirname, '..', '..', 'docs');

// Helper to sanitize filename and prevent directory traversal
function getSafeGuidePath(filename) {
  if (!filename || typeof filename !== 'string') return null;
  
  // Strip any directory separator or null byte injections
  const sanitized = path.basename(filename);
  if (sanitized !== filename) return null; // filename must not contain directory structures
  
  const fullPath = path.join(DOCS_DIR, sanitized);
  
  // Verify it resolves strictly inside the docs directory
  if (!fullPath.startsWith(DOCS_DIR)) return null;
  
  return fullPath;
}

// 1. GET /api/toolkit/guides - List all guides
router.get('/', (req, res) => {
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      return res.json({ guides: [] });
    }

    const files = fs.readdirSync(DOCS_DIR);
    const guides = [];

    // Filter for only markdown files
    const mdFiles = files.filter(f => f.toLowerCase().endsWith('.md'));

    for (const file of mdFiles) {
      const fullPath = path.join(DOCS_DIR, file);
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        // Extract first heading as the title
        let title = file.replace(/\.md$/i, '').replace(/_/g, ' ').replace(/-/g, ' ');
        // Title-case
        title = title.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const firstLine = content.split('\n')[0];
          if (firstLine && firstLine.startsWith('# ')) {
            title = firstLine.slice(2).trim();
          }
        } catch (e) {
          // Fallback to filename-based title
        }

        guides.push({
          filename: file,
          title: title,
          size: stat.size,
          mtime: stat.mtimeMs
        });
      }
    }

    // Sort alphabetically by title
    guides.sort((a, b) => a.title.localeCompare(b.title));

    res.json({ guides });
  } catch (err) {
    console.error("[GUIDES ROUTE] Failed to list guides:", err);
    res.status(500).json({ error: "Failed to list offline manuals." });
  }
});

// 2. GET /api/toolkit/guides/:filename - Get guide content
router.get('/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const safePath = getSafeGuidePath(filename);

    if (!safePath || !fs.existsSync(safePath)) {
      return res.status(404).json({ error: "Guide manual not found." });
    }

    const stat = fs.statSync(safePath);
    if (!stat.isFile()) {
      return res.status(403).json({ error: "Access denied." });
    }

    const content = fs.readFileSync(safePath, 'utf8');
    res.json({
      filename,
      content
    });
  } catch (err) {
    console.error("[GUIDES ROUTE] Failed to get guide:", err);
    res.status(500).json({ error: "Failed to load offline manual." });
  }
});

module.exports = router;
