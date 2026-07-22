/**
 * KnowledgeEntry Model
 * Single source of truth model for Mycology & future domain knowledge entries.
 */
export function createKnowledgeEntry(data = {}) {
  return {
    id: data.id || `entry_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type: data.type || 'mycology',
    title: data.title || 'Untitled Entry',
    scientificName: data.scientificName || '',
    authority: data.authority || '',
    taxonomy: {
      kingdom: data.taxonomy?.kingdom || 'Fungi',
      phylum: data.taxonomy?.phylum || '',
      class: data.taxonomy?.class || '',
      order: data.taxonomy?.order || '',
      family: data.taxonomy?.family || '',
      genus: data.taxonomy?.genus || '',
      species: data.taxonomy?.species || ''
    },
    content: {
      summary: data.content?.summary || '',
      description: data.content?.description || '',
      identificationGuide: data.content?.identificationGuide || '',
      habitatDesc: data.content?.habitatDesc || '',
      seasonalityDesc: data.content?.seasonalityDesc || '',
      edibility: data.content?.edibility || 'unknown', // 'choice', 'edible', 'edible_with_caution', 'inedible', 'poisonous', 'deadly', 'unknown'
      toxicityDesc: data.content?.toxicityDesc || '',
      medicinalDesc: data.content?.medicinalDesc || ''
    },
    safetyRating: {
      difficulty: data.safetyRating?.difficulty || 'intermediate', // 'beginner', 'intermediate', 'expert'
      risk: data.safetyRating?.risk || 'moderate', // 'low', 'moderate', 'high', 'deadly'
      requirement: data.safetyRating?.requirement || 'visual' // 'visual', 'microscopy', 'chemical'
    },
    sourcesAttribution: Array.isArray(data.sourcesAttribution) ? data.sourcesAttribution : [
      { type: 'scientific', contributor: 'SOS Mycology Library', notes: 'Peer-reviewed field guide data' }
    ],
    media: Array.isArray(data.media) ? data.media : [],
    references: Array.isArray(data.references) ? data.references : [],
    relationships: Array.isArray(data.relationships) ? data.relationships : [],
    packId: data.packId || 'default_pack',
    version: data.version || '1.0.0',
    traits: data.traits || {},
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString()
  };
}

export const EDIBILITY_BADGES = {
  choice: { label: 'Choice Edible', color: 'var(--color-edible-choice, #10B981)', bg: 'rgba(16, 185, 129, 0.15)' },
  edible: { label: 'Edible', color: 'var(--color-edible, #059669)', bg: 'rgba(5, 150, 105, 0.15)' },
  edible_with_caution: { label: 'Caution Required', color: 'var(--color-caution, #F59E0B)', bg: 'rgba(245, 158, 11, 0.15)' },
  inedible: { label: 'Inedible', color: 'var(--color-inedible, #6B7280)', bg: 'rgba(107, 114, 128, 0.15)' },
  poisonous: { label: 'Toxic / Poisonous', color: 'var(--color-poisonous, #EF4444)', bg: 'rgba(239, 68, 68, 0.15)' },
  deadly: { label: 'DEADLY POISONOUS', color: 'var(--color-deadly, #991B1B)', bg: 'rgba(153, 27, 27, 0.25)' },
  unknown: { label: 'Unknown Edibility', color: 'var(--color-unknown, #9CA3AF)', bg: 'rgba(156, 163, 175, 0.15)' }
};
