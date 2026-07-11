const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
const { 
  resolveMaterialPath, 
  absoluteToMaterialWebPath, 
  getMaterialRoot,
  isBlockedMaterialPath 
} = require('./materialRootService');

/**
 * Normalizes web path to absolute path and prevents directory traversal.
 */
function webPathToMaterialAbsolutePath(webPath) {
  if (!webPath || typeof webPath !== 'string') {
    throw new Error('filePath is required');
  }
  if (!webPath.startsWith('/materials/')) {
    throw new Error('filePath must start with /materials/');
  }
  return resolveMaterialPath(webPath);
}

/**
 * Converts filesystem absolute path to web path.
 */
function absolutePathToWebPath(absolutePath) {
  return absoluteToMaterialWebPath(absolutePath);
}

/**
 * Reads text/pages content from a file (PDF or TXT), checking for high-fidelity OCR markdown first.
 */
async function extractDocumentTextPages(absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase();
  const materialsRoot = getMaterialRoot();
  
  // Boundary check
  if (isBlockedMaterialPath(absolutePath)) {
    throw new Error('Access denied to blocked path');
  }

  const relPath = path.relative(materialsRoot, absolutePath);
  const parsed = path.parse(relPath);
  const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
  const mdPath = path.join(materialsRoot, 'markdown_materials', mdRelPath);

  if (ext === '.pdf' && fs.existsSync(mdPath)) {
    console.log(`[SQLITE] Found high-fidelity olmOCR Markdown: ${mdPath}`);
    const text = fs.readFileSync(mdPath, 'utf8');
    const pages = [text];
    pages.isOcr = true;
    return pages;
  } else if (ext === '.pdf') {
    const loader = new PDFLoader(absolutePath);
    const docs = await loader.load();
    const pages = docs.map(d => d.pageContent);
    
    // Auto-detect native text vs scanned: count non-whitespace characters
    const totalText = pages.join(' ').trim();
    const charCount = totalText.replace(/\s/g, '').length;
    pages.isOcr = (charCount < 100); // Scanned if almost zero selectable text
    return pages;
  } else if (ext === '.txt' || ext === '.md' || ext === '.html' || ext === '.htm') {
    let text = fs.readFileSync(absolutePath, 'utf8');
    if (ext === '.html' || ext === '.htm') {
      text = text
        .replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, '')
        .replace(/<style[^>]*>([\s\S]*?)<\/style>/gi, '')
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/\s+/g, ' ')
        .trim();
    }
    const pages = [text];
    pages.isOcr = false;
    return pages;
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }
}

/**
 * Deletes previous chunks, writes fresh chunks, and registers in indexed_docs.
 */
function writeDocumentChunksToSqlite(webPath, pages) {
  // Check bounds first via resolve
  resolveMaterialPath(webPath);

  // Begin database transaction for high-performance atomic insertion
  db.exec("BEGIN TRANSACTION");
  
  try {
    // Delete previous chunks
    const deleteChunks = db.prepare('DELETE FROM document_chunks WHERE document_path = ?');
    deleteChunks.run(webPath);

    // Insert fresh chunks (including is_ocr flag)
    const isOcrFlag = pages.isOcr ? 1 : 0;
    const insertChunk = db.prepare("INSERT INTO document_chunks (document_path, chunk_index, content, is_ocr) VALUES (?, ?, ?, ?)");
    for (let i = 0; i < pages.length; i++) {
      insertChunk.run(webPath, i, pages[i], isOcrFlag);
    }

    // Upsert into indexed_docs
    const upsertIndex = db.prepare("INSERT OR REPLACE INTO indexed_docs (path, indexed_at) VALUES (?, ?)");
    upsertIndex.run(webPath, new Date().toISOString());
    
    // Commit transaction
    db.exec("COMMIT");
  } catch (err) {
    // Rollback transaction on error
    try {
      db.exec("ROLLBACK");
    } catch (rollbackErr) {}
    throw err;
  }
}

/**
 * Unified helper to index a single document to SQLite.
 */
async function indexDocumentToSqliteByWebPath(webPath) {
  const absolutePath = webPathToMaterialAbsolutePath(webPath);
  const pages = await extractDocumentTextPages(absolutePath);
  writeDocumentChunksToSqlite(webPath, pages);
  return { success: true, chunks: pages.length };
}

/**
 * Checks SQLite for chunk count and indexed status.
 */
function checkDocumentIndexedStatus(webPath) {
  try {
    // Resolve validation
    resolveMaterialPath(webPath);

    const chunkStmt = db.prepare("SELECT COUNT(*) as count FROM document_chunks WHERE document_path = ?");
    const docStmt = db.prepare("SELECT 1 FROM indexed_docs WHERE path = ?");
    
    const chunkCount = chunkStmt.get(webPath)?.count || 0;
    const isIndexed = !!docStmt.get(webPath);
    
    return {
      path: webPath,
      indexed: isIndexed && chunkCount > 0,
      chunks: chunkCount,
      hasIndexedDocEntry: isIndexed
    };
  } catch (err) {
    console.error(`[INTEGRITY] Error checking status for ${webPath}:`, err);
    return { path: webPath, indexed: false, chunks: 0, hasIndexedDocEntry: false };
  }
}

/**
 * Heuristic to detect if a PDF is scanned/image-only.
 */
async function isScannedPdf(absolutePath) {
  try {
    const ext = path.extname(absolutePath).toLowerCase();
    if (ext !== '.pdf') return false;

    const materialsRoot = getMaterialRoot();
    const relPath = path.relative(materialsRoot, absolutePath);
    const parsed = path.parse(relPath);
    const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
    const mdPath = path.join(materialsRoot, 'markdown_materials', mdRelPath);
    if (fs.existsSync(mdPath)) {
      return false; // Already has high-fidelity OCR markdown
    }

    const loader = new PDFLoader(absolutePath);
    const docs = await loader.load();
    if (docs.length === 0) return true;

    let totalText = "";
    const checkPages = Math.min(5, docs.length);
    for (let i = 0; i < checkPages; i++) {
      totalText += docs[i].pageContent;
    }

    const avgLen = totalText.length / checkPages;
    return avgLen < 100;
  } catch (e) {
    console.error("[INDEX SERVICE] Error checking if scanned PDF:", e);
    return false;
  }
}

/**
 * Async version of checkDocumentIndexedStatus that adds isScanned and ocrCompleted checks.
 */
async function checkDocumentIndexedStatusAsync(webPath) {
  const status = checkDocumentIndexedStatus(webPath);
  try {
    const absolutePath = resolveMaterialPath(webPath);
    const ext = path.extname(absolutePath).toLowerCase();
    
    let isScanned = false;
    let ocrCompleted = false;

    if (ext === '.pdf') {
      const materialsRoot = getMaterialRoot();
      const relPath = path.relative(materialsRoot, absolutePath);
      const parsed = path.parse(relPath);
      const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
      const mdPath = path.join(materialsRoot, 'markdown_materials', mdRelPath);
      ocrCompleted = fs.existsSync(mdPath);
      
      if (fs.existsSync(absolutePath)) {
        isScanned = await isScannedPdf(absolutePath);
      }
    }

    return {
      ...status,
      isScanned,
      ocrCompleted
    };
  } catch (e) {
    return {
      ...status,
      isScanned: false,
      ocrCompleted: false
    };
  }
}

module.exports = {
  webPathToMaterialAbsolutePath,
  absolutePathToWebPath,
  extractDocumentTextPages,
  writeDocumentChunksToSqlite,
  indexDocumentToSqliteByWebPath,
  checkDocumentIndexedStatus,
  isScannedPdf,
  checkDocumentIndexedStatusAsync
};
