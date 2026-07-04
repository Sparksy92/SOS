import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import toolkitRouter from '../routes/toolkit.routes.js';

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

// Helper to mock req/res for router testing
function mockReqRes(reqOpts, callback) {
  const req = {
    query: {},
    body: {},
    ...reqOpts
  };

  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      callback(this);
    },
    send(data) {
      this.body = data;
      callback(this);
    }
  };

  return { req, res };
}

// Import catalog, stores, provider registry, and gap analysis
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
import { CONTENT_PROVIDERS } from '../../sos-app/src/modules/toolkit/contentProviderRegistry.js';
import { GAP_ANALYSIS_DATA } from '../../sos-app/src/modules/toolkit/gapAnalysisData.js';

test('Offline Toolkit Catalog Safety Verification', () => {
  assert.ok(OFFLINE_TOOLKIT_CATALOG.length > 0, 'Catalog should contain tool card entries.');
  
  OFFLINE_TOOLKIT_CATALOG.forEach(tool => {
    assert.ok(tool.title);
    assert.ok(tool.description);
    assert.ok(tool.officialUrls && Array.isArray(tool.officialUrls));
    
    // Check against live tracking wording
    if (tool.id === 'osmand' || tool.id === 'meshtastic') {
      const lowerDesc = tool.description.toLowerCase();
      const lowerImportance = tool.offlineImportance.toLowerCase();
      assert.ok(!lowerDesc.includes('live tracking'));
      assert.ok(!lowerImportance.includes('location tracking'));
    }

    tool.officialUrls.forEach(url => {
      assert.ok(!url.includes('theswissbay.ch'), `No Swiss Bay links allowed: ${url}`);
      assert.ok(url.startsWith('https://') || url.startsWith('http://'));
      
      const lowerUrl = url.toLowerCase();
      const forbiddenSuffixes = ['.exe', '.msi', '.dmg', '.pkg', '.zip', '.tar.gz', '.sh', '.bat', '.bin'];
      forbiddenSuffixes.forEach(suffix => {
        assert.ok(!lowerUrl.endsWith(suffix), `No direct executable links: ${url}`);
      });
    });
  });
});

test('Setup Progress Store Verification & Exact Keys', () => {
  mockLocalStorage.clear();

  const initialProgress = loadSetupProgress();
  Object.keys(initialProgress).forEach(id => {
    assert.strictEqual(initialProgress[id], false);
  });

  const updatedProgress = toggleStep(3);
  assert.strictEqual(updatedProgress["3"], true);
  assert.ok('sos_setup_progress' in mockLocalStorage.store);
  assert.ok(!('setup_progress' in mockLocalStorage.store));

  const resetProgress = resetSetupProgress();
  Object.keys(resetProgress).forEach(id => {
    assert.strictEqual(resetProgress[id], false);
  });
});

test('Toolkit Cards Checkmark Persistence & Exact Keys', () => {
  mockLocalStorage.clear();

  const initialMarks = loadToolkitCheckmarks();
  assert.deepStrictEqual(initialMarks, []);

  const updatedMarks = toggleToolkitCheckmark('ollama');
  assert.deepStrictEqual(updatedMarks, ['ollama']);
  assert.ok('sos_toolkit_checkmarks' in mockLocalStorage.store);
  assert.ok(!('toolkit_checkmarks' in mockLocalStorage.store));

  const cleared = resetToolkitCheckmarks();
  assert.deepStrictEqual(cleared, []);
});

test('One-time Fallback Migration Verification', () => {
  mockLocalStorage.clear();

  // setup progress migration
  const oldProgressMock = { "1": true, "2": true };
  mockLocalStorage.setItem('setup_progress', JSON.stringify(oldProgressMock));

  const loadedProgress = loadSetupProgress();
  assert.strictEqual(loadedProgress["1"], true);
  assert.strictEqual(loadedProgress["2"], true);
  assert.ok(!('setup_progress' in mockLocalStorage.store));
  assert.ok('sos_setup_progress' in mockLocalStorage.store);

  // toolkit checkmarks migration
  const oldCheckmarksMock = ['ollama', 'cyberchef'];
  mockLocalStorage.setItem('toolkit_checkmarks', JSON.stringify(oldCheckmarksMock));

  const loadedCheckmarks = loadToolkitCheckmarks();
  assert.deepStrictEqual(loadedCheckmarks, ['ollama', 'cyberchef']);
  assert.ok(!('toolkit_checkmarks' in mockLocalStorage.store));
  assert.ok('sos_toolkit_checkmarks' in mockLocalStorage.store);
});

test('Content Provider Registry Safety Verification', () => {
  assert.ok(CONTENT_PROVIDERS.length > 0);
  CONTENT_PROVIDERS.forEach(provider => {
    assert.strictEqual(provider.supportsAutomaticDownload, false, `Automatic downloads must be false: ${provider.id}`);
    
    provider.officialLinks.forEach(url => {
      assert.ok(!url.includes('theswissbay.ch'), `No Swiss Bay links allowed in providers: ${url}`);
      const lowerUrl = url.toLowerCase();
      const forbiddenSuffixes = ['.exe', '.msi', '.dmg', '.pkg', '.zip', '.tar.gz'];
      forbiddenSuffixes.forEach(suffix => {
        assert.ok(!lowerUrl.endsWith(suffix), `No direct executable links in providers: ${url}`);
      });
    });
  });
});

test('Content Gap Analyzer Safety & Parsing Verification', () => {
  assert.ok(GAP_ANALYSIS_DATA);
  assert.ok(GAP_ANALYSIS_DATA.categoryCoverage.length > 0);
  assert.ok(GAP_ANALYSIS_DATA.candidateItems.length > 0);

  // Verify restricted or unknown-license items are flagged as manual review
  GAP_ANALYSIS_DATA.candidateItems.forEach(item => {
    if (item.licenseStatus === 'restricted' || item.licenseStatus === 'unknown') {
      assert.strictEqual(item.recommendedAction, 'manual_review', `Restricted/unknown items must require manual review: ${item.title}`);
    }
  });
});

test('Toolkit Routes Handler Metadata-Only Verification', () => {
  const stagingHandler = toolkitRouter.stack.find(s => s.route?.path === '/staging').route.stack[0].handle;
  const zimHandler = toolkitRouter.stack.find(s => s.route?.path === '/zim').route.stack[0].handle;

  // Verify staging lists metadata only and does not open file contents
  return new Promise((resolve, reject) => {
    // Create a mock staging file
    const stagingDir = path.resolve('import-staging', 'offline-library');
    if (!fs.existsSync(stagingDir)) {
      fs.mkdirSync(stagingDir, { recursive: true });
    }
    const testFile = path.join(stagingDir, 'FM_21-76_Survival_Manual.pdf');
    fs.writeFileSync(testFile, 'dummy file content');

    const { req, res } = mockReqRes({}, (result) => {
      try {
        assert.strictEqual(result.statusCode, 200);
        assert.ok(Array.isArray(result.body.stagedFiles));
        
        const fileRecord = result.body.stagedFiles.find(f => f.filename === 'FM_21-76_Survival_Manual.pdf');
        assert.ok(fileRecord, 'Staging file should be listed.');
        assert.strictEqual(fileRecord.detectedCategory, 'general_survival');
        assert.strictEqual(fileRecord.licenseStatus, 'official_free');
        assert.strictEqual(fileRecord.sanitizedPath, '[IMPORT_STAGING]/FM_21-76_Survival_Manual.pdf');
        
        // Ensure no actual user home paths or system paths are returned
        result.body.stagedFiles.forEach(f => {
          assert.ok(!f.sanitizedPath.includes('Users'), 'Path should be sanitized');
        });

        // Clean up test file
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
        resolve();
      } catch (err) {
        if (fs.existsSync(testFile)) {
          fs.unlinkSync(testFile);
        }
        reject(err);
      }
    });

    stagingHandler(req, res);
  }).then(() => {
    // Verify ZIM catalog listing ZIM filenames and sanitizing paths
    return new Promise((resolve, reject) => {
      const zimDir = path.resolve('import-staging', 'kiwix');
      if (!fs.existsSync(zimDir)) {
        fs.mkdirSync(zimDir, { recursive: true });
      }
      const testZim = path.join(zimDir, 'wikipedia_en_medicine.zim');
      fs.writeFileSync(testZim, 'dummy zim binary');

      const { req, res } = mockReqRes({ query: { folder: zimDir } }, (result) => {
        try {
          assert.strictEqual(result.statusCode, 200);
          assert.strictEqual(result.body.zimFolder, '[ZIM_FOLDER]');
          assert.ok(Array.isArray(result.body.archives));
          
          const archiveRecord = result.body.archives.find(a => a.filename === 'wikipedia_en_medicine.zim');
          assert.ok(archiveRecord);
          assert.strictEqual(archiveRecord.path, '[ZIM_FOLDER]/wikipedia_en_medicine.zim');
          
          // Ensure no user home directory leak
          result.body.archives.forEach(a => {
            assert.ok(!a.path.includes('Users'));
          });

          if (fs.existsSync(testZim)) {
            fs.unlinkSync(testZim);
          }
          resolve();
        } catch (err) {
          if (fs.existsSync(testZim)) {
            fs.unlinkSync(testZim);
          }
          reject(err);
        }
      });

      zimHandler(req, res);
    });
  });
});
