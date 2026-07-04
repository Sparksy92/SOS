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

// Import store functions
import { 
  loadLedger, 
  saveLedger, 
  saveRecord, 
  deleteRecord, 
  validateAndImport, 
  generateMarkdownReport, 
  isValidUrl, 
  isAbsolutePath 
} from '../../sos-app/src/modules/toolkit/importApprovalLedgerStore.js';

test('Approval Ledger Store Namespace & CRUD', () => {
  mockLocalStorage.clear();

  // Namespace check
  const initial = loadLedger();
  assert.deepStrictEqual(initial, []);
  
  // Create pending review record from staged metadata
  const stagedMeta = {
    filename: "FM_21-76_Survival_Manual.pdf",
    sanitizedPath: "[IMPORT_STAGING]/FM_21-76_Survival_Manual.pdf",
    detectedCategory: "general_survival",
    riskCategory: null,
    suggestedLicenseStatus: "official_free",
    matchConfidence: "filename_match_only",
    operatorDecision: "pending",
    operatorVerifiedSource: false
  };

  const saved = saveRecord(stagedMeta);
  assert.strictEqual(saved.length, 1);
  assert.strictEqual(saved[0].filename, "FM_21-76_Survival_Manual.pdf");
  assert.strictEqual(saved[0].operatorDecision, "pending");
  assert.strictEqual(saved[0].licenseStatus, "unknown", "licenseStatus must default to unknown for staged files");
  assert.strictEqual(saved[0].verificationStatus, "requires_operator_review", "staged files default to requires_operator_review");
  
  assert.ok('sos_import_approval_ledger' in mockLocalStorage.store, 'Ledger must use exact key sos_import_approval_ledger');

  // Update decision to approved
  const record = { ...saved[0], operatorDecision: "approved", operatorVerifiedSource: true };
  const updated = saveRecord(record);
  assert.strictEqual(updated[0].operatorDecision, "approved");
  assert.strictEqual(updated[0].operatorVerifiedSource, true);

  // Update decision to rejected
  record.operatorDecision = "rejected";
  const rejected = saveRecord(record);
  assert.strictEqual(rejected[0].operatorDecision, "rejected");

  // Update decision to needs_more_evidence
  record.operatorDecision = "needs_more_evidence";
  const needsEvidence = saveRecord(record);
  assert.strictEqual(needsEvidence[0].operatorDecision, "needs_more_evidence");
});

test('Ledger Validation Rules (Absolute Paths & Injection URL schemes)', () => {
  // Path checks
  assert.ok(isAbsolutePath("C:\\Users\\Blair\\Downloads\\File.pdf"));
  assert.ok(isAbsolutePath("/home/blair/survival/File.pdf"));
  assert.ok(isAbsolutePath("D:/materials/book.pdf"));
  assert.ok(isAbsolutePath("[IMPORT_STAGING]/D:/materials/book.pdf"), "embedded windows drive paths anywhere in string are absolute");
  assert.ok(!isAbsolutePath("[IMPORT_STAGING]/FM_21-76_Survival_Manual.pdf"));
  assert.ok(!isAbsolutePath("FM_21-76_Survival_Manual.pdf"));

  // URL checks
  assert.ok(isValidUrl("https://officialsource.gov/manual.pdf"));
  assert.ok(isValidUrl("http://mirror.org/survival/"));
  assert.ok(!isValidUrl("javascript:alert(1)"));
  assert.ok(!isValidUrl("data:text/html,<script>alert(1)</script>"));
  assert.ok(!isValidUrl("file:///C:/Users/Blair/secret.txt"));
  assert.ok(!isValidUrl("ftp://ftp.server.com/"));

  // Validation rejections for filename
  assert.throws(() => saveRecord({
    filename: "C:/Users/Blair/secret.pdf",
    sanitizedPath: "[IMPORT_STAGING]/secret.pdf",
    operatorDecision: "pending"
  }), /Absolute file paths are not allowed/);

  assert.throws(() => saveRecord({
    filename: "D:/materials/book.pdf",
    sanitizedPath: "[IMPORT_STAGING]/book.pdf",
    operatorDecision: "pending"
  }), /Absolute file paths are not allowed/);

  assert.throws(() => saveRecord({
    filename: "/home/blair/book.pdf",
    sanitizedPath: "[IMPORT_STAGING]/book.pdf",
    operatorDecision: "pending"
  }), /Absolute file paths are not allowed/);

  // Validation rejections for sanitizedPath
  assert.throws(() => saveRecord({
    filename: "book.pdf",
    sanitizedPath: "[IMPORT_STAGING]/D:/materials/book.pdf",
    operatorDecision: "pending"
  }), /Absolute file paths are not allowed/);

  const badUrlRecord = {
    filename: "test.pdf",
    sanitizedPath: "[IMPORT_STAGING]/test.pdf",
    operatorDecision: "pending",
    officialSourceUrl: "javascript:evil()"
  };
  assert.throws(() => saveRecord(badUrlRecord), /Invalid URL scheme detected/);

  const missingDecisionRecord = {
    filename: "test.pdf",
    sanitizedPath: "[IMPORT_STAGING]/test.pdf"
  };
  assert.throws(() => saveRecord(missingDecisionRecord), /Invalid or missing operator decision/);
});

test('UI Components Hardening Wording Checks', () => {
  const gapAnalyzerPath = path.resolve('sos-app', 'src', 'components', 'toolkit', 'ContentGapAnalyzerPanel.jsx');
  const manualImportPath = path.resolve('sos-app', 'src', 'components', 'toolkit', 'ManualImportQueuePanel.jsx');

  const gapContent = fs.readFileSync(gapAnalyzerPath, 'utf8');
  const importContent = fs.readFileSync(manualImportPath, 'utf8');

  // Gap Analyzer heading checks
  assert.ok(!gapContent.includes("Available Candidate Sources (Safe & Public Domain)"), "Gap Analyzer heading must not say Safe & Public Domain");
  assert.ok(gapContent.includes("Candidate Sources for Operator Review"), "Gap Analyzer must use Operator Review header");

  // Manual Import status text checks
  assert.ok(importContent.includes("getLedgerRecordStatus"), "Manual Import must call getLedgerRecordStatus");
  assert.ok(importContent.includes("Review record exists — pending."), "Manual Import must display pending review text");
  assert.ok(importContent.includes("Rejected by operator."), "Manual Import must display rejected text");
});

test('Ledger JSON Export/Import & Markdown Report', () => {
  mockLocalStorage.clear();

  const record = {
    filename: "FM_21-76_Survival_Manual.pdf",
    sanitizedPath: "[IMPORT_STAGING]/FM_21-76_Survival_Manual.pdf",
    detectedCategory: "general_survival",
    riskCategory: null,
    suggestedLicenseStatus: "official_free",
    matchConfidence: "filename_match_only",
    operatorDecision: "approved",
    operatorVerifiedSource: true,
    officialSourceUrl: "https://government.gov/survival.pdf",
    licenseEvidence: "US Gov publication",
    reviewNotes: "Looks authentic and safe"
  };

  saveRecord(record);

  // Markdown Report checks
  const mdReport = generateMarkdownReport(loadLedger());
  assert.ok(mdReport.includes("FM_21-76_Survival_Manual.pdf"));
  assert.ok(mdReport.includes("APPROVED"));
  assert.ok(mdReport.includes("US Gov publication"));
  assert.ok(!mdReport.includes("Copyright cleared"), "MD report must not claim copyright clearance");

  // JSON Import validations
  const validJson = JSON.stringify(loadLedger());
  const imported = validateAndImport(validJson);
  assert.strictEqual(imported.length, 1);

  // Invalid JSON rejection
  assert.throws(() => validateAndImport("invalid json string"), /Validation failed/);

  // Missing fields JSON rejection
  const badJson1 = JSON.stringify([{ operatorDecision: "approved" }]);
  assert.throws(() => validateAndImport(badJson1), /missing filename/);

  // Script injection URL mirror JSON rejection
  const badJson2 = JSON.stringify([{ filename: "FM_21-76.pdf", operatorDecision: "approved", officialSourceUrl: "javascript:alert(1)" }]);
  assert.throws(() => validateAndImport(badJson2), /Invalid url scheme/);
});

test('Toolkit Routes Exception Generic Hardening', () => {
  const stagingHandler = toolkitRouter.stack.find(s => s.route?.path === '/staging').route.stack[0].handle;
  const zimHandler = toolkitRouter.stack.find(s => s.route?.path === '/zim').route.stack[0].handle;

  // Mock fs.readdirSync to throw an unexpected error to trigger catches
  const originalReaddirSync = fs.readdirSync;
  fs.readdirSync = () => {
    throw new Error("Sensitive filesystem root exception or Users folder path leak");
  };

  return new Promise((resolve, reject) => {
    const { req, res } = mockReqRes({}, (result) => {
      try {
        assert.strictEqual(result.statusCode, 500);
        // Assert generic message returned instead of err.message
        assert.strictEqual(result.body.error, "Internal server error during staging folder read.");
        assert.ok(!result.body.error.includes("readdirSync"), "Detailed stack error must not leak to client");
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    stagingHandler(req, res);
  }).then(() => {
    return new Promise((resolve, reject) => {
      const { req, res } = mockReqRes({}, (result) => {
        try {
          // Restore readdirSync
          fs.readdirSync = originalReaddirSync;

          assert.strictEqual(result.statusCode, 500);
          assert.strictEqual(result.body.error, "Internal server error during ZIM catalog scan.");
          assert.ok(!result.body.error.includes("readdirSync"), "Detailed stack error must not leak to client");
          resolve();
        } catch (err) {
          fs.readdirSync = originalReaddirSync;
          reject(err);
        }
      });

      zimHandler(req, res);
    });
  });
});
