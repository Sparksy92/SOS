import { isAbsolutePath, isValidUrl } from './importApprovalLedgerStore.js';

const ALLOWLIST_KEY = 'sos_source_allowlist';

export const loadAllowlist = () => {
  try {
    const val = localStorage.getItem(ALLOWLIST_KEY);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    console.error("Failed to load source allowlist:", e);
    return [];
  }
};

export const saveAllowlist = (list) => {
  try {
    localStorage.setItem(ALLOWLIST_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to save source allowlist:", e);
  }
};

export const saveAllowlistEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    throw new Error("Invalid record type.");
  }
  if (!entry.label || typeof entry.label !== 'string') {
    throw new Error("Record is missing label.");
  }
  if (
    isAbsolutePath(entry.label) || 
    isAbsolutePath(entry.officialSourceUrl) || 
    isAbsolutePath(entry.sourceEvidence) || 
    isAbsolutePath(entry.operatorNotes)
  ) {
    throw new Error("Absolute file paths are not allowed.");
  }
  if (!isValidUrl(entry.officialSourceUrl)) {
    throw new Error("Invalid URL scheme detected.");
  }

  const list = loadAllowlist();
  const existingIdx = list.findIndex(l => 
    l.label.toLowerCase() === entry.label.toLowerCase() || 
    (entry.officialSourceUrl && l.officialSourceUrl && l.officialSourceUrl.toLowerCase() === entry.officialSourceUrl.toLowerCase())
  );

  const cleanEntry = {
    id: entry.id || `src_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    label: String(entry.label).trim(),
    officialSourceUrl: String(entry.officialSourceUrl || '').trim(),
    sourceType: String(entry.sourceType || 'unknown').trim(),
    sourceEvidence: String(entry.sourceEvidence || '').trim(),
    categories: Array.isArray(entry.categories) ? entry.categories.map(String) : [],
    riskCategories: Array.isArray(entry.riskCategories) ? entry.riskCategories.map(String) : [],
    operatorTrusted: !!entry.operatorTrusted,
    operatorNotes: String(entry.operatorNotes || '').trim(),
    createdAt: entry.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    list[existingIdx] = cleanEntry;
  } else {
    list.push(cleanEntry);
  }

  saveAllowlist(list);
  return list;
};

export const deleteAllowlistEntry = (id) => {
  const list = loadAllowlist();
  const filtered = list.filter(l => l.id !== id);
  saveAllowlist(filtered);
  return filtered;
};

export const validateAndImportAllowlist = (jsonStr) => {
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
      if (!record.label || typeof record.label !== 'string') {
        throw new Error("Imported record is missing label.");
      }
      if (
        isAbsolutePath(record.label) || 
        isAbsolutePath(record.officialSourceUrl) || 
        isAbsolutePath(record.sourceEvidence) || 
        isAbsolutePath(record.operatorNotes)
      ) {
        throw new Error(`Absolute paths not allowed in record: ${record.label}`);
      }
      if (!isValidUrl(record.officialSourceUrl)) {
        throw new Error(`Invalid url scheme in record: ${record.label}`);
      }

      validated.push({
        id: record.id || `src_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        label: String(record.label).trim(),
        officialSourceUrl: String(record.officialSourceUrl || '').trim(),
        sourceType: String(record.sourceType || 'unknown').trim(),
        sourceEvidence: String(record.sourceEvidence || '').trim(),
        categories: Array.isArray(record.categories) ? record.categories.map(String) : [],
        riskCategories: Array.isArray(record.riskCategories) ? record.riskCategories.map(String) : [],
        operatorTrusted: !!record.operatorTrusted,
        operatorNotes: String(record.operatorNotes || '').trim(),
        createdAt: record.createdAt || new Date().toISOString(),
        updatedAt: record.updatedAt || new Date().toISOString()
      });
    }

    const current = loadAllowlist();
    const mergedMap = new Map(current.map(l => [l.label.toLowerCase(), l]));
    validated.forEach(l => {
      mergedMap.set(l.label.toLowerCase(), l);
    });

    const merged = Array.from(mergedMap.values());
    saveAllowlist(merged);
    return merged;
  } catch (e) {
    throw new Error("Validation failed: " + e.message);
  }
};

export const generateAllowlistMarkdownReport = (list) => {
  let md = `# SurvivalOS — Operator Trusted Source Allowlist Report\n\n`;
  md += `> [!IMPORTANT]\n`;
  md += `> Trusted flags indicate that the operator has reviewed and trusted these sources for manual data auditing. It does NOT imply that SurvivalOS has verified legal copyright clearances.\n\n`;

  if (list.length === 0) {
    md += `*No records in the source allowlist.*\n`;
    return md;
  }

  md += `| Source Label | Type | Official Source URL | Trusted? | Categories |\n`;
  md += `| --- | --- | --- | --- | --- |\n`;
  list.forEach(entry => {
    const trusted = entry.operatorTrusted ? 'YES ✓' : 'NO ✗';
    const cats = entry.categories.join(', ') || 'None';
    md += `| **${entry.label}** | ${entry.sourceType} | [Link](${entry.officialSourceUrl || '#'}) | **${trusted}** | ${cats} |\n`;
  });

  return md;
};
