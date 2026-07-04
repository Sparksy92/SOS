# Implementation Plan — Phase 15: Library Lifecycle Dashboard & Manifest Reconciliation

> [!NOTE]
> This phase implements a read-only local lifecycle reconciliation dashboard. It does not introduce any automated downloads, file transfers, indexing, or parsing.

## Proposed Components

### 1. Path Validator Cleanup (`isAbsolutePath` refinement)
*   Refine `isAbsolutePath` in `importApprovalLedgerStore.js` to strip `https?://` prefixes (already done in Phase 14) and also specifically bypass matching URL path segments like `/home/` when part of a URL scheme. 
*   Add unit tests confirming that `https://example.org/home/survival-guide.pdf` is allowed while `/home/blair/book.pdf` is rejected.

### 2. Library Lifecycle Analyzer (`libraryLifecycleAnalyzer.js`)
*   Synthesizes metadata from `GAP_ANALYSIS_DATA`, `loadLedger()`, `loadQueue()`, `loadAllowlist()`, and staging endpoints.
*   Produces unified lifecycle records containing status mapping warnings and recommended next steps.

### 3. UI Tab Panels (`LibraryLifecyclePanel.jsx`)
*   Add "Lifecycle" tab under `OFFLINE TOOLKIT`.
*   Shows status summary metrics, a searchable reconciliation table, and local Markdown/JSON export features.

### 4. Integrations
*   **Manual Import**, **Acquisition Queue**, and **Approval Ledger**: Show lifecycle status hints and render `"Open Lifecycle"` navigation buttons.

### 5. J.A.R.V.I.S. conversational updates
*   Summarizes local lifecycle counts, stuck files, missing evidence, and recommended next steps.

---

## Verification Plan

### Automated Tests
Run unit tests to verify:
*   Refined path validator allows legitimate `/home/` URLs.
*   Lifecycle analyzer derives status attributes.
*   Rejections of absolute paths, dangerous schemes, and invalid imports.
