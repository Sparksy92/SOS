// Pure JS utilities for mission-aware library search scoring and ranking (fully testable under Node.js)

const RISK_CATEGORY_TERMS = {
  electrical: ['electrical', 'power', 'generator', 'wiring', 'voltage', 'circuits', 'blackout'],
  water_treatment: ['water', 'filtration', 'filter', 'treatment', 'purification', 'sanitization', 'chlorine', 'boiling'],
  medical: ['medical', 'first aid', 'bandage', 'tourniquet', 'cpr', 'burn', 'wound', 'trauma', 'emergency'],
  mechanical: ['mechanical', 'vehicle', 'motor', 'engine', 'tool', 'starter', 'torque', 'repair', 'diagnostic'],
  chemical: ['chemical', 'safety', 'hazmat', 'dilution', 'acid', 'solvent', 'neutralize'],
  mushrooms: ['mushrooms', 'fungi', 'spore', 'toxic', 'edible', 'identification'],
  wild_plants: ['plants', 'foraging', 'edible', 'toxic', 'identification', 'berries'],
  firearms: ['firearms', 'safety', 'cleaning', 'maintenance', 'storage'],
  food_preservation: ['pantry', 'canning', 'dehydrating', 'preservation', 'spoilage', 'botulism', 'dry storage']
};

export const normalizeText = (value) => {
  if (!value) return '';
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ') // Replace punctuation with spaces
    .replace(/\s+/g, ' ')      // Consolidate spaces
    .trim();
};

export const tokenizeSearchText = (value) => {
  const norm = normalizeText(value);
  if (!norm) return [];
  return norm.split(' ').filter(word => word.length >= 3);
};

export const buildMissionSearchTerms = (mission, template) => {
  const terms = new Set();

  if (mission.title) {
    tokenizeSearchText(mission.title).forEach(t => terms.add(t));
  }
  if (mission.missionType) {
    tokenizeSearchText(mission.missionType).forEach(t => terms.add(t));
  }
  if (mission.overview) {
    tokenizeSearchText(mission.overview).forEach(t => terms.add(t));
  }

  // Add objectives terms
  (mission.objectives || []).forEach(obj => {
    tokenizeSearchText(obj.label).forEach(t => terms.add(t));
  });

  // Add checklist task terms
  (mission.checklist || []).forEach(task => {
    tokenizeSearchText(task.label).forEach(t => terms.add(t));
  });

  // Add custom task terms
  (mission.tasks || []).forEach(task => {
    tokenizeSearchText(task.label).forEach(t => terms.add(t));
  });

  // Add template suggested searches
  if (template && template.suggestedSourceSearches) {
    template.suggestedSourceSearches.forEach(searchStr => {
      tokenizeSearchText(searchStr).forEach(t => terms.add(t));
    });
  }

  // Add boost terms for risk category
  const risk = mission.riskCategory || (template && template.riskCategory);
  if (risk && RISK_CATEGORY_TERMS[risk]) {
    RISK_CATEGORY_TERMS[risk].forEach(t => terms.add(t));
  }

  return Array.from(terms);
};

// Extracts risk category from material path or category
export const getMaterialRiskCategory = (path = '', category = '') => {
  const normalized = (path + '/' + category).toLowerCase();
  for (const cat of Object.keys(RISK_CATEGORY_TERMS)) {
    if (normalized.includes(cat) || normalized.includes(cat.replace('_', ''))) {
      return cat;
    }
  }
  return null;
};

export const scoreMaterialForMission = (material, mission, options = {}) => {
  const terms = options.terms || [];
  let score = 0;
  const reasons = [];

  const name = material.name || '';
  const path = material.path || '';
  const category = material.category || '';
  const ext = (name.split('.').pop() || '').toLowerCase();
  
  const normName = normalizeText(name);
  const normPath = normalizeText(path);
  const normCategory = normalizeText(category);

  // Exact phrase match of mission title
  if (mission.title) {
    const normTitle = normalizeText(mission.title);
    if (normTitle && (normName.includes(normTitle) || normPath.includes(normTitle))) {
      score += 25;
      reasons.push(`Exact match for mission title: "${mission.title}"`);
    }
  }

  // Mission type boost
  if (mission.missionType) {
    const normType = normalizeText(mission.missionType);
    if (normType && (normCategory.includes(normType) || normPath.includes(normType))) {
      score += 20;
      reasons.push(`Targeted mission-type boost: "${mission.missionType}"`);
    }
  }

  // Risk category match
  const materialRisk = getMaterialRiskCategory(path, category);
  const missionRisk = mission.riskCategory;
  if (materialRisk && missionRisk && materialRisk === missionRisk) {
    score += 15;
    reasons.push(`Risk category match: "${materialRisk}"`);
  }

  // Index status boost
  if (material.indexed) {
    score += 8;
    reasons.push('Indexed document (Ready for R.A.N.G.E.R. RAG)');
  }

  // PDF extension boost
  if (ext === 'pdf') {
    score += 3;
    reasons.push('Premium PDF reference resource');
  }

  // Match against tokenized terms
  let termMatches = 0;
  terms.forEach(term => {
    let matchedTerm = false;
    if (normName.includes(term)) {
      score += 5;
      matchedTerm = true;
    }
    if (normPath.includes(term)) {
      score += 3;
      matchedTerm = true;
    }
    if (material.metadata) {
      if (material.metadata.title && normalizeText(material.metadata.title).includes(term)) {
        score += 4;
        matchedTerm = true;
      }
      if (material.metadata.summary && normalizeText(material.metadata.summary).includes(term)) {
        score += 2;
        matchedTerm = true;
      }
    }
    if (matchedTerm) {
      termMatches++;
    }
  });

  if (termMatches > 0) {
    reasons.push(`Matched ${termMatches} keyword term(s) from mission context`);
  }

  // Determine match label
  let matchLabel = 'Needs Review';
  if (score >= 40) {
    matchLabel = 'Strong Match';
  } else if (score >= 15) {
    matchLabel = 'Related';
  } else if (score >= 5) {
    matchLabel = 'Weak Match';
  }

  return {
    material,
    score,
    reasons,
    riskCategory: materialRisk,
    indexed: !!material.indexed,
    matchLabel
  };
};

export const rankMaterialsForMission = (materials = [], mission, options = {}) => {
  const terms = options.terms || buildMissionSearchTerms(mission, options.template);
  const scored = materials.map(mat => scoreMaterialForMission(mat, mission, { ...options, terms }));
  
  // Sort descending by score, then alphabetically by name
  return scored.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (a.material.name || '').localeCompare(b.material.name || '');
  });
};

export const filterMaterialsByRisk = (scoredMaterials = [], riskFilters = []) => {
  if (!riskFilters || riskFilters.length === 0) return scoredMaterials;
  return scoredMaterials.filter(s => {
    if (!s.riskCategory) return riskFilters.includes('none') || riskFilters.includes('safe');
    return riskFilters.includes(s.riskCategory);
  });
};

export const filterMaterialsByIndexStatus = (scoredMaterials = [], indexStatus = 'all') => {
  if (indexStatus === 'all') return scoredMaterials;
  return scoredMaterials.filter(s => {
    if (indexStatus === 'indexed') return s.indexed === true;
    if (indexStatus === 'unindexed') return s.indexed !== true;
    return true;
  });
};

export const buildMissionSearchSummary = (rankedMaterials = []) => {
  const total = rankedMaterials.length;
  const strongMatches = rankedMaterials.filter(r => r.matchLabel === 'Strong Match').length;
  const indexedCount = rankedMaterials.filter(r => r.indexed).length;
  return {
    total,
    strongMatches,
    indexedCount,
    unindexedCount: total - indexedCount
  };
};
