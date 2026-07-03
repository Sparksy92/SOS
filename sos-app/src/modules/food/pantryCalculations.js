/**
 * Pantry and food reserves calculator.
 * Tracks survival category weights and evaluates homestead stock levels.
 */

export const PANTRY_GUIDELINES = {
  grains_starch: { recommendation_lbs_per_week: 5 },
  proteins_legumes: { recommendation_lbs_per_week: 3 },
  dairy: { recommendation_lbs_per_week: 0.5 },
  fats_oils: { recommendation_lbs_per_week: 0.5 },
  sugars_fruits: { recommendation_lbs_per_week: 2 },
  fuel_cooking: { recommendation_lbs_per_week: 2 },
  hygiene_sanitation: { recommendation_lbs_per_week: 1 },
  water_filtration: { recommendation_lbs_per_week: 0.1 }
};

export const calculatePantryReserves = (pantryItems, peopleCount, targetWeeks) => {
  const breakdown = {};
  const warnings = [];
  let totalSurplus = 0;
  let totalDeficit = 0;

  Object.entries(PANTRY_GUIDELINES).forEach(([category, guide]) => {
    const target = guide.recommendation_lbs_per_week * peopleCount * targetWeeks;
    const current = parseFloat(pantryItems[category]) || 0;
    const diff = current - target;
    const percent = target > 0 ? (current / target) * 100 : 100;

    if (diff < 0) {
      totalDeficit += Math.abs(diff);
      warnings.push(`Low stock warning: ${category.replace('_', ' ')} is at ${percent.toFixed(0)}% of target.`);
    } else {
      totalSurplus += diff;
    }

    breakdown[category] = {
      current,
      target,
      diff,
      percent
    };
  });

  return {
    breakdown,
    warnings,
    totalSurplus,
    totalDeficit,
    isCritical: totalDeficit > 0
  };
};
