const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ai = require('./ai');
const { db } = require('./db');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");

const ROOT_DIR = path.join(__dirname, '..');
const BACKUP_DIR = path.join(__dirname, '..', '..', 'survival_zip_backups');
const METADATA_FILE = path.join(__dirname, 'metadata.json');

let status = {
  isCrawling: false,
  totalZips: 0,
  processedZips: 0,
  totalDocs: 0,
  processedDocs: 0,
  currentFile: "None",
  statusText: "System idle"
};

// Load metadata cache
let metadataCache = {};
if (fs.existsSync(METADATA_FILE)) {
  try {
    metadataCache = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
  } catch (e) {
    console.error("Error reading metadata cache:", e);
  }
}

function saveMetadataCache() {
  fs.writeFileSync(METADATA_FILE, JSON.stringify(metadataCache, null, 2));
}

// Helper to run shell commands
const runCmd = (cmd) => {
  return new Promise((resolve, reject) => {
    exec(cmd, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
};

// Recursive file scanner
function scanDir(dir, filesList = { zips: [], docs: [] }) {
  try {
    const files = fs.readdirSync(dir);
    for (const file of files) {
      // Exclude source, hidden, node_modules, backup, and markdown files
      if (['sos-app', 'sos-server', '.git', '.gemini', 'node_modules', '.vscode', 'survival_zip_backups', 'markdown_materials'].includes(file)) continue;
      
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDir(fullPath, filesList);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (ext === '.zip' && file !== 'sos-source-backup.zip') {
          filesList.zips.push(fullPath);
        } else if (['.pdf', '.txt'].includes(ext)) {
          filesList.docs.push(fullPath);
        }
      }
    }
  } catch (err) {
    console.error("Scan error:", err);
  }
  return filesList;
}

// Helper to check if doc is already indexed in SQLite
function isIndexedInSql(docRelativePath) {
  try {
    const stmt = db.prepare("SELECT 1 FROM indexed_docs WHERE path = ?");
    const result = stmt.get(docRelativePath);
    return !!result;
  } catch (err) {
    console.error("SQL query error:", err);
    return false;
  }
}

// Index doc to SQLite FTS5
async function indexToSqlite(docPath, relativePath) {
  if (isIndexedInSql(relativePath)) {
    return true;
  }
  
  const ext = path.extname(docPath).toLowerCase();
  let pages = [];
  
  try {
    console.log(`[SQLITE] Reading content for FTS5 indexing: ${relativePath}`);
    
    // Check if a pre-processed markdown file exists in markdown_materials
    const relPath = path.relative(ROOT_DIR, docPath);
    const parsed = path.parse(relPath);
    const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
    const mdPath = path.join(ROOT_DIR, 'markdown_materials', mdRelPath);
    
    if (ext === '.pdf' && fs.existsSync(mdPath)) {
      console.log(`[SQLITE] Found high-fidelity olmOCR Markdown: ${mdPath}`);
      const text = fs.readFileSync(mdPath, 'utf8');
      pages = [text];
    } else if (ext === '.pdf') {
      const loader = new PDFLoader(docPath);
      const docs = await loader.load();
      pages = docs.map(d => d.pageContent);
    } else if (ext === '.txt') {
      const text = fs.readFileSync(docPath, 'utf8');
      pages = [text];
    } else {
      return false;
    }
    
    // Insert into virtual table
    const insertChunk = db.prepare("INSERT INTO document_chunks (document_path, chunk_index, content) VALUES (?, ?, ?)");
    for (let i = 0; i < pages.length; i++) {
      insertChunk.run(relativePath, i, pages[i]);
    }
    
    // Mark as indexed
    const markIndexed = db.prepare("INSERT INTO indexed_docs (path, indexed_at) VALUES (?, ?)");
    markIndexed.run(relativePath, new Date().toISOString());
    
    console.log(`[SQLITE] Successfully indexed ${pages.length} pages/chunks for ${relativePath}`);
    return true;
  } catch (err) {
    console.error(`[SQLITE] Failed indexing for ${docPath}:`, err);
    return false;
  }
}

// Main crawl loop
async function start() {
  if (status.isCrawling) return;
  status.isCrawling = true;
  status.statusText = "Scanning database structure...";
  
  try {
    // 1. Scan files
    const scanResults = scanDir(ROOT_DIR);
    status.totalZips = scanResults.zips.length;
    status.totalDocs = scanResults.docs.length;
    status.processedZips = 0;
    status.processedDocs = 0;
    
    // Create backup directory if not exists
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
    
    // 2. Extract and Move Zips
    for (let i = 0; i < scanResults.zips.length; i++) {
      const zipPath = scanResults.zips[i];
      const zipDir = path.dirname(zipPath);
      const zipName = path.basename(zipPath, '.zip');
      
      status.currentFile = path.basename(zipPath);
      status.statusText = `Extracting ZIP [${i+1}/${status.totalZips}]`;
      
      const destExtractDir = path.join(zipDir, zipName);
      
      try {
        console.log(`[ZIP ${i+1}/${status.totalZips}] Extracting ${status.currentFile}...`);
        // Extract using PowerShell with -LiteralPath to avoid wildcard parsing issues
        await runCmd(`powershell -Command "Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destExtractDir.replace(/'/g, "''")}' -Force"`);
        
        // Move original ZIP to backup directory, preserving relative path structure
        const relativeZipPath = path.relative(ROOT_DIR, zipPath);
        const backupZipPath = path.join(BACKUP_DIR, relativeZipPath);
        
        fs.mkdirSync(path.dirname(backupZipPath), { recursive: true });
        fs.renameSync(zipPath, backupZipPath);
        
        console.log(`[ZIP ${i+1}/${status.totalZips}] Success. Original moved to backup.`);
        status.processedZips++;
      } catch (err) {
        console.error(`[ZIP ${i+1}/${status.totalZips}] Failed to extract/move ZIP: ${zipPath}`, err);
        status.statusText = `Error extracting ${status.currentFile}`;
      }
      // Brief sleep between zips to prevent CPU bottleneck
      await new Promise(r => setTimeout(r, 500));
    }
    
    // 3. Scan again for docs (since we extracted new ones)
    status.statusText = "Re-scanning database for newly extracted documents...";
    const postScanResults = scanDir(ROOT_DIR);
    status.totalDocs = postScanResults.docs.length;
    
    // 4. Index and Metadata Extract
    for (let i = 0; i < postScanResults.docs.length; i++) {
      const docPath = postScanResults.docs[i];
      const relativePath = '/materials/' + path.relative(ROOT_DIR, docPath).replace(/\\/g, '/');
      const ext = path.extname(docPath).toLowerCase();
      
      status.currentFile = path.basename(docPath);
      status.statusText = `Syncing Document [${i+1}/${status.totalDocs}]`;
      
      // Step A: Extract Metadata (only for PDF)
      if (ext === '.pdf') {
        if (fs.existsSync(METADATA_FILE)) {
          try {
            metadataCache = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
          } catch(e){}
        }
        
        if (!metadataCache[relativePath] || metadataCache[relativePath].title === 'Unknown Document' || metadataCache[relativePath].title?.startsWith("Error")) {
          try {
            const meta = await ai.extractMetadata(docPath);
            metadataCache[relativePath] = meta;
            saveMetadataCache();
          } catch (err) {
            console.error("AI metadata extraction failed for:", docPath, err);
          }
        }
      }
      
      // Step B: Index document in SQLite FTS5 (lightning fast, zero RAM)
      await indexToSqlite(docPath, relativePath);
      
      status.processedDocs++;
      // Sleep between files to prevent Disk I/O bottleneck
      await new Promise(r => setTimeout(r, 100));
    }
    
    status.statusText = "Database fully synchronized.";
    status.currentFile = "None";
  } catch (err) {
    console.error("Crawler crashed:", err);
    status.statusText = "Sync interrupted by system error.";
  } finally {
    status.isCrawling = false;
  }
}

function getStatus() {
  return status;
}

module.exports = {
  start,
  getStatus
};
