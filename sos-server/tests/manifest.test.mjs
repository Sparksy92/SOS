import assert from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

process.env.SOS_MANIFEST_PATH = path.join(__dirname, 'manifest_test.json');
process.env.SOS_METADATA_PATH = path.join(__dirname, 'metadata_test.json');

import pkg from '../services/manifestService.js';
const { loadManifest, rebuildManifest, setMaterialsDir } = pkg;

test('Manifest Service - rebuild and load manifest using isolated mock directory', () => {
  // Create an isolated temp directory for materials
  const tempDir = path.join(__dirname, 'temp-test-materials');
  
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir, { recursive: true });

  // Create mock categories and files
  const atlDir = path.join(tempDir, 'ATL');
  const arkDir = path.join(tempDir, 'The Ark');
  const miscDir = path.join(tempDir, 'Uncategorized');

  fs.mkdirSync(atlDir, { recursive: true });
  fs.mkdirSync(arkDir, { recursive: true });
  fs.mkdirSync(miscDir, { recursive: true });

  fs.writeFileSync(path.join(atlDir, 'farming.pdf'), 'farming content');
  fs.writeFileSync(path.join(arkDir, 'tactics.txt'), 'tactics content');
  fs.writeFileSync(path.join(miscDir, 'video.mp4'), 'video content');

  // Override manifest service materials directory to our isolated mock folder
  setMaterialsDir(tempDir);

  try {
    // Rebuild the manifest
    const manifest = rebuildManifest();

    assert.ok(manifest);
    assert.strictEqual(manifest.version, 1);
    assert.ok(manifest.generatedAt);
    assert.strictEqual(manifest.root, tempDir);
    assert.strictEqual(manifest.fileCount, 3);
    assert.strictEqual(manifest.totalFiles, 3);
    assert.ok(manifest.categories);
    assert.ok(fs.existsSync(pkg.MANIFEST_FILE));

    // Verify categories mapping
    const categories = Object.keys(manifest.categories);
    assert.ok(categories.includes('Applied Technology & Agriculture'));
    assert.ok(categories.includes('Survival, Firearm Tactics & Software'));
    assert.ok(categories.includes('General Materials'));

    // Check Applied Technology & Agriculture file shape
    const atlFiles = manifest.categories['Applied Technology & Agriculture'];
    assert.strictEqual(atlFiles.length, 1);
    const file = atlFiles[0];
    assert.strictEqual(file.name, 'farming.pdf');
    assert.strictEqual(file.path, '/materials/ATL/farming.pdf');
    assert.strictEqual(file.extension, '.pdf');
    assert.strictEqual(file.rawCategory, 'ATL');
    assert.strictEqual(file.category, 'Applied Technology & Agriculture');
    assert.ok(Array.isArray(file.subdirectories));
    assert.strictEqual(typeof file.size, 'number');
    assert.strictEqual(typeof file.mtime, 'number');
    assert.ok('riskCategory' in file);
    assert.ok('indexed' in file);
    assert.ok('metadata' in file);

    // Verify General Materials file shape
    const generalFiles = manifest.categories['General Materials'];
    assert.strictEqual(generalFiles.length, 1);
    assert.strictEqual(generalFiles[0].name, 'video.mp4');

    // Load manifest should load successfully from cache
    const loaded = loadManifest();
    assert.strictEqual(loaded.timestamp, manifest.timestamp);
    assert.strictEqual(loaded.manifestReady, true);
  } finally {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Restore default MATERIALS_DIR
    setMaterialsDir(path.join(__dirname, '..', '..'));
    // Clean up test manifest files
    try {
      if (fs.existsSync(process.env.SOS_MANIFEST_PATH)) fs.unlinkSync(process.env.SOS_MANIFEST_PATH);
      if (fs.existsSync(process.env.SOS_METADATA_PATH)) fs.unlinkSync(process.env.SOS_METADATA_PATH);
    } catch (e) {}
  }
});
