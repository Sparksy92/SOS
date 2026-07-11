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

const { rebuildManifest, loadManifest, setMaterialsDir } = require('../services/manifestService');
const { extractDocumentTextPages } = require('../services/documentIndexingService');

test('SOS Quality & Data Format Validation Test Suite', async (t) => {
  const tempRootDir = path.join(__dirname, 'quality_temp_fixture');
  const testManifestFile = path.join(__dirname, 'quality_manifest_test.json');

  t.before(() => {
    // Setup mock materials root structure
    if (!fs.existsSync(tempRootDir)) {
      fs.mkdirSync(tempRootDir, { recursive: true });
    }
    
    // Create folders mapping to standard CATEGORY_MAP
    fs.mkdirSync(path.join(tempRootDir, 'The Ark'), { recursive: true });
    fs.mkdirSync(path.join(tempRootDir, 'Great Science Textbooks DVD Library (Entire Collection 88.9 GB)'), { recursive: true });
    
    // Add sample files
    fs.writeFileSync(path.join(tempRootDir, 'The Ark', 'manual.pdf'), 'Mock PDF content');
    fs.writeFileSync(path.join(tempRootDir, 'Great Science Textbooks DVD Library (Entire Collection 88.9 GB)', 'physics.txt'), 'Mock Physics text');
    
    // Apply path override and isolate manifest path
    setMaterialsDir(tempRootDir);
    process.env.SOS_MANIFEST_PATH = testManifestFile;
  });

  t.after(() => {
    // Restore default
    setMaterialsDir(null);
    delete process.env.SOS_MANIFEST_PATH;
    try {
      if (fs.existsSync(testManifestFile)) {
        fs.unlinkSync(testManifestFile);
      }
    } catch (e) {}
    try {
      if (fs.existsSync(tempRootDir)) {
        fs.rmSync(tempRootDir, { recursive: true, force: true });
      }
    } catch (e) {}
  });

  await t.test('1. Directory Scanning & Manifest Rebuilding', () => {
    const manifest = rebuildManifest();
    
    assert.ok(manifest.categories);
    assert.strictEqual(typeof manifest.categories, 'object');
    
    // Verify mapped categories exist as keys
    const categoryKeys = Object.keys(manifest.categories);
    assert.ok(categoryKeys.includes('Survival, Firearm Tactics & Software'));
    assert.ok(categoryKeys.includes('Academic & Science'));
    
    // Verify file count metadata is tracked
    const survivalCategoryFiles = manifest.categories['Survival, Firearm Tactics & Software'];
    assert.ok(survivalCategoryFiles);
    assert.strictEqual(survivalCategoryFiles.length, 1);
    assert.strictEqual(survivalCategoryFiles[0].name, 'manual.pdf');
    assert.strictEqual(survivalCategoryFiles[0].path, '/materials/The Ark/manual.pdf');
  });

  await t.test('2. Manifest Loading Fallbacks', () => {
    // If manifest exists, it should load it
    const manifest = loadManifest();
    assert.ok(manifest);
    assert.strictEqual(typeof manifest.categories, 'object');
  });

  await t.test('3. OCR Output Formatting Standards', () => {
    const mockOcrText = "<!-- PAGE 1 -->\nThis is some OCR'd text.\n<!-- PAGE 2 -->\nSecond page content.";
    const pageRegex = /<!-- PAGE \d+ -->/g;
    const matches = mockOcrText.match(pageRegex);
    
    assert.ok(matches);
    assert.strictEqual(matches.length, 2);
    assert.strictEqual(matches[0], '<!-- PAGE 1 -->');
    assert.strictEqual(matches[1], '<!-- PAGE 2 -->');
  });

  await t.test('4. Markdown File Scanning and Indexing', async () => {
    // 1. Create a mock Markdown file
    const mdFilePath = path.join(tempRootDir, 'The Ark', 'guide.md');
    fs.writeFileSync(mdFilePath, '# Off-Grid Bannock Bread\nIngredients: Flour, water, salt.\nMethod: Mix and bake over coals.');

    // 2. Verify that manifest scanning picks up the .md file
    const manifest = rebuildManifest();
    const survivalCategoryFiles = manifest.categories['Survival, Firearm Tactics & Software'];
    const mdRecord = survivalCategoryFiles.find(f => f.name === 'guide.md');
    assert.ok(mdRecord);
    assert.strictEqual(mdRecord.extension, '.md');

    // 3. Verify that the indexing service can extract text from .md files
    const pages = await extractDocumentTextPages(mdFilePath);
    assert.strictEqual(pages.length, 1);
    assert.ok(pages[0].includes('Off-Grid Bannock Bread'));
    assert.ok(pages[0].includes('bake over coals'));
  });
});
