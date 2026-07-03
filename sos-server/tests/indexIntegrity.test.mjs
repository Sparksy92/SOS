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
    // Note: We use the mock manifest path we populated in beforeEach
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

});
