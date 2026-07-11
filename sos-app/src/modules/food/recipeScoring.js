import { RECIPES } from './recipes.js';

/**
 * Evaluates recipe match percentages and cookability based on pantry stock or manual overrides.
 * 
 * @param {object} pantry Homestead pantry stock weights (e.g. { grains_starch: 150, fats_oils: 10 })
 * @param {object} onHandOverrides Operator manual overrides for specific ingredients (e.g. { "Salt": true })
 * @returns {array} Scored and sorted recipe records
 */
export const scoreRecipes = (pantry = {}, onHandOverrides = {}) => {
  const scored = RECIPES.map(recipe => {
    let availableCount = 0;
    const availableIngredients = [];
    const missingIngredients = [];
    let missingCritical = false;

    recipe.ingredients.forEach(ing => {
      const isOverridden = onHandOverrides[ing.name] === true;
      const isStocked = pantry[ing.category] > 0;
      const isAvailable = isOverridden || isStocked;

      if (isAvailable) {
        availableCount++;
        availableIngredients.push(ing.name);
      } else {
        missingIngredients.push(ing.name);
        if (ing.critical) {
          missingCritical = true;
        }
      }
    });

    const totalCount = recipe.ingredients.length;
    const matchPercent = totalCount > 0 ? Math.round((availableCount / totalCount) * 100) : 0;
    const isCookable = !missingCritical;

    return {
      ...recipe,
      matchPercent,
      availableIngredients,
      missingIngredients,
      isCookable
    };
  });

  // Sort: Cookable first, then by match percentage descending
  return scored.sort((a, b) => {
    if (a.isCookable && !b.isCookable) return -1;
    if (!a.isCookable && b.isCookable) return 1;
    return b.matchPercent - a.matchPercent;
  });
};
