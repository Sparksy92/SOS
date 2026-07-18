# Implementation Plan — Phase 14: Controlled Acquisition Queue & Source Allowlist

> [!NOTE]
> This phase implements local-only planning checklist queues and source allowlist registries. It does not introduce any automated downloads, file copy/moves, file deletions, indexing, or parsing.

## Proposed Components

### 1. Acquisition Queue Store (`acquisitionQueueStore.js`)
*   Manages local queue records under localStorage key `sos_acquisition_queue`.
*   States tracked: `planned`, `manually_acquired`, `manually_staged`, `blocked`, `skipped`.
*   Enforces strong validations: rejects absolute paths in `filenameHint` / `title` / `officialSourceUrl`, and restricts URL schemes.

### 2. Source Allowlist Store (`sourceAllowlistStore.js`)
*   Manages operator-trusted source logs under localStorage key `sos_source_allowlist`.
*   Stores source labels, URLs, types, evidence, and notes.

### 3. UI Panels (`AcquisitionQueuePanel.jsx` & `SourceAllowlistPanel.jsx`)
*   Add two new sub-tabs: "Acquisition Queue" and "Source Allowlist" under the `OFFLINE TOOLKIT` workspace.
*   Enforce disclaimers: status entries are operator notes only and do not signify legal copyright clearance.

### 4. Integrations
*   **Gap Analyzer**: Adds buttons to add candidate items to the queue or trust their source in the allowlist. Matches matching records with their local statuses.
*   **Approval Ledger**: Adds buttons to queue approved ledger entries. Pending/rejected ledger items are blocked from queuing.
*   **Manual Import**: Staged files matching queue items can be marked as `manually_staged` in the queue store via button click.

### 5. R.A.N.G.E.R. guidance
*   Advisory-only intercepts for counting and summarizing planned, acquired, staged, or blocked reference checklist items.

---

## Verification Plan

### Automated Tests
Run unit tests to verify:
*   Ledger, queue, and allowlist stores validation behavior.
*   Path blocks and scheme rejections.
*   JSON backup schema integrity.

### Manual Checklist
1.  Verify sub-tabs appear inside the Toolkit.
2.  Add a candidate from Gap Analyzer to queue, verify it shows up in Acquisition Queue.
3.  Add source to allowlist, verify operator-trusted flags update.
4.  Test JSON export/import and Markdown exports.
5.  Ask R.A.N.G.E.R. conversational prompts and verify counts match.
