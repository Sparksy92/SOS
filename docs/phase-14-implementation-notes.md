# Phase 14 Implementation Notes — Controlled Acquisition Queue & Source Allowlist

This document details the acquisition queue and source allowlist stores, UI panels, integrations, Jarvis responses, test suite, and verification notes implemented for Phase 14.

## Features and Subsystems Implemented

### 1. Acquisition Queue Store (`acquisitionQueueStore.js`)
*   Manages manual reference acquisition plans under localStorage key `sos_acquisition_queue`.
*   Supported statuses: `planned`, `manually_acquired`, `manually_staged`, `blocked`, `skipped`.
*   Validates items:
    *   Bypasses protocols `http://` and `https://` during Windows drive pattern scans.
    *   Blocks absolute paths (`C:/`, `/home/...`, Windows drive letters, etc.) inside `title`, `filenameHint`, `officialSourceUrl`, `sourceEvidence`, and `operatorNotes`.
    *   Blocks dangerous URL schemes (such as `javascript:`, `data:`, `file:`, `ftp:`).
*   Enables JSON export/import and Markdown format checklist generation.

### 2. Source Allowlist Store (`sourceAllowlistStore.js`)
*   Logs official source definition properties under localStorage key `sos_source_allowlist`.
*   Enables checking `operatorTrusted` (trusted for manual data review by the operator, not legal clearance).
*   Validates absolute paths and dangerous URL schemes.
*   Enables JSON export/import and Markdown allowed sources report generation.

### 3. UI Panels (`AcquisitionQueuePanel.jsx` & `SourceAllowlistPanel.jsx`)
*   Integrated two new workspace sub-tabs under `OFFLINE TOOLKIT`: "Acquisition Queue" and "Source Allowlist".
*   "Acquisition Queue" lists items grouped/filtered by status, edit controls, clipboard URL copying, and backup buttons.
*   "Source Allowlist" logs repository labels, category applicability grids, trust toggle buttons, and mirror references.
*   Clearly displays local planning banners indicating that actions do not verify legal copyright clearance.

### 4. Cross-Module Integrations
*   **Gap Analyzer**: Annotates candidate items with LEDGER, QUEUE, and ALLOWLIST status tags. Adds safe buttons `Add to Acquisition Queue`, `Add Official Source to Allowlist`, and `Copy Official Source URL`.
*   **Approval Ledger**: For approved items with source URLs, enables quick queuing or allowlisting. Pending/rejected ledger records show warning guidance: `"Complete source evidence before queueing this item."`
*   **Manual Import**: Staged card queue shows `"Queue status: manually staged candidate detected"` when staged files align with queue hints, and adds a button `"Mark Queue Item as Manually Staged"` updating localStorage only.

### 5. J.A.R.V.I.S. Conversational Guidance
*   Deterministic local intercepts implemented in `App.jsx` for:
    *   `what is in my acquisition queue?`
    *   `what sources are allowlisted?`
    *   `what should i acquire next?`
    *   `what items are manually acquired?`
    *   `what items are manually staged?`
    *   `what acquisition items are blocked?`
    *   `show my source allowlist`
*   Reports local counts and statuses only. Never claims to automate fetches, downloads, or verify copyrights.

---

## Verification Logs

### Automated Tests
Node unit tests verify store key namespaces, creation helpers, persistence, import validations, UI strings, ledger gating, and Jarvis prompts:
*   Test File Path: [`sos-server/tests/acquisitionQueue.test.mjs`](file:///c:/Users/operator/Downloads/survival/sos-server/tests/acquisitionQueue.test.mjs)
```bash
node --test sos-server/tests/acquisitionQueue.test.mjs
# tests 8
# pass 8
# fail 0
```
All 82 total tests pass:
```bash
node --test sos-server/tests/*.test.mjs
# tests 82
# pass 82
# fail 0
```

### Production Build
Vite production build succeeds cleanly:
```bash
dist/assets/index-CPIsuCyX.js   621.65 kB
✓ built in 384ms
```

---

## Safety Boundary Integration
Phase 15 builds on the acquisition queue and source allowlist by adding a read-only lifecycle reconciliation dashboard. It does not add downloads, automatic import, file movement, file deletion, indexing, OCR, hashing, or parsing.

