import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Polyfill localStorage for testing in Node.js
const mockLocalStorage = {
  store: {},
  get length() {
    return Object.keys(this.store).length;
  },
  key(index) {
    return Object.keys(this.store)[index] || null;
  },
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

// Import store elements
import { BACKUP_KEYS_REGISTRY } from '../../sos-app/src/modules/toolkit/offlineToolkitBackupRegistry.js';
import { 
  createOfflineToolkitBackup, 
  validateOfflineToolkitBackup, 
  previewOfflineToolkitBackup, 
  restoreOfflineToolkitBackup, 
  generateOfflineToolkitBackupMarkdown, 
  runOfflineToolkitIntegrityAudit,
  resetOfflineToolkitProfile,
  loadOfflineToolkitDemoData
} from '../../sos-app/src/modules/toolkit/offlineToolkitBackupStore.js';

test('Backup Registry Checks', () => {
  // Check that expected keys are registered
  const keys = BACKUP_KEYS_REGISTRY.map(r => r.key);
  assert.ok(keys.includes('sos_setup_progress'));
  assert.ok(keys.includes('sos_toolkit_checkmarks'));
  assert.ok(keys.includes('sos_import_approval_ledger'));
  assert.ok(keys.includes('sos_acquisition_queue'));
  assert.ok(keys.includes('sos_source_allowlist'));
  assert.ok(keys.includes('missions'));
});

test('Backup Structure & Schema Version 3', () => {
  mockLocalStorage.clear();

  mockLocalStorage.setItem('sos_setup_progress', JSON.stringify({ step: 1 }));
  mockLocalStorage.setItem('sos_import_approval_ledger', JSON.stringify([{ filename: "FM_21-76.pdf", operatorDecision: "approved" }]));
  mockLocalStorage.setItem('sos_acquisition_queue', JSON.stringify([{ title: "Survival guide", acquisitionStatus: "planned" }]));
  mockLocalStorage.setItem('sos_source_allowlist', JSON.stringify([{ label: "IA", officialSourceUrl: "https://archive.org" }]));
  mockLocalStorage.setItem('missions', JSON.stringify([{ id: "m_01", createdAt: new Date().toISOString() }]));
  mockLocalStorage.setItem('some_unknown_key', "confidential data");

  const backup = createOfflineToolkitBackup();

  assert.strictEqual(backup.backupType, "survivalos_offline_toolkit_backup");
  assert.strictEqual(backup.schemaVersion, 3);
  assert.strictEqual(backup.includesMaterialFiles, false);
  assert.strictEqual(backup.includesCloudSync, false);

  // Contains registered records
  assert.ok(backup.records.sos_setup_progress);
  assert.strictEqual(backup.records.sos_import_approval_ledger.length, 1);
  assert.strictEqual(backup.records.sos_acquisition_queue.length, 1);
  assert.strictEqual(backup.records.sos_source_allowlist.length, 1);
  assert.strictEqual(backup.records.missions.length, 1);

  // Does NOT contain unknown keys
  assert.strictEqual(backup.records.some_unknown_key, undefined);
});

test('Backup Validation Logic (Rejections & Path Rules)', () => {
  // Reject invalid JSON
  const invalidJsonRes = validateOfflineToolkitBackup("corrupt-data");
  assert.strictEqual(invalidJsonRes.valid, false);
  assert.match(invalidJsonRes.error, /is not a valid JSON string/);

  // Reject unknown keys by default
  const badKeys = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: {
      unknown_secret_key: { data: 123 }
    }
  };
  const keysRes = validateOfflineToolkitBackup(badKeys);
  assert.strictEqual(keysRes.valid, false);
  assert.match(keysRes.error, /Unknown key "unknown_secret_key" detected/);

  // Ignore unknown keys with warning if ignoreUnknown enabled
  const keysIgnoreRes = validateOfflineToolkitBackup(badKeys, { ignoreUnknown: true });
  assert.strictEqual(keysIgnoreRes.valid, true);
  assert.ok(keysIgnoreRes.warnings.some(w => w.includes("Ignored unknown key")));

  // Reject unsupported schemaVersion
  const badVersion = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 4,
    records: {}
  };
  const versionRes = validateOfflineToolkitBackup(badVersion);
  assert.strictEqual(versionRes.valid, false);
  assert.match(versionRes.error, /higher than supported version/);

  // Reject dangerous URL schemes
  const badScheme = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: {
      sos_source_allowlist: [
        {
          label: "Attack",
          officialSourceUrl: "javascript:alert(1)"
        }
      ]
    }
  };
  const schemeRes = validateOfflineToolkitBackup(badScheme);
  assert.strictEqual(schemeRes.valid, false);
  assert.match(schemeRes.error, /Dangerous URL scheme injection detected/);

  // Reject absolute paths
  const badPath = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: {
      sos_import_approval_ledger: [
        {
          filename: "C:/Users/operator/secret.pdf",
          operatorDecision: "approved"
        }
      ]
    }
  };
  const pathRes = validateOfflineToolkitBackup(badPath);
  assert.strictEqual(pathRes.valid, false);
  assert.match(pathRes.error, /Absolute paths are not allowed/);

  // Reject executable scripts
  const badScript = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: {
      sos_acquisition_queue: [
        {
          title: "Guide <script>alert(1)</script>",
          acquisitionStatus: "planned"
        }
      ]
    }
  };
  const scriptRes = validateOfflineToolkitBackup(badScript);
  assert.strictEqual(scriptRes.valid, false);
  assert.match(scriptRes.error, /Executable scripting strings detected/);

  // 1. Validation rejects object for sos_import_approval_ledger
  const badLedgerType = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_import_approval_ledger: { badObj: true } }
  };
  const ledgerTypeRes = validateOfflineToolkitBackup(badLedgerType);
  assert.strictEqual(ledgerTypeRes.valid, false);
  assert.match(ledgerTypeRes.error, /expected array/);

  // 2. Validation rejects object for sos_acquisition_queue
  const badQueueType = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_acquisition_queue: { badObj: true } }
  };
  const queueTypeRes = validateOfflineToolkitBackup(badQueueType);
  assert.strictEqual(queueTypeRes.valid, false);
  assert.match(queueTypeRes.error, /expected array/);

  // 3. Validation rejects object for sos_source_allowlist
  const badAllowlistType = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_source_allowlist: { badObj: true } }
  };
  const allowlistTypeRes = validateOfflineToolkitBackup(badAllowlistType);
  assert.strictEqual(allowlistTypeRes.valid, false);
  assert.match(allowlistTypeRes.error, /expected array/);

  // 4. Validation rejects array for sos_setup_progress
  const badSetupType = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_setup_progress: [1, 2, 3] }
  };
  const setupTypeRes = validateOfflineToolkitBackup(badSetupType);
  assert.strictEqual(setupTypeRes.valid, false);
  assert.match(setupTypeRes.error, /expected object/);

  // 5. Validation rejects ledger record missing filename
  const missingLedgerFilename = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_import_approval_ledger: [{ operatorDecision: "approved" }] }
  };
  const ledgerFilenameRes = validateOfflineToolkitBackup(missingLedgerFilename);
  assert.strictEqual(ledgerFilenameRes.valid, false);
  assert.match(ledgerFilenameRes.error, /missing "filename"/);

  // 6. Validation rejects ledger record with invalid operatorDecision
  const badLedgerDecision = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_import_approval_ledger: [{ filename: "x.pdf", operatorDecision: "something_else" }] }
  };
  const ledgerDecisionRes = validateOfflineToolkitBackup(badLedgerDecision);
  assert.strictEqual(ledgerDecisionRes.valid, false);
  assert.match(ledgerDecisionRes.error, /invalid "operatorDecision"/);

  // 7. Validation rejects queue record missing title
  const missingQueueTitle = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_acquisition_queue: [{ acquisitionStatus: "planned" }] }
  };
  const queueTitleRes = validateOfflineToolkitBackup(missingQueueTitle);
  assert.strictEqual(queueTitleRes.valid, false);
  assert.match(queueTitleRes.error, /missing "title"/);

  // 8. Validation rejects queue record with invalid acquisitionStatus
  const badQueueStatus = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_acquisition_queue: [{ title: "x", acquisitionStatus: "something_else" }] }
  };
  const queueStatusRes = validateOfflineToolkitBackup(badQueueStatus);
  assert.strictEqual(queueStatusRes.valid, false);
  assert.match(queueStatusRes.error, /invalid "acquisitionStatus"/);

  // 9. Validation rejects allowlist record missing label
  const missingAllowlistLabel = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: { sos_source_allowlist: [{ officialSourceUrl: "https://x.com" }] }
  };
  const allowlistLabelRes = validateOfflineToolkitBackup(missingAllowlistLabel);
  assert.strictEqual(allowlistLabelRes.valid, false);
  assert.match(allowlistLabelRes.error, /missing "label"/);
});

test('Preview Mode Independence', () => {
  mockLocalStorage.clear();

  const backupData = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: {
      sos_setup_progress: { step: 12 }
    }
  };

  // Previewing must NOT write to localStorage
  const preview = previewOfflineToolkitBackup(JSON.stringify(backupData));
  assert.strictEqual(preview.keysRecognized.includes('sos_setup_progress'), true);
  assert.strictEqual(mockLocalStorage.getItem('sos_setup_progress'), null);
});

test('Restore Options (Merge vs Replace Confirmations)', () => {
  mockLocalStorage.clear();

  // Populate local storage
  mockLocalStorage.setItem('sos_acquisition_queue', JSON.stringify([
    { id: "q_01", title: "Original Local Item", acquisitionStatus: "planned", updatedAt: "2026-07-01T00:00:00Z" }
  ]));

  const backupData = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: {
      sos_acquisition_queue: [
        { id: "q_01", title: "Imported New Item", acquisitionStatus: "manually_staged", updatedAt: "2026-07-04T00:00:00Z" },
        { id: "q_02", title: "Additional Item", acquisitionStatus: "planned", updatedAt: "2026-07-04T00:00:00Z" }
      ]
    }
  };

  // Merge Mode preserves local entries and updates conflicts if newer
  restoreOfflineToolkitBackup(JSON.stringify(backupData), { mode: 'merge' });
  const merged = JSON.parse(mockLocalStorage.getItem('sos_acquisition_queue'));
  assert.strictEqual(merged.length, 2);
  const q01 = merged.find(x => x.id === "q_01");
  assert.strictEqual(q01.title, "Imported New Item"); // Updated because imported is newer

  // Replace Mode requires typed phrase confirmation
  assert.throws(() => {
    restoreOfflineToolkitBackup(JSON.stringify(backupData), { mode: 'replace_known_keys', typedConfirm: 'WRONG PHRASE' });
  }, /Typed confirmation phrase mismatch/);

  // Correct typed phrase overwrites
  restoreOfflineToolkitBackup(JSON.stringify(backupData), { mode: 'replace_known_keys', typedConfirm: 'RESTORE TOOLKIT BACKUP' });
  const replaced = JSON.parse(mockLocalStorage.getItem('sos_acquisition_queue'));
  assert.strictEqual(replaced.length, 2);

  // 10. restore blocks wrong expected type even if called directly
  const badTypeDirect = {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    records: {
      sos_setup_progress: [1, 2, 3] // array when expected object
    }
  };
  assert.throws(() => {
    restoreOfflineToolkitBackup(JSON.stringify(badTypeDirect), { mode: 'merge', ignoreUnknown: true });
  }, /expected object/);
  assert.throws(() => {
    restoreOfflineToolkitBackup(JSON.stringify(badTypeDirect), { mode: 'replace_known_keys', typedConfirm: 'RESTORE TOOLKIT BACKUP', ignoreUnknown: true });
  }, /expected object/);
});

test('Integrity Audit Auditing Rules', () => {
  mockLocalStorage.clear();

  // 1. Corrupt JSON detection
  mockLocalStorage.setItem('sos_import_approval_ledger', "corrupt-non-json");
  const auditCorrupt = runOfflineToolkitIntegrityAudit();
  assert.strictEqual(auditCorrupt.status, "error");
  assert.ok(auditCorrupt.findings.some(f => f.message.includes("Corrupt JSON layout")));

  // 2. Invalid Ledger/Queue record detection
  mockLocalStorage.clear();
  mockLocalStorage.setItem('sos_import_approval_ledger', JSON.stringify([
    { missingFields: true }
  ]));
  mockLocalStorage.setItem('sos_acquisition_queue', JSON.stringify([
    { title: "Queued", acquisitionStatus: "auto_downloaded_status" }
  ]));

  const auditFields = runOfflineToolkitIntegrityAudit();
  assert.strictEqual(auditFields.status, "error");
  assert.ok(auditFields.findings.some(f => f.message.includes("missing filename or operatorDecision")));
  assert.ok(auditFields.findings.some(f => f.message.includes("contains invalid acquisitionStatus")));

  // 3. Dangerous Allowlist URL checks
  mockLocalStorage.clear();
  mockLocalStorage.setItem('sos_source_allowlist', JSON.stringify([
    { label: "Evil Source", officialSourceUrl: "javascript:alert('xss')" }
  ]));
  const auditAllowlist = runOfflineToolkitIntegrityAudit();
  assert.strictEqual(auditAllowlist.status, "error");
  assert.ok(auditAllowlist.findings.some(f => f.message.includes("contains dangerous URL scheme")));

  // 4. Duplicate legacy/canonical keys & unknown sos_ keys check
  mockLocalStorage.clear();
  mockLocalStorage.setItem('saved_answers', JSON.stringify([{ id: "1", createdAt: new Date().toISOString() }]));
  mockLocalStorage.setItem('sos_saved_answers', JSON.stringify([{ id: "2", createdAt: new Date().toISOString() }]));
  mockLocalStorage.setItem('sos_unregistered_key', JSON.stringify({ data: 123 }));

  const auditDupes = runOfflineToolkitIntegrityAudit();
  assert.strictEqual(auditDupes.status, "warning");
  assert.ok(auditDupes.findings.some(f => f.message.includes("Duplicate keys found")));
  assert.ok(auditDupes.findings.some(f => f.message.includes("Unknown localStorage key beginning with sos_")));
});

test('Backup UI & Ranger safety audits', () => {
  const uiPath = path.resolve('sos-app', 'src', 'components', 'toolkit', 'OfflineToolkitBackupPanel.jsx');
  const uiContent = fs.readFileSync(uiPath, 'utf8');

  // UI buttons guardrails
  assert.ok(!uiContent.includes("Cloud Backup"));
  assert.ok(!uiContent.includes("Sync Now"));
  assert.ok(!uiContent.includes("Upload"));
  assert.ok(!uiContent.includes("Download Materials"));

  // Ranger guidance checks
  const appPath = path.resolve('sos-app', 'src', 'App.jsx');
  const appContent = fs.readFileSync(appPath, 'utf8');
  assert.ok(appContent.includes("backup my offline toolkit"));
  assert.ok(appContent.includes("run toolkit integrity audit"));
  assert.ok(!appContent.includes('text += "I synced'), "Ranger must not say 'I synced'");
});

test('Demo Data & Reset Profile Hardening Checks', () => {
  // 1. loadOfflineToolkitDemoData requires LOAD DEMO DATA
  assert.throws(() => {
    loadOfflineToolkitDemoData('INVALID PHRASE');
  }, /must match 'LOAD DEMO DATA' exactly/);

  // 2. load demo data succeeds and sets valid keys
  mockLocalStorage.clear();
  loadOfflineToolkitDemoData('LOAD DEMO DATA');

  const ledgerRaw = mockLocalStorage.getItem('sos_import_approval_ledger');
  const acqRaw = mockLocalStorage.getItem('sos_acquisition_queue');
  const allowlistRaw = mockLocalStorage.getItem('sos_source_allowlist');

  assert.ok(ledgerRaw, "ledger key should exist");
  assert.ok(acqRaw, "acq key should exist");
  assert.ok(allowlistRaw, "allowlist key should exist");

  const ledger = JSON.parse(ledgerRaw);
  const acq = JSON.parse(acqRaw);
  const allowlist = JSON.parse(allowlistRaw);

  // demo ledger record has filename
  assert.ok(ledger[0].filename, "ledger record should have filename");
  // demo ledger record has operatorDecision
  assert.ok(ledger[0].operatorDecision, "ledger record should have operatorDecision");
  // demo ledger operatorDecision is not approved
  assert.notStrictEqual(ledger[0].operatorDecision, "approved", "ledger decision should not be approved");
  // demo ledger operatorVerifiedSource is false
  assert.strictEqual(ledger[0].operatorVerifiedSource, false, "operatorVerifiedSource should be false");

  // demo acquisition queue record has acquisitionStatus
  assert.ok(acq[0].acquisitionStatus, "acquisition record should have acquisitionStatus");
  // demo acquisitionStatus is planned
  assert.strictEqual(acq[0].acquisitionStatus, "planned", "acquisitionStatus should be planned");

  // demo allowlist record has label
  assert.ok(allowlist[0].label, "allowlist record should have label");
  // demo allowlist operatorTrusted is false
  assert.strictEqual(allowlist[0].operatorTrusted, false, "operatorTrusted should be false");

  // demo data does not contain "Verified mock public domain publication"
  const rawStoreContentStr = JSON.stringify(mockLocalStorage.store);
  assert.ok(!rawStoreContentStr.includes("Verified mock public domain publication"));
  // demo data does not contain "CC0 (Public Domain)"
  assert.ok(!rawStoreContentStr.includes("CC0 (Public Domain)"));

  // demo data uses example.invalid URLs only
  const urls = [];
  const regex = /https?:\/\/[^\s"']+/g;
  let match;
  while ((match = regex.exec(rawStoreContentStr)) !== null) {
    urls.push(match[0]);
  }
  urls.forEach(url => {
    assert.ok(url.includes('example.invalid') || url.includes('localhost-safe'), `URLs must be example.invalid or localhost-safe, found: ${url}`);
  });

  // runOfflineToolkitIntegrityAudit after loading demo data does not produce schema warnings/errors for demo records
  const audit = runOfflineToolkitIntegrityAudit();
  const schemaErrors = audit.findings.filter(f => f.severity === 'error');
  assert.strictEqual(schemaErrors.length, 0, "No schema errors should be present");

  // resetOfflineToolkitProfile requires RESET PROFILE DATA
  assert.throws(() => {
    resetOfflineToolkitProfile('INVALID RESET');
  }, /must match 'RESET PROFILE DATA' exactly/);

  // resetOfflineToolkitProfile removes only registered keys and aliases
  mockLocalStorage.clear();
  mockLocalStorage.setItem('sos_setup_progress', '{}');
  mockLocalStorage.setItem('setup_progress', '{}'); // alias
  mockLocalStorage.setItem('sos_unregistered_key', 'keep_me'); // unregistered key beginning with sos_
  mockLocalStorage.setItem('other_key', 'keep_me_too'); // unregistered other key

  resetOfflineToolkitProfile('RESET PROFILE DATA');
  assert.strictEqual(mockLocalStorage.getItem('sos_setup_progress'), null);
  assert.strictEqual(mockLocalStorage.getItem('setup_progress'), null);
  assert.strictEqual(mockLocalStorage.getItem('sos_unregistered_key'), 'keep_me');
  assert.strictEqual(mockLocalStorage.getItem('other_key'), 'keep_me_too');

  // offlineToolkitBackupStore.js does not call localStorage.clear()
  const storePath = path.resolve('sos-app', 'src', 'modules', 'toolkit', 'offlineToolkitBackupStore.js');
  const storeContent = fs.readFileSync(storePath, 'utf8');
  assert.ok(!storeContent.includes("localStorage.clear("), "offlineToolkitBackupStore.js should not call localStorage.clear()");
});
