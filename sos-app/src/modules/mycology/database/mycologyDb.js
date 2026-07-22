import { localStore } from '../../../services/localStore.js';

const STORAGE_KEYS = {
  ENTRIES: 'mycology_entries_cache',
  OBSERVATIONS: 'mycology_observations',
  KEYS: 'mycology_identification_keys',
  PACKS: 'mycology_installed_packs'
};

export const mycologyDb = {
  // Entries Cache
  getEntries: () => localStore.get(STORAGE_KEYS.ENTRIES, []),
  saveEntries: (entries) => localStore.set(STORAGE_KEYS.ENTRIES, entries),
  
  // Observations Local Store
  getObservations: () => localStore.get(STORAGE_KEYS.OBSERVATIONS, []),
  saveObservation: (obs) => {
    const list = localStore.get(STORAGE_KEYS.OBSERVATIONS, []);
    const idx = list.findIndex(o => o.id === obs.id);
    if (idx >= 0) {
      list[idx] = obs;
    } else {
      list.unshift(obs);
    }
    localStore.set(STORAGE_KEYS.OBSERVATIONS, list);
    return obs;
  },
  deleteObservation: (id) => {
    const list = localStore.get(STORAGE_KEYS.OBSERVATIONS, []);
    const filtered = list.filter(o => o.id !== id);
    localStore.set(STORAGE_KEYS.OBSERVATIONS, filtered);
    return true;
  },

  // Identification Keys
  getKeys: () => localStore.get(STORAGE_KEYS.KEYS, []),
  saveKey: (key) => {
    const keys = localStore.get(STORAGE_KEYS.KEYS, []);
    const idx = keys.findIndex(k => k.id === key.id);
    if (idx >= 0) keys[idx] = key;
    else keys.push(key);
    localStore.set(STORAGE_KEYS.KEYS, keys);
    return key;
  },

  // Installed Packs
  getPacks: () => localStore.get(STORAGE_KEYS.PACKS, []),
  savePack: (packMeta) => {
    const packs = localStore.get(STORAGE_KEYS.PACKS, []);
    const idx = packs.findIndex(p => p.id === packMeta.id);
    if (idx >= 0) packs[idx] = packMeta;
    else packs.push(packMeta);
    localStore.set(STORAGE_KEYS.PACKS, packs);
    return packMeta;
  }
};
