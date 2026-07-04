# SurvivalOS Operator Runbook

This manual guides off-grid operators through starting, using, auditing, and troubleshooting SurvivalOS.

## 1. What SurvivalOS Is
SurvivalOS is a local-only database, briefing, and checklist manager that runs entirely in the local web browser and a lightweight local Node.js server. It facilitates emergency preparation planning, materials inventory audits, and local AI-assisted search.

## 2. What SurvivalOS Is Not
*   **SurvivalOS does not call emergency services.**
*   **SurvivalOS does not provide medical diagnosis or treatment.**
*   **SurvivalOS does not provide offensive firearms guidance.**
*   **SurvivalOS does not automatically download copyrighted materials.**
*   **SurvivalOS does not sync to cloud.**
*   **SurvivalOS does not back up material files.**

---

## 3. Starting the System
1.  **Start the Backend API Server**:
    *   Open terminal/command prompt.
    *   Navigate to `sos-server/` and run `node index.js`.
    *   Confirm port 3001 is listening.
2.  **Start the Frontend UI Client**:
    *   Open a second terminal.
    *   Navigate to `sos-app/` and run `npm run dev`.
    *   Verify the console shows port 3000 is listening.
3.  **Launch the Browser**:
    *   Navigate to `http://localhost:3000`.

*On Windows, you can double-click `start.bat` in the root folder to automate these three steps.*

---

## 4. Confirming Server Health
To verify that the server is online and running safely:
1.  Navigate to **RELEASE CHECK** in the sidebar.
2.  Wait for the page to load or click **Refresh Release Check**.
3.  Alternatively, query the health endpoint directly by visiting `http://localhost:3001/api/health` in your browser. It returns basic diagnostic flags (`ok`, `materialRootConfigured`, `manifestExists`) while strictly omitting absolute directory paths or secrets.

---

## 5. Configuring Materials safely
The default materials library directory is the project root. To configure a dedicated, separate folder:
1.  Copy `.env.example` to `.env` (either in the root folder or inside `sos-server/`).
2.  Set `SOS_MATERIALS_DIR` to the absolute path of your target folder (e.g. `SOS_MATERIALS_DIR=D:/offline-libraries/survival-guides`).
3.  Restart the backend server.
4.  Verify that **RELEASE CHECK** registers `materialRootConfigured` as `ready`.

---

## 6. Local Reference Workflow & Governance

### Step A: Gap Candidate Review
1.  Open **OFFLINE TOOLKIT** > **Gap Analyzer**.
2.  Review missing category guides (candidates). Gaps are determined dynamically by checking metadata mappings.

### Step B: Approval Ledger Auditing
1.  Vetting candidates requires operator approval. Click **Open relevant panel** or visit **Approval Ledger**.
2.  Review licenses and evidence, then mark files as `approved`, `rejected`, or `needs_more_evidence`.

### Step C: Staging & Copying Files Manually
1.  Place raw files inside `import-staging/offline-library/`.
2.  Open **Manual Import** in the offline toolkit. Follow the instructions to review staged metadata and manually copy them to your materials folder.

### Step D: Indexing & Rebuilding Manifest
1.  Open **INDEX INTEGRITY** in the sidebar.
2.  Click **Rebuild Manifest** to register the new files.
3.  Click **Index AI** on individual documents to build local vector embeddings.

---

## 7. Configuration Backups & Restoring
1.  Open **OFFLINE TOOLKIT** > **Backup**.
2.  **Create Backup**: Click **Create Local JSON Backup** to package your progress and active missions. Download and store the JSON file.
3.  **Restore Backup**:
    *   *Merge Mode*: Combines backup items with local storage (keeping the newer record).
    *   *Replace Mode*: Overwrites local storage keys. Requires typing the confirmation phrase `RESTORE TOOLKIT BACKUP`.

---

## 8. Common Troubleshooting

### Backend Unreachable / Blocked Status
*   **Cause**: The Node server is not running or crashed.
*   **Resolution**: Check the terminal running `node index.js`. Confirm port 3001 is not blocked by another application.

### Materials Manifest Offline / Unknown Statuses
*   **Cause**: The backend was started without access to the material files, or the manifest file is corrupt.
*   **Resolution**: Go to **INDEX INTEGRITY** and click **Rebuild Manifest**.

### Vector Search Returns Empty Results
*   **Cause**: Ollama is unreachable or documents have not been indexed.
*   **Resolution**: Verify that Ollama is running locally at `http://127.0.0.1:11434`. Go to **INDEX INTEGRITY** and run indexing on files.
