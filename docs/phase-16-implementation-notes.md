# Phase 16 Implementation Notes — Offline Toolkit Backup, Restore & Integrity Audit v3

This document lists the implementation and verification details of Phase 16, adding backup v3 export/import and integrity audit layers in SurvivalOS.

## Subsystems Implemented

### 1. Backup Registry (`offlineToolkitBackupRegistry.js`)
*   Declares registry settings (description, category, expected type, legacy key fallbacks) for all Offline Toolkit keys: setup progress, checklist states, dismissed import entries, approval ledger records, acquisition queues, allowed sources, missions, notes, and report drafts.

### 2. Backup Store & Utility (`offlineToolkitBackupStore.js`)
*   `createOfflineToolkitBackup()`: Packages active localStorage values into schema version 3 backups under backupType `'survivalos_offline_toolkit_backup'`.
*   `validateOfflineToolkitBackup(json)`: Validates imported payloads. Blocks dangerous URL schemes (`javascript:`, `data:`, `file:`, `ftp:`), absolute paths in string attributes, and script tags (`<script>`, `eval(`, etc.).
*   `previewOfflineToolkitBackup(json)`: Scans payload contents, reporting recognized/ignored keys and counts before writing changes.
*   `restoreOfflineToolkitBackup(json, options)`:
    *   **Merge Mode**: Deduplicates lists by ID, filename, or label, keeping the newer item if updatedAt/createdAt conflicts occur.
    *   **Replace Mode**: Overwrites entire local stores. Requires typing the verification phrase `RESTORE TOOLKIT BACKUP` to execute.
*   `runOfflineToolkitIntegrityAudit()`: Audits active localStorage keys, flag corrupt JSON layout structures, mismatched active mission IDs, or unknown statuses.

### 3. UI Tab Pane (`OfflineToolkitBackupPanel.jsx`)
*   Mounted as a new sub-tab named **Backup** inside the `OFFLINE TOOLKIT` panel workspace.
*   Displays configuration counters, audit tables, and export/import options.
*   Explicitly outlines safety boundaries: backups are local-only and do not include material files or cloud sync.

### 4. Conversational guidance
*   Jarvis intercepts in `App.jsx` respond to backup and audit queries with localized summaries.

---

## Verification Logs

### Automated Tests
Node unit tests verify registry entries, schema version 3 structures, URL/path rejections, preview/restore state validations, and Jarvis intercepts:
*   Test File Path: [`sos-server/tests/offlineToolkitBackup.test.mjs`](file:///c:/Users/operator/Downloads/survival/sos-server/tests/offlineToolkitBackup.test.mjs)
```bash
node --test sos-server/tests/offlineToolkitBackup.test.mjs
# tests 7
# pass 7
# fail 0
```
All 94 total tests pass successfully:
```bash
node --test sos-server/tests/*.test.mjs
# tests 94
# pass 94
# fail 0
```

### Production Build
Vite production compilation succeeds cleanly:
```bash
dist/assets/index-Dj3-PL33.js   673.21 kB
✓ built in 441ms
```
