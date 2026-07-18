# SurvivalOS Release Candidate Manual Verification Checklist

Verify each of the following checklist items manually to confirm the release candidate's integrity.

## 1. Startup & Diagnostics
- [ ] **Backend Starts Cleanly**: `node index.js` runs on port 3001 with no database locks.
- [ ] **Frontend Starts Cleanly**: `npm run dev` starts the React client.
- [ ] **Health API Endpoint works**: `http://localhost:3001/api/health` queries successfully and returns app, server, and platform versions.
- [ ] **Index Status Endpoint works**: `GET /api/index/status?path=...` handles paths and blocks directory traversals.

## 2. UI View Verification
- [ ] **RELEASE CHECK Sidebar Tab**: The release check panel loads and executes readiness reports correctly.
- [ ] **Offline Toolkit Wizard**: The 12 setup steps render and toggle completion statuses.
- [ ] **Backup Sub-Tab**: Backups can be created, previews load, and restores prompt confirm phrase.
- [ ] **Integrity Audit**: Scans and logs configuration schema issues.
- [ ] **Lifecycle Tab**: Reconciles gap data, ledger records, allowlists, and materials.
- [ ] **Index Integrity Tab**: Audits database records and triggers manual file indexing.
- [ ] **Mission Mode**: Guided intake accepts questions, prompts user confirmations, and saves notes.

## 3. Local AI & R.A.N.G.E.R. Prompts
- [ ] **R.A.N.G.E.R. Release Prompts**: Prompts like `is survivalos ready?` respond locally.
- [ ] **R.A.N.G.E.R. Health Prompts**: Prompt replies explain how to start servers and warn about backups.

## 4. Off-Grid Boundaries (Strict Enforcements)
- [ ] **No Cloud Sync**: Verify no options exists to link Google, Dropbox, or OneDrive accounts.
- [ ] **No Upload Buttons**: Verify no telemetry logs or diagnostic profiles are uploaded to external endpoints.
- [ ] **No Material Backup**: Confirm configuration backup files contains only keys/checklists, not raw PDF/ZIM material binary contents.
- [ ] **No Auto-Downloads**: Confirm no automatic crawler downloads occur.
- [ ] **No Auto-Imports**: Confirm files inside staging folder must be copied manually by the operator.
- [ ] **No Emergency Dispatch / GPS / Live Tracking**: Confirm no maps integration uses live telemetry.

## 5. Automation Builds & Checks
- [ ] **All Tests Pass**: `node --test sos-server/tests/*.test.mjs` runs with 0 failures.
- [ ] **Production Build Passes**: `npm run build` inside `sos-app` finishes compilation with no build errors.
