/**
 * Field Observation Model
 */
export function createObservation(data = {}) {
  return {
    id: data.id || `obs_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    userId: data.userId || 'local_ranger',
    date: data.date || new Date().toISOString(),
    latitude: data.latitude !== undefined ? data.latitude : null,
    longitude: data.longitude !== undefined ? data.longitude : null,
    locationName: data.locationName || '',
    photos: Array.isArray(data.photos) ? data.photos : [], // [{ url, angle: 'top'|'side'|'underside'|'spore_print'|'habitat', quality, verified }]
    entryId: data.entryId || null,
    confidence: data.confidence || 'unidentified', // 'confirmed', 'probable', 'possible', 'unidentified'
    notes: data.notes || '',
    weather: data.weather || '',
    habitat: data.habitat || '',
    treesNearby: data.treesNearby || '',
    isPrivate: data.isPrivate !== undefined ? Boolean(data.isPrivate) : true,
    createdAt: data.createdAt || new Date().toISOString()
  };
}
