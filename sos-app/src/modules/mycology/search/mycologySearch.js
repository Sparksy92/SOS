/**
 * Multi-Attribute Trait & Fuzzy Text Search Engine (Client-Side Offline Capable)
 */
export function filterAndSearchEntries(entries = [], options = {}) {
  const {
    query = '',
    edibility = '',
    habitat = '',
    season = '',
    safetyDifficulty = '',
    selectedTraits = {},
    sortBy = 'title'
  } = options;

  let filtered = [...entries];

  // 1. Text Query Filter
  if (query.trim()) {
    const q = query.toLowerCase().trim();
    filtered = filtered.filter(entry => {
      const matchTitle = entry.title?.toLowerCase().includes(q);
      const matchSci = entry.scientificName?.toLowerCase().includes(q);
      const matchGenus = entry.taxonomy?.genus?.toLowerCase().includes(q);
      const matchFamily = entry.taxonomy?.family?.toLowerCase().includes(q);
      const matchSummary = entry.content?.summary?.toLowerCase().includes(q);
      const matchDesc = entry.content?.description?.toLowerCase().includes(q);
      
      return matchTitle || matchSci || matchGenus || matchFamily || matchSummary || matchDesc;
    });
  }

  // 2. Edibility Filter
  if (edibility) {
    filtered = filtered.filter(entry => {
      const eClass = entry.content?.edibility?.toLowerCase();
      if (edibility === 'edible') return eClass === 'choice' || eClass === 'edible' || eClass === 'edible_with_caution';
      if (edibility === 'poisonous') return eClass === 'poisonous' || eClass === 'deadly';
      return eClass === edibility.toLowerCase();
    });
  }

  // 3. Habitat Filter
  if (habitat) {
    const h = habitat.toLowerCase();
    filtered = filtered.filter(entry => {
      const entryHabitats = entry.traits?.habitat?.map(t => t.name.toLowerCase()) || [];
      const habDesc = entry.content?.habitatDesc?.toLowerCase() || '';
      return entryHabitats.some(trait => trait.includes(h)) || habDesc.includes(h);
    });
  }

  // 4. Season Filter
  if (season) {
    const s = season.toLowerCase();
    filtered = filtered.filter(entry => {
      const entrySeasons = entry.traits?.season?.map(t => t.name.toLowerCase()) || [];
      const sDesc = entry.content?.seasonalityDesc?.toLowerCase() || '';
      return entrySeasons.includes(s) || sDesc.includes(s);
    });
  }

  // 5. Safety Difficulty Filter
  if (safetyDifficulty) {
    filtered = filtered.filter(entry => entry.safetyRating?.difficulty === safetyDifficulty);
  }

  // 6. Selected Traits Filter
  if (selectedTraits && Object.keys(selectedTraits).length > 0) {
    Object.entries(selectedTraits).forEach(([category, val]) => {
      if (!val) return;
      const targetVals = Array.isArray(val) ? val.map(v => String(v).toLowerCase()) : [String(val).toLowerCase()];
      
      filtered = filtered.filter(entry => {
        const catTraits = entry.traits?.[category] || [];
        const names = catTraits.map(t => t.name.toLowerCase());
        return targetVals.some(tv => names.includes(tv));
      });
    });
  }

  // Sorting
  filtered.sort((a, b) => {
    if (sortBy === 'scientific') return (a.scientificName || '').localeCompare(b.scientificName || '');
    if (sortBy === 'difficulty') {
      const ranks = { beginner: 1, intermediate: 2, expert: 3 };
      return (ranks[a.safetyRating?.difficulty] || 2) - (ranks[b.safetyRating?.difficulty] || 2);
    }
    return (a.title || '').localeCompare(b.title || '');
  });

  return filtered;
}
