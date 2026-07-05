# SurvivalOS Operator Update Runbook

This runbook guides operators through pulling repository updates, verifying configuration backups, rebuilding build-time dependencies, and validating system integrity after updating the application code.

SurvivalOS is designed to operate in a fully offline environment. Updates must be executed with safety checks to prevent data loss or service disruption.

---

## Pre-Update Backup Checklist

Before applying any code updates, you must preserve your local database indices, ledger approvals, active missions, and settings.

1. **Open SurvivalOS** inside your browser.
2. Navigate to **Offline Toolkit > Backup**.
3. Under the **Create Toolkit Backup** card, click **Create Local JSON Backup**.
4. Confirm the file `sos_toolkit_backup_[DATE].json` has been downloaded to your local downloads folder.
5. Export a backup summary: click **Export Backup Summary** (`sos_backup_summary_[DATE].md`) for human review.

---

## Pulling Updates & Rebuilding

Once your configurations are safely backed up, apply the repository updates and compile the production build.

### 1. Retrieve the Latest Code
Open PowerShell or Git Bash and fetch the latest repository commits:
```powershell
git fetch origin
git pull origin main
```

### 2. Install Project Dependencies
Run dependency audits and installations for both backend and frontend applications:
```powershell
# Update server dependencies
cd sos-server
npm install

# Update frontend dependencies
cd ../sos-app
npm install
```

### 3. Recompile Frontend Production Assets
The application must compile static files to serve them on port 3001 in production mode:
```powershell
# Inside sos-app/
npm run build
```
*Note: You can also use the launcher script to recompile assets by selecting option `8. Run Frontend Build Compiler`.*

---

## Post-Update Verification

After compiling, verify system health and restore configurations if necessary.

### 1. Launch the Server
Start the production environment:
- Run `launcher.bat` at the repository root folder.
- Select Option `1. Start SurvivalOS (Production Mode)`.
- This will boot the backend process on port `3001` and serve static assets.

### 2. Verify System Health Check
- Go to the **Release Check** tab.
- Click **Refresh Release Check**.
- Ensure the **Overall Status** is green/yellow and **Backend Health Status** reports **ONLINE**.
- If there are missing files or schema version conflicts, review the blockers listed in the **Audit Findings** card.

### 3. Run Configuration Integrity Audit
- Navigate to **Offline Toolkit > Backup**.
- Click **Run Integrity Audit** under the status card.
- If any keys show schema violations or warnings:
  - Paste your pre-update backup JSON contents into the **Restore Toolkit Backup** text area.
  - Click **Preview Backup Import**.
  - Select **Replace known keys (Overwrite)**.
  - Type `RESTORE TOOLKIT BACKUP` to confirm.
  - Click **Replace Known Keys**.
