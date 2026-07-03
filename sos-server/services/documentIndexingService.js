const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");

const MATERIALS_DIR = path.resolve(__dirname, '..', '..');

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

  const relPath = webPath.replace(/^\/materials\//, '');
  const absolutePath = path.resolve(MATERIALS_DIR, relPath);
  const root = path.resolve(MATERIALS_DIR);

  if (absolutePath !== root && !absolutePath.startsWith(root + path.sep)) {
    throw new Error('Invalid material path');
  }

  return absolutePath;
}

/**
 * Converts filesystem absolute path to web path.
 */
function absolutePathToWebPath(absolutePath) {
  const resolvedAbsolute = path.resolve(absolutePath);
  const resolvedRoot = path.resolve(MATERIALS_DIR);
  
  if (resolvedAbsolute !== resolvedRoot && !resolvedAbsolute.startsWith(resolvedRoot + path.sep)) {
    throw new Error('Path is outside materials directory');
  }
  
  return '/materials/' + path.relative(resolvedRoot, resolvedAbsolute).replace(/\\/g, '/');
}

/**
 * Reads text/pages content from a file (PDF or TXT), checking for high-fidelity OCR markdown first.
 */
async function extractDocumentTextPages(absolutePath) {
  const ext = path.extname(absolutePath).toLowerCase();
  const relPath = path.relative(MATERIALS_DIR, absolutePath);
  const parsed = path.parse(relPath);
  const mdRelPath = path.join(parsed.dir, parsed.name + '.md');
  const mdPath = path.join(MATERIALS_DIR, 'markdown_materials', mdRelPath);

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
  // Delete previous chunks (Blocker 4)
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
