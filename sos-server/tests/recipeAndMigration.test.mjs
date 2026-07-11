import assert from 'node:assert';
import test from 'node:test';

// Mock localStorage for node environment
const mockLocalStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = String(value); },
  removeItem(key) { delete this.store[key]; },
  clear() { this.store = {}; }
};
global.localStorage = mockLocalStorage;

import { scoreRecipes } from '../../sos-app/src/modules/food/recipeScoring.js';
import { loadProfile } from '../../sos-app/src/modules/profile/sosProfileStore.js';
import { loadWaterContainers } from '../../sos-app/src/modules/water/waterStorage.js';

test('Recipe Scoring Engine - matches pantry items and cookability', () => {
  // Empty pantry
  const pantry = {
    grains_starch: 0,
    proteins_legumes: 0,
    dairy: 0,
    fats_oils: 0,
    sugars_fruits: 0
  };

  const scored = scoreRecipes(pantry, {});
  assert.ok(scored.length > 0);
  // None should be cookable if pantry is empty
  assert.ok(scored.every(r => r.isCookable === false));
  assert.ok(scored.every(r => r.matchPercent === 0));

  // Add some items to pantry
  const pantryWithStock = {
    grains_starch: 100, // flour / rice
    fats_oils: 10 // oil
  };

  const scored2 = scoreRecipes(pantryWithStock, {});
  // Bannock bread uses grains_starch and fats_oils - it should be cookable!
  const bannock = scored2.find(r => r.id === 'bannock_bread');
  assert.ok(bannock);
  assert.strictEqual(bannock.isCookable, true);
  assert.strictEqual(bannock.matchPercent, 100);

  // Test manual override
  const scored3 = scoreRecipes(pantry, { "White or Brown Rice": true, "Dried or Canned Beans": true });
  const riceBeans = scored3.find(r => r.id === 'tactical_rice_beans');
  assert.ok(riceBeans);
  // Rice & beans has 4 ingredients: rice, beans, oil, salt
  // Since rice and beans are critical and overridden, it is cookable!
  assert.strictEqual(riceBeans.isCookable, true);
  assert.strictEqual(riceBeans.matchPercent, 50); // 2 of 4 ingredients available
});

test('Local Storage Migrations - migrates legacy unprefixed keys', () => {
  mockLocalStorage.clear();

  // 1. Profile migration
  const testProfile = { name: "Test Migration Homestead", peopleCount: 5, targetWeeks: 3, pantry: {} };
  // Set legacy key
  mockLocalStorage.setItem('homestead_profile', JSON.stringify(testProfile));

  // Load profile - should migrate and return the test profile
  const loadedProfile = loadProfile();
  assert.strictEqual(loadedProfile.name, "Test Migration Homestead");
  
  // Legacy key should be removed
  assert.strictEqual(mockLocalStorage.getItem('homestead_profile'), null);
  // New prefixed key should contain the data
  assert.ok(mockLocalStorage.getItem('sos_homestead_profile') !== null);

  // 2. Water containers migration
  mockLocalStorage.clear();
  const testContainers = [{ id: 99, name: "Migration Cistern", capacity: 100, currentLevel: 50 }];
  mockLocalStorage.setItem('water_containers', JSON.stringify(testContainers));

  const loadedContainers = loadWaterContainers();
  assert.strictEqual(loadedContainers[0].name, "Migration Cistern");
  assert.strictEqual(mockLocalStorage.getItem('water_containers'), null);
  assert.ok(mockLocalStorage.getItem('sos_water_containers') !== null);
});
