import { API_BASE } from '../../../config.js';
import { mycologyDb } from '../database/mycologyDb.js';
import seedPack from '../data/knowledge-packs/mycology/north-america-fungi.pack.json';
import greenhousePack from '../data/knowledge-packs/mycology/greenhouse-and-cultivation-mushrooms.pack.json';

function ensureDefaultPacksSeeded() {
  const mergedMap = new Map();
  if (seedPack.entries) seedPack.entries.forEach(e => mergedMap.set(e.id, e));
  if (greenhousePack.entries) greenhousePack.entries.forEach(e => mergedMap.set(e.id, e));
  mycologyDb.saveEntries(Array.from(mergedMap.values()));
}

export const mycologyService = {
  // Fetch entries with API call or localStore fallback
  fetchEntries: async (filters = {}) => {
    ensureDefaultPacksSeeded();
    try {
      const queryParams = new URLSearchParams(filters).toString();
      const res = await fetch(`${API_BASE}/api/mycology/entries?${queryParams}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          mycologyDb.saveEntries(data);
          return data;
        }
      }
    } catch (e) {
      console.warn("[MYCOLOGY SERVICE] Server API unavailable, using offline localStore:", e.message);
    }
    return mycologyDb.getEntries();
  },

  // Get single entry by ID
  getEntryById: async (id) => {
    try {
      const res = await fetch(`${API_BASE}/api/mycology/entries/${id}`);
      if (res.ok) return await res.json();
    } catch (e) {}
    const cached = mycologyDb.getEntries();
    return cached.find(e => e.id === id) || null;
  },

  // Save entry
  saveEntry: async (entryData) => {
    try {
      const res = await fetch(`${API_BASE}/api/mycology/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entryData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    const entries = mycologyDb.getEntries();
    const idx = entries.findIndex(e => e.id === entryData.id);
    if (idx >= 0) entries[idx] = entryData;
    else entries.push(entryData);
    mycologyDb.saveEntries(entries);
    return entryData;
  },

  // Identification Candidate Scorer
  evaluateTraits: async (traits = {}) => {
    try {
      const res = await fetch(`${API_BASE}/api/mycology/identify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ traits })
      });
      if (res.ok) return await res.json();
    } catch (e) {}

    // Offline fallback evaluation
    const entries = mycologyDb.getEntries();
    const scored = entries.map(entry => {
      let matchScore = 0;
      let totalCriteria = 0;
      const matchReasons = [];

      Object.entries(traits).forEach(([category, val]) => {
        if (!val) return;
        totalCriteria++;
        const userVals = (Array.isArray(val) ? val : [val]).map(v => String(v).toLowerCase());
        const catTraits = entry.traits?.[category] || [];
        const traitNames = catTraits.map(t => t.name.toLowerCase());

        if (userVals.some(uv => traitNames.includes(uv))) {
          matchScore++;
          matchReasons.push(`Matches ${category}: ${userVals.join(', ')}`);
        }
      });

      const matchPercentage = totalCriteria > 0 ? Math.round((matchScore / totalCriteria) * 100) : 0;
      return { entry, matchScore, totalCriteria, matchPercentage, matchReasons };
    });

    const matches = scored.filter(s => s.matchPercentage > 0).sort((a, b) => b.matchPercentage - a.matchPercentage);
    return { traits, candidateCount: matches.length, matches };
  },

  // Field Observations
  fetchObservations: async (userId = 'local_ranger') => {
    try {
      const res = await fetch(`${API_BASE}/api/mycology/observations?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        localStoreSaveObservations(data);
        return data;
      }
    } catch (e) {}
    return mycologyDb.getObservations();
  },

  saveObservation: async (obsData) => {
    mycologyDb.saveObservation(obsData);
    try {
      const res = await fetch(`${API_BASE}/api/mycology/observations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(obsData)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
    return obsData;
  },

  deleteObservation: async (id) => {
    mycologyDb.deleteObservation(id);
    try {
      await fetch(`${API_BASE}/api/mycology/observations/${id}`, { method: 'DELETE' });
    } catch (e) {}
    return true;
  },

  // Knowledge Packs
  fetchPacks: async () => {
    try {
      const res = await fetch(`${API_BASE}/api/mycology/packs`);
      if (res.ok) return await res.json();
    } catch (e) {}
    return mycologyDb.getPacks();
  },

  importPack: async (packJson) => {
    try {
      const res = await fetch(`${API_BASE}/api/mycology/packs/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(packJson)
      });
      if (res.ok) {
        const result = await res.json();
        if (packJson.entries) {
          const current = mycologyDb.getEntries();
          const mergedMap = new Map();
          current.forEach(e => mergedMap.set(e.id, e));
          packJson.entries.forEach(e => mergedMap.set(e.id, e));
          mycologyDb.saveEntries(Array.from(mergedMap.values()));
        }
        mycologyDb.savePack({ id: packJson.id, title: packJson.title, version: packJson.version, installedAt: new Date().toISOString() });
        return result;
      }
    } catch (e) {}

    // Offline local import fallback
    if (packJson.entries) {
      const current = mycologyDb.getEntries();
      const mergedMap = new Map();
      current.forEach(e => mergedMap.set(e.id, e));
      packJson.entries.forEach(e => mergedMap.set(e.id, e));
      mycologyDb.saveEntries(Array.from(mergedMap.values()));
    }
    mycologyDb.savePack({ id: packJson.id, title: packJson.title, version: packJson.version, installedAt: new Date().toISOString() });
    return { success: true, packId: packJson.id, title: packJson.title, importedEntriesCount: packJson.entries?.length || 0 };
  }
};

function localStoreSaveObservations(obsList) {
  try {
    localStorage.setItem('sos_mycology_observations', JSON.stringify(obsList));
  } catch (e) {}
}
