/**
 * Water calculations engine.
 * Computes capacity, reserve counts, fill levels, and status warnings.
 */

export const calculateWaterReserves = (containers, peopleCount, targetWeeks) => {
  const totalCapacity = containers.reduce((acc, c) => acc + (parseFloat(c.capacity) || 0), 0);
  const totalReserve = containers.reduce((acc, c) => acc + (parseFloat(c.currentLevel) || 0), 0);
  
  const fillPercentage = totalCapacity > 0 ? (totalReserve / totalCapacity) * 100 : 0;
  
  // Calculate requirement: 1 gallon per person per day
  const targetDays = targetWeeks * 7;
  const targetGallons = peopleCount * targetDays;
  const surplusDeficit = totalReserve - targetGallons;
  const durationDays = peopleCount > 0 ? Math.floor(totalReserve / (peopleCount * 1)) : Infinity;

  // Warnings
  const warnings = [];
  if (fillPercentage <= 25 && totalCapacity > 0) {
    warnings.push("Water storage levels are critical (25% or less total fill percentage).");
  }

  const today = new Date();
  containers.forEach(c => {
    if (c.filterChangeDate) {
      const filterDate = new Date(c.filterChangeDate);
      if (filterDate < today) {
        warnings.push(`Filter on container "${c.name}" is overdue for replacement.`);
      }
    }
    if (c.lastTestDate) {
      const testDate = new Date(c.lastTestDate);
      const diffDays = Math.ceil((today - testDate) / (1000 * 60 * 60 * 24));
      if (diffDays > 90) {
        warnings.push(`Water test for "${c.name}" is older than 90 days.`);
      }
    }
    if (c.lastTestResult?.toLowerCase() === 'unsafe') {
      warnings.push(`Water in container "${c.name}" is marked UNSAFE.`);
    }
  });

  return {
    totalCapacity,
    totalReserve,
    fillPercentage,
    targetGallons,
    surplusDeficit,
    durationDays,
    warnings
  };
};
