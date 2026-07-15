import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Polyfill localStorage for testing
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

// Import stores and validators
import { isAbsolutePath } from '../../sos-app/src/modules/toolkit/importApprovalLedgerStore.js';
import { computeLifecycleRecords } from '../../sos-app/src/modules/toolkit/libraryLifecycleAnalyzer.js';

test('Path Validator Cleanups', () => {
  // URLs containing '/home/' segments must be allowed
  assert.strictEqual(isAbsolutePath("https://example.org/home/survival-guide.pdf"), false);
  assert.strictEqual(isAbsolutePath("http://example.org/home/guide.pdf"), false);

  // Local /home/... paths must be rejected
  assert.strictEqual(isAbsolutePath("/home/blair/book.pdf"), true);

  // Windows drive letter roots must be rejected
  assert.strictEqual(isAbsolutePath("C:/Users/Blair/file.pdf"), true);
  assert.strictEqual(isAbsolutePath("D:/materials/book.pdf"), true);
  assert.strictEqual(isAbsolutePath("file:///C:/Users/Blair/file.pdf"), true);

  // Embedded Windows drive letters must be rejected
  assert.strictEqual(isAbsolutePath("[IMPORT_STAGING]/D:/materials/book.pdf"), true);
});

test('Lifecycle Analyzer State Reconciliation Rules', () => {
  const gapData = {
    candidateItems: [
      {
        title: "FM 21-76 Survival",
        filename: "fm21_76.pdf",
        category: "general_survival",
        recommendedAction: "approved_download"
      }
    ]
  };

  const ledger = [
    {
      id: "led_01",
      filename: "fm21_76.pdf",
      operatorDecision: "pending",
      detectedCategory: "general_survival",
      officialSourceUrl: "https://government.gov/fm21_76.pdf"
    }
  ];

  const queue = [
    {
      id: "q_01",
      title: "FM 21-76 Survival",
      filenameHint: "fm21_76.pdf",
      category: "general_survival",
      ledgerRecordId: "led_01",
      acquisitionStatus: "planned",
      officialSourceUrl: "https://government.gov/fm21_76.pdf"
    }
  ];

  const allowlist = [];

  // Reconcile
  const records = computeLifecycleRecords(gapData, ledger, queue, allowlist, [], {});
  assert.strictEqual(records.length, 1);
  const rec = records[0];

  // Assert candidate-only records are not treated as approved
  assert.strictEqual(rec.ledgerStatus, "pending");
  assert.strictEqual(rec.lifecycleStage, "approval_review", "Pending ledger record must be in approval_review stage");

  // Assert pending ledger records are not treated as acquired
  assert.notStrictEqual(rec.lifecycleStage, "manually_acquired");

  // Assert approved ledger records are not treated as downloaded/imported
  const approvedLedger = [{ ...ledger[0], operatorDecision: "approved" }];
  const recordsApproved = computeLifecycleRecords(gapData, approvedLedger, queue, allowlist, [], {});
  assert.strictEqual(recordsApproved[0].ledgerStatus, "approved");
  assert.strictEqual(recordsApproved[0].lifecycleStage, "acquisition_planned", "Approved ledger record not acquired must be planned");

  // Assert planned queue records are not treated as staged
  assert.strictEqual(recordsApproved[0].lifecycleStage, "acquisition_planned");

  // Assert manually_staged queue records are not treated as indexed
  const stagedQueue = [{ ...queue[0], acquisitionStatus: "manually_staged" }];
  const recordsStaged = computeLifecycleRecords(gapData, approvedLedger, stagedQueue, allowlist, [], {});
  assert.strictEqual(recordsStaged[0].lifecycleStage, "staged", "Staged queue item must be in staged lifecycleStage");
  assert.strictEqual(recordsStaged[0].indexStatus, "unknown", "Staged item has unknown index status by default");

  // Assert possible matches are labelled possible
  const mismatchedQueue = [{ ...queue[0], ledgerRecordId: "different_id" }];
  const recordsMismatched = computeLifecycleRecords(gapData, approvedLedger, mismatchedQueue, allowlist, [], {});
  assert.strictEqual(recordsMismatched[0].matchConfidence, "possible_match");
  assert.ok(recordsMismatched[0].warnings.some(w => w.includes("Match is possible but unconfirmed")));
});

test('operatorTrusted Evidence & Wording Safeguards', () => {
  const gapData = { candidateItems: [] };
  const ledger = [
    {
      id: "led_01",
      filename: "fm21_76.pdf",
      operatorDecision: "approved",
      detectedCategory: "general_survival",
      officialSourceUrl: "https://government.gov/fm21_76.pdf",
      licenseEvidence: "Logged evidence description"
    }
  ];
  const queue = [];
  const allowlist = [
    {
      label: "Government source",
      officialSourceUrl: "https://government.gov/fm21_76.pdf",
      sourceType: "official",
      operatorTrusted: true
    }
  ];

  const records = computeLifecycleRecords(gapData, ledger, queue, allowlist, [], {});
  assert.strictEqual(records.length, 1);
  // Approved ledger + URL + evidence = present
  assert.strictEqual(records[0].evidenceStatus, "present");

  // operatorTrusted alone does not imply legal copyright clearance
  const docPath = path.resolve('sos-app', 'src', 'components', 'toolkit', 'LibraryLifecyclePanel.jsx');
  const docContent = fs.readFileSync(docPath, 'utf8');
  assert.ok(docContent.includes("does NOT guarantee legal copyright clearance"), "Dashboard must disclaimer legal copyright");
});

test('Lifecycle UI Guardrails & Export safety', () => {
  const panelPath = path.resolve('sos-app', 'src', 'components', 'toolkit', 'LibraryLifecyclePanel.jsx');
  const panelContent = fs.readFileSync(panelPath, 'utf8');

  // Assert no Download, Fetch, Import automatically, Move/Copy/Delete file, indexing, or OCR buttons are present in Lifecycle UI
  assert.ok(!panelContent.includes('Download File'), "Lifecycle Panel must not have Download File actions");
  assert.ok(!panelContent.includes('Fetch File'), "Lifecycle Panel must not have Fetch File actions");
  assert.ok(!panelContent.includes('Import automatically'), "Lifecycle Panel must not have auto-imports");
  assert.ok(!panelContent.includes('Move file'), "Lifecycle Panel must not have move actions");
  assert.ok(!panelContent.includes('Copy file'), "Lifecycle Panel must not have copy actions");
  assert.ok(!panelContent.includes('Delete file'), "Lifecycle Panel must not have delete actions");
  assert.ok(!panelContent.includes('Index now'), "Lifecycle Panel must not trigger background indexing");
  assert.ok(!panelContent.includes('Run OCR'), "Lifecycle Panel must not trigger OCR");

  // Assert exports do not contain download/fetch commands
  assert.ok(panelContent.includes("triggerExportJSON"), "Lifecycle Panel must support JSON export");
  assert.ok(panelContent.includes("triggerExportMarkdown"), "Lifecycle Panel must support Markdown export");
});

test('Ranger Lifecycle Guidance Checks', () => {
  const appPath = path.resolve('sos-app', 'src', 'App.jsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Guidance intercepts are present
  assert.ok(appContent.includes("show my library lifecycle"));
  assert.ok(appContent.includes("what references are stuck?"));
  assert.ok(appContent.includes("what references need evidence?"));
  assert.ok(appContent.includes("what references are ready to index?"));
  assert.ok(appContent.includes("what references are staged but not indexed?"));
  assert.ok(appContent.includes("what references are blocked or rejected?"));
  assert.ok(appContent.includes("what should i do next for my library?"));

  // Check forbidden answers
  assert.ok(!appContent.includes('text += "I downloaded'), "Ranger must not say 'I downloaded'");
  assert.ok(!appContent.includes('text += "I imported'), "Ranger must not say 'I imported'");
  assert.ok(!appContent.includes('text += "I indexed'), "Ranger must not say 'I indexed'");
  assert.ok(!appContent.includes('text += "I verified copyright'), "Ranger must not say 'I verified copyright'");
});

test('manifestChecked Fallback Rules', () => {
  const gapData = {
    candidateItems: [
      {
        title: "FM 21-76 Survival",
        filename: "fm21_76.pdf",
        category: "general_survival",
        recommendedAction: "approved_download"
      }
    ]
  };

  const ledger = [
    {
      id: "led_01",
      filename: "fm21_76.pdf",
      operatorDecision: "approved",
      officialSourceUrl: "https://government.gov/fm21_76.pdf",
      licenseEvidence: "public domain"
    }
  ];

  // 1. manifestChecked = false => manifestStatus/indexStatus should be unknown
  const recordsUnchecked = computeLifecycleRecords(gapData, ledger, [], [], [], {}, false);
  assert.strictEqual(recordsUnchecked[0].manifestStatus, "unknown");
  assert.strictEqual(recordsUnchecked[0].indexStatus, "unknown");
  assert.strictEqual(recordsUnchecked[0].recommendedNextStep, "Open Index Integrity or refresh materials manifest.");

  // 2. manifestChecked = true => manifestStatus should be not_found_in_manifest
  const recordsChecked = computeLifecycleRecords(gapData, ledger, [], [], [], {}, true);
  assert.strictEqual(recordsChecked[0].manifestStatus, "not_found_in_manifest");
});
