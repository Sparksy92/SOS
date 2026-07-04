const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ai = require('./ai');
const { db } = require('./db');
const { checkDocumentIndexedStatus, extractDocumentTextPages, writeDocumentChunksToSqlite } = require('./services/documentIndexingService');
const { getMaterialRoot, isBlockedMaterialPath } = require('./services/materialRootService');
const manifestService = require('./services/manifestService');

const METADATA_FILE = path.join(__dirname, 'metadata.json');

let status = {
  isCrawling: false,
  totalZips: 0,
  processedZips: 0,
  totalDocs: 0,
  processedDocs: 0,
  currentFile: "None",
  statusText: "System idle",
  mode: "idle",
  dryRunZips: []
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

// Recursive file scanner respecting materialRootService boundaries
function scanDir(dir, filesList = { zips: [], docs: [] }) {
  try {
    const resolvedDir = path.resolve(dir);
    if (isBlockedMaterialPath(resolvedDir)) return filesList;

    const files = fs.readdirSync(resolvedDir);
    for (const file of files) {
      const fullPath = path.join(resolvedDir, file);
      if (isBlockedMaterialPath(fullPath)) continue;
      
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

// Index doc to SQLite FTS5 using unified service
async function indexToSqlite(docPath, relativePath) {
  const status = checkDocumentIndexedStatus(relativePath);
  if (status.indexed && status.chunks > 0) {
    return true;
  }
  
  try {
    console.log(`[SQLITE] Reading content for FTS5 indexing: ${relativePath}`);
    const pages = await extractDocumentTextPages(docPath);
    writeDocumentChunksToSqlite(relativePath, pages);
    console.log(`[SQLITE] Successfully indexed ${pages.length} pages/chunks for ${relativePath}`);
    return true;
  } catch (err) {
    console.error(`[SQLITE] Failed indexing for ${docPath}:`, err);
    return false;
  }
}

// Main crawl loop
async function start(options = { mode: 'inventory', confirmation: '', dryRun: false }) {
  if (status.isCrawling) return;
  
  const mode = options.mode || 'inventory';
  const confirmation = options.confirmation || '';
  const dryRun = options.dryRun === true;
  
  status.isCrawling = true;
  status.mode = mode;
  status.dryRunZips = [];
  status.totalZips = 0;
  status.processedZips = 0;
  status.totalDocs = 0;
  status.processedDocs = 0;
  status.currentFile = "None";
  status.statusText = `Starting crawl in ${mode.toUpperCase()} mode...`;
  
  try {
    const materialsRoot = getMaterialRoot();
    const backupDir = path.join(materialsRoot, 'survival_zip_backups');
    
    // 1. Scan files
    const scanResults = scanDir(materialsRoot);
    status.totalZips = scanResults.zips.length;
    status.totalDocs = scanResults.docs.length;
    
    if (mode === 'inventory') {
      status.statusText = "Running inventory scan only...";
      console.log("[CRAWLER] Rebuilding material manifest in inventory mode...");
      manifestService.rebuildManifest();
      status.statusText = `Inventory Complete. Found ${status.totalDocs} documents and ${status.totalZips} zip files.`;
      return;
    }
    
    if (mode === 'extract-zips') {
      if (dryRun) {
        status.dryRunZips = scanResults.zips.map(z => path.basename(z));
        status.statusText = `Dry run complete. Found ${status.totalZips} ZIP files ready for extraction.`;
        console.log(`[CRAWLER] Dry Run found ${status.totalZips} ZIP archives.`);
        return;
      }
      
      if (confirmation !== 'EXTRACT ZIP ARCHIVES') {
        throw new Error("Missing or invalid confirmation phrase for ZIP extraction.");
      }
      
      // Create backup directory if not exists
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      
      // Extract and Move Zips
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
          const relativeZipPath = path.relative(materialsRoot, zipPath);
          const backupZipPath = path.join(backupDir, relativeZipPath);
          
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
      
      status.statusText = `ZIP extraction finished. Extracted ${status.processedZips} of ${status.totalZips} zips.`;
      return;
    }
    
    if (mode === 'index') {
      status.statusText = "Starting document indexing...";
      
      // Index and Metadata Extract
      for (let i = 0; i < scanResults.docs.length; i++) {
        const docPath = scanResults.docs[i];
        const relativePath = '/materials/' + path.relative(materialsRoot, docPath).replace(/\\/g, '/');
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
        
        // Step B: Index document in SQLite FTS5
        await indexToSqlite(docPath, relativePath);
        
        status.processedDocs++;
        // Sleep between files to prevent Disk I/O bottleneck
        await new Promise(r => setTimeout(r, 100));
      }
      
      status.statusText = "Database fully indexed.";
      status.currentFile = "None";
    }
  } catch (err) {
    console.error("Crawler crashed:", err);
    status.statusText = `Crawler failed: ${err.message}`;
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
