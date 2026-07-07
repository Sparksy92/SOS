import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

test('Production Readiness Diagnostics & Launcher Files', () => {
  // 1. Version file check
  const versionPath = path.resolve('sos-server', 'version.json');
  assert.ok(fs.existsSync(versionPath), "version.json must exist in sos-server");
  const versionData = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  assert.strictEqual(versionData.appVersion, "0.1.0-alpha");
  assert.strictEqual(versionData.releaseCandidate, "RC-2");
  assert.strictEqual(typeof versionData.schemaVersion, "number");
  assert.strictEqual(typeof versionData.backupSchemaVersion, "number");

  // 2. Launcher script existence checks
  const batPath = path.resolve('launcher.bat');
  const psPath = path.resolve('scripts', 'launcher.ps1');
  assert.ok(fs.existsSync(batPath), "launcher.bat must exist");
  assert.ok(fs.existsSync(psPath), "launcher.ps1 must exist");

  const psContent = fs.readFileSync(psPath, 'utf8');
  assert.ok(psContent.includes("Stop-PortProcess"), "launcher.ps1 should contain Stop-PortProcess port utility");
  assert.ok(psContent.includes("NODE_ENV = \"production\""), "launcher.ps1 should set NODE_ENV to production");

  // 3. Update Runbook documentation check
  const runbookPath = path.resolve('docs', 'update-runbook.md');
  assert.ok(fs.existsSync(runbookPath), "update-runbook.md must exist in docs/");
  const runbookContent = fs.readFileSync(runbookPath, 'utf8');
  assert.ok(runbookContent.includes("Pre-Update Backup Checklist"), "update-runbook.md should contain backup checklists");
  assert.ok(runbookContent.includes("git pull"), "update-runbook.md should guide operators on pulling code");

  // 4. Index.js static build configuration check
  const serverIdxPath = path.resolve('sos-server', 'index.js');
  const serverIdxContent = fs.readFileSync(serverIdxPath, 'utf8');
  assert.ok(serverIdxContent.includes("NODE_ENV === 'production'"), "index.js must have production static routing check");
  assert.ok(serverIdxContent.includes("express.static(frontendDist)"), "index.js must use express.static to host frontend dist");
  assert.ok(serverIdxContent.includes("res.sendFile(indexPath)"), "index.js must have default sendFile fallback for SPA routing");

  // 5. Offline Toolkit Backup Store Static checks
  const storePath = path.resolve('sos-app', 'src', 'modules', 'toolkit', 'offlineToolkitBackupStore.js');
  const storeContent = fs.readFileSync(storePath, 'utf8');
  assert.ok(!storeContent.includes("localStorage.clear("), "offlineToolkitBackupStore.js should not call localStorage.clear()");
  assert.ok(!storeContent.includes("Verified mock public domain publication"), "offlineToolkitBackupStore.js should not contain legacy demo ledger claims");
  assert.ok(!storeContent.includes("CC0 (Public Domain)"), "offlineToolkitBackupStore.js should not contain legacy CC0 license claims");
  assert.ok(!storeContent.includes("http://localhost-safe/demo/"), "offlineToolkitBackupStore.js ledger URLs must be example.invalid");
});
