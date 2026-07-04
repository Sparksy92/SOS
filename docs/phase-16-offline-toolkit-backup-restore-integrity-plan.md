# Implementation Plan — Phase 16: Offline Toolkit Backup, Restore & Integrity Audit v3

> [!NOTE]
> This phase extends the existing local backup and restore system to cover all Offline Toolkit governance data added in Phases 12–15. It remains 100% local-first and does not sync to cloud S3 or back up material files.

## Proposed Components

### 1. Backup Registry (`offlineToolkitBackupRegistry.js`)
*   Defines every known `sos_` localStorage key included in the backup scope.
*   Maps older legacy unprefixed keys (`saved_answers`, `missions`, etc.) to support backward compatibility.

### 2. Backup Store / Utility (`offlineToolkitBackupStore.js`)
*   Generates schema v3 backups (`survivalos_offline_toolkit_backup`).
*   Runs integrity audits returning status warnings, corrupt data logs, and next steps.
*   Enforces validation schema blocks (XSS schemes, absolute paths, and executable script sequences).

### 3. UI sub-Tab Panel (`OfflineToolkitBackupPanel.jsx`)
*   Mounted as subtab `'backup'` inside `OFFLINE TOOLKIT`.
*   Includes backup summary counters, local JSON export/import blocks, audit logs, and overwrite typed-phrase checks (`RESTORE TOOLKIT BACKUP`).

---

## Verification Plan

### Automated Tests
Run Node unit tests to check:
*   Expected `sos_` key scopes.
*   Version 3 metadata attributes.
*   Validation blocks against script/URL injections.
*   Merge and replace modes.
