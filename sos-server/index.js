const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const app = express();
const PORT = 3001;

// Enable CORS for frontend
app.use(cors());
app.use(express.json());

// Path to the survival materials
const MATERIALS_DIR = path.join(__dirname, '..');

// Serve the materials folder statically so files can be accessed via URL
app.use('/materials', express.static(MATERIALS_DIR));

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

app.use('/api/crawler', crawlerRoutes);
app.use('/api/video', mediaRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/health', healthRoutes);

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

// AI Index Endpoint
app.post('/api/index', async (req, res) => {
  try {
    const { filePath } = req.body; 
    if (!filePath) return res.status(400).json({ error: "filePath is required" });
    
    // Resolve absolute path using the new MATERIALS_DIR
    const absolutePath = path.join(MATERIALS_DIR, filePath.replace('/materials/', ''));
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: "File not found" });

    const result = await ai.indexFile(absolutePath);
    res.json(result);
  } catch (err) {
    console.error("Indexing Error:", err);
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

    // 3. Parse PDF
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

app.listen(PORT, () => {
  console.log(`SOS Server running on http://localhost:${PORT}`);
});
