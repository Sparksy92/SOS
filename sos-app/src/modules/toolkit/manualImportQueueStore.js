const DISMISSED_KEY = 'sos_import_queue_dismissed';

export const loadDismissedImports = () => {
  try {
    const val = localStorage.getItem(DISMISSED_KEY);
    return val ? JSON.parse(val) : [];
  } catch (e) {
    console.error("Failed loading dismissed imports:", e);
    return [];
  }
};

export const saveDismissedImports = (list) => {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed saving dismissed imports:", e);
  }
};

export const dismissImport = (filename) => {
  const list = loadDismissedImports();
  if (!list.includes(filename)) {
    list.push(filename);
    saveDismissedImports(list);
  }
  return list;
};

export const resetDismissedImports = () => {
  saveDismissedImports([]);
  return [];
};
