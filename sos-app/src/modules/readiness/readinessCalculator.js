import { calculateWaterReserves } from '../water/waterCalculations.js';
import { calculatePantryReserves } from '../food/pantryCalculations.js';

/**
 * Isolated mathematical engine to compute survival readiness score (0-100).
 * Water: 40%, Food: 30%, Energy: 15%, Self-reliance: 15%.
 */
export const calculateReadinessScore = ({ waterContainers, pantryItems, peopleCount, targetWeeks, energyLevel, selfRelianceLevel }) => {
  // 1. Water Score (40%)
  const waterRes = calculateWaterReserves(waterContainers, peopleCount, targetWeeks);
  const waterScore = Math.min((waterRes.totalReserve / (peopleCount * 14)) * 100, 100); // 14 day target

  // 2. Food Score (30%)
  const foodRes = calculatePantryReserves(pantryItems, peopleCount, targetWeeks);
  const foodPercentages = Object.values(foodRes.breakdown).map(b => b.percent);
  const averageFoodPercent = foodPercentages.reduce((acc, p) => acc + p, 0) / foodPercentages.length;
  const foodScore = Math.min(averageFoodPercent, 100);

  // 3. Energy Score (15%)
  const energyScore = Math.min(Math.max(energyLevel || 0, 0), 100);

  // 4. Garden/Self-Reliance Score (15%)
  const gardenScore = Math.min(Math.max(selfRelianceLevel || 0, 0), 100);

  const total = Math.floor((waterScore * 0.4) + (foodScore * 0.3) + (energyScore * 0.15) + (gardenScore * 0.15));

  return {
    total,
    breakdown: {
      water: Math.round(waterScore),
      food: Math.round(foodScore),
      energy: Math.round(energyScore),
      garden: Math.round(gardenScore)
    }
  };
};
