# Local Material Library Documentation

The Survival Operating System (SOS) is designed to operate completely offline, acting as a portal to a massive local-first knowledge library. This document outlines directory layouts, file support, and data-integrity guidelines.

## 1. Directory Structure & Layout
All survival books, appropriate technology manuals, and video courses must be placed in the **root directory** of your external drive where the app is cloned:
```
survival/
├── sos-app/                 # React UI code (tracked in Git)
├── sos-server/              # Node.js API backend (tracked in Git)
├── launcher.bat             # Windows tactical launcher
├── launcher.sh              # Linux tactical launcher
├── ATL/                     # [Local Library] Applied Tech & Agriculture (500GB+ outside Git)
├── ENCYCLOPEDIAS.../        # [Local Library] Encyclopedias & Reference
├── CD3WD Extracted Manuals/ # [Local Library] Extracted CD3WD books
└── ...
```

## 2. Why Large Files are Excluded from Git
*   **Performance**: Git is not designed to handle massive libraries (500GB+). Tracking binary files like gigabyte-scale videos, PDFs, and ZIM archives causes severe slow-downs, bloat, and push failures.
*   **Security & Version Control**: Git should track only the code framework, interface assets, and calculations. The offline library data is preserved separately as a clean local folder structure.

## 3. Supported File Types
The backend scanner scans and renders the following extensions:
*   **Documents**: `.pdf`, `.epub`, `.zim`, `.doc`, `.docx`, `.txt`, `.zip`
*   **Videos (Native & Transcoded)**: `.mp4`, `.webm`, `.avi`, `.mkv`, `.wmv`, `.mov`
*   **Blueprints & Diagrams**: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.bmp`
*   **Discs**: `.iso`

## 4. Metadata Extraction
*   **File Sync**: When the server boots (or a manual scan is triggered), the backend processes each PDF to extract titles and summaries using a local Ollama model.
*   **Caching**: Metadata is stored locally in `sos-server/metadata.json` mapping the relative path of the file to its extracted info. This caches results so that indexing is never repeated.

## 5. OCR Output Storage
*   Scanned or image-only PDFs must be converted to text using the Vision OCR script (`ocr_library.py`).
*   **Storage Location**: Output markdown files are written in a `markdown_materials/` subfolder right next to the original PDF:
    ```
    ATL/01 Background reading/
    ├── 01-15.pdf
    └── markdown_materials/
        └── 01-15.md
    ```
*   **Duplicate Protection**: The backend scanner explicitly ignores the `markdown_materials` directory during file tree indexing to prevent showing duplicate items. When a user views `01-15.pdf` and activates the R.A.N.G.E.R. Audio Reader, the backend checks for the presence of the `.md` file in `markdown_materials/` to read the high-fidelity text instead.

## 6. Source Material Protection
*   The crawler operates in a **100% read-only** capacity for library files.
*   It never moves, alters, deletes, or renames your source files.
*   If files are corrupted or unreadable, the crawler logs the error and gracefully skips the file, keeping your original documents completely safe.
