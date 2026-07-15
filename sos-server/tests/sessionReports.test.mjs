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

import { generateMarkdownReport, generateJSONReport } from '../../sos-app/src/modules/reports/reportExport.js';
import { validateBackup, mergeCollections } from '../../sos-app/src/modules/session/sessionStore.js';

test('Session Notes and Reports Test Suite', async (t) => {
  
  await t.test('1. Report JSON generation preserves structure', () => {
    const reportData = {
      title: 'Emergency Fuel Assessment',
      type: 'supply assessment',
      createdAt: '2026-07-03T14:00:00.000Z',
      author: 'Homestead Alpha',
      summary: 'Checking winter fuel reserve logistics.',
      includedAnswers: [
        {
          id: 'ans-1',
          title: 'Generator safety guidance',
          relatedQuestion: 'How to run generator inside?',
          relatedAnswerStatus: 'verified_local',
          riskCategory: 'fuel_generator',
          body: 'Never operate generator indoors due to carbon monoxide danger.'
        }
      ],
      includedNotes: [
        {
          id: 'note-1',
          title: 'Check generator valve',
          type: 'note',
          noteType: 'task',
          tags: ['generator', 'maintenance'],
          riskCategory: 'fuel_generator',
          body: 'Valve needs clearing before winter.'
        }
      ],
      includedSources: [
        {
          id: 'src-1',
          title: 'Generator Manual Sec 4',
          source: '/materials/manuals/generator.pdf',
          page: 15,
          matchLabel: 'Strong Match',
          excerpt: 'Generator must have 3 feet of clearance.'
        }
      ],
      manualNotes: 'Checked drums, no leaks.',
      nextActions: '1. Acquire carbon monoxide alarm.'
    };

    const json = generateJSONReport(reportData);
    const parsed = JSON.parse(json);
    
    assert.strictEqual(parsed.title, 'Emergency Fuel Assessment');
    assert.strictEqual(parsed.type, 'supply assessment');
    assert.strictEqual(parsed.includedAnswers[0].id, 'ans-1');
    assert.strictEqual(parsed.includedNotes[0].noteType, 'task');
  });

  await t.test('2. Report Markdown generation formats correctly and includes risk warnings', () => {
    const reportData = {
      title: 'Emergency Fuel Assessment',
      type: 'supply assessment',
      createdAt: '2026-07-03T14:00:00.000Z',
      author: 'Homestead Alpha',
      summary: 'Checking winter fuel reserve logistics.',
      includedAnswers: [
        {
          id: 'ans-1',
          title: 'Generator safety guidance',
          relatedQuestion: 'How to run generator inside?',
          relatedAnswerStatus: 'verified_local',
          riskCategory: 'fuel_generator',
          body: 'Never operate generator indoors.'
        }
      ],
      includedNotes: [
        {
          id: 'note-1',
          title: 'Check generator valve',
          noteType: 'task',
          tags: ['generator'],
          riskCategory: 'fuel_generator',
          body: 'Valve needs clearing.'
        }
      ],
      includedSources: [
        {
          id: 'src-1',
          title: 'Generator Manual Sec 4',
          source: '/materials/manuals/generator.pdf',
          page: 15,
          matchLabel: 'Strong Match',
          excerpt: 'Generator must have 3 feet of clearance.'
        }
      ],
      manualNotes: 'Checked drums, no leaks.',
      nextActions: '1. Acquire alarm.'
    };

    const md = generateMarkdownReport(reportData);
    
    // Assert all major section titles are present
    assert.ok(md.includes('SURVIVALOS SESSION REPORT: EMERGENCY FUEL ASSESSMENT'));
    assert.ok(md.includes('**REPORT TYPE:** SUPPLY ASSESSMENT'));
    assert.ok(md.includes('**OPERATOR CALLSIGN:** HOMESTEAD ALPHA'));
    assert.ok(md.includes('Checking winter fuel reserve logistics.'));
    assert.ok(md.includes('## SECTION 2: OPERATOR LOG NOTES'));
    assert.ok(md.includes('## SECTION 3: RANGER VERIFIED ANSWERS'));
    assert.ok(md.includes('## SECTION 4: FIELD NOTES & OBSERVATIONS'));
    assert.ok(md.includes('## SECTION 5: LOCAL SOURCES UTILIZED'));
    
    // Assert item content is rendered
    assert.ok(md.includes('How to run generator inside?'));
    assert.ok(md.includes('Never operate generator indoors.'));
    assert.ok(md.includes('Check generator valve (task)'));
    assert.ok(md.includes('generator.pdf'));
    
    // Assert warning directives are included because fuel_generator is high-risk
    assert.ok(md.includes('CRITICAL SECURITY RISK WARNING'));
    assert.ok(md.includes('FUEL_GENERATOR'));
    assert.ok(md.includes('Do not rely entirely on AI summaries in life-threatening scenarios.'));
  });

  await t.test('3. High-risk warning omitted when no high-risk items are included', () => {
    const safeReport = {
      title: 'Organic Farming Summary',
      type: 'research summary',
      createdAt: '2026-07-03T14:00:00.000Z',
      author: 'Homestead Alpha',
      summary: 'Reviewing soil quality manuals.',
      includedAnswers: [
        {
          id: 'ans-1',
          title: 'Soil nitrogen levels',
          body: 'Add organic compost to increase nitrogen.'
        }
      ],
      includedNotes: [],
      includedSources: []
    };

    const md = generateMarkdownReport(safeReport);
    assert.ok(md.includes('No high-risk operations were identified during this session.'));
    assert.ok(!md.includes('CRITICAL SECURITY RISK WARNING'));
  });

  await t.test('4. Backup Validation Schema Checks', () => {
    // Valid Backup
    const validBackup = {
      backupType: 'sos_session_backup',
      version: 1,
      exportedAt: '2026-07-03T14:00:00.000Z',
      data: {
        savedAnswers: [{ id: 'ans-1', createdAt: '2026-07-03T14:00:00.000Z', title: 'Answer' }],
        savedSources: [],
        fieldNotes: [],
        reportDrafts: []
      }
    };
    assert.deepStrictEqual(validateBackup(validBackup), { valid: true });

    // Invalid Backup: incorrect backupType
    const invalidType = { ...validBackup, backupType: 'invalid_type' };
    assert.strictEqual(validateBackup(invalidType).valid, false);
    assert.ok(validateBackup(invalidType).error.includes('backupType mismatch'));

    // Invalid Backup: missing version
    const invalidVersion = { ...validBackup, version: undefined };
    assert.strictEqual(validateBackup(invalidVersion).valid, false);

    // Invalid Backup: missing data collection array
    const missingCollection = {
      backupType: 'sos_session_backup',
      version: 1,
      data: {
        savedAnswers: []
        // savedSources, fieldNotes, reportDrafts are missing
      }
    };
    assert.strictEqual(validateBackup(missingCollection).valid, false);
    assert.ok(validateBackup(missingCollection).error.includes('missing collection'));

    // Invalid Backup: missing id in items
    const invalidItem = {
      backupType: 'sos_session_backup',
      version: 1,
      data: {
        savedAnswers: [{ createdAt: '2026-07-03T14:00:00.000Z' }], // missing id
        savedSources: [],
        fieldNotes: [],
        reportDrafts: []
      }
    };
    assert.strictEqual(validateBackup(invalidItem).valid, false);
    assert.ok(validateBackup(invalidItem).error.includes("missing required 'id'"));
  });

  await t.test('5. Deduplication and Merging behavior', () => {
    const existing = [
      { id: 'ans-1', createdAt: '2026-07-03T10:00:00.000Z', updatedAt: '2026-07-03T10:00:00.000Z', text: 'Old Answer' },
      { id: 'ans-2', createdAt: '2026-07-03T10:00:00.000Z', updatedAt: '2026-07-03T10:00:00.000Z', text: 'Untouched' }
    ];

    const imported = [
      // Older or equal item: should be ignored
      { id: 'ans-1', createdAt: '2026-07-03T10:00:00.000Z', updatedAt: '2026-07-03T10:00:00.000Z', text: 'Ignored Older' },
      // Newer item: should overwrite
      { id: 'ans-2', createdAt: '2026-07-03T10:00:00.000Z', updatedAt: '2026-07-03T11:00:00.000Z', text: 'Updated Text' },
      // New disjoint item: should append
      { id: 'ans-3', createdAt: '2026-07-03T12:00:00.000Z', updatedAt: '2026-07-03T12:00:00.000Z', text: 'Appended Item' }
    ];

    const merged = mergeCollections(existing, imported);

    assert.strictEqual(merged.length, 3);
    // ans-1 retained old text
    assert.strictEqual(merged.find(x => x.id === 'ans-1').text, 'Old Answer');
    // ans-2 updated with new text
    assert.strictEqual(merged.find(x => x.id === 'ans-2').text, 'Updated Text');
    // ans-3 was added
    assert.strictEqual(merged.find(x => x.id === 'ans-3').text, 'Appended Item');
  });
});
