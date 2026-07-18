import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Polyfill localStorage for testing the stores in Node.js
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

// Import store functions
import { 
  loadQueue, 
  saveQueueItem, 
  deleteQueueItem, 
  validateAndImportQueue, 
  generateQueueMarkdownChecklist 
} from '../../sos-app/src/modules/toolkit/acquisitionQueueStore.js';

import { 
  loadAllowlist, 
  saveAllowlistEntry, 
  deleteAllowlistEntry, 
  validateAndImportAllowlist, 
  generateAllowlistMarkdownReport 
} from '../../sos-app/src/modules/toolkit/sourceAllowlistStore.js';

test('Acquisition Queue Namespace & CRUD Persistence', () => {
  mockLocalStorage.clear();

  // Namespace check
  assert.deepStrictEqual(loadQueue(), []);
  
  // Create queue item from gap candidate metadata
  const item = {
    title: "US Army Survival Manual FM 21-76",
    filenameHint: "FM_21-76_Survival_Manual.pdf",
    category: "general_survival",
    riskCategory: null,
    sourceType: "official_source",
    officialSourceUrl: "https://government.gov/fm21-76.pdf",
    sourceEvidence: "US Army Field Manual",
    suggestedLicenseStatus: "official_free",
    acquisitionStatus: "planned"
  };

  const saved = saveQueueItem(item);
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].title, "US Army Survival Manual FM 21-76");
  assert.strictEqual(saved[0].acquisitionStatus, "planned");
  assert.ok('sos_acquisition_queue' in mockLocalStorage.store, 'Queue must use exact key sos_acquisition_queue');

  // Verify status transitions persist
  const updatedItem = { ...saved[0], acquisitionStatus: "manually_acquired" };
  const updated = saveQueueItem(updatedItem);
  assert.strictEqual(updated[0].acquisitionStatus, "manually_acquired");

  // Invalid status rejection
  const badStatusItem = { ...saved[0], acquisitionStatus: "downloaded_automatically" };
  assert.throws(() => saveQueueItem(badStatusItem), /Invalid acquisition status/);
});

test('Acquisition Queue Validation (Absolute Paths & URL Schemes)', () => {
  mockLocalStorage.clear();

  // Rejections for filenameHint
  assert.throws(() => saveQueueItem({
    title: "Safe Title",
    filenameHint: "C:/Users/operator/secret.pdf",
    acquisitionStatus: "planned"
  }), /Absolute file paths are not allowed/);

  // Rejections for title
  assert.throws(() => saveQueueItem({
    title: "D:/materials/book.pdf",
    filenameHint: "book.pdf",
    acquisitionStatus: "planned"
  }), /Absolute file paths are not allowed/);

  // Rejections for officialSourceUrl containing absolute paths
  assert.throws(() => saveQueueItem({
    title: "Safe Title",
    filenameHint: "book.pdf",
    officialSourceUrl: "C:\\Users\\operator\\secret.pdf",
    acquisitionStatus: "planned"
  }), /Absolute file paths are not allowed/);

  // Rejections for embedded Windows drive paths
  assert.throws(() => saveQueueItem({
    title: "Safe Title",
    filenameHint: "[IMPORT_STAGING]/D:/materials/book.pdf",
    acquisitionStatus: "planned"
  }), /Absolute file paths are not allowed/);

  // Rejections for bad URL schemes
  assert.throws(() => saveQueueItem({
    title: "Safe Title",
    filenameHint: "book.pdf",
    officialSourceUrl: "javascript:alert(1)",
    acquisitionStatus: "planned"
  }), /Invalid URL scheme detected/);

  assert.throws(() => saveQueueItem({
    title: "Safe Title",
    filenameHint: "book.pdf",
    officialSourceUrl: "data:text/html,evil",
    acquisitionStatus: "planned"
  }), /Invalid URL scheme detected/);
});

test('Source Allowlist Namespace & Trust Settings', () => {
  mockLocalStorage.clear();

  assert.deepStrictEqual(loadAllowlist(), []);

  const entry = {
    label: "Internet Archive",
    officialSourceUrl: "https://archive.org",
    sourceType: "public_domain_archive",
    sourceEvidence: "Community public archive",
    categories: ["general_survival"],
    operatorTrusted: true
  };

  const saved = saveAllowlistEntry(entry);
  assert.strictEqual(saved.length, 1);
  assert.ok('sos_source_allowlist' in mockLocalStorage.store, 'Allowlist must use exact key sos_source_allowlist');
  assert.strictEqual(saved[0].operatorTrusted, true);

  // operatorTrusted does not imply copyright clearance wording report check
  const report = generateAllowlistMarkdownReport(saved);
  assert.ok(report.includes("Trusted?"));
  assert.ok(!report.includes("copyright cleared"), "Allowlist report must not claim copyright clearance");
});

test('Backup Import/Export Security Checks', () => {
  mockLocalStorage.clear();

  // Export checklist contains no download commands
  const checklist = generateQueueMarkdownChecklist([
    {
      title: "Planned reference",
      category: "water",
      acquisitionStatus: "planned",
      officialSourceUrl: "https://source.gov/manual.pdf"
    }
  ]);
  assert.ok(!checklist.includes("download"), "Checklist must not contain download actions");
  assert.ok(!checklist.includes("fetch"), "Checklist must not contain fetch actions");

  // Import JSON validations
  assert.throws(() => validateAndImportQueue("invalid json"), /Validation failed/);
  
  // Import invalid status rejection
  const badJson1 = JSON.stringify([{ title: "Safe Book", acquisitionStatus: "auto_downloaded" }]);
  assert.throws(() => validateAndImportQueue(badJson1), /Invalid status/);

  // Import absolute path rejection
  const badJson2 = JSON.stringify([{ title: "C:/Users/operator/secret.pdf", acquisitionStatus: "planned" }]);
  assert.throws(() => validateAndImportQueue(badJson2), /Absolute paths not allowed/);
});

test('Gap Analyzer UI Wording & No Downloads', () => {
  const gapAnalyzerPath = path.resolve('sos-app', 'src', 'components', 'toolkit', 'ContentGapAnalyzerPanel.jsx');
  const gapContent = fs.readFileSync(gapAnalyzerPath, 'utf8');

  // Gap Analyzer heading is preserved
  assert.ok(gapContent.includes("Candidate Sources for Operator Review"), "Gap Analyzer must use Operator Review heading");
  assert.ok(!gapContent.includes("Safe & Public Domain"), "Safe & Public Domain heading must be softened");

  // No download/fetch buttons in UI code
  assert.ok(!gapContent.includes('className="btn-tactical">Download'), "Must not have Download tactical button");
  assert.ok(!gapContent.includes('className="btn-tactical">Fetch'), "Must not have Fetch tactical button");
  assert.ok(!gapContent.includes('className="btn-tactical">Acquire now'), "Must not have Acquire now button");
});

test('Approval Ledger Queues Gating Checks', () => {
  const ledgerPath = path.resolve('sos-app', 'src', 'components', 'toolkit', 'ImportApprovalLedgerPanel.jsx');
  const ledgerContent = fs.readFileSync(ledgerPath, 'utf8');

  // Gating wording is present
  assert.ok(ledgerContent.includes("Complete source evidence before queueing this item."), "Approval Ledger must warn if pending/needs evidence");
  assert.ok(ledgerContent.includes("selectedRecord.operatorDecision === 'approved'"), "Only approved records can be queued");
});

test('Manual Import Local Updates Only', () => {
  const manualImportPath = path.resolve('sos-app', 'src', 'components', 'toolkit', 'ManualImportQueuePanel.jsx');
  const manualContent = fs.readFileSync(manualImportPath, 'utf8');

  // Only updates queue status locally without file writes
  assert.ok(manualContent.includes("saveQueueItem"), "Manual Import queue updates must call saveQueueItem");
  assert.ok(manualContent.includes("Queue status: manually staged candidate detected"), "Staged indicators must match hints");
});

test('Ranger Conversational Guidance Safety Check', () => {
  const appPath = path.resolve('sos-app', 'src', 'App.jsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Ranger intercepts are guidance-only
  assert.ok(appContent.includes("what is in my acquisition queue?"));
  assert.ok(appContent.includes("what sources are allowlisted?"));
  assert.ok(appContent.includes("what should i acquire next?"));
  assert.ok(appContent.includes("planned acquisition records"));

  // Check forbidden actions in Ranger answers
  assert.ok(!appContent.includes('text += "I downloaded'), "Ranger must not say 'I downloaded'");
  assert.ok(!appContent.includes('text += "I fetched'), "Ranger must not say 'I fetched'");
  assert.ok(!appContent.includes('text += "I verified copyright'), "Ranger must not say 'I verified copyright'");
});
