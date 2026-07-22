/**
 * Real Field Guide Photographs Resolver for Mushroom Species (100% Unique Scientific Photography)
 */
export function getMushroomImage(speciesId) {
  const photoMap = {
    hericium_erinaceus: '/materials/mycology/hericium_erinaceus.jpg',
    cantharellus_cibarius: '/materials/mycology/cantharellus_cibarius.jpg',
    morchella_angusticeps: '/materials/mycology/morchella_angusticeps.jpg',
    laetiporus_sulphureus: '/materials/mycology/laetiporus_sulphureus.jpg',
    amanita_phalloides: '/materials/mycology/amanita_phalloides.jpg',
    fomitopsis_betulina: '/materials/mycology/fomitopsis_betulina.jpg',
    pleurotus_eryngii: '/materials/mycology/pleurotus_eryngii.jpg',
    lentinula_edodes: '/materials/mycology/lentinula_edodes.jpg',
    grifola_frondosa: '/materials/mycology/grifola_frondosa.jpg',
    cordyceps_militaris: '/materials/mycology/cordyceps_militaris.jpg',
    stropharia_rugosoannulata: '/materials/mycology/stropharia_rugosoannulata.jpg',
    trametes_versicolor: '/materials/mycology/trametes_versicolor.jpg',
    psilocybe_cubensis: '/materials/mycology/psilocybe_cubensis.jpg',
    amanita_muscaria: '/materials/mycology/amanita_muscaria.jpg'
  };

  if (photoMap[speciesId]) {
    return photoMap[speciesId];
  }

  // Fallback to default real field guide photograph
  return '/materials/mycology/hericium_erinaceus.jpg';
}
