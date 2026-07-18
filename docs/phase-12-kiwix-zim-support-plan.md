# Kiwix / ZIM Support Plan

Kiwix distributes highly-compressed offline encyclopedia copies using the `.zim` format. Because `.zim` files can be extremely large (up to 100+ GB), Phase 12 implements a **metadata-aware only** approach to avoid memory bottlenecks and file-read performance overhead.

## Structural Design

### 1. ZIM Directory Scanner
SOS scans ZIM files using a server-side configured directory path (`process.env.SOS_ZIM_DIR` or default fallback `import-staging/kiwix/`).
The server-side scanner:
*   Lists files matching the `.zim` extension in the configured path.
*   Ignores any client-supplied folder parameters in requests to prevent scanning arbitrary paths or system folders.
*   Extracts filename, file path, and file size.
*   Does **not** read inside the `.zim` binary.
*   Does **not** index the contents of ZIM articles.
*   Never exposes raw local paths in payloads or error messages. ZIM paths returned to the frontend must be sanitized. Use placeholders such as `[ZIM_FOLDER]`.

### 2. Catalog Registry Schema
The scanned list is exposed to the frontend via `GET /api/toolkit/zim` in this format:
```json
{
  "zimFolder": "[ZIM_FOLDER]",
  "archives": [
    {
      "filename": "wikipedia_en_medicine_novid_2026-05.zim",
      "size": 1564892019,
      "title": "Wikipedia Medicine Encyclopedia",
      "language": "en",
      "path": "[ZIM_FOLDER]/wikipedia_en_medicine_novid_2026-05.zim"
    }
  ]
}
```

### 3. R.A.N.G.E.R. Guidance Integration
When an operator is planning a mission or asking a medical question, R.A.N.G.E.R. checks the ZIM catalog metadata. R.A.N.G.E.R. can suggest:
*   *"I see you have the Wikipedia Medicine ZIM archive (`wikipedia_en_medicine_novid_2026-05.zim`) configured. You can search this archive inside your Kiwix desktop application for detailed clinical procedures."*
*   This keeps R.A.N.G.E.R.'s scope strictly advisory and avoids parsing heavy binaries inside the NodeJS event loop.
