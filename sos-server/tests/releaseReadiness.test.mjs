import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Import localReleaseReadiness
import { buildLocalReleaseReadinessReport } from '../../sos-app/src/modules/release/localReleaseReadiness.js';

test('Release Readiness Analyzer States', () => {
  // Test blocked state when backendHealth is null
  const reportBlocked = buildLocalReleaseReadinessReport({
    backendHealth: null,
    toolkitAudit: null
  });
  assert.strictEqual(reportBlocked.status, "blocked");
  assert.ok(reportBlocked.blockers.includes("Backend API server is unreachable."));
  assert.ok(reportBlocked.score < 100);

  // Test warning state when backendHealth has missing material root configuration
  const reportWarning = buildLocalReleaseReadinessReport({
    backendHealth: { ok: true, materialRootConfigured: false, manifestExists: true, metadataExists: true },
    toolkitAudit: { status: "healthy" }
  });
  assert.strictEqual(reportWarning.status, "warning");
  assert.ok(reportWarning.warnings.includes("Materials directory override is not configured."));

  // Test ready state when all components are fully online
  const reportReady = buildLocalReleaseReadinessReport({
    backendHealth: { ok: true, materialRootConfigured: true, manifestExists: true, metadataExists: true },
    toolkitAudit: { status: "healthy" },
    backupSummary: { counts: { keysIncluded: 5, missions: 2 } },
    lifecycleSummary: { candidates: 10, staged: 2 }
  });
  assert.strictEqual(reportReady.status, "ready");
  assert.strictEqual(reportReady.blockers.length, 0);
  assert.strictEqual(reportReady.warnings.length, 0);
  assert.strictEqual(reportReady.score, 100);
});

test('Readiness Report Path and Secret Sanitization', () => {
  const mockReport = buildLocalReleaseReadinessReport({
    backendHealth: { ok: true, materialRootConfigured: true },
    toolkitAudit: { status: "healthy" }
  });

  const reportStr = JSON.stringify(mockReport);
  // Must not contain any absolute local paths, drive letters, usernames, secrets, or database file names
  assert.ok(!reportStr.includes('C:/'), "Report must scrub absolute paths");
  assert.ok(!reportStr.includes('sos_database.db'), "Report must scrub database filename details");
  assert.ok(!reportStr.includes('SOS_SECRET'), "Report must scrub secret credentials");
});

test('Release Check UI Options and Exclusions', () => {
  const uiPath = path.resolve('sos-app', 'src', 'components', 'release', 'LocalReleaseCandidatePanel.jsx');
  const uiContent = fs.readFileSync(uiPath, 'utf8');

  // Allowed buttons list
  const allowed = [
    'Refresh Release Check',
    'Open Offline Toolkit',
    'Open Backup',
    'Open Lifecycle',
    'Open Index Integrity',
    'Open Mission Mode',
    'Open Settings',
    'Export Readiness Report JSON',
    'Export Readiness Report Markdown'
  ];
  allowed.forEach(btn => {
    assert.ok(uiContent.includes(btn), `UI Panel must contain allowed button: ${btn}`);
  });

  // Forbidden buttons/actions
  const forbidden = [
    'Auto Fix',
    'Auto Download',
    'Auto Import',
    'Scan Drive',
    'Upload Logs',
    'Sync',
    'Cloud Backup',
    'Delete Files',
    'Move Files',
    'Copy Files',
    'Index Now',
    'Run OCR'
  ];
  forbidden.forEach(btn => {
    assert.ok(!uiContent.includes(btn), `UI Panel must NOT contain forbidden button/action: ${btn}`);
  });

  assert.ok(uiContent.includes("This release check is read-only. It does not change files, download references, index documents, upload logs, or alter local storage."), "UI must clearly explain diagnostic boundaries");
});

test('API Health endpoint safety checks', () => {
  const routePath = path.resolve('sos-server', 'routes', 'health.routes.js');
  const routeContent = fs.readFileSync(routePath, 'utf8');

  // Assert health route exists and contains ok, app, server, checkedAt, materialRootConfigured, environment, autoCrawlEnabled
  assert.ok(routeContent.includes("ok: true"), "Health API must return ok flag");
  assert.ok(routeContent.includes("app: \"SurvivalOS\""), "Health API must return app name");
  assert.ok(routeContent.includes("server: \"sos-server\""), "Health API must return server name");
  assert.ok(routeContent.includes("checkedAt:"), "Health API must return checkedAt time");
  assert.ok(routeContent.includes("materialRootConfigured:"), "Health API must return materialRootConfigured status");
  assert.ok(routeContent.includes("autoCrawlEnabled:"), "Health API must return autoCrawlEnabled status");
  assert.ok(routeContent.includes("environment:"), "Health API must return environment version metadata");

  // Verify it does not expose absolute material paths, database names or secrets
  assert.ok(!routeContent.includes("SOS_MATERIALS_DIR: process.env.SOS_MATERIALS_DIR,"), "Health API must not return raw material folder paths");
  assert.ok(!routeContent.includes("sos_database.db"), "Health API must not return raw database file name");

  // Verify crawler safety requirements: does NOT return raw crawlerStatus, returns crawlerSummary
  assert.ok(!routeContent.includes("crawlerStatus:"), "Health API must not return raw crawlerStatus");
  assert.ok(!routeContent.includes("currentFile"), "Health API must not return currentFile");
  assert.ok(!routeContent.includes("statusText"), "Health API must not return statusText");
  assert.ok(!routeContent.includes("dryRunZips"), "Health API must not return dryRunZips");
  assert.ok(routeContent.includes("crawlerSummary"), "Health API must return crawlerSummary");
  assert.ok(routeContent.includes("isCrawling:"), "Health API must return isCrawling");
  assert.ok(routeContent.includes("mode:"), "Health API must return mode");
  assert.ok(routeContent.includes("totalDocs:"), "Health API must return totalDocs");
  assert.ok(routeContent.includes("processedDocs:"), "Health API must return processedDocs");
  assert.ok(routeContent.includes("totalZips:"), "Health API must return totalZips");
  assert.ok(routeContent.includes("processedZips:"), "Health API must return processedZips");
});

test('Ranger Release Guidance Matches & Boundaries', () => {
  const appPath = path.resolve('sos-app', 'src', 'App.jsx');
  const appContent = fs.readFileSync(appPath, 'utf8');

  // Check required local prompts are present
  const prompts = [
    "is survivalos ready?",
    "run release check",
    "show release readiness",
    "how do i start survivalos?",
    "what should i do first?",
    "how do i troubleshoot survivalos?",
    "is my local setup healthy?"
  ];
  prompts.forEach(p => {
    assert.ok(appContent.includes(p), `Ranger must intercept prompt: ${p}`);
  });

  // Verify allowed responses wording
  assert.ok(appContent.includes("Open RELEASE CHECK to verify backend, materials, index, toolkit state, and backup status."), "Ranger must direct to Release Check");
  assert.ok(appContent.includes("commands in the README"), "Ranger must mention README commands");

  // Verify forbidden words (auto-fixes / file modifications)
  const forbiddenRanger = [
    "I fixed your setup automatically",
    "I scanned your drive",
    "I uploaded logs",
    "I synced your data",
    "I downloaded your library",
    "I indexed your files automatically"
  ];
  forbiddenRanger.forEach(w => {
    assert.ok(!appContent.includes(w), `Ranger must not reply with forbidden wording: ${w}`);
  });
});

test('Release Documentation and Config Verification', () => {
  // README checks
  const readmePath = path.resolve('README.md');
  assert.ok(fs.existsSync(readmePath), "README.md must exist in root");
  const readmeContent = fs.readFileSync(readmePath, 'utf8');
  assert.ok(readmeContent.includes("Setup"), "README must detail dependencies install");
  assert.ok(readmeContent.includes("launcher.bat"), "README must reference startup script");

  // Operator Runbook checks
  const runbookPath = path.resolve('docs', 'operator-runbook.md');
  assert.ok(fs.existsSync(runbookPath), "operator-runbook.md must exist");
  const runbookContent = fs.readFileSync(runbookPath, 'utf8');
  assert.ok(runbookContent.includes("SurvivalOS does not call emergency services."), "Runbook must declare emergency limits");
  assert.ok(runbookContent.includes("SurvivalOS does not provide medical diagnosis or treatment."), "Runbook must declare medical limits");
  assert.ok(runbookContent.includes("Copy `.env.example` to `.env`"), "Runbook must say to copy .env.example to .env");

  // Release Checklist checks
  const checklistPath = path.resolve('docs', 'release-candidate-checklist.md');
  assert.ok(fs.existsSync(checklistPath), "release-candidate-checklist.md must exist");

  // Env Example checks
  const envPath = path.resolve('.env.example');
  assert.ok(fs.existsSync(envPath), "Root .env.example must exist");
  const envContent = fs.readFileSync(envPath, 'utf8');
  assert.ok(!envContent.includes('C:/'), ".env.example must not contain real local paths");
  assert.ok(!envContent.includes('operator'), ".env.example must not contain real usernames");

  // Dotenv runtime loading checks
  const pkgPath = path.resolve('sos-server', 'package.json');
  const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  assert.ok(pkgContent.dependencies && pkgContent.dependencies.dotenv, "package.json must include dotenv");

  const idxPath = path.resolve('sos-server', 'index.js');
  const idxContent = fs.readFileSync(idxPath, 'utf8');
  assert.ok(idxContent.includes("dotenv.config("), "index.js must call dotenv.config()");
});
