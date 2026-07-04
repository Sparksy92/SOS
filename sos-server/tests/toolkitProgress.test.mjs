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
    
    // Check against live tracking wording
    if (tool.id === 'osmand' || tool.id === 'meshtastic') {
      const lowerDesc = tool.description.toLowerCase();
      const lowerImportance = tool.offlineImportance.toLowerCase();
      assert.ok(!lowerDesc.includes('live tracking'), 'Should not imply live tracking');
      assert.ok(!lowerImportance.includes('location tracking'), 'Should not imply live location tracking');
    }

    tool.officialUrls.forEach(url => {
      // Must not contain swiss bay mirror
      assert.ok(!url.includes('theswissbay.ch'), `Tool link must not point to Swiss Bay mirror: ${url}`);
      // Must be HTTPS/HTTP
      assert.ok(url.startsWith('https://') || url.startsWith('http://'), `Tool URL should be standard web link: ${url}`);
      // Exposes no executable auto-download actions
      const lowerUrl = url.toLowerCase();
      const forbiddenSuffixes = ['.exe', '.msi', '.dmg', '.pkg', '.zip', '.tar.gz', '.sh', '.bat', '.bin'];
      forbiddenSuffixes.forEach(suffix => {
        assert.ok(!lowerUrl.endsWith(suffix), `Official link should be an information reference page, not a direct auto-download link: ${url}`);
      });
    });
  });
});

test('Setup Progress Store Verification & Exact Keys', () => {
  mockLocalStorage.clear();

  // Test default loading (all should be false initially)
  const initialProgress = loadSetupProgress();
  Object.keys(initialProgress).forEach(id => {
    assert.strictEqual(initialProgress[id], false, `Step ${id} should be false initially.`);
  });

  // Test toggling a step writes to exact keys
  const updatedProgress = toggleStep(3); // Step 3
  assert.strictEqual(updatedProgress["3"], true, 'Step 3 should be true after toggle.');

  // Assert that it writes specifically to the key 'sos_setup_progress'
  assert.ok('sos_setup_progress' in mockLocalStorage.store, 'Should write to sos_setup_progress key');
  
  // Assert that old setup_progress key is NOT created/used for new writes
  assert.ok(!('setup_progress' in mockLocalStorage.store), 'Should not write to old setup_progress key');

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

test('Toolkit Cards Checkmark Persistence & Exact Keys', () => {
  mockLocalStorage.clear();

  // Initial list is empty
  const initialMarks = loadToolkitCheckmarks();
  assert.deepStrictEqual(initialMarks, [], 'Toolkit checkmarks list should start empty.');

  // Toggle a checkmark
  const updatedMarks = toggleToolkitCheckmark('ollama');
  assert.deepStrictEqual(updatedMarks, ['ollama'], 'Kiwix should contain ollama.');

  // Assert that it writes specifically to the key 'sos_toolkit_checkmarks'
  assert.ok('sos_toolkit_checkmarks' in mockLocalStorage.store, 'Should write to sos_toolkit_checkmarks key');

  // Assert that old toolkit_checkmarks key is NOT created/used for new writes
  assert.ok(!('toolkit_checkmarks' in mockLocalStorage.store), 'Should not write to old toolkit_checkmarks key');

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

test('One-time Fallback Migration Verification', () => {
  mockLocalStorage.clear();

  // 1. Setup progress migration
  const oldProgressMock = { "1": true, "2": true };
  mockLocalStorage.setItem('setup_progress', JSON.stringify(oldProgressMock));

  // Load progress - should read from fallback and migrate
  const loadedProgress = loadSetupProgress();
  assert.strictEqual(loadedProgress["1"], true, 'Should successfully load migrated step 1');
  assert.strictEqual(loadedProgress["2"], true, 'Should successfully load migrated step 2');

  // Verify old key is deleted
  assert.ok(!('setup_progress' in mockLocalStorage.store), 'Old setup_progress key should be removed after migration');
  // Verify new key contains the migrated data
  assert.ok('sos_setup_progress' in mockLocalStorage.store, 'Data should be saved in sos_setup_progress');

  // 2. Toolkit checkmarks migration
  const oldCheckmarksMock = ['ollama', 'cyberchef'];
  mockLocalStorage.setItem('toolkit_checkmarks', JSON.stringify(oldCheckmarksMock));

  // Load checkmarks - should read from fallback and migrate
  const loadedCheckmarks = loadToolkitCheckmarks();
  assert.deepStrictEqual(loadedCheckmarks, ['ollama', 'cyberchef'], 'Should successfully migrate checkmarks');

  // Verify old key is deleted
  assert.ok(!('toolkit_checkmarks' in mockLocalStorage.store), 'Old toolkit_checkmarks key should be removed after migration');
  // Verify new key contains the migrated data
  assert.ok('sos_toolkit_checkmarks' in mockLocalStorage.store, 'Data should be saved in sos_toolkit_checkmarks');
});
