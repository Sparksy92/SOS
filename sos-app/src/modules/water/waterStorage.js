import { localStore } from '../../services/localStore.js';

const WATER_STORAGE_KEY = 'water_containers';

const defaultContainers = [
  { 
    id: 1, 
    name: 'Main Cistern', 
    capacity: 500, 
    currentLevel: 400, 
    unit: 'Gallons', 
    filterType: 'Ceramic Gravity', 
    filterChangeDate: '2026-10-01', 
    lastTestDate: '2026-06-15', 
    lastTestResult: 'Safe', 
    notes: 'Primary drinking water' 
  },
  { 
    id: 2, 
    name: 'Rain Barrel A', 
    capacity: 55, 
    currentLevel: 10, 
    unit: 'Gallons', 
    filterType: 'Mesh Pre-filter', 
    filterChangeDate: '2026-08-01', 
    lastTestDate: '2026-05-20', 
    lastTestResult: 'Unsafe', 
    notes: 'Garden irrigation' 
  }
];

export const loadWaterContainers = () => {
  return localStore.get(WATER_STORAGE_KEY, defaultContainers);
};

export const saveWaterContainers = (containers) => {
  localStore.set(WATER_STORAGE_KEY, containers);
};
