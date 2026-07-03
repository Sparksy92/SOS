import { 
  rankMaterialsForMission, 
  filterMaterialsByRisk, 
  filterMaterialsByIndexStatus,
  buildMissionSearchTerms
} from './missionSearchUtils.js';

export const getMissionSourceRecommendations = ({
  mission,
  materials = [],
  metadata = {},
  template = null,
  limit = 10,
  riskFilters = [],
  indexStatus = 'all',
  fileTypes = []
}) => {
  const terms = buildMissionSearchTerms(mission, template);
  
  // Score and rank all materials based on terms
  let ranked = rankMaterialsForMission(materials, mission, { terms, template });
  
  // Filter by file types if specified
  if (fileTypes && fileTypes.length > 0) {
    ranked = ranked.filter(r => {
      const ext = (r.material.name || '').split('.').pop().toLowerCase();
      return fileTypes.includes(ext);
    });
  }

  // Filter by index status
  ranked = filterMaterialsByIndexStatus(ranked, indexStatus);

  // Filter by risk categories
  ranked = filterMaterialsByRisk(ranked, riskFilters);

  const totalScanned = materials.length;
  
  // Map top candidates into recommendations
  const recommendations = ranked.slice(0, limit).map(r => {
    const mat = r.material;
    const meta = metadata[mat.path] || {};
    const ext = (mat.name || '').split('.').pop().toLowerCase();

    // Determine actions
    const suggestedActions = ['open_document', 'save_source', 'add_to_mission', 'queue_for_review'];
    if (r.riskCategory) {
      suggestedActions.push('review_safety');
    }

    return {
      sourcePath: mat.path,
      title: mat.name || 'Unnamed Document',
      category: mat.category || '',
      extension: ext,
      score: r.score,
      matchLabel: r.matchLabel,
      reasons: r.reasons,
      riskCategory: r.riskCategory,
      indexed: r.indexed,
      metadataSummary: meta.summary || mat.metadata?.summary || '',
      suggestedActions
    };
  });

  return {
    missionId: mission.id,
    generatedAt: new Date().toISOString(),
    totalScanned,
    totalRecommended: recommendations.length,
    recommendations
  };
};
