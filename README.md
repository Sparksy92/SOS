# SurvivalOS (Survival Operations System)

SurvivalOS is a local-only, off-grid command center designed to manage offline emergency materials, pantry/water resources, and guided survival mission checklist workflows.

## Safety & Local-First Boundaries
*   **No Auto-Downloads**: SurvivalOS never automatically downloads copyrighted material references.
*   **No Cloud Integrations**: Backups are kept entirely local as profile JSON exports. No server sync or telemetry is uploaded.
*   **Safety Limits**:
    *   SurvivalOS does not call emergency services.
    *   SurvivalOS does not provide medical diagnosis or treatment.
    *   SurvivalOS does not provide offensive firearms guidance.
    *   SurvivalOS does not back up raw material files, only configuration and checklist metadata.

---

## Quick Start (Local Runbook)

### 1. Install Dependencies
Install packages for the backend and frontend. Run inside the root directory:
```bash
# Install backend packages
cd sos-server
npm install

# Install frontend packages
cd ../sos-app
npm install
```

### 2. Configure Environment (Optional)
Copy the example environment configuration:
```bash
cp .env.example .env
```
Inside `.env`, you can optionally configure `SOS_MATERIALS_DIR` to point to your offline libraries.

### 3. Start the Server and App
Use the pre-configured script from the root folder:
```bash
# On Windows, run the batch script:
start.bat
```
Alternatively, start the backend and frontend separately:
```bash
# Start backend API (Port 3001)
cd sos-server
node index.js

# Start frontend development server (Port 3000)
cd sos-app
npm run dev
```

### 4. Run Release Check
Open the application in your browser at `http://localhost:3000` (or the dev port shown). Select **RELEASE CHECK** from the sidebar list to verify connection and configuration status.

### 5. Verify Offline Toolkit & Backup Audits
*   Navigate to **OFFLINE TOOLKIT** > **Backup** to execute a local storage integrity check.
*   Confirm materials manifest file structure and index health.

### 6. Run Automated Unit Tests
Verify module correctness using the test runner inside the root folder:
```bash
node --test sos-server/tests/*.test.mjs
```

### 7. Build Production Bundle
To compile the frontend client:
```bash
cd sos-app
npm run build
```
