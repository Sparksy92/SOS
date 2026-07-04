# Implementation Plan — Phase 13: Library Governance & Operator Approval Ledger

> [!NOTE]
> This phase implements local-only metadata tracking of operator review audits, source evidence, and licensing decisions. It does not introduce any file movers, deletes, or automated download tools.

## Proposed Components

### 1. Ledger Store (`importApprovalLedgerStore.js`)
*   Exposes CRUD functions for browser-only localStorage under key `sos_import_approval_ledger`.
*   Enforces data validation: rejects absolute paths, rejects script injection URLs (`javascript:`, `data:`, `file:`, `ftp:`), and strictly verifies required fields.
*   Enables JSON export/import and Markdown format exports.

### 2. Approval Ledger UI Tab (`ImportApprovalLedgerPanel.jsx`)
*   Appears as a new sub-tab "Approval Ledger" inside the `OFFLINE TOOLKIT` view.
*   Shows record summary stats, filters (Pending, Approved, Rejected, Needs Evidence), and a manual review editor.
*   Includes action buttons to save records, export files, and clear logs after confirmation.

### 3. Manual Import Integration (`ManualImportQueuePanel.jsx`)
*   Adds a button `Create Review Record` which inserts file metadata into the ledger store.
*   Displays a link `Open Approval Ledger` if a record is already detected.
*   Does not perform any disk actions.

### 4. Content Gap Analyzer (`ContentGapAnalyzerPanel.jsx`)
*   Displays matching ledger decisions under candidate items in the Gap Analyzer.
*   Wording strictly references operator audit logs and avoids copyright clearance claims.

### 5. Jarvis Guidance (`App.jsx`)
*   Local-only intercepts for counting and summarizing operator decisions.
*   Explicitly reports counts and guides operator to the ledger panel.

### 6. Backend Route Hardening (`toolkit.routes.js`)
*   Replaces raw catch-block error payloads in `/staging` and `/zim` with generic messages.
*   Keeps detailed logs server-side.

---

## Verification Plan

### Automated Tests
Run unit tests to verify:
*   Ledger namespace checks.
*   Import validation limits.
*   Catch-block error sanitization.

### Manual Checklist
1.  Open the Toolkit, toggle sub-tabs, and confirm ledger edits save.
2.  Import and export ledger data and verify schema constraints.
3.  Ask J.A.R.V.I.S. about the ledger and verify advisory responses.
