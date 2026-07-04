# Phase 12 Implementation Notes — Offline Toolkit & Content Gap Analyzer

> [!NOTE]
> Phase 12A was an internal implementation slice. The final project feature is **Phase 12 — Offline Toolkit & Content Gap Analyzer**.

This document details the unified components, storage structures, routes, and safety check boundaries built for Phase 12.

## Components and Features Implemented

### 1. Offline Toolkit Guides (`offlineToolkitCatalog.js` & `OfflineToolkitPanel.jsx`)
*   Renders 14 card collections (Ollama, Kiwix, LocalSend, OsmAnd, KeePassXC, VeraCrypt, Obsidian, Calibre, ArchiveBox, CyberChef, Kolibri, Meshtastic, Briar, Jellyfin) listing descriptions, offline importance, setup difficulty, platform notes, storage costs, and risk warnings.
*   Uses official information reference URLs only. Does not expose direct executable/archive downloads or Swiss Bay mirror links.
*   Wording polished to emphasize offline navigation, manual position awareness, and external device/app capabilities instead of implying SOS itself does active GPS/live tracking.

### 2. Setup Wizard (`setupProgressStore.js` & `SetupWizardPanel.jsx`)
*   Guides the operator through the 12 approved configuration steps.
*   Directs manual actions to native SOS module views (Settings, Index Integrity, Notes & Reports) or inline guidelines. Zero background download/crawl triggers.
*   Enforces browser storage namespace keys `sos_setup_progress` and `sos_toolkit_checkmarks` directly, with safe one-time fallback migration for old keys.

### 3. Content Provider Registry (`contentProviderRegistry.js` & `ContentProviderRegistryPanel.jsx`)
*   Registers 9 local provider systems (Calibre, Obsidian, Kiwix, local staging, etc.).
*   `supportsAutomaticDownload` is strictly configured to `false` for all providers.
*   Displays capabilities, risk logs, and manual setup guides. Zero auto-scan/download triggers.

### 4. Content Gap Analyzer (`contentGapAnalyzer.js` & `ContentGapAnalyzerPanel.jsx`)
*   Parses static reference gap analysis data (`gapAnalysisData.js`).
*   Displays library coverage levels, missing categories, safe public domain candidates, and manual review items.
*   Exposes prominent copyright disclaimers:
    > "The audit does not prove copyright clearance. Unknown or restricted items require manual review. Only operator-approved allowlist items with official source evidence may be considered for any future download tool."

### 5. Kiwix/ZIM Catalog (`zimCatalog.js` & `ZimCatalogPanel.jsx`)
*   Exposes a server-controlled folder scan interface via `GET /api/toolkit/zim`.
*   ZIM route scans the configured folder (`process.env.SOS_ZIM_DIR` or default `import-staging/kiwix/`) for `.zim` filenames and returns size and title metadata. Does not read inside binary structures or run local servers.
*   Strict safety: ignores arbitrary paths submitted by the client (frontend does not submit paths), never leaks raw local paths in error responses, and returns paths sanitized as `[ZIM_FOLDER]/`.

### 6. Manual Import Staging (`manualImportQueueStore.js` & `ManualImportQueuePanel.jsx`)
*   Enforces a manual staging workflow inside the gitignored `import-staging/offline-library/` directory.
*   Exposes staging files metadata (filename, extension, size, mtime, sanitized path) via `GET /api/toolkit/staging`.
*   Category and risk category are mapped via filename heuristics. The `licenseStatus` is set to `"unknown"` by default, and heuristic matches are served as a `suggestedLicenseStatus` with `matchConfidence: "filename_match_only"`.
*   Verification status is set to `requires_operator_review`. Heuristics do not prove copyright clearance. UI requires operators to verify file source validity.
*   Includes a **Dismiss** action that saves to local storage key `sos_import_queue_dismissed` to hide listings without deleting files from disk.

### 7. Conversational J.A.R.V.I.S. Guidance (`App.jsx`)
*   Added local static guidance response command intercepts for:
    *   `offline readiness checklist` / `help me get ready for offline use` / `what offline tools should I set up?` / `show my offline toolkit status` (Checklist summaries).
    *   `what content am i missing?` (Gap analyzer category status).
    *   `do i have offline maps ready?` (Step 9 status check).
    *   `do i have kiwix set up?` (Step 10 status check).
    *   `how do i import new files safely?` (Step-by-step staging walk-through).

---

## Verification Logs

### Automated Tests
Node unit tests verify store key rules, catalog boundaries, provider registry safety, gap analyzer classifications, path sanitization, and route handlers:
*   Test File Path: [`sos-server/tests/toolkitProgress.test.mjs`](file:///c:/Users/Blair/Downloads/survival/sos-server/tests/toolkitProgress.test.mjs)
```bash
node --test sos-server/tests/toolkitProgress.test.mjs
# tests 7
# pass 7
# fail 0
```

### Production Build
Vite production build succeeds cleanly:
```bash
dist/assets/index-uxR-ZIh2.js   500.47 kB
✓ built in 351ms
```

---

## Safety Boundary Integration
Phase 13 builds on Phase 12 by adding operator approval records. It does not add downloads, automatic import, or indexing.

