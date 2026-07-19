const path = require('path');
const dotenv = require('dotenv');

// Load .env from backend directory first, then root directory fallback
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');
const domPurifyWindow = new JSDOM('').window;
const DOMPurify = createDOMPurify(domPurifyWindow);
const { spawn } = require('child_process');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3001;
const TTS_URL = process.env.SOS_TTS_URL || 'http://localhost:3002';

// Security headers
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false,
}));

// Response compression
app.use(compression());

// Request logging
app.use(morgan('combined'));

const isLoopback = (req) => {
  const ip = req.ip || req.connection.remoteAddress;
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip === 'localhost';
};

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: isLoopback,
});
app.use('/api/', generalLimiter);

// Strict rate limiter for expensive AI/crawler operations
const heavyLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute
  max: 10,
  message: { error: 'Rate limit exceeded for this operation.' },
  skip: isLoopback,
});
app.use('/api/chat', heavyLimiter);
app.use('/api/crawler/start', heavyLimiter);
app.use('/api/crawler/ocr', heavyLimiter);
app.use('/api/launcher/npm-install', heavyLimiter);
app.use('/api/launcher/build', heavyLimiter);
app.use('/api/launcher/pull-model', heavyLimiter);
app.use('/api/launcher/start-app', heavyLimiter);
app.use('/api/launcher/stop', heavyLimiter);

// Enable CORS for frontend - restricted to localhost/same-origin
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    // Allow tunnel connections in production mode
    if (process.env.NODE_ENV === 'production') {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  }
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
          const cleanHtml = DOMPurify.sanitize(result.value);
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
                ${cleanHtml}
              </body>
            </html>
          `;
          res.setHeader('Content-Type', 'text/html');
          res.send(html);
        })
        .catch(err => {
          console.error("Error converting docx:", err);
          res.status(500).send("Error converting docx document.");
        });
    }
    
    res.sendFile(absolutePath, { dotfiles: 'allow' });
  } catch (err) {
    console.error("Access denied:", err);
    res.status(403).send("Access denied.");
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
const launcherRoutes = require('./routes/launcher.routes');
const ebgRoutes = require('./routes/ebg.routes');
const settingsRoutes = require('./routes/settings.routes');
const meshtasticRoutes = require('./routes/meshtastic.routes');
const networkRoutes = require('./routes/network.routes');
const guidesRoutes = require('./routes/guides.routes');
const academyRoutes = require('./routes/academy.routes');

app.use('/api/crawler', crawlerRoutes);
app.use('/api/video', mediaRoutes);
app.use('/api/materials', materialsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/index', indexRoutes);
app.use('/api/toolkit', toolkitRoutes);
app.use('/api/toolkit/guides', guidesRoutes);
app.use('/api/launcher', launcherRoutes);
app.use('/api/ebg', ebgRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/mesh', meshtasticRoutes);
app.use('/api/network', networkRoutes);
app.use('/api/academy', academyRoutes);

// Launcher UI HTML route
app.get('/launcher', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'launcher.html'));
});

// AI Chat Endpoint

app.post('/api/chat', async (req, res) => {
  const abortController = new AbortController();
  
  req.on('close', () => {
    if (!res.writableEnded) {
      console.log("[API CHAT] Client connection closed early. Aborting Ollama inference stream.");
      abortController.abort();
    }
  });

  try {
    const { message, isLiveGuide, useGeneralKnowledge } = req.body;
    if (!message) return res.status(400).json({ error: "Message is required" });
    
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no'
    });

    let sentMetadata = false;

    const finalResponse = await ai.askQuestion(message, isLiveGuide, useGeneralKnowledge, (token, meta) => {
      if (req.destroyed || abortController.signal.aborted) return;
      if (!sentMetadata && meta) {
        res.write(`data: ${JSON.stringify({ type: 'metadata', sources: meta.sources, answerStatus: meta.answerStatus })}\n\n`);
        sentMetadata = true;
      }
      res.write(`data: ${JSON.stringify({ type: 'token', text: token })}\n\n`);
    }, { signal: abortController.signal });

    if (req.destroyed || abortController.signal.aborted) {
      return;
    }

    if (!sentMetadata) {
      res.write(`data: ${JSON.stringify({ 
        type: 'metadata', 
        sources: finalResponse.sources || [], 
        answerStatus: finalResponse.answerStatus 
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'token', text: finalResponse.answer })}\n\n`);
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log("[API CHAT] LLM inference cleanly aborted.");
    } else {
      console.error("AI Error:", err);
      if (!req.destroyed) {
        res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.end();
      }
    }
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
      } catch (e) {
        console.error('[metadata] Error parsing metadata cache:', e.message);
      }
    }
    
    // If we already have a valid title, return it
    if (currentMeta[filePath] && !currentMeta[filePath].title?.startsWith("Error")) {
      return res.json(currentMeta[filePath]);
    }
    
    // Resolve absolute path using the resolveMaterialPath helper to prevent directory traversal
    let absolutePath;
    try {
      absolutePath = resolveMaterialPath(filePath);
    } catch (e) {
      return res.status(403).json({ error: "Access denied" });
    }
    if (!fs.existsSync(absolutePath)) return res.status(404).json({ error: "File not found" });
    
    const meta = await ai.extractMetadata(absolutePath);
    
    // Reload right before write to prevent overwrite race conditions with the crawler
    try {
      if (fs.existsSync(METADATA_FILE)) {
        currentMeta = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
      }
    } catch (e) {
      console.error('[metadata] Error reloading metadata cache:', e.message);
    }
    
    currentMeta[filePath] = meta;
    fs.writeFileSync(METADATA_FILE, JSON.stringify(currentMeta, null, 2));
    
    res.json(meta);
  } catch (err) {
    console.error("Extraction Error:", err);
    res.status(500).json({ error: "Error extracting metadata from file." });
  }
});


// Get full text of a document for read-aloud functionality
app.get('/api/document/text', async (req, res) => {
  const relPath = req.query.path;
  if (!relPath) return res.status(400).json({ error: "Path query parameter is required." });

  try {
    let absolutePath;
    try {
      absolutePath = resolveMaterialPath(relPath);
    } catch (e) {
      return res.status(403).json({ error: "Access denied" });
    }
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
    res.status(500).json({ error: "Error extracting text from document." });
  }
});

// Proxy route for local Neural TTS service
app.get('/api/tts', async (req, res) => {
  try {
    const { text, voice } = req.query;
    if (!text) return res.status(400).json({ error: "Text is required" });

    const targetUrl = `${TTS_URL}/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice || 'af_sarah')}`;
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      const errText = await response.text();
      return res.status(response.status).send(errText);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.send(buffer);
  } catch (err) {
    console.error("[TTS PROXY] Error forwarding request:", err);
    res.status(500).json({ error: "TTS proxy failed." });
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

// Global Express error handler
app.use((err, req, res, next) => {
  console.error('[UNHANDLED ERROR]', err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Process-level crash protection
process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  // Give time to finish in-flight requests, then exit
  setTimeout(() => process.exit(1), 3000);
});

// Graceful shutdown handler
function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Shutting down gracefully...`);
  server.close(() => {
    console.log('HTTP server closed.');
    try {
      const { closeDb } = require('./db');
      closeDb();
    } catch (e) {
      console.error('Error closing DB during shutdown:', e.message);
    }
    process.exit(0);
  });
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('Forced shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;
