import assert from 'node:assert';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const { 
  resolveMaterialPath, 
  setMaterialsDirOverride,
  absoluteToMaterialWebPath
} = require('../services/materialRootService');

test('SOS Path & Environment Compatibility Test Suite', async (t) => {
  const tempRootDir = path.join(__dirname, 'path_temp_fixture');

  t.before(() => {
    setMaterialsDirOverride(tempRootDir);
  });

  t.after(() => {
    setMaterialsDirOverride(null);
  });

  await t.test('1. Spaces in Paths Resolution', () => {
    const relativePathWithSpaces = 'Medical and First Aid Guides/Trauma Care Manual.pdf';
    const resolved = resolveMaterialPath('/materials/' + relativePathWithSpaces);
    
    const expected = path.resolve(tempRootDir, relativePathWithSpaces);
    assert.strictEqual(resolved, expected);
  });

  await t.test('2. Unicode & Multi-lingual Characters in Paths', () => {
    const unicodeRelativePath = 'Botanicals_植物学/Foraging_野外採集_Guide.pdf';
    const resolved = resolveMaterialPath('/materials/' + unicodeRelativePath);
    
    const expected = path.resolve(tempRootDir, unicodeRelativePath);
    assert.strictEqual(resolved, expected);
  });

  await t.test('3. Mixed Cross-Platform Slashes', () => {
    // Frontslashes to Backslashes equivalence check
    const mixedPathWeb = '/materials/subfolder\\another-sub/file.pdf';
    const resolved = resolveMaterialPath(mixedPathWeb);
    
    const expected = path.resolve(tempRootDir, 'subfolder', 'another-sub', 'file.pdf');
    assert.strictEqual(resolved, expected);
  });

  await t.test('4. Web Path Translation Roundtrip', () => {
    const relativePath = 'Survival Guides/Firemaking/techniques.txt';
    const absPath = path.resolve(tempRootDir, relativePath);
    
    const webPath = absoluteToMaterialWebPath(absPath);
    assert.strictEqual(webPath, '/materials/Survival Guides/Firemaking/techniques.txt');

    const resolvedBack = resolveMaterialPath(webPath);
    assert.strictEqual(resolvedBack, absPath);
  });
});
