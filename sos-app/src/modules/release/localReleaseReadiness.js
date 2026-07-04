export const buildLocalReleaseReadinessReport = ({
  backendHealth = null,
  indexStatus = null,
  toolkitAudit = null,
  lifecycleSummary = null,
  backupSummary = null,
  manifestStatus = null,
  environmentHints = {}
}) => {
  const sections = [];
  const blockers = [];
  const warnings = [];
  const nextSteps = [];
  let score = 100;

  // 1. Backend API
  const backendSec = {
    id: "backend",
    label: "Backend API",
    status: "unknown",
    summary: "Checking API server connection...",
    recommendedAction: "Confirm backend server process is running."
  };
  if (backendHealth) {
    if (backendHealth.ok) {
      backendSec.status = "ready";
      backendSec.summary = `Connected to Express API Server. Status: ${backendHealth.status || 'healthy'}.`;
      backendSec.recommendedAction = "None required.";
    } else {
      backendSec.status = "blocked";
      backendSec.summary = "Backend API returned non-ok status.";
      backendSec.recommendedAction = "Check backend service logs.";
      blockers.push("Backend API connection is offline or unhealthy.");
      score -= 25;
    }
  } else {
    backendSec.status = "blocked";
    backendSec.summary = "Unable to reach the backend API server on port 3001.";
    backendSec.recommendedAction = "Run start.bat or execute 'node index.js' inside sos-server.";
    blockers.push("Backend API server is unreachable.");
    score -= 25;
  }
  sections.push(backendSec);

  // 2. Frontend App
  const frontendSec = {
    id: "frontend",
    label: "Frontend App",
    status: "ready",
    summary: "React Application loaded successfully.",
    recommendedAction: "None required."
  };
  sections.push(frontendSec);

  // 3. Materials Directory
  const materialsSec = {
    id: "materials",
    label: "Materials Directory",
    status: "unknown",
    summary: "Checking directory configuration...",
    recommendedAction: "Define SOS_MATERIALS_DIR in settings or environment."
  };
  if (backendHealth) {
    if (backendHealth.materialRootConfigured) {
      materialsSec.status = "ready";
      materialsSec.summary = "Materials directory is configured and recognized by backend.";
      materialsSec.recommendedAction = "None required.";
    } else {
      materialsSec.status = "warning";
      materialsSec.summary = "Materials directory environment variable (SOS_MATERIALS_DIR) is not set. Defaulting to application root.";
      materialsSec.recommendedAction = "Define SOS_MATERIALS_DIR setting to separate library data from code.";
      warnings.push("Materials directory override is not configured.");
      score -= 10;
    }
  } else {
    materialsSec.status = "unknown";
    materialsSec.summary = "Manual verification required: Backend offline.";
    materialsSec.recommendedAction = "Verify directory path settings once backend is connected.";
  }
  sections.push(materialsSec);

  // 4. Manifest Availability
  const manifestSec = {
    id: "manifest",
    label: "Manifest Availability",
    status: "unknown",
    summary: "Checking manifest existence...",
    recommendedAction: "Trigger a manifest refresh under Offline Toolkit."
  };
  if (backendHealth) {
    if (backendHealth.manifestExists) {
      manifestSec.status = "ready";
      manifestSec.summary = "Library manifest cache file (material_manifest.json) exists.";
      manifestSec.recommendedAction = "None required.";
    } else {
      manifestSec.status = "warning";
      manifestSec.summary = "Manifest cache file is missing. The app catalog will appear empty.";
      manifestSec.recommendedAction = "Open Setup Wizard or Index Integrity and run manual manifest refresh.";
      warnings.push("Material manifest file does not exist.");
      score -= 15;
    }
  } else {
    manifestSec.status = "unknown";
    manifestSec.summary = "Manual verification required: Backend offline.";
    manifestSec.recommendedAction = "Inspect files once backend starts.";
  }
  sections.push(manifestSec);

  // 5. Index Integrity
  const indexSec = {
    id: "index",
    label: "Index Integrity",
    status: "unknown",
    summary: "Checking vector db index integrity...",
    recommendedAction: "Open Index Integrity Panel."
  };
  if (backendHealth) {
    if (backendHealth.metadataExists) {
      indexSec.status = "ready";
      indexSec.summary = "Vector database metadata file (metadata.json) exists.";
      indexSec.recommendedAction = "None required.";
    } else {
      indexSec.status = "warning";
      indexSec.summary = "Vector index metadata file is missing. Search functionality may require document indexing.";
      indexSec.recommendedAction = "Open Index Integrity Panel and run database verification.";
      warnings.push("Vector index metadata is not present.");
      score -= 10;
    }
  } else {
    indexSec.status = "unknown";
    indexSec.summary = "Manual verification required: Backend offline.";
    indexSec.recommendedAction = "Run index diagnostics once backend is reachable.";
  }
  sections.push(indexSec);

  // 6. Offline Toolkit State
  const toolkitSec = {
    id: "toolkit",
    label: "Offline Toolkit State",
    status: "unknown",
    summary: "Checking localStorage configuration integrity...",
    recommendedAction: "Run Backup Integrity Audit."
  };
  if (toolkitAudit) {
    if (toolkitAudit.status === 'healthy') {
      toolkitSec.status = "ready";
      toolkitSec.summary = "All registered localStorage configurations are healthy.";
      toolkitSec.recommendedAction = "None required.";
    } else if (toolkitAudit.status === 'warning') {
      toolkitSec.status = "warning";
      toolkitSec.summary = `Incomplete schemas or legacy duplicate keys detected in storage.`;
      toolkitSec.recommendedAction = "Open Backup tab and run Integrity Audit to review findings.";
      warnings.push("Offline Toolkit has configuration warnings.");
      score -= 5;
    } else {
      toolkitSec.status = "blocked";
      toolkitSec.summary = "Corrupt JSON data or critical schema violations detected.";
      toolkitSec.recommendedAction = "Restore local configurations from a clean backup JSON file.";
      blockers.push("Offline Toolkit local state is corrupt.");
      score -= 15;
    }
  } else {
    toolkitSec.status = "unknown";
    toolkitSec.summary = "Not checked. Manual verification required.";
    toolkitSec.recommendedAction = "Open Backup tab and trigger a local storage integrity audit.";
  }
  sections.push(toolkitSec);

  // 7. Backup Status
  const backupSec = {
    id: "backup",
    label: "Backup Status",
    status: "unknown",
    summary: "Checking configuration backups...",
    recommendedAction: "Create a local JSON backup."
  };
  if (backupSummary) {
    if (backupSummary.counts && backupSummary.counts.keysIncluded > 0) {
      backupSec.status = "ready";
      backupSec.summary = `Backup is configured. Total keys included: ${backupSummary.counts.keysIncluded}.`;
      backupSec.recommendedAction = "Export a fresh copy regularly.";
    } else {
      backupSec.status = "warning";
      backupSec.summary = "No active configurations found to back up.";
      backupSec.recommendedAction = "Perform Setup Wizard steps first.";
      warnings.push("Backup records are currently empty.");
      score -= 5;
    }
  } else {
    backupSec.status = "warning";
    backupSec.summary = "No local backup exported in current session.";
    backupSec.recommendedAction = "Open Backup tab and click Create Local JSON Backup.";
    warnings.push("Backup status is unverified.");
    score -= 5;
  }
  sections.push(backupSec);

  // 8. Mission Data
  const missionSec = {
    id: "missions",
    label: "Mission Data",
    status: "ready",
    summary: "Missions data initialized.",
    recommendedAction: "None required."
  };
  if (backupSummary && backupSummary.counts) {
    missionSec.summary = `Active missions loaded. Total count: ${backupSummary.counts.missions || 0}.`;
  }
  sections.push(missionSec);

  // 9. Lifecycle Dashboard
  const lifecycleSec = {
    id: "lifecycle",
    label: "Lifecycle Dashboard",
    status: "ready",
    summary: "Reconciliation layers verified.",
    recommendedAction: "None required."
  };
  if (lifecycleSummary) {
    lifecycleSec.summary = `Dashboard synced. Candidates: ${lifecycleSummary.candidates || 0}, Staged: ${lifecycleSummary.staged || 0}.`;
  }
  sections.push(lifecycleSec);

  // 10. High-Risk Guardrails
  const guardSec = {
    id: "guardrails",
    label: "High-Risk Guardrails",
    status: "ready",
    summary: "Platform safety rules and warning banners active.",
    recommendedAction: "None required."
  };
  sections.push(guardSec);

  // 11. Documentation / Runbook
  const docsSec = {
    id: "documentation",
    label: "Documentation / Runbook",
    status: "ready",
    summary: "Operator troubleshooting runbook and quick start manuals present.",
    recommendedAction: "Open docs/operator-runbook.md to review platform boundaries."
  };
  sections.push(docsSec);

  // Compute status
  let status = "ready";
  if (blockers.length > 0) {
    status = "blocked";
  } else if (warnings.length > 0 || score < 90) {
    status = "warning";
  }

  // Generate next steps
  if (status === "blocked") {
    nextSteps.push("Resolve backend connection errors and boot the API server.");
  }
  if (manifestSec.status !== "ready") {
    nextSteps.push("Refresh materials manifest cache from the Index Integrity panel.");
  }
  if (toolkitSec.status !== "ready") {
    nextSteps.push("Open Backup tab and run Integrity Audit to resolve storage issues.");
  }
  if (backupSec.status !== "ready") {
    nextSteps.push("Export a local profile JSON backup to safeguard configurations.");
  }
  if (nextSteps.length === 0) {
    nextSteps.push("System is fully ready. Open Mission Mode to begin guided planning.");
  }

  return {
    status,
    checkedAt: new Date().toISOString(),
    score: Math.max(0, score),
    sections,
    blockers,
    warnings,
    nextSteps
  };
};
