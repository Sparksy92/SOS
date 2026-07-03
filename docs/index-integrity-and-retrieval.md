# SurvivalOS: Index Integrity & Retrieval Auditor

This document defines the offline indexing standards and manifest integrity validation layer in SurvivalOS.

## The Definition of "Indexed"

In SurvivalOS, a reference document is defined as **Indexed** if and only if:
1.  It has an active entry inside the SQLite `indexed_docs` table.
2.  Its content has been successfully parsed into text chunks and saved inside the SQLite `document_chunks` table.

Jarvis uses the `document_chunks` table for offline RAG searches. If chunks are absent, Jarvis cannot find or retrieve facts from that document, regardless of any flag in the frontend or manifest.

---

## Mismatch Risk & Unified Indexing

Previously, a mismatch could occur because:
*   The background crawler parsed files into the SQLite database.
*   But manual single-document indexing via the Library UI only indexed documents into the Langchain `vectorStore` (HNSWLib) on disk.
*   This left the SQLite chunk table empty, meaning the document remained invisible to J.A.R.V.I.S. Chat, and the manifest flag remained out of sync.

### Unified Solution:
*   Both the crawler and manual single-document indexing now use the unified indexing pathway in `ai.indexFile`.
*   Manual indexing writes to both the Langchain vectorStore AND the SQLite `document_chunks` and `indexed_docs` tables under the correct `/materials/...` path format.
*   This instantly updates the manifest cache file so the document shows up as `INDEXED` in both the Library Browser and the Mission Source Finder.

---

## Index Integrity Auditor Interface

To monitor index sync states:
1.  Navigate to **INDEX INTEGRITY** in the sidebar.
2.  Click **RUN RETRIEVAL AUDIT** to query SQLite for the actual chunk count of all files.
3.  If mismatched flags are found:
    *   Click **REPAIR MANIFEST FLAGS** to update the manifest file to match the database state.
    *   This is an extremely fast operation because it queries SQLite counts and updates local JSON caches. No directory scans or parsing are executed.

---

## Technical Boundaries

To keep the application responsive:
*   **No Auto-Crawls**: The SQLite database auditor only queries existing tables. It never crawles directories, extracts ZIPs, or runs OCR automatically.
*   **Operator-Triggered**: Indexing and repairing must be explicitly initiated by click actions.
*   **Local-Only**: All database tables, manifest caches, and index files remain strictly local on the operator's device. No cloud indexing, external syncs, or telemetry are used.
