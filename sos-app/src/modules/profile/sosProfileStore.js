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

export const loadProfile = () => localStore.get(PROFILE_KEY, defaultProfile);
export const saveProfile = (profile) => localStore.set(PROFILE_KEY, profile);

export const loadFavorites = () => localStore.get(FAVORITES_KEY, []);
export const saveFavorites = (favs) => localStore.set(FAVORITES_KEY, favs);

export const loadReadGuides = () => localStore.get(READ_GUIDES_KEY, []);
export const saveReadGuides = (guides) => localStore.set(READ_GUIDES_KEY, guides);

export const loadLastAccessed = () => localStore.get(LAST_ACCESSED_KEY, null);
export const saveLastAccessed = (item) => localStore.set(LAST_ACCESSED_KEY, item);

export const loadDashboardWidgets = () => localStore.get(WIDGETS_KEY, defaultWidgets);
export const saveDashboardWidgets = (widgets) => localStore.set(WIDGETS_KEY, widgets);
