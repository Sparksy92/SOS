import { isAbsolutePath, isValidUrl } from './importApprovalLedgerStore.js';

const QUEUE_KEY = 'sos_acquisition_queue';

export const ACQ_STATUSES = {
  PLANNED: 'planned',
  MANUALLY_ACQUIRED: 'manually_acquired',
  MANUALLY_STAGED: 'manually_staged',
  BLOCKED: 'blocked',
  SKIPPED: 'skipped'
};

export const loadQueue = () => {
  try {
    const val = localStorage.getItem(QUEUE_KEY);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    console.error("Failed to load acquisition queue:", e);
    return [];
  }
};

export const saveQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (e) {
    console.error("Failed to save acquisition queue:", e);
  }
};

export const saveQueueItem = (item) => {
  if (!item || typeof item !== 'object') {
    throw new Error("Invalid record type.");
  }
  if (!item.title || typeof item.title !== 'string') {
    throw new Error("Record is missing title.");
  }
  if (
    isAbsolutePath(item.title) || 
    isAbsolutePath(item.filenameHint) || 
    isAbsolutePath(item.officialSourceUrl) || 
    isAbsolutePath(item.operatorNotes) || 
    isAbsolutePath(item.sourceEvidence)
  ) {
    throw new Error("Absolute file paths are not allowed.");
  }
  if (!isValidUrl(item.officialSourceUrl)) {
    throw new Error("Invalid URL scheme detected.");
  }
  const status = item.acquisitionStatus || ACQ_STATUSES.PLANNED;
  if (!Object.values(ACQ_STATUSES).includes(status)) {
    throw new Error("Invalid acquisition status.");
  }

  const queue = loadQueue();
  const existingIdx = queue.findIndex(q => 
    q.title.toLowerCase() === item.title.toLowerCase() || 
    (item.filenameHint && q.filenameHint && q.filenameHint.toLowerCase() === item.filenameHint.toLowerCase())
  );

  const cleanItem = {
    id: item.id || `acq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    title: String(item.title).trim(),
    filenameHint: String(item.filenameHint || '').trim(),
    category: String(item.category || 'general_survival').trim(),
    riskCategory: item.riskCategory ? String(item.riskCategory).trim() : null,
    sourceType: String(item.sourceType || 'unknown').trim(),
    officialSourceUrl: String(item.officialSourceUrl || '').trim(),
    sourceEvidence: String(item.sourceEvidence || '').trim(),
    suggestedLicenseStatus: String(item.suggestedLicenseStatus || 'unknown').trim(),
    ledgerRecordId: String(item.ledgerRecordId || '').trim(),
    ledgerDecision: String(item.ledgerDecision || 'none').trim(),
    acquisitionStatus: status,
    operatorNotes: String(item.operatorNotes || '').trim(),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    filePath: item.filePath ? String(item.filePath).trim() : '',
    currentPage: item.currentPage !== undefined ? Number(item.currentPage) : 0,
    totalPages: item.totalPages !== undefined ? Number(item.totalPages) : 0,
    progressPercent: item.progressPercent !== undefined ? Number(item.progressPercent) : 0,
    lastReadAt: item.lastReadAt || null
  };

  if (existingIdx >= 0) {
    queue[existingIdx] = cleanItem;
  } else {
    queue.push(cleanItem);
  }

  saveQueue(queue);
  return queue;
};

export const deleteQueueItem = (id) => {
  const queue = loadQueue();
  const filtered = queue.filter(q => q.id !== id);
  saveQueue(filtered);
  return filtered;
};

export const validateAndImportQueue = (jsonStr) => {
  try {
    const data = JSON.parse(jsonStr);
    if (!Array.isArray(data)) {
      throw new Error("Imported data must be a JSON array.");
    }
    const validated = [];
    for (const record of data) {
      if (!record || typeof record !== 'object') {
        throw new Error("Imported records must be objects.");
      }
      if (!record.title || typeof record.title !== 'string') {
        throw new Error("Imported record is missing title.");
      }
      if (
        isAbsolutePath(record.title) || 
        isAbsolutePath(record.filenameHint) || 
        isAbsolutePath(record.officialSourceUrl) || 
        isAbsolutePath(record.operatorNotes) || 
        isAbsolutePath(record.sourceEvidence)
      ) {
        throw new Error(`Absolute paths not allowed in record: ${record.title}`);
      }
      if (!isValidUrl(record.officialSourceUrl)) {
        throw new Error(`Invalid url scheme in record: ${record.title}`);
      }
      const status = record.acquisitionStatus || ACQ_STATUSES.PLANNED;
      if (!Object.values(ACQ_STATUSES).includes(status)) {
        throw new Error(`Invalid status for record: ${record.title}`);
      }

      validated.push({
        id: record.id || `acq_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        title: String(record.title).trim(),
        filenameHint: String(record.filenameHint || '').trim(),
        category: String(record.category || 'general_survival').trim(),
        riskCategory: record.riskCategory ? String(record.riskCategory).trim() : null,
        sourceType: String(record.sourceType || 'unknown').trim(),
        officialSourceUrl: String(record.officialSourceUrl || '').trim(),
        sourceEvidence: String(record.sourceEvidence || '').trim(),
        suggestedLicenseStatus: String(record.suggestedLicenseStatus || 'unknown').trim(),
        ledgerRecordId: String(record.ledgerRecordId || '').trim(),
        ledgerDecision: String(record.ledgerDecision || 'none').trim(),
        acquisitionStatus: status,
        operatorNotes: String(record.operatorNotes || '').trim(),
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        filePath: record.filePath ? String(record.filePath).trim() : '',
        currentPage: record.currentPage !== undefined ? Number(record.currentPage) : 0,
        totalPages: record.totalPages !== undefined ? Number(record.totalPages) : 0,
        progressPercent: record.progressPercent !== undefined ? Number(record.progressPercent) : 0,
        lastReadAt: record.lastReadAt || null
      });
    }

    const current = loadQueue();
    const mergedMap = new Map(current.map(q => [q.title.toLowerCase(), q]));
    validated.forEach(q => {
      mergedMap.set(q.title.toLowerCase(), q);
    });

    const merged = Array.from(mergedMap.values());
    saveQueue(merged);
    return merged;
  } catch (e) {
    throw new Error("Validation failed: " + e.message);
  }
};

export const generateQueueMarkdownChecklist = (queue) => {
  let md = `# SurvivalOS — Offline Reference Library Acquisition Checklist\n\n`;
  md += `> [!IMPORTANT]\n`;
  md += `> This checklist contains operator-entered manual acquisition plans and notes. It does NOT automatically verify legal copyright clearances or guarantee document safety.\n\n`;
  
  if (queue.length === 0) {
    md += `*No planned items in the acquisition queue.*\n`;
    return md;
  }

  const grouped = {};
  queue.forEach(item => {
    const cat = item.category || 'general_survival';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  Object.keys(grouped).sort().forEach(cat => {
    md += `## ${cat.replace(/_/g, ' ').toUpperCase()}\n\n`;
    grouped[cat].forEach(item => {
      const box = item.acquisitionStatus === ACQ_STATUSES.MANUALLY_ACQUIRED || item.acquisitionStatus === ACQ_STATUSES.MANUALLY_STAGED ? '[x]' : '[ ]';
      md += `- ${box} **${item.title}** (File Hint: \`${item.filenameHint || 'N/A'}\`)\n`;
      md += `  *   **Status:** ${item.acquisitionStatus.toUpperCase()}\n`;
      md += `  *   **Source Type:** ${item.sourceType}\n`;
      if (item.officialSourceUrl) {
        md += `  *   **Official Source URL:** ${item.officialSourceUrl}\n`;
      }
      if (item.sourceEvidence) {
        md += `  *   **Evidence Notes:** ${item.sourceEvidence}\n`;
      }
      if (item.operatorNotes) {
        md += `  *   **Operator Notes:** ${item.operatorNotes}\n`;
      }
      if (item.riskCategory) {
        md += `  *   **Risk Category:** ${item.riskCategory.replace(/_/g, ' ')}\n`;
      }
      md += `\n`;
    });
  });

  return md;
};
