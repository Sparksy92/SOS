import test from 'node:test';
import assert from 'node:assert/strict';
import mycologyService from '../services/mycologyService.js';
import { db } from '../db.js';

test('Mycology Service - Knowledge Entry & Relational Trait Indexing', () => {
  const testEntry = {
    id: 'test_lion_mane',
    type: 'mycology',
    title: "Lion's Mane",
    scientificName: 'Hericium erinaceus',
    authority: '(Bull.) Pers.',
    taxonomy: { kingdom: 'Fungi', phylum: 'Basidiomycota', genus: 'Hericium', species: 'Hericium erinaceus' },
    content: {
      summary: 'Icicle-like white teeth mushroom',
      description: 'Choice edible mushroom with toothy spines hanging down.',
      edibility: 'choice'
    },
    safetyRating: { difficulty: 'beginner', risk: 'low', requirement: 'visual' },
    traits: {
      hymenophore: [{ name: 'teeth', label: 'Teeth / Spines' }],
      cap_color: [{ name: 'white', label: 'White' }],
      habitat: [{ name: 'hardwood', label: 'Hardwood Trees' }],
      season: [{ name: 'fall', label: 'Autumn' }],
      edibility: [{ name: 'choice', label: 'Choice Edible' }]
    }
  };

  const saved = mycologyService.upsertKnowledgeEntry(testEntry);
  assert.equal(saved.id, 'test_lion_mane');
  assert.equal(saved.scientificName, 'Hericium erinaceus');
  assert.equal(saved.traits.hymenophore[0].name, 'teeth');

  // Search by single trait filter
  const teethResults = mycologyService.searchKnowledgeEntries({
    traitFilters: [{ category: 'hymenophore', name: 'teeth' }]
  });
  assert.ok(teethResults.some(e => e.id === 'test_lion_mane'));

  // Search by edibility filter
  const edibleResults = mycologyService.searchKnowledgeEntries({ edibility: 'choice' });
  assert.ok(edibleResults.some(e => e.id === 'test_lion_mane'));

  // Search by query keyword
  const searchResults = mycologyService.searchKnowledgeEntries({ query: 'erinaceus' });
  assert.ok(searchResults.some(e => e.id === 'test_lion_mane'));
});

test('Mycology Service - Trait Candidate Scorer', () => {
  const matches = mycologyService.evaluateTraitsAgainstCandidates({
    hymenophore: 'teeth',
    habitat: 'hardwood'
  });

  assert.ok(Array.isArray(matches));
  assert.ok(matches.length > 0);
  assert.equal(matches[0].entry.id, 'test_lion_mane');
  assert.ok(matches[0].matchPercentage > 0);
});

test('Mycology Service - Identification Decision Keys', () => {
  const keyData = {
    id: 'test_na_key_01',
    module: 'mycology',
    region: 'north_america',
    title: 'North American Test Key',
    description: 'Basic diagnostic key',
    keyTree: {
      root: 'hymenophore',
      nodes: {
        hymenophore: {
          question: 'What is under cap?',
          options: [
            { label: 'Teeth', value: 'teeth', next: 'color' }
          ]
        }
      }
    }
  };

  const savedKey = mycologyService.saveIdentificationKey(keyData);
  assert.equal(savedKey.id, 'test_na_key_01');
  assert.equal(savedKey.title, 'North American Test Key');

  const keysList = mycologyService.getIdentificationKeys('mycology');
  assert.ok(keysList.some(k => k.id === 'test_na_key_01'));
});

test('Mycology Service - Field Journal Observations', () => {
  const obs = {
    id: 'test_obs_001',
    userId: 'ranger_test',
    date: new Date().toISOString(),
    latitude: 45.4215,
    longitude: -75.6972,
    locationName: 'Gatineau Park',
    photos: [{ url: '/photos/test.jpg', angle: 'underside' }],
    entryId: 'test_lion_mane',
    confidence: 'confirmed',
    notes: 'Found on old oak trunk',
    weather: 'Cool, 15C',
    habitat: 'Deciduous forest',
    treesNearby: 'Oak, Maple',
    isPrivate: true
  };

  const saved = mycologyService.saveObservation(obs);
  assert.equal(saved.id, 'test_obs_001');
  assert.equal(saved.locationName, 'Gatineau Park');
  assert.equal(saved.isPrivate, true);

  const list = mycologyService.getObservations('ranger_test');
  assert.ok(list.some(o => o.id === 'test_obs_001'));

  const deleted = mycologyService.deleteObservation('test_obs_001');
  assert.equal(deleted.success, true);
  assert.equal(mycologyService.getObservationById('test_obs_001'), null);
});

test('Mycology Service - Knowledge Pack Importing & Versioning', () => {
  const pack = {
    id: 'test_pack_ontario',
    module: 'mycology',
    title: 'Ontario Test Pack',
    version: '1.2.0',
    source: 'Canadian Fungi Project',
    license: 'CC-BY-4.0',
    entries: [
      {
        id: 'pack_chanterelle',
        title: 'Golden Chanterelle',
        scientificName: 'Cantharellus cibarius',
        content: { edibility: 'choice', description: 'Vase-shaped yellow mushroom with decurrent false gills.' },
        safetyRating: { difficulty: 'beginner', risk: 'low', requirement: 'visual' },
        traits: {
          hymenophore: [{ name: 'folds', label: 'False Gills / Folds' }],
          cap_color: [{ name: 'yellow', label: 'Yellow / Apricot' }],
          edibility: [{ name: 'choice', label: 'Choice Edible' }]
        }
      }
    ],
    identificationKeys: []
  };

  const res = mycologyService.importKnowledgePack(pack);
  assert.equal(res.success, true);
  assert.equal(res.importedEntriesCount, 1);

  const installedPacks = mycologyService.getKnowledgePacks('mycology');
  assert.ok(installedPacks.some(p => p.id === 'test_pack_ontario'));

  const entry = mycologyService.getEntryById('pack_chanterelle');
  assert.equal(entry.title, 'Golden Chanterelle');
  assert.equal(entry.version, '1.2.0');
});
