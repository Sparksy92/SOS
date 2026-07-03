const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { loadManifest } = require('./manifestService');

const MANIFEST_FILE = path.join(__dirname, '..', 'material_manifest.json');

/**
 * Checks SQLite for actual chunks and indexed status.
 */
const checkDocumentIndexedStatus = (webPath) => {
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
};

/**
 * Audit the manifest against actual SQLite counts.
 */
const auditIndex = () => {
  const manifest = loadManifest();
  const categories = manifest.categories || {};
  
  const mismatched = [];
  let totalAudited = 0;
  let indexedCount = 0;
  let unindexedCount = 0;

  Object.entries(categories).forEach(([catName, filesList]) => {
    filesList.forEach(file => {
      totalAudited++;
      const status = checkDocumentIndexedStatus(file.path);
      
      const manifestFlag = !!file.indexed;
      const actualFlag = status.indexed;
      
      if (actualFlag) {
        indexedCount++;
      } else {
        unindexedCount++;
      }

      if (manifestFlag !== actualFlag || (actualFlag && !status.hasIndexedDocEntry)) {
        mismatched.push({
          name: file.name,
          path: file.path,
          manifestFlag,
          actualFlag,
          chunks: status.chunks,
          hasIndexedDocEntry: status.hasIndexedDocEntry
        });
      }
    });
  });

  return {
    totalAudited,
    indexedCount,
    unindexedCount,
    mismatchedCount: mismatched.length,
    mismatched
  };
};

/**
 * Repair manifest indexed flags based on SQLite status.
 */
const repairIndex = () => {
  if (!fs.existsSync(MANIFEST_FILE)) {
    return { repairedCount: 0, message: "No manifest file found to repair." };
  }

  try {
    const manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
    const categories = manifest.categories || {};
    let repairedCount = 0;

    Object.entries(categories).forEach(([catName, filesList]) => {
      filesList.forEach(file => {
        const status = checkDocumentIndexedStatus(file.path);
        const manifestFlag = !!file.indexed;
        const actualFlag = status.indexed;

        if (manifestFlag !== actualFlag) {
          file.indexed = actualFlag;
          repairedCount++;
        }
      });
    });

    if (repairedCount > 0) {
      fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
      console.log(`[INTEGRITY] Repaired ${repairedCount} manifest index flags.`);
    }

    return {
      repairedCount,
      success: true,
      message: `Audited manifest and repaired ${repairedCount} incorrect index flags.`
    };
  } catch (err) {
    console.error("[INTEGRITY] Repair failed:", err);
    return { repairedCount: 0, success: false, error: err.message };
  }
};

module.exports = {
  checkDocumentIndexedStatus,
  auditIndex,
  repairIndex
};
