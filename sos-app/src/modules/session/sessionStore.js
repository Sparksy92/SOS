import { localStore } from '../../services/localStore.js';

const SAVED_ANSWERS_KEY = 'saved_answers';
const SAVED_SOURCES_KEY = 'saved_sources';
const FIELD_NOTES_KEY = 'field_notes';
const REPORT_DRAFTS_KEY = 'report_drafts';
const ACTIVE_SESSION_KEY = 'active_session';

export const loadSavedAnswers = () => localStore.get(SAVED_ANSWERS_KEY, []);
export const saveAnswers = (items) => localStore.set(SAVED_ANSWERS_KEY, items);
export const addSavedAnswer = (item) => {
  const items = loadSavedAnswers();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  saveAnswers(items);
  return newItem;
};

export const loadSavedSources = () => localStore.get(SAVED_SOURCES_KEY, []);
export const saveSources = (items) => localStore.set(SAVED_SOURCES_KEY, items);
export const addSavedSource = (item) => {
  const items = loadSavedSources();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  saveSources(items);
  return newItem;
};

export const loadFieldNotes = () => localStore.get(FIELD_NOTES_KEY, []);
export const saveFieldNotes = (items) => localStore.set(FIELD_NOTES_KEY, items);
export const addFieldNote = (item) => {
  const items = loadFieldNotes();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  saveFieldNotes(items);
  return newItem;
};

export const loadReportDrafts = () => localStore.get(REPORT_DRAFTS_KEY, []);
export const saveReportDrafts = (items) => localStore.set(REPORT_DRAFTS_KEY, items);
export const addReportDraft = (item) => {
  const items = loadReportDrafts();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  saveReportDrafts(items);
  return newItem;
};

export const loadActiveSession = () => localStore.get(ACTIVE_SESSION_KEY, {
  id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
  title: 'Active Session',
  createdAt: new Date().toISOString(),
  notes: []
});
export const saveActiveSession = (session) => localStore.set(ACTIVE_SESSION_KEY, session);

// --- PURE JS BACKUP & RESTORE UTILITIES (Testable under Node.js) ---

export const validateBackup = (backupObject) => {
  if (!backupObject || typeof backupObject !== 'object') {
    return { valid: false, error: 'Backup is not a valid JSON object.' };
  }
  if (backupObject.backupType !== 'sos_session_backup') {
    return { valid: false, error: 'Invalid backup identifier (backupType mismatch).' };
  }
  if (typeof backupObject.version !== 'number') {
    return { valid: false, error: 'Backup version metadata is missing or invalid.' };
  }
  if (!backupObject.data || typeof backupObject.data !== 'object') {
    return { valid: false, error: 'Backup payload data object is missing.' };
  }

  const collections = ['savedAnswers', 'savedSources', 'fieldNotes', 'reportDrafts'];
  for (const col of collections) {
    const arr = backupObject.data[col];
    if (!arr) {
      return { valid: false, error: `Backup data payload is missing collection: ${col}` };
    }
    if (!Array.isArray(arr)) {
      return { valid: false, error: `Collection ${col} is not a valid array.` };
    }
    for (const item of arr) {
      if (!item.id || !item.createdAt) {
        return { valid: false, error: `Item inside collection ${col} is missing required 'id' or 'createdAt' fields.` };
      }
    }
  }

  // Version 2 checks (Missions)
  if (backupObject.version >= 2) {
    if (backupObject.data.missions) {
      if (!Array.isArray(backupObject.data.missions)) {
        return { valid: false, error: 'Missions collection is not a valid array.' };
      }
      for (const item of backupObject.data.missions) {
        if (!item.id || !item.createdAt) {
          return { valid: false, error: "Item inside missions collection is missing required 'id' or 'createdAt' fields." };
        }
      }
    }
  }

  return { valid: true };
};

export const mergeCollections = (existingList, importedList) => {
  const merged = [...existingList];

  importedList.forEach(importedItem => {
    const existingIdx = merged.findIndex(x => x.id === importedItem.id);
    if (existingIdx !== -1) {
      const existingItem = merged[existingIdx];
      const existingTime = new Date(existingItem.updatedAt || existingItem.createdAt).getTime();
      const importedTime = new Date(importedItem.updatedAt || importedItem.createdAt).getTime();
      
      // Imported item wins only if it has a newer timestamp
      if (importedTime > existingTime) {
        merged[existingIdx] = { ...existingItem, ...importedItem };
      }
    } else {
      merged.push(importedItem);
    }
  });

  return merged;
};

// --- BROWSER LOCALSTORE ACTIONS ---

export const exportAllSavedData = () => {
  return {
    backupType: 'sos_session_backup',
    version: 2,
    exportedAt: new Date().toISOString(),
    data: {
      savedAnswers: loadSavedAnswers(),
      savedSources: loadSavedSources(),
      fieldNotes: loadFieldNotes(),
      reportDrafts: loadReportDrafts(),
      activeSession: loadActiveSession(),
      missions: localStore.get('missions', []),
      activeMission: localStore.get('active_mission', null)
    }
  };
};

export const importSavedData = (backupObject) => {
  const validation = validateBackup(backupObject);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const data = backupObject.data;

  if (data.savedAnswers) {
    const merged = mergeCollections(loadSavedAnswers(), data.savedAnswers);
    saveAnswers(merged);
  }
  if (data.savedSources) {
    const merged = mergeCollections(loadSavedSources(), data.savedSources);
    saveSources(merged);
  }
  if (data.fieldNotes) {
    const merged = mergeCollections(loadFieldNotes(), data.fieldNotes);
    saveFieldNotes(merged);
  }
  if (data.reportDrafts) {
    const merged = mergeCollections(loadReportDrafts(), data.reportDrafts);
    saveReportDrafts(merged);
  }
  if (data.activeSession) {
    saveActiveSession(data.activeSession);
  }

  // Version 2 imports
  if (backupObject.version >= 2 && data.missions) {
    const existingMissions = localStore.get('missions', []);
    const merged = mergeCollections(existingMissions, data.missions);
    localStore.set('missions', merged);
    
    if (data.activeMission) {
      localStore.set('active_mission', data.activeMission);
    }
  }

  return true;
};

export const clearAllSavedData = () => {
  localStore.remove(SAVED_ANSWERS_KEY);
  localStore.remove(SAVED_SOURCES_KEY);
  localStore.remove(FIELD_NOTES_KEY);
  localStore.remove(REPORT_DRAFTS_KEY);
  localStore.remove(ACTIVE_SESSION_KEY);
  localStore.remove('missions');
  localStore.remove('active_mission');
};
