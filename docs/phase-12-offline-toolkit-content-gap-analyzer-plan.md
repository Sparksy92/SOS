# Phase 12 — Offline Toolkit & Content Gap Analyzer

## Purpose
Phase 12 builds a user-facing configuration, toolkit guidance, and content gap analysis suite within SurvivalOS. It provides operators with step-by-step guidance to verify their offline readiness, audit their document category coverage, map offline tools, and stage file imports safely.

## User Experience Goal
An operator preparing their hardware for off-grid deployment needs to verify that all databases, local LLMs, offline maps, and reference manuals are ready. The user interface will walk them through a 12-stage setup checklist, analyze their local reference library for gaps against vetted catalogs, and provide instructions for setting up external applications (like Kiwix, LocalSend, or OsmAnd) without automated scripts doing it behind their back.

## Non-Negotiable Safety and Local-First Boundaries
*   **Zero Auto-Downloads**: No files, PDFs, or ZIPs will be downloaded from the internet.
*   **Zero Auto-Indexing**: Discovered files in import staging are not indexed until explicitly requested by the operator.
*   **Offline Storage Only**: Progress state is saved exclusively in local browser storage prefixed with `sos_`.
*   **No Auto-Installation**: No external binaries or packages will be installed or configured by the system.
*   **LAN Isolation**: No remote sync, cloud backup, or unauthenticated hotspot servers will be proposed.

## Current Inputs from Reference Audit
The gap analyzer leverages:
*   `offline-library-gap-analysis.json` (Structured JSON of category coverage and candidate lists).
*   `content-acquisition-candidates.md` (List of evidence-backed candidate sources and manual review items. The audit does not prove copyright clearance by itself. Only operator-approved items from an allowlist with official source evidence may be considered for any future download tool.).
*   `restricted-or-unknown-content-review.md` (List of restricted items requiring review).
*   `approved-public-domain-downloads.example.json` (Allowlist model schema).

## Proposed Feature Areas

### Offline Toolkit
A dedicated tab displaying guide cards for key offline utilities. It acts as an educational dashboard listing platform notes, storage costs, offline importance, and manual verification checkmarks.

### Setup Wizard
An interactive 12-stage wizard tracking the configuration of Ollama connection, materials path, test indexation, map preparation, and backup exports. Progress is saved using `sos_setup_progress` in localStorage.

### Content Provider Registry
A data registry cataloging data sources (e.g. Kiwix, Calibre, Obsidian, local import staging) and detailing their capabilities, risk profiles, and manual setup checklists.

### Content Gap Analyzer
A UI panel reading from the Reference Library Audit JSON to show missing categories, weak category levels, safe download candidates, and restricted reviews.

### Manual Import Workflow
A staging UI showing files placed in `import-staging/offline-library/`. Operators can verify the metadata, check safety risk indicators, and follow explicit instructions to manually copy the files into their materials directory.

### Kiwix/ZIM Awareness
A lightweight catalog reader listing `.zim` files present in a configured directory, showing titles, paths, and sizes, and allowing J.A.R.V.I.S. to refer users to them.

### Jarvis-Guided Offline Readiness
Conversational commands enabling J.A.R.V.I.S. to output checklist status, explain wizard stages, recommend setup guides, and list gap priorities.

---

## Proposed Data Models

### Setup Step Model
```typescript
interface SetupStep {
  id: number;
  title: string;
  description: string;
  category: "environment" | "llm" | "materials" | "maps" | "backup" | "power";
  completed: boolean;
  completedAt: string | null;
  manualActions: string[];
}
```

### Content Provider Model
```typescript
interface ContentProvider {
  id: string;
  label: string;
  type: string;
  localOnly: boolean;
  requiresManualSetup: boolean;
  supportsAutomaticDownload: boolean;
  supportsMetadataScan: boolean;
  supportsContentIndexing: "never" | "future_manual_only" | "manual_only";
  riskNotes: string[];
  setupChecklist: string[];
  officialLinks: string[];
}
```

### Staged File Model
```typescript
interface StagedFile {
  filename: string;
  size: number;
  mtime: number;
  detectedCategory: string;
  riskCategory: string | null;
  licenseStatus: "public_domain" | "open_license" | "official_free" | "user_owned" | "unknown" | "restricted";
  officialSourceUrl: string;
  verificationStatus: "verified" | "unverified";
}
```

---

## Proposed Local Storage Keys
*   `sos_setup_progress`: Map of step IDs to completion states.
*   `sos_toolkit_checkmarks`: Set of tool guides checked off by the operator.
*   `sos_provider_registry`: List of manually registered provider paths.
*   `sos_import_queue_dismissed`: List of staging filenames dismissed by the user.

---

## Proposed Components
1.  `OfflineToolkitPanel.jsx`: Visual tool cards with search, filters, and offline guide drawers.
2.  `SetupWizardPanel.jsx`: Step-by-step progress checklist tracking local preparation tasks.
3.  `ContentGapAnalyzerPanel.jsx`: Visual graph/dashboard indicating document category readiness.
4.  `ManualImportQueuePanel.jsx`: Interactive list showing staged items, risk labels, and copy instructions.
5.  `ZimCatalogPanel.jsx`: Catalog listing discovered `.zim` files and their metadata sizes.

---

## Proposed Modules
*   `setupProgressStore.js`: Methods for loading, setting, and checking setup wizard steps.
*   `contentProviderRegistry.js`: Predefined list of offline systems and manual registration hooks.
*   `manualImportQueueStore.js`: Front-end state manager that queries server-side staging folder contents.
*   `zimCatalog.js`: Helper reading directory `.zim` files from backend API endpoints.

---

## Proposed Backend Touch Points
*   `GET /api/toolkit/staging`: Lists files inside `import-staging/offline-library/` with sizes, metadata, and license classification.
*   `GET /api/toolkit/zim`: Scans a configured directory for `.zim` files and returns metadata.
*   `POST /api/toolkit/scan-manifest`: Triggers `manifestService.js` to rebuild the local material catalog safely. This endpoint must not perform deep indexing, OCR, ZIP extraction, document parsing, or crawler indexing. It may only call the existing safe manifest inventory rebuild path after explicit operator action and confirmation. It must use the existing Phase 10 material boundary helpers and must not bypass crawler confirmation rules.

---

## What Must Stay Manual
*   Downloading PDFs, ZIPs, ZIM archives, or executable tools.
*   Moving files from staging folders to live materials libraries.
*   Enabling or config-modifying third-party applications (like Ollama or Kiwix).
*   Charging off-grid power banks or checking cables.

## What Must Not Be Implemented
*   Direct download buttons fetching files from external mirror links.
*   Auto-index files on arrival in staging.
*   Auto-updating application source code.
*   LAN unauthenticated wireless exposures or background syncing.

---

## Test Plan
*   **Wizard Store Tests**: Assert that step completions update `sos_setup_progress` correctly and survive page refreshes.
*   **Gap Analyzer Tests**: Mock the gap analyzer JSON output and assert correct category categorization (e.g. *Adequate*, *Missing*, *Weak*).
*   **Import Staging API Tests**: Verify that `GET /api/toolkit/staging` returns sanitized relative paths and lists all blocked file extensions safely.
*   **ZIM Reader Tests**: Verify that `.zim` files are only read as directory metadata listings, with zero full-content parsing.

## Manual Verification Plan
1.  Open the Toolkit page, toggle guide cards, and confirm setup checklist updates.
2.  Place a dummy file (`US_Army_Manual.pdf`) in `import-staging/offline-library/` and verify that it appears in the staging panel with safety disclaimers.
3.  Confirm that moving the file to `/materials` and running manifest refresh moves it to the Gap Analyzer active file list.
4.  Ask J.A.R.V.I.S. *"offline readiness checklist"* and confirm conversational overview output.

## Acceptance Criteria
*   Setup progress saved strictly in local-only localStorage with prefix `sos_`.
*   Zero auto-download paths present in code or UI.
*   All external tools (Calibre, Kiwix, LocalSend) displayed as guide cards only.
*   Files in staging directory must not be automatically index-processed.
*   All unit tests pass successfully.

## Risks / Unknowns
*   **Varying ZIM Folder Paths**: Operators might configure deep nested directories. The server-side scan must have short timeouts and ignore deep system folders.
*   **Browser Storage Limits**: Large custom import manifests could exceed localStorage quotas. We must restrict client-side staging tracking to lightweight metadata.

## Implementation Summary
Phase 12 is implemented and completed as one unified phase: **Phase 12 — Offline Toolkit & Content Gap Analyzer**. All sub-features (Setup Wizard, Tool Guides, Content Providers, Gap Analyzer, ZIM Catalog, Manual Import) are integrated inside the unified Offline Toolkit panel workspace.
