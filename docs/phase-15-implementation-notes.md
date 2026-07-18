# Phase 15 Implementation Notes — Library Lifecycle Dashboard & Manifest Reconciliation

This document outlines the design, implementation, and verification details for Phase 15, adding a read-only local lifecycle dashboard and manifest reconciliation layers in SurvivalOS.

## Subsystems Implemented

### 1. Library Lifecycle Analyzer (`libraryLifecycleAnalyzer.js`)
*   Synthesizes catalog metadata from local stores: Gap Analyzer, Approval Ledger, Acquisition Queue, Source Allowlist, staging folders, and materials manifest files.
*   Enforces conservative matching strategies (exact/normalized filenames, title containing stem, URL matching, and ledger IDs). Unconfirmed alignments are flagged as `"Possible match"`.
*   Assigns a lifecycle stage: `candidate_review`, `approval_review`, `acquisition_planned`, `manually_acquired`, `staged`, `in_materials`, `indexed`, `blocked`, or `rejected`.
*   Evaluates evidence completeness (`present`, `partial`, or `missing`) based on official source URLs and operator signature evidence notes.
*   Generates next-step guidance messages and risk warnings.

### 2. UI Sub-Tab Pane (`LibraryLifecyclePanel.jsx`)
*   Integrated a new sub-tab named **Lifecycle** inside the `OFFLINE TOOLKIT` workspace.
*   Displays summary dashboard statistics for planning targets, pending approval queue entries, and index states.
*   Includes a filterable datagrid rendering titles, stages, evidence status, and next-step actions.
*   Allows local JSON/Markdown exports.
*   Contains safe navigation links to existing sub-tabs (Gap Analyzer, Approval Ledger, Acquisition Queue, Source Allowlist, Manual Import) and the manual Index Integrity page.

### 3. Integrations
*   **Manual Import**: Staged queue cards show an `"Open Lifecycle"` button next to matching files.
*   **Acquisition Queue**: Cards show dynamic lifecycle tag summaries and a navigation button.
*   **Approval Ledger**: Selected editor entries display a lifecycle stage preview and navigation link.

### 4. Jarvis Conversational Guidance
*   Deterministic local chat intercepts in `App.jsx` handle prompt requests for:
    *   `show my library lifecycle`
    *   `what references are stuck?`
    *   `what references need evidence?`
    *   `what references are ready to index?`
    *   `what references are staged but not indexed?`
    *   `what references are blocked or rejected?`
    *   `what should i do next for my library?`
*   Summarizes dynamic local store counts and guidance.

### 5. Path Validator Refinement
*   Updated `isAbsolutePath` in `importApprovalLedgerStore.js` to strip `https?://` prefixes and bypass folder keyword checks (e.g. `/home/`) when evaluated as part of a URL, preventing false path rejection flags.

---

## Verification Logs

### Automated Tests
Node unit tests verify store namespaces, validator updates, stage derivations, matches, UI strings, and Jarvis checks:
*   Test File Path: [`sos-server/tests/libraryLifecycle.test.mjs`](file:///c:/Users/operator/Downloads/survival/sos-server/tests/libraryLifecycle.test.mjs)
```bash
node --test sos-server/tests/libraryLifecycle.test.mjs
# tests 5
# pass 5
# fail 0
```
All 87 total tests pass:
```bash
node --test sos-server/tests/*.test.mjs
# tests 87
# pass 87
# fail 0
```

### Production Build
Vite production compilation succeeds cleanly:
```bash
dist/assets/index-3-9lIAHP.js   647.94 kB
✓ built in 903ms
```

---

## Safety Boundary Integration
Phase 16 adds a local-only backup, restore, and integrity audit layer for Offline Toolkit and mission governance data. It does not back up material files, scan drives, upload data, sync cloud storage, index files, OCR files, or parse document contents.

