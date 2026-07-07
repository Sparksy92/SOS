const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory first, then root directory fallback
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

const { resolveMaterialPath, getMaterialRoot } = require('./services/materialRootService');
const MATERIALS_DIR = getMaterialRoot();

// Serve the materials folder statically via a custom guarded Express 5 route
app.get(/^\/materials\/(.+)$/, (req, res) => {
  try {
    const decodedPath = decodeURIComponent(req.path);
    const absolutePath = resolveMaterialPath(decodedPath);
    
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).send("File not found.");
    }
    
    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      return res.status(403).send("Access denied: Directory listing not allowed.");
    }
    
    // On-the-fly DOCX to HTML conversion for browser viewing
    const ext = path.extname(absolutePath).toLowerCase();
    if (ext === '.docx') {
      const mammoth = require("mammoth");
      return mammoth.convertToHtml({ path: absolutePath })
        .then(result => {
          const html = `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    line-height: 1.6;
                    color: #e2e8f0;
                    max-width: 800px;
                    margin: 40px auto;
                    padding: 0 20px;
                    background-color: #0f172a;
                  }
                  p { margin-bottom: 1.2em; }
                  h1, h2, h3, h4 { margin-top: 1.5em; margin-bottom: 0.5em; color: #38bdf8; border-bottom: 1px solid #334155; padding-bottom: 4px; }
                  table { border-collapse: collapse; width: 100%; margin: 20px 0; background-color: #1e293b; }
                  th, td { border: 1px solid #475569; padding: 8px 12px; text-align: left; }
                  th { background-color: #334155; color: #38bdf8; }
                  a { color: #38bdf8; }
                </style>
              </head>
              <body>
                ${result.value}
              </body>
            </html>
          `;
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
        })
        .catch(err => {
          res.status(500).send(`Error converting docx: ${err.message}`);
        });
    }
    
    res.sendFile(absolutePath);
  } catch (err) {
    res.status(403).send(`Access denied: ${err.message}`);
  }
});

const ai = require('./ai');
const crawler = require('./crawler');

// Check config flag for auto-crawl. Default is false to protect large libraries.
const autoCrawl = process.env.SOS_AUTO_CRAWL === 'true';
if (autoCrawl) {
  console.log("[SQLITE] Auto-crawler enabled. Starting background scan...");
  crawler.start();
} else {
  console.log("[SQLITE] Auto-crawler disabled. Standing by for manual triggers.");
}

// Register routes
const crawlerRoutes = require('./routes/crawler.routes');
const mediaRoutes = require('./routes/media.routes');
const materialsRoutes = require('./routes/materials.routes');
const healthRoutes = require('./routes/health.routes');
const indexRoutes = require('./routes/index.routes');
const toolkitRoutes = require('./routes/toolkit.routes');

app.use('/api/crawler', crawlerRoutes);
app.use('/api/video', mediaRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/index', indexRoutes);
app.use('/api/toolkit', toolkitRoutes);

// AI Chat Endpoint
app.use(express.json()); // Add JSON parser for POST requests

app.post('/api/chat', async (req, res) => {
  try {
    const { message, isLiveGuide, useGeneralKnowledge } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    
    const response = await ai.askQuestion(message, isLiveGuide, useGeneralKnowledge);
    res.json(response);
  } catch (err) {
    console.error("AI Error:", err);
    res.status(500).json({ error: err.message });
  }
});




// --- METADATA SYSTEM ---
const METADATA_FILE = path.join(__dirname, 'metadata.json');

app.get('/api/metadata', (req, res) => {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      return res.json(data);
    }
  } catch (e) {
    console.error("Error serving metadata:", e);
  }
  res.json({});
});

app.post('/api/metadata/extract', async (req, res) => {
  try {
    const { filePath } = req.body;
    if (!filePath) return res.status(400).json({ error: "filePath is required" });
    
    let currentMeta = {};
    if (fs.existsSync(METADATA_FILE)) {
      try {
        currentMeta = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      } catch (e) {}
    }
    
    // If we already have a valid title, return it
    if (currentMeta[filePath] && !currentMeta[filePath].title?.startsWith("Error")) {
      return res.json(currentMeta[filePath]);
    }
    
    // Resolve absolute path using the new MATERIALS_DIR
    const absolutePath = path.join(MATERIALS_DIR, filePath.replace('/materials/', ''));
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: "File not found" });
    
    const meta = await ai.extractMetadata(absolutePath);
    
    // Reload right before write to prevent overwrite race conditions with the crawler
    try {
      if (fs.existsSync(METADATA_FILE)) {
        currentMeta = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      }
    } catch (e) {}
    
    currentMeta[filePath] = meta;
    fs.writeFileSync(METADATA_FILE, JSON.stringify(currentMeta, null, 2));
    
    res.json(meta);
  } catch (err) {
    console.error("Extraction Error:", err);
    res.status(500).json({ error: err.message });
  }
});


// Get full text of a document for read-aloud functionality
app.get('/api/document/text', async (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: "Path query parameter is required." });

  try {
    const absolutePath = path.join(MATERIALS_DIR, relPath.replace('/materials/', ''));
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "File not found." });
    }

    // 1. Check if high-fidelity markdown exists
    const mdPath = path.join(
      path.dirname(absolutePath),
      'markdown_materials',
      path.basename(absolutePath).replace(/\.[^/.]+$/, "") + ".md"
    );

    if (fs.existsSync(mdPath)) {
      const text = fs.readFileSync(mdPath, 'utf8');
      return res.json({ text, type: 'markdown' });
    }

    // 2. Check if text file
    const ext = path.extname(absolutePath).toLowerCase();
    if (['.txt', '.md'].includes(ext)) {
      const text = fs.readFileSync(absolutePath, 'utf8');
      return res.json({ text, type: 'text' });
    }

    // 3. Parse DOCX
    if (ext === '.docx') {
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ path: absolutePath });
      return res.json({ text: result.value, type: 'docx' });
    }

    // 4. Parse PDF
    if (ext === '.pdf') {
      const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
      const loader = new PDFLoader(absolutePath);
      const docs = await loader.load();
      const text = docs.map(d => d.pageContent).join("\n\n--- PAGE BREAK ---\n\n");
      return res.json({ text, type: 'pdf' });
    }

    return res.status(400).json({ error: "Unsupported file type for text extraction." });
  } catch (err) {
    console.error("Text extraction error:", err);
    res.status(500).json({ error: err.message });
  }
});

if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'sos-app', 'dist');
  
  // Serve static assets from build output folder
  app.use(express.static(frontendDist));
  
  // Fallback for SPA routing: serve index.html for all non-api, non-materials routes
  app.get(/^\/(?!api|materials).*/, (req, res) => {
    const indexPath = path.join(frontendDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Production build index.html not found. Please build frontend first.");
    }
  });
}

const server = app.listen(PORT, () => {
  console.log(`SOS Server running on http://localhost:${PORT}`);
});

module.exports = server;
