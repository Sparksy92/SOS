import assert from 'node:assert';
import test from 'node:test';

import { calculateWaterReserves } from '../../sos-app/src/modules/water/waterCalculations.js';
import { calculatePantryReserves } from '../../sos-app/src/modules/food/pantryCalculations.js';
import { calculateReadinessScore } from '../../sos-app/src/modules/readiness/readinessCalculator.js';

test('calculateWaterReserves - correct calculations and alerts', () => {
  const containers = [
    { id: 1, name: 'T1', capacity: 100, currentLevel: 80, unit: 'Gallons', filterType: 'Ceramic', filterChangeDate: '2026-12-01', lastTestDate: '2026-06-15', lastTestResult: 'Safe' },
    { id: 2, name: 'T2', capacity: 100, currentLevel: 10, unit: 'Gallons', filterType: 'Ceramic', filterChangeDate: '2026-01-01', lastTestDate: '2025-06-15', lastTestResult: 'Unsafe' }
  ];

  const res = calculateWaterReserves(containers, 4, 2);

  assert.strictEqual(res.totalCapacity, 200);
  assert.strictEqual(res.totalReserve, 90);
  assert.strictEqual(res.fillPercentage, 45);
  assert.strictEqual(res.targetGallons, 56); // 4 people * 14 days
  assert.strictEqual(res.surplusDeficit, 34);
  assert.strictEqual(res.durationDays, 22); // 90 / 4

  // Check alerts: T2 filter is overdue, T2 test is >90 days, T2 water is Unsafe.
  assert.ok(res.warnings.length >= 3);
  assert.ok(res.warnings.some(w => w.includes('Filter on container "T2" is overdue')));
  assert.ok(res.warnings.some(w => w.includes('Water test for "T2" is older than 90 days')));
  assert.ok(res.warnings.some(w => w.includes('Water in container "T2" is marked UNSAFE')));
});

test('calculatePantryReserves - evaluates surplus and deficits', () => {
  const pantry = {
    grains_starch: 50,       // target: 5 * 4 * 2 = 40 (Surplus)
    proteins_legumes: 10,    // target: 3 * 4 * 2 = 24 (Deficit)
    dairy: 5,                // target: 0.5 * 4 * 2 = 4 (Surplus)
    fats_oils: 2,            // target: 0.5 * 4 * 2 = 4 (Deficit)
    sugars_fruits: 10,       // target: 2 * 4 * 2 = 16 (Deficit)
    fuel_cooking: 20,        // target: 2 * 4 * 2 = 16 (Surplus)
    hygiene_sanitation: 10,  // target: 1 * 4 * 2 = 8 (Surplus)
    water_filtration: 1      // target: 0.1 * 4 * 2 = 0.8 (Surplus)
  };

  const res = calculatePantryReserves(pantry, 4, 2);

  assert.ok(res.breakdown.grains_starch.diff > 0);
  assert.ok(res.breakdown.proteins_legumes.diff < 0);
  assert.ok(res.isCritical);
  assert.ok(res.warnings.some(w => w.includes('proteins legumes')));
});

test('calculateReadinessScore - returns composite score', () => {
  const containers = [
    { id: 1, name: 'T1', capacity: 100, currentLevel: 56, unit: 'Gallons' } // 56 gallons = target for 4 people / 14 days (100% water score)
  ];
  const pantry = {
    grains_starch: 40,
    proteins_legumes: 24,
    dairy: 4,
    fats_oils: 4,
    sugars_fruits: 16,
    fuel_cooking: 16,
    hygiene_sanitation: 8,
    water_filtration: 0.8
  }; // 100% food score

  const score = calculateReadinessScore({
    waterContainers: containers,
    pantryItems: pantry,
    peopleCount: 4,
    targetWeeks: 2,
    energyLevel: 100,
    selfRelianceLevel: 100
  });

  assert.strictEqual(score.total, 100);
});
