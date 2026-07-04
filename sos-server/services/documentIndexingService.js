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
    return [text];
  } else if (ext === '.pdf') {
    const loader = new PDFLoader(absolutePath);
    const docs = await loader.load();
    return docs.map(d => d.pageContent);
  } else if (ext === '.txt') {
    const text = fs.readFileSync(absolutePath, 'utf8');
    return [text];
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

  // Delete previous chunks
  const deleteChunks = db.prepare('DELETE FROM document_chunks WHERE document_path = ?');
  deleteChunks.run(webPath);

  // Insert fresh chunks
  const insertChunk = db.prepare("INSERT INTO document_chunks (document_path, chunk_index, content) VALUES (?, ?, ?)");
  for (let i = 0; i < pages.length; i++) {
    insertChunk.run(webPath, i, pages[i]);
  }

  // Upsert into indexed_docs
  const upsertIndex = db.prepare("INSERT OR REPLACE INTO indexed_docs (path, indexed_at) VALUES (?, ?)");
  upsertIndex.run(webPath, new Date().toISOString());
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

module.exports = {
  webPathToMaterialAbsolutePath,
  absolutePathToWebPath,
  extractDocumentTextPages,
  writeDocumentChunksToSqlite,
  indexDocumentToSqliteByWebPath,
  checkDocumentIndexedStatus
};
