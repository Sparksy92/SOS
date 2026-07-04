# SurvivalOS: Material Boundary & Crawler Hardening

This document outlines the directory access boundaries, static route configurations, and offline crawler execution safety protocols in SurvivalOS.

---

## 1. Material Root Resolution (`SOS_MATERIALS_DIR`)

SurvivalOS uses `materialRootService.js` as the single path authority to resolve and normalize document paths.
*   **Environment Variable**: If `process.env.SOS_MATERIALS_DIR` is set (e.g. `SOS_MATERIALS_DIR=C:\SurvivalLib`), the system resolves all document lookups against that directory.
*   **Fallback Compatibility Mode**: If the variable is not set, it defaults back to the parent directory of `sos-server` (the repository root). This ensures out-of-the-box compatibility with existing local setups.

---

## 2. Blocked Paths & Extension Filtering

Even when falling back to the repository root directory, source code, configuration files, and databases are strictly protected. The system runs path-segment checks (case-insensitive and compatible with both Windows and POSIX) to block any path containing:
*   **Source Code & App Folders**: `sos-app`, `sos-server`, `node_modules`
*   **System & IDE Configs**: `.git`, `.github`, `.gemini`, `.vscode`
*   **Private Environments**: `.env`, `.env.local`
*   **Database Files**: Any file ending in `.db`, `.sqlite`, or `.sqlite3` (e.g. `sos_database.db`)
*   **Cache Metadata**: `material_manifest.json`, `metadata.json`, `vector_store`, `markdown_materials`, `survival_zip_backups`

---

## 3. Guarded `/materials` Static Serving

The generic Express static middleware serving of the repository root is replaced with a custom Express 5 regex-matched guarded route:
```javascript
app.get(/^\/materials\/(.+)$/, (req, res) => { ... })
```
This route executes only safe, side-effect-free file streaming:
*   It decodes and resolves the web path using `resolveMaterialPath(req.path)`.
*   It rejects directory traversal (`../../`) or unauthorized folder roots, returning `403 Access Denied`.
*   It checks file existence and ensures it is not a directory.
*   It does **not** call Ollama, touch SQLite, extract archives, or parse file contents.

---

## 4. Crawler Safety Modes

Decoupled from a generic monolithic trigger, the background crawler supports three explicit, operator-initiated execution modes:

### A. `inventory` Mode (Default / Auto-crawl)
*   Performs a lightweight scanning of filenames to build `material_manifest.json`.
*   Does **not** index text contents or extract ZIP files. Safe, fast, and extremely low footprint.

### B. `index` Mode
*   Performs page-by-page text parsing and metadata extraction on supported files (`.pdf`, `.txt`) into the SQLite database.
*   Does **not** extract ZIP archives.

### C. `extract-zips` Mode
*   Processes compressed packages discovered in the materials folder.
*   **Dry Run**: Passing `"dryRun": true` reports discovered ZIP archives without extracting or moving files.
*   **Execution**: Requires the explicit, typed confirmation phrase: `"confirmation": "EXTRACT ZIP ARCHIVES"`. Original ZIP packages are moved to `survival_zip_backups` after successful extraction.
