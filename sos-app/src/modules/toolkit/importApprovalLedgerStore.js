const LEDGER_KEY = 'sos_import_approval_ledger';

export const DECISIONS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  NEEDS_MORE_EVIDENCE: 'needs_more_evidence'
};

// URL validation helper (Evidence URLs only)
export const isValidUrl = (url) => {
  if (!url) return true;
  const lower = url.toLowerCase().trim();
  if (
    lower.startsWith('javascript:') || 
    lower.startsWith('data:') || 
    lower.startsWith('file:') || 
    lower.startsWith('ftp:')
  ) {
    return false;
  }
  return lower.startsWith('http://') || lower.startsWith('https://');
};

// Absolute path validation helper
export const isAbsolutePath = (p) => {
  if (!p) return false;
  const trimmed = p.trim();
  
  const isUrl = /^https?:\/\//i.test(trimmed);
  if (isUrl) {
    const withoutProto = trimmed.replace(/^https?:\/\//i, '');
    if (/[a-zA-Z]:[\\\/]/.test(withoutProto)) return true;
    return false;
  }

  if (/^[a-zA-Z]:[\\\/]/.test(trimmed)) return true;
  if (trimmed.startsWith('/') && !trimmed.startsWith('/..')) return true;
  if (/[a-zA-Z]:[\\\/]/.test(trimmed)) return true;
  if (
    trimmed.includes('Users/') || 
    trimmed.includes('Users\\') || 
    trimmed.includes('home/') || 
    trimmed.includes('home\\')
  ) {
    return true;
  }
  return false;
};

// Load ledger records
export const loadLedger = () => {
  try {
    const val = localStorage.getItem(LEDGER_KEY);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    console.error("Failed to load approval ledger:", e);
    return [];
  }
};

// Save ledger records
export const saveLedger = (records) => {
  try {
    localStorage.setItem(LEDGER_KEY, JSON.stringify(records));
  } catch (e) {
    console.error("Failed to save approval ledger:", e);
  }
};

// Add or update ledger record
export const saveRecord = (record) => {
  if (!record || typeof record !== 'object') {
    throw new Error("Invalid record type.");
  }
  if (!record.filename || typeof record.filename !== 'string') {
    throw new Error("Record is missing filename.");
  }
  if (!record.operatorDecision || !Object.values(DECISIONS).includes(record.operatorDecision)) {
    throw new Error("Invalid or missing operator decision.");
  }
  if (isAbsolutePath(record.filename) || isAbsolutePath(record.sanitizedPath)) {
    throw new Error("Absolute file paths are not allowed.");
  }
  if (!isValidUrl(record.officialSourceUrl) || !isValidUrl(record.thirdPartyMirrorUrl)) {
    throw new Error("Invalid URL scheme detected.");
  }

  const ledger = loadLedger();
  const existingIdx = ledger.findIndex(r => r.filename === record.filename);

  const cleanRecord = {
    id: record.id || `approval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    filename: record.filename.trim(),
    sanitizedPath: (record.sanitizedPath || '').trim(),
    detectedCategory: (record.detectedCategory || 'general_survival').trim(),
    riskCategory: record.riskCategory ? String(record.riskCategory).trim() : null,
    
    licenseStatus: 'unknown',
    suggestedLicenseStatus: (record.suggestedLicenseStatus || 'unknown').trim(),
    matchConfidence: (record.matchConfidence || 'none').trim(),
    verificationStatus: 'requires_operator_review',

    operatorDecision: record.operatorDecision,
    operatorVerifiedSource: !!record.operatorVerifiedSource,
    officialSourceUrl: (record.officialSourceUrl || '').trim(),
    thirdPartyMirrorUrl: (record.thirdPartyMirrorUrl || '').trim(),
    licenseEvidence: (record.licenseEvidence || '').trim(),
    reviewNotes: (record.reviewNotes || '').trim(),

    reviewedBy: (record.reviewedBy || '').trim(),
    reviewedAt: record.reviewedAt || new Date().toISOString(),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    ledger[existingIdx] = cleanRecord;
  } else {
    ledger.push(cleanRecord);
  }

  saveLedger(ledger);
  return ledger;
};

// Delete record (by filename)
export const deleteRecord = (filename) => {
  const ledger = loadLedger();
  const filtered = ledger.filter(r => r.filename !== filename);
  saveLedger(filtered);
  return filtered;
};

// Import validation
export const validateAndImport = (jsonStr) => {
  try {
    const rawData = JSON.parse(jsonStr);
    const records = Array.isArray(rawData) ? rawData : [rawData];

    const validated = [];
    for (const record of records) {
      if (!record || typeof record !== 'object') {
        throw new Error("Imported data must contain records of object type.");
      }
      if (!record.filename || typeof record.filename !== 'string') {
        throw new Error("Imported record is missing filename.");
      }
      if (!record.operatorDecision || !Object.values(DECISIONS).includes(record.operatorDecision)) {
        throw new Error(`Invalid decision for file ${record.filename}.`);
      }
      if (isAbsolutePath(record.filename) || isAbsolutePath(record.sanitizedPath)) {
        throw new Error(`Absolute paths not allowed in record: ${record.filename}`);
      }
      if (!isValidUrl(record.officialSourceUrl) || !isValidUrl(record.thirdPartyMirrorUrl)) {
        throw new Error(`Invalid url scheme in record: ${record.filename}`);
      }

      // Safe clean normalization
      validated.push({
        id: record.id || `approval_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        filename: String(record.filename).trim(),
        sanitizedPath: String(record.sanitizedPath || '').trim(),
        detectedCategory: String(record.detectedCategory || 'general_survival').trim(),
        riskCategory: record.riskCategory ? String(record.riskCategory).trim() : null,
        
        licenseStatus: 'unknown',
        suggestedLicenseStatus: String(record.suggestedLicenseStatus || 'unknown').trim(),
        matchConfidence: String(record.matchConfidence || 'none').trim(),
        verificationStatus: 'requires_operator_review',

        operatorDecision: record.operatorDecision,
        operatorVerifiedSource: !!record.operatorVerifiedSource,
        officialSourceUrl: String(record.officialSourceUrl || '').trim(),
        thirdPartyMirrorUrl: String(record.thirdPartyMirrorUrl || '').trim(),
        licenseEvidence: String(record.licenseEvidence || '').trim(),
        reviewNotes: String(record.reviewNotes || '').trim(),

        reviewedBy: String(record.reviewedBy || '').trim(),
        reviewedAt: record.reviewedAt || new Date().toISOString(),
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString()
      });
    }

    // Merge validated records into existing ledger (overwrite duplicates by filename)
    const current = loadLedger();
    const mergedMap = new Map(current.map(r => [r.filename, r]));
    
    validated.forEach(r => {
      mergedMap.set(r.filename, r);
    });

    const mergedList = Array.from(mergedMap.values());
    saveLedger(mergedList);
    return mergedList;
  } catch (e) {
    throw new Error(`Validation failed: ${e.message}`);
  }
};

// Export Markdown content generator
export const generateMarkdownReport = (ledger) => {
  const dateStr = new Date().toISOString().split('T')[0];
  const countByStatus = {
    pending: 0,
    approved: 0,
    rejected: 0,
    needs_more_evidence: 0
  };

  ledger.forEach(r => {
    if (countByStatus[r.operatorDecision] !== undefined) {
      countByStatus[r.operatorDecision]++;
    }
  });

  let md = `# SurvivalOS — Library Governance Audit Report\n\n`;
  md += `**Date Generated:** ${dateStr}\n\n`;
  md += `### Review Summary stats\n`;
  md += `*   **Approved items:** ${countByStatus.approved}\n`;
  md += `*   **Pending items:** ${countByStatus.pending}\n`;
  md += `*   **Rejected items:** ${countByStatus.rejected}\n`;
  md += `*   **Needs more evidence:** ${countByStatus.needs_more_evidence}\n\n`;
  md += `---\n\n`;
  md += `## Operator Approval Log\n\n`;

  if (ledger.length === 0) {
    md += `*No records currently tracked in the ledger.*\n`;
  } else {
    ledger.forEach((r, idx) => {
      md += `### ${idx + 1}. ${r.filename}\n`;
      md += `*   **Category:** ${r.detectedCategory.replace(/_/g, ' ')}\n`;
      md += `*   **Risk Category:** ${r.riskCategory ? r.riskCategory.replace(/_/g, ' ') : 'None'}\n`;
      md += `*   **Suggested License:** ${r.suggestedLicenseStatus.toUpperCase()}\n`;
      md += `*   **Operator Decision:** **${r.operatorDecision.toUpperCase()}**\n`;
      md += `*   **Verified Source:** ${r.operatorVerifiedSource ? 'YES' : 'NO'}\n`;
      md += `*   **Official Source URL:** ${r.officialSourceUrl || 'None'}\n`;
      md += `*   **License Evidence:** ${r.licenseEvidence || 'None'}\n`;
      md += `*   **Reviewed By:** ${r.reviewedBy || 'Operator'}\n`;
      md += `*   **Review Notes:** ${r.reviewNotes || 'No notes provided.'}\n\n`;
    });
  }

  return md;
};
