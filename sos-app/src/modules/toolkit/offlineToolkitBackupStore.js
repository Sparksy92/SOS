import { BACKUP_KEYS_REGISTRY } from './offlineToolkitBackupRegistry.js';
import { isAbsolutePath } from './importApprovalLedgerStore.js';

// Safe localStorage helper for environment independence
const getLocalItem = (key) => {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(key);
};

const setLocalItem = (key, value) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const removeLocalItem = (key) => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
};

export const createOfflineToolkitBackup = () => {
  const records = {};
  let keysIncludedCount = 0;
  
  let ledgerCount = 0;
  let queueCount = 0;
  let allowlistCount = 0;
  let missionsCount = 0;
  let notesCount = 0;
  let reportsCount = 0;

  BACKUP_KEYS_REGISTRY.forEach(reg => {
    // Export the active key actually found in localStorage
    const rawVal = getLocalItem(reg.key);
    if (rawVal !== null) {
      try {
        const parsed = JSON.parse(rawVal);
        records[reg.key] = parsed;
        keysIncludedCount++;

        // Update counts
        if (reg.key === 'sos_import_approval_ledger' && Array.isArray(parsed)) ledgerCount = parsed.length;
        if (reg.key === 'sos_acquisition_queue' && Array.isArray(parsed)) queueCount = parsed.length;
        if (reg.key === 'sos_source_allowlist' && Array.isArray(parsed)) allowlistCount = parsed.length;
        if (reg.key === 'missions' && Array.isArray(parsed)) missionsCount = parsed.length;
        if (reg.key === 'saved_answers' && Array.isArray(parsed)) notesCount += parsed.length;
        if (reg.key === 'field_notes' && Array.isArray(parsed)) notesCount += parsed.length;
        if (reg.key === 'report_drafts' && Array.isArray(parsed)) reportsCount += parsed.length;
        if (reg.key === 'reports' && Array.isArray(parsed)) reportsCount += parsed.length;
      } catch (e) {
        // Carry on if unparsable
      }
    }
  });

  return {
    backupType: "survivalos_offline_toolkit_backup",
    schemaVersion: 3,
    createdAt: new Date().toISOString(),
    app: "SurvivalOS",
    includesMaterialFiles: false,
    includesCloudSync: false,
    records,
    counts: {
      keysIncluded: keysIncludedCount,
      ledgerRecords: ledgerCount,
      queueRecords: queueCount,
      allowlistRecords: allowlistCount,
      missions: missionsCount,
      notes: notesCount,
      reports: reportsCount
    },
    warnings: []
  };
};

export const validateOfflineToolkitBackup = (jsonStr, options = { ignoreUnknown: false }) => {
  if (typeof jsonStr === 'string' && jsonStr.length > 5 * 1024 * 1024) {
    return { valid: false, error: "Validation failed: Backup payload is oversized (> 5MB)." };
  }

  let payload;
  try {
    payload = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  } catch (e) {
    return { valid: false, error: "Validation failed: Backup is not a valid JSON string." };
  }

  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: "Validation failed: Backup payload must be a JSON object." };
  }

  const warnings = [];

  // Convert old sos_session_backup (Phase 6 / Version 2)
  if (payload.backupType === 'sos_session_backup') {
    warnings.push("Legacy backup payload format detected. Converting data to backup v3 layout.");
    const mappedRecords = {};
    if (payload.data) {
      Object.entries(payload.data).forEach(([oldKey, val]) => {
        const registryMatch = BACKUP_KEYS_REGISTRY.find(r => r.key === oldKey || (r.legacyAliases && r.legacyAliases.includes(oldKey)));
        if (registryMatch) {
          mappedRecords[registryMatch.key] = val;
        }
      });
    }
    payload = {
      backupType: "survivalos_offline_toolkit_backup",
      schemaVersion: 3,
      createdAt: payload.exportedAt || new Date().toISOString(),
      app: "SurvivalOS",
      includesMaterialFiles: false,
      includesCloudSync: false,
      records: mappedRecords,
      counts: {
        keysIncluded: Object.keys(mappedRecords).length,
        ledgerRecords: Array.isArray(mappedRecords.sos_import_approval_ledger) ? mappedRecords.sos_import_approval_ledger.length : 0,
        queueRecords: Array.isArray(mappedRecords.sos_acquisition_queue) ? mappedRecords.sos_acquisition_queue.length : 0,
        allowlistRecords: Array.isArray(mappedRecords.sos_source_allowlist) ? mappedRecords.sos_source_allowlist.length : 0,
        missions: Array.isArray(mappedRecords.missions) ? mappedRecords.missions.length : 0,
        notes: 0,
        reports: 0
      },
      warnings
    };
  }

  if (!payload.backupType) {
    return { valid: false, error: "Validation failed: missing backupType." };
  }

  if (payload.backupType !== 'survivalos_offline_toolkit_backup') {
    return { valid: false, error: "Validation failed: backupType mismatch." };
  }

  if (typeof payload.schemaVersion !== 'number') {
    return { valid: false, error: "Validation failed: schemaVersion must be a number." };
  }

  if (payload.schemaVersion > 3) {
    return { valid: false, error: `Validation failed: schemaVersion ${payload.schemaVersion} is higher than supported version 3.` };
  }

  if (!payload.records || typeof payload.records !== 'object') {
    return { valid: false, error: "Validation failed: records payload must be an object." };
  }

  // Scan for unknown keys
  const recordKeys = Object.keys(payload.records);
  for (const k of recordKeys) {
    const recognized = BACKUP_KEYS_REGISTRY.some(r => r.key === k || (r.legacyAliases && r.legacyAliases.includes(k)));
    if (!recognized) {
      if (!options.ignoreUnknown) {
        return { valid: false, error: `Validation failed: Unknown key "${k}" detected in backup records.` };
      } else {
        warnings.push(`Ignored unknown key "${k}" from backup payload.`);
      }
    }
  }

  // Scan for dangerous schemes, absolute paths, script elements, or binary-looking content
  let dangerousBlocked = false;
  let pathBlocked = false;
  let scriptBlocked = false;
  let binaryBlocked = false;

  const checkValue = (val, keyPath) => {
    if (typeof val === 'string') {
      const trimmed = val.toLowerCase().trim();
      
      // Binary checks
      if (
        val.startsWith('%PDF-') || 
        val.startsWith('PK\x03\x04') || 
        val.startsWith('MZ') ||
        /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(val) // non-printable control characters
      ) {
        binaryBlocked = true;
      }

      // Dangerous URL schemes
      if (
        trimmed.startsWith('javascript:') ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('file:') ||
        trimmed.startsWith('ftp:')
      ) {
        dangerousBlocked = true;
      }

      // Absolute local path check on path/filename keys
      const lowercaseKey = keyPath.toLowerCase();
      if (
        lowercaseKey.includes('path') ||
        lowercaseKey.includes('file') ||
        lowercaseKey.includes('url') ||
        lowercaseKey.includes('title')
      ) {
        if (isAbsolutePath(val)) {
          pathBlocked = true;
        }
      }

      // Executable-looking scripts
      if (
        val.includes('<script') ||
        val.includes('eval(') ||
        val.includes('Function(')
      ) {
        scriptBlocked = true;
      }
    } else if (val && typeof val === 'object') {
      Object.keys(val).forEach(k => checkValue(val[k], `${keyPath}.${k}`));
    }
  };

  try {
    checkValue(payload.records, 'records');
  } catch (e) {
    return { valid: false, error: `Validation failed during content scanning: ${e.message}` };
  }

  if (binaryBlocked) return { valid: false, error: "Validation failed: Binary-looking payload detected." };
  if (dangerousBlocked) return { valid: false, error: "Validation failed: Dangerous URL scheme injection detected." };
  if (pathBlocked) return { valid: false, error: "Validation failed: Absolute paths are not allowed." };
  if (scriptBlocked) return { valid: false, error: "Validation failed: Executable scripting strings detected." };

  const getRegistryEntryForRecordKey = (key) => {
    return BACKUP_KEYS_REGISTRY.find(
      (r) => r.key === key || (r.legacyAliases && r.legacyAliases.includes(key))
    );
  };

  const isExpectedType = (value, expectedType) => {
    if (expectedType === 'array') return Array.isArray(value);
    if (expectedType === 'object') {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    if (expectedType === 'string') return typeof value === 'string';
    if (expectedType === 'boolean') return typeof value === 'boolean';
    return true;
  };

  for (const [recordKey, recordValue] of Object.entries(payload.records)) {
    const registryEntry = getRegistryEntryForRecordKey(recordKey);

    if (!registryEntry) {
      continue; // unknown-key handling already ran above
    }

    if (!isExpectedType(recordValue, registryEntry.expectedType)) {
      return {
        valid: false,
        error: `Validation failed: Key "${recordKey}" expected ${registryEntry.expectedType}.`
      };
    }

    // record shape validation for high-risk collections:
    if (recordKey === 'sos_import_approval_ledger' && Array.isArray(recordValue)) {
      for (const rec of recordValue) {
        if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
          return { valid: false, error: `Validation failed: Each record in "sos_import_approval_ledger" must be an object.` };
        }
        if (!rec.filename) {
          return { valid: false, error: `Validation failed: Record in "sos_import_approval_ledger" is missing "filename".` };
        }
        const validDecisions = ['pending', 'approved', 'rejected', 'needs_more_evidence'];
        if (!rec.operatorDecision || !validDecisions.includes(rec.operatorDecision)) {
          return { valid: false, error: `Validation failed: Record in "sos_import_approval_ledger" has invalid "operatorDecision".` };
        }
      }
    }

    if (recordKey === 'sos_acquisition_queue' && Array.isArray(recordValue)) {
      for (const rec of recordValue) {
        if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
          return { valid: false, error: `Validation failed: Each record in "sos_acquisition_queue" must be an object.` };
        }
        if (!rec.title) {
          return { valid: false, error: `Validation failed: Record in "sos_acquisition_queue" is missing "title".` };
        }
        const validStatuses = ['planned', 'manually_acquired', 'manually_staged', 'blocked', 'skipped'];
        if (!rec.acquisitionStatus || !validStatuses.includes(rec.acquisitionStatus)) {
          return { valid: false, error: `Validation failed: Record in "sos_acquisition_queue" has invalid "acquisitionStatus".` };
        }
      }
    }

    if (recordKey === 'sos_source_allowlist' && Array.isArray(recordValue)) {
      for (const rec of recordValue) {
        if (!rec || typeof rec !== 'object' || Array.isArray(rec)) {
          return { valid: false, error: `Validation failed: Each record in "sos_source_allowlist" must be an object.` };
        }
        if (!rec.label) {
          return { valid: false, error: `Validation failed: Record in "sos_source_allowlist" is missing "label".` };
        }
      }
    }
  }

  return { valid: true, backupObj: payload, warnings };
};

export const previewOfflineToolkitBackup = (jsonStr, options = { ignoreUnknown: false }) => {
  const validation = validateOfflineToolkitBackup(jsonStr, options);
  if (!validation.valid) {
    return {
      keysFound: [],
      keysRecognized: [],
      keysIgnored: [],
      counts: {},
      warnings: [validation.error],
      dangerousValuesBlocked: true
    };
  }

  const backupObj = validation.backupObj;
  const keysFound = Object.keys(backupObj.records || {});
  const keysRecognized = [];
  const keysIgnored = [];

  keysFound.forEach(k => {
    const reg = BACKUP_KEYS_REGISTRY.find(r => r.key === k || (r.legacyAliases && r.legacyAliases.includes(k)));
    if (reg) {
      keysRecognized.push(k);
    } else {
      keysIgnored.push(k);
    }
  });

  return {
    keysFound,
    keysRecognized,
    keysIgnored,
    counts: backupObj.counts || {},
    warnings: validation.warnings || [],
    dangerousValuesBlocked: false
  };
};

export const restoreOfflineToolkitBackup = (jsonStr, options = { mode: 'merge', typedConfirm: '', ignoreUnknown: false }) => {
  const validation = validateOfflineToolkitBackup(jsonStr, { ignoreUnknown: options.ignoreUnknown });
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const backupObj = validation.backupObj;

  const isExpectedType = (value, expectedType) => {
    if (expectedType === 'array') return Array.isArray(value);
    if (expectedType === 'object') {
      return value !== null && typeof value === 'object' && !Array.isArray(value);
    }
    if (expectedType === 'string') return typeof value === 'string';
    if (expectedType === 'boolean') return typeof value === 'boolean';
    return true;
  };

  if (options.mode === 'replace_known_keys') {
    if (options.typedConfirm !== 'RESTORE TOOLKIT BACKUP') {
      throw new Error("Typed confirmation phrase mismatch.");
    }

    // Replace Mode: Only update/remove keys from the registry. NEVER call localStorage.clear()
    BACKUP_KEYS_REGISTRY.forEach(reg => {
      // Find if backup contains the canonical key or any of its legacy aliases
      let backupVal = backupObj.records[reg.key];
      if (backupVal === undefined && reg.legacyAliases) {
        for (const alias of reg.legacyAliases) {
          if (backupObj.records[alias] !== undefined) {
            backupVal = backupObj.records[alias];
            break;
          }
        }
      }

      if (backupVal !== undefined) {
        if (!isExpectedType(backupVal, reg.expectedType)) {
          throw new Error(`Restore blocked: Key "${reg.key}" expected ${reg.expectedType}.`);
        }
        setLocalItem(reg.key, JSON.stringify(backupVal));
        // Remove legacy key in localStorage if we updated canonical
        if (reg.legacyAliases) {
          reg.legacyAliases.forEach(alias => {
            if (alias !== reg.key && getLocalItem(alias) !== null) {
              removeLocalItem(alias);
            }
          });
        }
      }
    });
  } else {
    // Merge Mode
    BACKUP_KEYS_REGISTRY.forEach(reg => {
      // Read value from backup (checking canonical or legacy alias keys)
      let backupVal = backupObj.records[reg.key];
      if (backupVal === undefined && reg.legacyAliases) {
        for (const alias of reg.legacyAliases) {
          if (backupObj.records[alias] !== undefined) {
            backupVal = backupObj.records[alias];
            break;
          }
        }
      }

      if (backupVal === undefined) return;

      if (!isExpectedType(backupVal, reg.expectedType)) {
        throw new Error(`Restore blocked: Key "${reg.key}" expected ${reg.expectedType}.`);
      }

      const localVal = getLocalItem(reg.key);
      if (!localVal) {
        setLocalItem(reg.key, JSON.stringify(backupVal));
        return;
      }

      if (reg.expectedType === 'array') {
        let merged = [];
        try {
          const localArr = JSON.parse(localVal) || [];
          const backupArr = backupVal || [];
          
          if (Array.isArray(localArr) && Array.isArray(backupArr)) {
            merged = [...localArr];
            backupArr.forEach(bItem => {
              const matchIdx = merged.findIndex(x => {
                if (x.id && bItem.id) return x.id === bItem.id;
                if (x.filename && bItem.filename) return x.filename === bItem.filename;
                if (x.title && bItem.title) return x.title === bItem.title;
                if (x.label && bItem.label) return x.label === bItem.label;
                return false;
              });

              if (matchIdx !== -1) {
                const localItem = merged[matchIdx];
                const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
                const backupTime = new Date(bItem.updatedAt || bItem.createdAt || 0).getTime();
                
                // Merge and keep the newer one
                if (backupTime > localTime) {
                  merged[matchIdx] = { ...localItem, ...bItem };
                }
              } else {
                merged.push(bItem);
              }
            });
          }
        } catch (e) {
          merged = backupVal;
        }
        setLocalItem(reg.key, JSON.stringify(merged));
      } else {
        // Shallow merge object
        try {
          const localObj = JSON.parse(localVal) || {};
          const backupObj = backupVal || {};
          setLocalItem(reg.key, JSON.stringify({ ...localObj, ...backupObj }));
        } catch (e) {
          setLocalItem(reg.key, JSON.stringify(backupVal));
        }
      }
    });
  }

  return true;
};

export const generateOfflineToolkitBackupMarkdown = (backup) => {
  let md = `# SurvivalOS Offline Toolkit Backup Summary\n\n`;
  md += `Exported: **${backup.createdAt}**\n`;
  md += `Schema Version: **${backup.schemaVersion}**\n\n`;
  
  md += `### **Counts Reconciled**\n`;
  md += `- Ledger Records: **${backup.counts.ledgerRecords}**\n`;
  md += `- Acquisition Queue: **${backup.counts.queueRecords}**\n`;
  md += `- Allowed Sources: **${backup.counts.allowlistRecords}**\n`;
  md += `- Missions: **${backup.counts.missions}**\n`;
  md += `- Field/Planning Notes: **${backup.counts.notes}**\n`;
  md += `- Reports: **${backup.counts.reports}**\n\n`;

  md += `### **Backup Integrity Scope**\n`;
  md += `> [!NOTE]\n`;
  md += `> This backup contains only local operator metadata and configuration catalogs. It does NOT contain material files or cloud S3 replication tokens.\n`;
  
  return md;
};

export const runOfflineToolkitIntegrityAudit = () => {
  const findings = [];
  let status = "healthy";

  BACKUP_KEYS_REGISTRY.forEach(reg => {
    // Check if both canonical and legacy aliases exist simultaneously in localStorage
    if (reg.legacyAliases) {
      reg.legacyAliases.forEach(alias => {
        if (alias !== reg.key && getLocalItem(reg.key) !== null && getLocalItem(alias) !== null) {
          if (status !== 'error') status = 'warning';
          findings.push({
            severity: "warning",
            key: reg.key,
            message: `Duplicate keys found in localStorage: both canonical "${reg.key}" and legacy alias "${alias}" exist.`
          });
        }
      });
    }

    const rawVal = getLocalItem(reg.key);
    
    // Check missing expected keys
    if (rawVal === null) {
      findings.push({
        severity: "info",
        key: reg.key,
        message: `Key "${reg.key}" (${reg.label}) is not present in localStorage.`
      });
      return;
    }

    // Check corrupt JSON
    let parsed;
    try {
      parsed = JSON.parse(rawVal);
    } catch (e) {
      status = "error";
      findings.push({
        severity: "error",
        key: reg.key,
        message: `Corrupt JSON layout under key "${reg.key}". Error: ${e.message}`
      });
      return;
    }

    // Check wrong type
    if (reg.expectedType === 'array' && !Array.isArray(parsed)) {
      status = "error";
      findings.push({
        severity: "error",
        key: reg.key,
        message: `Expected type array under key "${reg.key}" but got object/string.`
      });
      return;
    }
    if (reg.expectedType === 'object' && (Array.isArray(parsed) || typeof parsed !== 'object')) {
      status = "error";
      findings.push({
        severity: "error",
        key: reg.key,
        message: `Expected type object under key "${reg.key}" but got array/string.`
      });
      return;
    }

    // Deep record verification
    if (reg.key === 'sos_import_approval_ledger' && Array.isArray(parsed)) {
      parsed.forEach((r, idx) => {
        if (!r.filename || !r.operatorDecision) {
          if (status !== 'error') status = 'warning';
          findings.push({
            severity: "warning",
            key: reg.key,
            message: `Ledger record at index ${idx} is missing filename or operatorDecision.`
          });
        }
      });
    }

    if (reg.key === 'sos_acquisition_queue' && Array.isArray(parsed)) {
      parsed.forEach((r, idx) => {
        if (!r.title || !r.acquisitionStatus) {
          if (status !== 'error') status = 'warning';
          findings.push({
            severity: "warning",
            key: reg.key,
            message: `Queue record at index ${idx} is missing title or acquisitionStatus.`
          });
        }
        const validStatuses = ['planned', 'manually_acquired', 'manually_staged', 'blocked', 'skipped'];
        if (r.acquisitionStatus && !validStatuses.includes(r.acquisitionStatus)) {
          status = "error";
          findings.push({
            severity: "error",
            key: reg.key,
            message: `Queue record at index ${idx} contains invalid acquisitionStatus "${r.acquisitionStatus}".`
          });
        }
      });
    }

    if (reg.key === 'sos_source_allowlist' && Array.isArray(parsed)) {
      parsed.forEach((r, idx) => {
        if (!r.label) {
          if (status !== 'error') status = 'warning';
          findings.push({
            severity: "warning",
            key: reg.key,
            message: `Allowlist record at index ${idx} is missing label.`
          });
        }
        if (r.officialSourceUrl) {
          const trimmed = r.officialSourceUrl.toLowerCase().trim();
          if (
            trimmed.startsWith('javascript:') ||
            trimmed.startsWith('data:') ||
            trimmed.startsWith('file:') ||
            trimmed.startsWith('ftp:')
          ) {
            status = "error";
            findings.push({
              severity: "error",
              key: reg.key,
              message: `Allowlist record at index ${idx} contains dangerous URL scheme in officialSourceUrl.`
            });
          }
        }
      });
    }

    if (reg.key === 'source_review_queue' && Array.isArray(parsed)) {
      parsed.forEach((r, idx) => {
        if (!r.source || !r.title) {
          if (status !== 'error') status = 'warning';
          findings.push({
            severity: "warning",
            key: reg.key,
            message: `Review queue record at index ${idx} is missing source or title.`
          });
        }
      });
    }
  });

  // Scan for any unknown keys beginning with sos_ in localStorage
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sos_')) {
        const isRegistered = BACKUP_KEYS_REGISTRY.some(r => r.key === key || (r.legacyAliases && r.legacyAliases.includes(key)));
        if (!isRegistered) {
          if (status !== 'error') status = 'warning';
          findings.push({
            severity: "warning",
            key: key,
            message: `Unknown localStorage key beginning with sos_ detected: "${key}"`
          });
        }
      }
    }
  }

  // Check active mission id synchronization
  const rawMissions = getLocalItem('missions');
  const rawActive = getLocalItem('active_mission');
  if (rawMissions && rawActive) {
    try {
      const missionsList = JSON.parse(rawMissions);
      const activeObj = JSON.parse(rawActive);
      if (activeObj && activeObj.id && Array.isArray(missionsList)) {
        const found = missionsList.some(m => m.id === activeObj.id);
        if (!found) {
          if (status !== 'error') status = 'warning';
          findings.push({
            severity: "warning",
            key: "active_mission",
            message: `Active mission ID "${activeObj.id}" is missing from missions list.`
          });
        }
      }
    } catch (e) {
      // captured in registry loop
    }
  }

  const recommendedActions = [];
  if (status === 'error') {
    recommendedActions.push("Corrupt or invalid records detected. Consider restoring from a clean local JSON backup.");
  } else if (status === 'warning') {
    recommendedActions.push("Incomplete record schemas found. Open the respective tab to verify and update entries.");
  } else {
    recommendedActions.push("All localStorage records healthy. Create a fresh JSON backup to preserve current state.");
  }

  return {
    status,
    checkedAt: new Date().toISOString(),
    findings,
    recommendedActions
  };
};

export const resetOfflineToolkitProfile = (typedConfirm) => {
  if (typedConfirm !== 'RESET PROFILE DATA') {
    throw new Error("Typed confirmation phrase must match 'RESET PROFILE DATA' exactly.");
  }
  
  BACKUP_KEYS_REGISTRY.forEach(reg => {
    removeLocalItem(reg.key);
    if (reg.legacyAliases) {
      reg.legacyAliases.forEach(alias => {
        removeLocalItem(alias);
      });
    }
  });
};

export const loadOfflineToolkitDemoData = (typedConfirm) => {
  if (typedConfirm !== 'LOAD DEMO DATA') {
    throw new Error("Typed confirmation phrase must match 'LOAD DEMO DATA' exactly.");
  }

  // Pre-clean existing keys first
  BACKUP_KEYS_REGISTRY.forEach(reg => {
    removeLocalItem(reg.key);
    if (reg.legacyAliases) {
      reg.legacyAliases.forEach(alias => {
        removeLocalItem(alias);
      });
    }
  });

  // Load obviously fake mock data
  const demoData = {
    sos_setup_progress: { "step-1": true, "step-2": true },
    sos_toolkit_checkmarks: { "card-1": true },
    sos_import_queue_dismissed: [],
    sos_import_approval_ledger: [
      {
        id: "demo-ledger-1",
        title: "MOCK: Wilderness First Aid Basics Guide",
        url: "http://localhost-safe/demo/wilderness-first-aid.pdf",
        license: "CC0 (Public Domain)",
        evidence: "DEMO ONLY: Verified mock public domain publication.",
        status: "needs_more_evidence",
        operatorTrusted: false
      }
    ],
    sos_acquisition_queue: [
      {
        id: "demo-acq-1",
        title: "MOCK: Emergency Water Filtration Standard Operations",
        url: "http://example.invalid/mock-water-ops.pdf",
        status: "planned",
        safetyChecked: true
      }
    ],
    sos_source_allowlist: [
      {
        id: "demo-allow-1",
        url: "http://example.invalid/trusted-repository",
        note: "DEMO ONLY: Example mock source allowlist entry."
      }
    ],
    missions: [
      {
        id: "demo-mission-1",
        name: "DEMO: Basic Water Harvesting Mission",
        status: "active",
        template: "water",
        createdAt: "2026-07-05T00:00:00Z"
      }
    ],
    active_mission: {
      id: "demo-mission-1",
      name: "DEMO: Basic Water Harvesting Mission",
      status: "active",
      template: "water",
      createdAt: "2026-07-05T00:00:00Z"
    },
    field_notes: [
      {
        id: "demo-note-1",
        missionId: "demo-mission-1",
        text: "DEMO ONLY: Logged mock field observation.",
        timestamp: "2026-07-05T00:05:00Z"
      }
    ],
    saved_answers: [],
    saved_sources: [],
    report_drafts: [],
    reports: [],
    source_review_queue: []
  };

  Object.keys(demoData).forEach(key => {
    setLocalItem(key, JSON.stringify(demoData[key]));
  });
};
