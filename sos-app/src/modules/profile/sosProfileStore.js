import { localStore } from '../../services/localStore.js';

const PROFILE_KEY = 'homestead_profile';
const FAVORITES_KEY = 'favorites';
const READ_GUIDES_KEY = 'read_guides';
const LAST_ACCESSED_KEY = 'last_accessed';
const WIDGETS_KEY = 'dashboard_widgets';

const defaultProfile = {
  name: 'Alpha Homestead',
  peopleCount: 4,
  targetWeeks: 4,
  energyLevel: 80,
  selfRelianceLevel: 50,
  pantry: {
    grains_starch: 150,
    proteins_legumes: 90,
    dairy: 15,
    fats_oils: 15,
    sugars_fruits: 60,
    fuel_cooking: 50,
    hygiene_sanitation: 30,
    water_filtration: 5
  }
};

const defaultWidgets = {
  waterStatus: true,
  foodStatus: true,
  readinessMeter: true,
  recentDocs: true,
  favorites: true
};

export const loadProfile = () => {
  let val = localStore.get(PROFILE_KEY, null);
  if (val === null && typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem('homestead_profile');
    if (legacy !== null) {
      try {
        const parsed = JSON.parse(legacy);
        localStore.set(PROFILE_KEY, parsed);
        localStorage.removeItem('homestead_profile');
        val = parsed;
      } catch (e) {}
    }
  }
  return val || defaultProfile;
};
export const saveProfile = (profile) => localStore.set(PROFILE_KEY, profile);

export const loadFavorites = () => {
  let val = localStore.get(FAVORITES_KEY, null);
  if (val === null && typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem('favorites');
    if (legacy !== null) {
      try {
        const parsed = JSON.parse(legacy);
        localStore.set(FAVORITES_KEY, parsed);
        localStorage.removeItem('favorites');
        val = parsed;
      } catch (e) {}
    }
  }
  return val || [];
};
export const saveFavorites = (favs) => localStore.set(FAVORITES_KEY, favs);

export const loadReadGuides = () => {
  let val = localStore.get(READ_GUIDES_KEY, null);
  if (val === null && typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem('read_guides');
    if (legacy !== null) {
      try {
        const parsed = JSON.parse(legacy);
        localStore.set(READ_GUIDES_KEY, parsed);
        localStorage.removeItem('read_guides');
        val = parsed;
      } catch (e) {}
    }
  }
  return val || [];
};
export const saveReadGuides = (guides) => localStore.set(READ_GUIDES_KEY, guides);

export const loadLastAccessed = () => {
  let val = localStore.get(LAST_ACCESSED_KEY, null);
  if (val === null && typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem('last_accessed');
    if (legacy !== null) {
      try {
        const parsed = JSON.parse(legacy);
        localStore.set(LAST_ACCESSED_KEY, parsed);
        localStorage.removeItem('last_accessed');
        val = parsed;
      } catch (e) {}
    }
  }
  return val;
};
export const saveLastAccessed = (item) => localStore.set(LAST_ACCESSED_KEY, item);

export const loadDashboardWidgets = () => {
  let val = localStore.get(WIDGETS_KEY, null);
  if (val === null && typeof localStorage !== 'undefined') {
    const legacy = localStorage.getItem('dashboard_widgets');
    if (legacy !== null) {
      try {
        const parsed = JSON.parse(legacy);
        localStore.set(WIDGETS_KEY, parsed);
        localStorage.removeItem('dashboard_widgets');
        val = parsed;
      } catch (e) {}
    }
  }
  return val || defaultWidgets;
};
export const saveDashboardWidgets = (widgets) => localStore.set(WIDGETS_KEY, widgets);
