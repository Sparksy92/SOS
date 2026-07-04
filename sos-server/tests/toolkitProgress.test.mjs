import test from 'node:test';
import assert from 'node:assert';

// Polyfill localStorage for testing the store in Node.js
const mockLocalStorage = {
  store: {},
  getItem(key) {
    return this.store[key] || null;
  },
  setItem(key, value) {
    this.store[key] = String(value);
  },
  removeItem(key) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  }
};
global.localStorage = mockLocalStorage;

// Import catalog and stores using ES module relative paths
import { OFFLINE_TOOLKIT_CATALOG } from '../../sos-app/src/modules/toolkit/offlineToolkitCatalog.js';
import { 
  loadSetupProgress, 
  saveSetupProgress, 
  toggleStep, 
  resetSetupProgress,
  loadToolkitCheckmarks,
  saveToolkitCheckmarks,
  toggleToolkitCheckmark,
  resetToolkitCheckmarks
} from '../../sos-app/src/modules/toolkit/setupProgressStore.js';

test('Offline Toolkit Catalog Safety Verification', () => {
  assert.ok(OFFLINE_TOOLKIT_CATALOG.length > 0, 'Catalog should contain tool card entries.');
  
  // Verify that all cards contain official links and no Swiss Bay mirror URLs
  OFFLINE_TOOLKIT_CATALOG.forEach(tool => {
    assert.ok(tool.title, 'Tool should have a title.');
    assert.ok(tool.description, 'Tool should have a description.');
    assert.ok(tool.officialUrls && Array.isArray(tool.officialUrls), 'Tool should have an officialUrls array.');
    
    tool.officialUrls.forEach(url => {
      // Must not contain swiss bay mirror
      assert.ok(!url.includes('theswissbay.ch'), `Tool link must not point to Swiss Bay mirror: ${url}`);
      // Must be HTTPS/HTTP
      assert.ok(url.startsWith('https://') || url.startsWith('http://'), `Tool URL should be standard web link: ${url}`);
      // Exposes no executable auto-download actions
      const lowerUrl = url.lowerCase ? url.lowerCase() : url.toLowerCase();
      const forbiddenSuffixes = ['.exe', '.msi', '.dmg', '.pkg', '.zip', '.tar.gz', '.sh', '.bat', '.bin'];
      forbiddenSuffixes.forEach(suffix => {
        assert.ok(!lowerUrl.endsWith(suffix), `Official link should be an information reference page, not a direct auto-download link: ${url}`);
      });
    });
  });
});

test('Setup Progress Store Verification', () => {
  mockLocalStorage.clear();

  // Test default loading (all should be false initially)
  const initialProgress = loadSetupProgress();
  Object.keys(initialProgress).forEach(id => {
    assert.strictEqual(initialProgress[id], false, `Step ${id} should be false initially.`);
  });

  // Test toggling a step
  const updatedProgress = toggleStep(3); // Step 3
  assert.strictEqual(updatedProgress["3"], true, 'Step 3 should be true after toggle.');

  // Test toggling back
  const toggledBack = toggleStep(3);
  assert.strictEqual(toggledBack["3"], false, 'Step 3 should return to false after second toggle.');

  // Test resetting
  toggleStep(1);
  toggleStep(5);
  const resetProgress = resetSetupProgress();
  Object.keys(resetProgress).forEach(id => {
    assert.strictEqual(resetProgress[id], false, `Step ${id} should be false after reset.`);
  });
});

test('Toolkit Cards Checkmark Persistence Verification', () => {
  mockLocalStorage.clear();

  // Initial list is empty
  const initialMarks = loadToolkitCheckmarks();
  assert.deepStrictEqual(initialMarks, [], 'Toolkit checkmarks list should start empty.');

  // Toggle a checkmark
  const updatedMarks = toggleToolkitCheckmark('ollama');
  assert.deepStrictEqual(updatedMarks, ['ollama'], 'Kiwix should contain ollama.');

  // Toggle another
  const doubleMarks = toggleToolkitCheckmark('kiwix');
  assert.ok(doubleMarks.includes('ollama'));
  assert.ok(doubleMarks.includes('kiwix'));

  // Toggle off
  const singleMark = toggleToolkitCheckmark('ollama');
  assert.deepStrictEqual(singleMark, ['kiwix'], 'Only kiwix should remain.');

  // Reset
  const cleared = resetToolkitCheckmarks();
  assert.deepStrictEqual(cleared, [], 'Toolkit checkmarks should be empty after reset.');
});
