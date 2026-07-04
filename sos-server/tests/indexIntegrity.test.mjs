import assert from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Set environment variable for isolated test database
const TEST_DB_PATH = path.join(__dirname, 'index_integrity_test.db');
process.env.SOS_DB_PATH = TEST_DB_PATH;

// Mock manifest file location for services
const TEST_MANIFEST_FILE = path.join(__dirname, '..', 'material_manifest_test.json');

const { db } = require('../db');
const { checkDocumentIndexedStatus, auditIndex, repairIndex } = require('../services/indexIntegrityService');
const { 
  webPathToMaterialAbsolutePath, 
  absolutePathToWebPath, 
  writeDocumentChunksToSqlite 
} = require('../services/documentIndexingService');
const ai = require('../ai');

test('SOS Index Integrity Layer Test Suite', async (t) => {

  // Setup/Clean database and manifest
  t.beforeEach(() => {
    db.exec("DELETE FROM document_chunks");
    db.exec("DELETE FROM indexed_docs");
    
    // Create a dummy manifest file
    const mockManifest = {
      version: 1,
      generatedAt: new Date().toISOString(),
      fileCount: 3,
      categories: {
        'water_treatment': [
          { name: 'Water Filtration.pdf', path: '/materials/CD3WD Extracted Manuals/water_treatment/filtration.pdf', indexed: false },
          { name: 'Sanitization.pdf', path: '/materials/CD3WD Extracted Manuals/water_treatment/sanitization.pdf', indexed: true } // Mismatched (flagged true but chunks=0)
        ],
        'cooking': [
          { name: 'Cookbook.pdf', path: '/materials/cook.pdf', indexed: false } // Correctly unindexed
        ]
      }
    };
    fs.writeFileSync(TEST_MANIFEST_FILE, JSON.stringify(mockManifest, null, 2));
  });

  t.after(() => {
    // Cleanup files
    try {
      if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
      if (fs.existsSync(TEST_MANIFEST_FILE)) fs.unlinkSync(TEST_MANIFEST_FILE);
    } catch (e) {}
  });

  await t.test('1. checkDocumentIndexedStatus detects correctly based on SQLite table contents', () => {
    const webPath = '/materials/CD3WD Extracted Manuals/water_treatment/filtration.pdf';
    
    // Initial status: not indexed
    const status1 = checkDocumentIndexedStatus(webPath);
    assert.strictEqual(status1.indexed, false);
    assert.strictEqual(status1.chunks, 0);

    // Insert chunks only (no index doc entry)
    const insertChunk = db.prepare("INSERT INTO document_chunks (document_path, chunk_index, content) VALUES (?, ?, ?)");
    insertChunk.run(webPath, 0, "Emergency sand gravel filter.");
    
    const status2 = checkDocumentIndexedStatus(webPath);
    assert.strictEqual(status2.indexed, false); // False because hasIndexedDocEntry is still false!
    assert.strictEqual(status2.chunks, 1);

    // Add index doc entry
    const markIndexed = db.prepare("INSERT INTO indexed_docs (path, indexed_at) VALUES (?, ?)");
    markIndexed.run(webPath, new Date().toISOString());

    const status3 = checkDocumentIndexedStatus(webPath);
    assert.strictEqual(status3.indexed, true); // Now true!
    assert.strictEqual(status3.chunks, 1);
  });

  await t.test('2. Audit detects mismatched manifest flags correctly', () => {
    // water_treatment/sanitization.pdf is flagged true in manifest, but chunks=0 in SQLite
    // water_treatment/filtration.pdf is flagged false in manifest, but has chunks=1 and entry in SQLite
    const webPathFiltration = '/materials/CD3WD Extracted Manuals/water_treatment/filtration.pdf';
    
    // Setup filtration as indexed
    const insertChunk = db.prepare("INSERT INTO document_chunks (document_path, chunk_index, content) VALUES (?, ?, ?)");
    insertChunk.run(webPathFiltration, 0, "Emergency sand filter.");
    const markIndexed = db.prepare("INSERT INTO indexed_docs (path, indexed_at) VALUES (?, ?)");
    markIndexed.run(webPathFiltration, new Date().toISOString());

    // Override service manifest file path for testing
    const originalManifestFile = path.join(__dirname, '..', 'material_manifest.json');
    
    // Backup and overwrite
    try {
      if (fs.existsSync(originalManifestFile)) {
        fs.renameSync(originalManifestFile, originalManifestFile + '.bak');
      }
      fs.writeFileSync(originalManifestFile, fs.readFileSync(TEST_MANIFEST_FILE));

      const report = auditIndex();
      
      assert.strictEqual(report.totalAudited, 3);
      assert.strictEqual(report.indexedCount, 1); // filtration
      assert.strictEqual(report.mismatchedCount, 2); // filtration (actual true, manifest false) and sanitization (actual false, manifest true)
      
      // Repair index
      const repairResult = repairIndex();
      assert.strictEqual(repairResult.repairedCount, 2);
      
      // Re-audit to verify sync
      const freshReport = auditIndex();
      assert.strictEqual(freshReport.mismatchedCount, 0);

    } finally {
      // Restore backup
      if (fs.existsSync(originalManifestFile + '.bak')) {
        fs.renameSync(originalManifestFile + '.bak', originalManifestFile);
      } else {
        try { fs.unlinkSync(originalManifestFile); } catch (e) {}
      }
    }
  });

  await t.test('3. Auto-crawler flag is checked and stays off by default', () => {
    const autoCrawlEnv = process.env.SOS_AUTO_CRAWL === 'true';
    assert.strictEqual(autoCrawlEnv, false); // Config default check
  });

  await t.test('4. webPathToMaterialAbsolutePath validates materials path and blocks traversal', () => {
    // Correct paths resolve correctly
    const abs = webPathToMaterialAbsolutePath('/materials/cook.pdf');
    assert.ok(abs.endsWith('cook.pdf'));

    // Non-/materials path throws error
    assert.throws(() => {
      webPathToMaterialAbsolutePath('/unauthorized/cook.pdf');
    }, /must start with \/materials\//);

    // Traversal attempts throw error
    assert.throws(() => {
      webPathToMaterialAbsolutePath('/materials/../../sos-server/index.js');
    }, /Invalid material path/);
  });

  await t.test('5. writeDocumentChunksToSqlite replaces chunks and prevents duplicates', () => {
    const webPath = '/materials/cook.pdf';
    
    // Write initially
    writeDocumentChunksToSqlite(webPath, ["Page 1 text", "Page 2 text"]);
    let status = checkDocumentIndexedStatus(webPath);
    assert.strictEqual(status.chunks, 2);

    // Re-indexing replaces the chunks rather than appending duplicates
    writeDocumentChunksToSqlite(webPath, ["New Page 1 text"]);
    status = checkDocumentIndexedStatus(webPath);
    assert.strictEqual(status.chunks, 1); // Shrunk to 1, no duplicate entries!
  });

  await t.test('6. zero-chunk indexed_docs entries get repaired by re-indexing', () => {
    const webPath = '/materials/CD3WD Extracted Manuals/water_treatment/sanitization.pdf';

    // Simulated broken state: has index entry but 0 chunks
    const markIndexed = db.prepare("INSERT INTO indexed_docs (path, indexed_at) VALUES (?, ?)");
    markIndexed.run(webPath, new Date().toISOString());

    let status = checkDocumentIndexedStatus(webPath);
    assert.strictEqual(status.indexed, false); // False because chunkCount is 0!

    // Simulated re-indexing logic
    writeDocumentChunksToSqlite(webPath, ["Sanitizing water with chlorine."]);
    status = checkDocumentIndexedStatus(webPath);
    assert.strictEqual(status.indexed, true);
    assert.strictEqual(status.chunks, 1);
  });

  await t.test('7. indexFile returns success and warning on vector store failure if SQLite succeeded', async () => {
    // Mock HNSWLib to force failure
    const { HNSWLib } = require("@langchain/community/vectorstores/hnswlib");
    const { getMaterialRoot } = require('../services/materialRootService');
    const originalLoad = HNSWLib.load;
    const originalFromDocuments = HNSWLib.fromDocuments;
    
    HNSWLib.load = () => Promise.reject(new Error("Mock load failure"));
    HNSWLib.fromDocuments = () => Promise.reject(new Error("Mock fromDocuments failure"));

    // Create a temporary text file to index under the safe material root
    const materialsRoot = getMaterialRoot();
    const tempFile = path.join(materialsRoot, 'temp_test_doc.txt');
    fs.writeFileSync(tempFile, 'Emergency sanitation guidelines.');

    try {
      // Execute indexing. It should write to SQLite successfully even if Ollama vector store fails
      const result = await ai.indexFile(tempFile);
      
      assert.strictEqual(result.success, true);
      assert.strictEqual(result.sqliteIndexed, true);
      assert.strictEqual(result.vectorIndexed, false); // False because HNSWLib is mocked to fail
      assert.ok(result.vectorWarning.includes('Vector store update failed'));

      // Check SQLite chunks are present
      const webPath = '/materials/' + path.relative(materialsRoot, tempFile).replace(/\\/g, '/');
      const status = checkDocumentIndexedStatus(webPath);
      assert.strictEqual(status.indexed, true);
      assert.strictEqual(status.chunks, 1);
    } finally {
      // Restore HNSWLib methods
      HNSWLib.load = originalLoad;
      HNSWLib.fromDocuments = originalFromDocuments;
      if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
    }
  });

});
