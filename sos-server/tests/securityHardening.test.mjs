import assert from 'node:assert';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const TEST_DB_PATH = path.join(__dirname, 'security_hardening_test.db');
process.env.SOS_DB_PATH = TEST_DB_PATH;

const { 
  resolveMaterialPath, 
  setMaterialsDirOverride,
  isBlockedMaterialPath,
  getMaterialRoot
} = require('../services/materialRootService');

const { db } = require('../db');

test('SOS Security Hardening Test Suite', async (t) => {
  const tempRootDir = path.join(__dirname, 'security_temp_fixture');

  t.before(() => {
    setMaterialsDirOverride(tempRootDir);
  });

  t.after(() => {
    setMaterialsDirOverride(null);
    const { closeDb } = require('../db');
    closeDb();
    const fs = require('fs');
    try {
      if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
      const walFile = TEST_DB_PATH + '-wal';
      const shmFile = TEST_DB_PATH + '-shm';
      if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
      if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
    } catch (e) {}
  });

  await t.test('1. Advanced Path Traversal Defenses', () => {
    // Direct traversal (must throw Out of bounds)
    assert.throws(() => {
      resolveMaterialPath('/materials/../../secrets.env');
    }, /Out of bounds/);

    assert.throws(() => {
      resolveMaterialPath('/materials/..\\..\\secrets.env');
    }, /Out of bounds/);

    // URL-decoded traversal equivalents (once decoded by server)
    assert.throws(() => {
      resolveMaterialPath('/materials/..%2f..%2fsecrets.env');
    }, /Out of bounds|Access denied/);

    // Verify literal url-encoded inputs remain safely inside root bounds
    const resolvedEncoded = resolveMaterialPath('/materials/%252e%252e%252fsecrets.env');
    assert.ok(resolvedEncoded.startsWith(path.resolve(tempRootDir)));
  });

  await t.test('2. Null Byte Injection Block', () => {
    // Null byte injection in string should throw a Null byte detected error
    assert.throws(() => {
      resolveMaterialPath('/materials/safety_guide.txt\0.env');
    }, /Null byte/);

    // Verify url-encoded null byte remains safely within root boundaries
    const resolvedNullUrl = resolveMaterialPath('/materials/safety_guide.txt%00.env');
    assert.ok(resolvedNullUrl.startsWith(path.resolve(tempRootDir)));
  });

  await t.test('3. Database SQL Injection Protection', () => {
    const malformedInput = "'; DROP TABLE document_chunks; --";
    const stmt = db.prepare("SELECT COUNT(*) as count FROM document_chunks WHERE document_path = ?");
    const result = stmt.get(malformedInput);
    
    assert.ok(result);
    assert.strictEqual(typeof result.count, 'number');
    
    const checkTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='document_chunks'");
    assert.ok(checkTable.get());
  });

  await t.test('4. Blocked File Access Rules', () => {
    const blockedFiles = [
      path.join(tempRootDir, '.env'),
      path.join(tempRootDir, '.env.local'),
      path.join(tempRootDir, 'node_modules', 'lodash', 'index.js'),
      path.join(tempRootDir, '.git', 'config'),
      path.join(tempRootDir, 'material_manifest.json'),
      path.join(tempRootDir, 'metadata.json'),
      path.join(tempRootDir, 'some_database.db'),
      path.join(tempRootDir, 'some_sqlite.sqlite')
    ];

    for (const blockedFile of blockedFiles) {
      assert.strictEqual(isBlockedMaterialPath(blockedFile), true, `Should block: ${blockedFile}`);
    }
  });
});
