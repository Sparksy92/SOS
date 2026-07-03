import assert from 'node:assert';
import test from 'node:test';

// Mock localStorage for Node.js test environment before importing modules
if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = {
    _data: {},
    getItem: (key) => globalThis.localStorage._data[key] || null,
    setItem: (key, val) => { globalThis.localStorage._data[key] = String(val); },
    removeItem: (key) => { delete globalThis.localStorage._data[key]; },
    clear: () => { globalThis.localStorage._data = {}; }
  };
}

// Imports
import { 
  normalizeText, tokenizeSearchText, buildMissionSearchTerms, 
  scoreMaterialForMission, rankMaterialsForMission, 
  filterMaterialsByRisk, filterMaterialsByIndexStatus 
} from '../../sos-app/src/modules/search/missionSearchUtils.js';
import { 
  getMissionSourceRecommendations 
} from '../../sos-app/src/modules/search/missionSourceRecommendations.js';
import { 
  loadSourceReviewQueue, saveSourceReviewQueue, addSourceToReviewQueue, 
  updateSourceReviewQueueItem, removeSourceReviewQueueItem, clearSourceReviewQueueForMission 
} from '../../sos-app/src/modules/search/sourceReviewQueueStore.js';
import { 
  generateMissionMarkdownReport 
} from '../../sos-app/src/modules/reports/reportExport.js';

test('SOS Mission-Aware Library Search & Queue Test Suite', async (t) => {

  await t.test('1. Normalization and tokenization functions work correctly', () => {
    assert.strictEqual(normalizeText('Water, Filtration: & Treatment!'), 'water filtration treatment');
    assert.deepEqual(tokenizeSearchText('CO2 valve leak - emergency'), ['co2', 'valve', 'leak', 'emergency']);
    // Filters out tiny tokens (length < 3)
    assert.deepEqual(tokenizeSearchText('a to be or not to be'), ['not']);
  });

  await t.test('2. Term extractor merges parameters and templates', () => {
    const mockMission = {
      title: 'Water Well Maintenance',
      missionType: 'water',
      overview: 'Inspect solar pump valve.',
      objectives: [{ label: 'Verify sanitization chemicals.' }],
      checklist: [{ label: 'Clean pump intake.' }],
      tasks: [{ label: 'Check pressure valve.' }],
      riskCategory: 'water_treatment'
    };

    const mockTemplate = {
      suggestedSourceSearches: ['gravity water filters']
    };

    const terms = buildMissionSearchTerms(mockMission, mockTemplate);
    
    // Check key terms are extracted
    assert.ok(terms.includes('water'));
    assert.ok(terms.includes('well'));
    assert.ok(terms.includes('solar'));
    assert.ok(terms.includes('intake'));
    assert.ok(terms.includes('sanitization'));
    assert.ok(terms.includes('gravity'));
    assert.ok(terms.includes('boiling')); // added via RISK_CATEGORY_TERMS water_treatment boost
  });

  await t.test('3. Document scoring yields expected matches and transparent matchLabel thresholds', () => {
    const mockMission = {
      title: 'Emergency Generator Setup',
      missionType: 'blackout',
      riskCategory: 'electrical'
    };

    const terms = ['generator', 'electrical', 'power', 'wiring'];

    // Test case A: Strong Match (exact title match, risk match, index boost)
    const materialA = {
      name: 'Residential Emergency Generator Setup Guide.pdf',
      path: 'books/electrical/generator_setup.pdf',
      category: 'electrical',
      indexed: true
    };
    const resA = scoreMaterialForMission(materialA, mockMission, { terms });
    assert.strictEqual(resA.matchLabel, 'Strong Match');
    assert.ok(resA.score >= 40);

    // Test case B: Related (some terms, wrong/no exact phrase match)
    const materialB = {
      name: 'General Electrical Wiring standards.txt',
      path: 'books/building/electrical_wiring.txt',
      category: 'building_code',
      indexed: false
    };
    const resB = scoreMaterialForMission(materialB, mockMission, { terms });
    assert.strictEqual(resB.matchLabel, 'Related');
    assert.ok(resB.score >= 15 && resB.score < 40);

    // Test case C: Weak Match (single term match)
    const materialC = {
      name: 'Pantry Food preservation rules.pdf',
      path: 'books/food/preservation.pdf',
      category: 'food_preservation',
      indexed: false
    };
    // No matching terms except if terms array had 'preservation' (it doesn't: terms are ['generator', 'electrical', 'power', 'wiring'])
    const resC = scoreMaterialForMission(materialC, mockMission, { terms });
    assert.strictEqual(resC.matchLabel, 'Needs Review');
    assert.ok(resC.score < 5);
  });

  await t.test('4. Ranker sorts items descending by score and filters index status / risks', () => {
    const mockMission = {
      title: 'Water Filtration Review',
      missionType: 'water_filtration',
      riskCategory: 'water_treatment'
    };

    const materials = [
      { name: 'Random Cookbook.pdf', path: 'cook.pdf', category: 'cooking' },
      { name: 'Intake Water Filter Setup.pdf', path: 'intake.pdf', category: 'water_treatment', indexed: true },
      { name: 'Water Filtration manual.pdf', path: 'manual.pdf', category: 'water_treatment' }
    ];

    const ranked = rankMaterialsForMission(materials, mockMission);
    
    // Intake filter and Filtration manual should be higher than Cookbook
    assert.ok(ranked[0].score > ranked[2].score);
    assert.strictEqual(ranked[0].material.name, 'Intake Water Filter Setup.pdf');

    // Index status filter
    const indexedOnly = filterMaterialsByIndexStatus(ranked, 'indexed');
    assert.strictEqual(indexedOnly.length, 1);
    assert.strictEqual(indexedOnly[0].material.name, 'Intake Water Filter Setup.pdf');

    // Risk category filter
    const safeOnly = filterMaterialsByRisk(ranked, ['safe']);
    assert.strictEqual(safeOnly.length, 1);
    assert.strictEqual(safeOnly[0].material.name, 'Random Cookbook.pdf');
  });

  await t.test('5. Source review queue store CRUD and deduplication logic', () => {
    globalThis.localStorage.clear();
    
    const mockItem = {
      missionId: 'miss-123',
      sourcePath: 'books/water/purification.pdf',
      title: 'Water Purification Guide',
      riskCategory: 'water_treatment'
    };

    // Add item
    const added = addSourceToReviewQueue(mockItem);
    assert.ok(added);
    assert.strictEqual(added.status, 'queued');

    // Attempt double add
    const doubleAdd = addSourceToReviewQueue(mockItem);
    assert.strictEqual(doubleAdd, null); // Deduplicated!

    // Read queue
    const queue = loadSourceReviewQueue();
    assert.strictEqual(queue.length, 1);

    // Update item
    const updated = updateSourceReviewQueueItem(added.id, { status: 'reviewing', notes: 'Operator inspected' });
    assert.ok(updated);
    assert.strictEqual(updated.status, 'reviewing');
    assert.strictEqual(updated.notes, 'Operator inspected');

    // Clear for mission
    clearSourceReviewQueueForMission('miss-123');
    assert.strictEqual(loadSourceReviewQueue().length, 0);
  });

  await t.test('6. Markdown exporter includes queue and recommendations sections', () => {
    const mockMission = {
      title: 'Water Well Logistics',
      missionType: 'water',
      overview: 'Checking well solar pump specs.'
    };

    const relatedData = {
      includedAnswers: [],
      includedSources: [],
      includedNotes: [],
      queuedSources: [
        { id: 'q1', title: 'Solar Well Pump Specs.pdf', sourcePath: 'books/specs.pdf', reason: 'Matches well solar keywords', riskCategory: 'electrical' }
      ],
      recommendedSources: [
        { id: 'r1', title: 'Homestead Water Guide.pdf', sourcePath: 'books/water.pdf', matchLabel: 'Strong Match', indexed: true }
      ]
    };

    const markdown = generateMissionMarkdownReport(mockMission, relatedData);
    
    assert.ok(markdown.includes('## SECTION 9: QUEUED SOURCES FOR REVIEW'));
    assert.ok(markdown.includes('Solar Well Pump Specs.pdf'));
    assert.ok(markdown.includes('Matches well solar keywords'));
    
    assert.ok(markdown.includes('## SECTION 10: RECOMMENDED SOURCES FROM MANIFEST'));
    assert.ok(markdown.includes('Homestead Water Guide.pdf'));
    assert.ok(markdown.includes('Strong Match'));

    assert.ok(markdown.includes('## SECTION 11: RISK DIRECTIVES & WARNINGS'));
    assert.ok(markdown.includes('**ELECTRICAL**'));
  });

});
