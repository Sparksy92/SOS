# Indexing Strategy for 500GB+ Material Libraries

Processing massive local libraries requires strict resource gating to avoid CPU bottlenecks, thermal throttling, or disk I/O freezes. This document details the indexing architecture, crawler flags, and incremental sync protocols.

## 1. Safety Guard & Startup Modes
To prevent accidental background crawls that could slow down your system, the crawler has a configurable boot-start guard:
*   **Flag**: `SOS_AUTO_CRAWL=false` (Default)
*   **Auto-Crawl Disabled**: The crawler will NOT run at server startup. Existing database search indexes remain instantly accessible.
*   **Manual Trigger**: Scan triggers can be sent via a POST request to `/api/crawler/start`.

## 2. Quick Scan vs. Deep Scan
*   **Quick Scan (Metadata Cache Sync)**: Reads file metadata and checks if the relative path exists in `sos-server/metadata.json`. If present, it loads details instantly. If missing, it adds the record.
*   **Deep Scan (Full-Text FTS5 Rebuild)**: Re-scans all files, extracts text page-by-page from PDFs, and stores searchable chunks in the SQLite database (`sos_database.db`).

## 3. Incremental Index-New-Only Behavior
*   The crawler maintains a lookup table (`indexed_docs`) in SQLite.
*   Before parsing a file, it checks `SELECT indexed_at FROM indexed_docs WHERE path = ?`.
*   If the file has already been indexed, the parser skips it. This saves massive amounts of CPU and makes scans take seconds instead of hours on subsequent runs.

## 4. Manifest & Database Tracking
*   **Metadata Manifest**: Cached in `sos-server/metadata.json` for fast loading of folders and titles in the UI.
*   **Search Database**: Stored in `sos-server/sos_database.db`. It utilizes **SQLite FTS5 virtual tables** for sub-millisecond keyword matches across gigabytes of text.
*   **Memory Footprint**: The virtual table lives entirely on disk, keeping active RAM consumption under 50MB.

## 5. File Gating & Skipping Rules
*   **Size Limit**: Files larger than 2GB (such as large ISO or video archives) are registered in the directory structure but skipped by the text parser.
*   **Unsupported Formats**: Binary executables, system files, and git configuration directories are strictly bypassed.

## 6. Status Reporting & Progress Tracking
*   Get real-time crawler logs and statuses via `GET /api/crawler/status`.
*   Returns:
    *   `statusText`: Description of current action (e.g. "Syncing Document [15/200]").
    *   `processedDocs`: Count of completed files.
    *   `totalDocs`: Total count of files found in active directories.
    *   `currentFile`: Basename of the file currently being processed.

## 7. Pause & Resume
*   If the server is shut down or restarted, the crawler stops immediately without corrupting the database.
*   On restart, because it checks `indexed_docs` before indexing, it automatically resumes exactly where it left off, avoiding duplicate work.
