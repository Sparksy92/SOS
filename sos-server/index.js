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

// Helper function to recursively get files
function getFiles(dirPath, arrayOfFiles = []) {
  try {
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      // Security: Ignore app source code, config, and markdown materials directories
      if (['sos-app', 'sos-server', '.git', '.gemini', 'node_modules', '.vscode', 'markdown_materials'].includes(file)) return;

      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getFiles(fullPath, arrayOfFiles);
      } else {
        // Only include certain file types
        const ext = path.extname(file).toLowerCase();
        if (['.pdf', '.epub', '.zim', '.doc', '.docx', '.txt', '.zip', '.mp4', '.avi', '.mkv', '.wmv', '.webm', '.mov', '.iso', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
           // Calculate relative path for URL access
           const relativePath = path.relative(MATERIALS_DIR, fullPath);
           const parts = path.dirname(relativePath).split(path.sep);
           const rawCategory = parts[0] || 'Uncategorized';
           const subdirs = parts.slice(1).filter(p => p && p !== '.');

           arrayOfFiles.push({
             name: file,
             path: `/materials/${relativePath.replace(/\\/g, '/')}`,
             extension: ext,
             rawCategory: rawCategory,
             subdirectories: subdirs
           });
        }
      }
    });
  } catch (err) {
    console.error("Error reading directory:", err);
  }
  return arrayOfFiles;
}

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
app.use('/api/crawler', crawlerRoutes);

// API endpoint to list all available materials
app.get('/api/materials', (req, res) => {
  if (!fs.existsSync(MATERIALS_DIR)) {
    return res.status(404).json({ error: 'Materials directory not found.' });
  }

  const files = getFiles(MATERIALS_DIR);
  
  // Category mapping dictionary
  const CATEGORY_MAP = {
    'ATL': 'Applied Technology & Agriculture',
    'ENCYCLOPEDIAS AND KNOWLEDGE PART I': 'Encyclopedias & Reference',
    'ENCYCLOPEDIAS AND KNOWLEDGE PART II': 'Encyclopedias & Reference',
    'Great Science Textbooks DVD Library (Entire Collection 88.9 GB)': 'Academic & Science',
    'The Ark': 'Survival, Firearm Tactics & Software',
    '2012_cdw3d_dvd_set': 'Infrastructure & CD3WD',
    'CD3WD Extracted Manuals': 'CD3WD Technical Library',
    'Uncategorized': 'General Materials'
  };

  // Group by mapped category
  const categorized = files.reduce((acc, file) => {
    const mappedCategory = CATEGORY_MAP[file.rawCategory] || file.rawCategory;
    if (!acc[mappedCategory]) {
      acc[mappedCategory] = [];
    }
    // Set mapped category name back on file for client compatibility
    file.category = mappedCategory;
    acc[mappedCategory].push(file);
    return acc;
  }, {});

  res.json({ categories: categorized });
});

// AI Chat Endpoint
app.use(express.json()); // Add JSON parser for POST requests

app.post('/api/chat', async (req, res) => {
  try {
    const { message, isLiveGuide } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    
    const response = await ai.askQuestion(message, isLiveGuide);
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

app.get('/api/video/stream', (req, res) => {
  const videoPath = req.query.path;
  if (!videoPath) return res.status(400).send("Path is required");
  
  // Resolve absolute path using the MATERIALS_DIR
  const absolutePath = path.join(MATERIALS_DIR, videoPath.replace('/materials/', ''));
  if (!fs.existsSync(absolutePath)) return res.status(404).send("File not found");
  
  console.log(`[STREAM] Transcoding and streaming: ${absolutePath}`);
  
  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });
  
  // Spawn FFmpeg to transcode video to fragmented H264 MP4 stream
  const ffmpeg = spawn('ffmpeg', [
    '-i', absolutePath,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'mp4',
    '-movflags', 'frag_keyframe+empty_moov+default_base_moof',
    'pipe:1'
  ]);
  
  ffmpeg.stdout.pipe(res);
  
  req.on('close', () => {
    console.log(`[STREAM] Connection closed. Terminating FFmpeg process for: ${absolutePath}`);
    ffmpeg.kill('SIGKILL');
  });
  
  ffmpeg.on('error', (err) => {
    console.error(`[STREAM] FFmpeg execution error for ${absolutePath}:`, err);
  });
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

// Real-time video transcoding endpoint for browsers (converts avi, mkv, wmv, mov on the fly)
app.get('/api/video/stream', (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).send("Path query parameter is required.");
  
  // Resolve absolute path
  const absolutePath = path.join(MATERIALS_DIR, relPath.replace('/materials/', ''));
  if (!fs.existsSync(absolutePath)) return res.status(404).send("File not found.");

  console.log(`[TRANSCODE] Starting real-time stream for: ${absolutePath}`);
  
  res.writeHead(200, {
    'Content-Type': 'video/mp4',
    'Transfer-Encoding': 'chunked'
  });

  const ffmpeg = spawn('ffmpeg', [
    '-i', absolutePath,
    '-c:v', 'libx264',
    '-preset', 'ultrafast',
    '-tune', 'zerolatency',
    '-pix_fmt', 'yuv420p',
    '-movflags', 'fragmented+empty_moov+default_base_moof',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-f', 'mp4',
    'pipe:1'
  ]);

  ffmpeg.stdout.pipe(res);

  ffmpeg.stderr.on('data', (data) => {
    // Optional: Log transcoding debugging logs if needed
  });

  req.on('close', () => {
    console.log('[TRANSCODE] Client closed connection, killing ffmpeg process.');
    ffmpeg.kill('SIGKILL');
  });
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
