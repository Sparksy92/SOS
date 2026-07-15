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
import { missionTemplates } from '../../sos-app/src/modules/missions/missionTemplates.js';
import { 
  createMissionFromTemplate, createMissionTask, 
  addTimelineEvent, transitionMissionStatus, detectMissionRisks 
} from '../../sos-app/src/modules/missions/missionUtils.js';
import { 
  generateMissionMarkdownReport, generateMissionJSONReport 
} from '../../sos-app/src/modules/reports/reportExport.js';
import { validateBackup } from '../../sos-app/src/modules/session/sessionStore.js';

test('SOS Mission Mode Test Suite', async (t) => {

  await t.test('1. Mission templates list loads configurations', () => {
    assert.ok(Array.isArray(missionTemplates));
    assert.strictEqual(missionTemplates.length, 6);
    
    const blackout = missionTemplates.find(x => x.id === 'template_blackout');
    assert.ok(blackout);
    assert.strictEqual(blackout.riskCategory, 'electrical');
    assert.ok(blackout.objectives.length > 0);
    assert.ok(blackout.checklist.length > 0);
  });

  await t.test('2. Mission initialization from template maps custom parameters', () => {
    const template = missionTemplates.find(x => x.id === 'template_blackout');
    const fields = {
      title: 'Active Grid Failure Sector 4',
      priority: 'high',
      locationLabel: 'Sector 4 Outpost',
      callsign: 'Apex 1',
      overview: 'Severe ice storm grid outage response.'
    };

    const mission = createMissionFromTemplate(template, fields);
    
    assert.ok(mission.id);
    assert.strictEqual(mission.title, 'Active Grid Failure Sector 4');
    assert.strictEqual(mission.priority, 'high');
    assert.strictEqual(mission.locationLabel, 'Sector 4 Outpost');
    assert.strictEqual(mission.callsign, 'Apex 1');
    assert.strictEqual(mission.overview, 'Severe ice storm grid outage response.');
    assert.strictEqual(mission.status, 'active');
    
    // Checklist mapping
    assert.strictEqual(mission.checklist.length, template.checklist.length);
    assert.strictEqual(mission.checklist[0].label, template.checklist[0]);
    assert.strictEqual(mission.checklist[0].status, 'todo');
    assert.strictEqual(mission.checklist[0].riskCategory, 'electrical');

    // Timeline event logged
    assert.strictEqual(mission.timeline.length, 1);
    assert.strictEqual(mission.timeline[0].type, 'mission_created');
  });

  await t.test('3. Status transitions update status, completedAt, and log timeline event', () => {
    const template = missionTemplates.find(x => x.id === 'template_water_filtration');
    let mission = createMissionFromTemplate(template, { title: 'Filter Maintenance' });

    assert.strictEqual(mission.status, 'active');
    assert.strictEqual(mission.completedAt, null);

    // Transition to Paused
    mission = transitionMissionStatus(mission, 'paused');
    assert.strictEqual(mission.status, 'paused');
    assert.strictEqual(mission.completedAt, null);
    assert.strictEqual(mission.timeline[1].type, 'status_changed');
    assert.ok(mission.timeline[1].label.includes('PAUSED'));

    // Transition to Completed
    mission = transitionMissionStatus(mission, 'completed');
    assert.strictEqual(mission.status, 'completed');
    assert.ok(mission.completedAt);
  });

  await t.test('4. Risk detector audits multiple resource categories', () => {
    const template = missionTemplates.find(x => x.id === 'template_blackout'); // electrical
    const mission = createMissionFromTemplate(template, { title: 'Pantry Audit' });

    const relatedAnswers = [
      { id: 'a1', riskCategory: 'medical' }
    ];
    const relatedSources = [
      { id: 's1', riskCategory: 'water_treatment' }
    ];
    const relatedNotes = [
      { id: 'n1', riskCategory: 'mechanical' }
    ];

    const risks = detectMissionRisks(mission, relatedAnswers, relatedSources, relatedNotes);
    
    // Risks should have: electrical (template), medical, water_treatment, mechanical
    assert.ok(risks.includes('electrical'));
    assert.ok(risks.includes('medical'));
    assert.ok(risks.includes('water_treatment'));
    assert.ok(risks.includes('mechanical'));
    assert.strictEqual(risks.length, 4);
  });

  await t.test('5. Markdown report generation matches structural format requirements', () => {
    const template = missionTemplates.find(x => x.id === 'template_blackout');
    const mission = createMissionFromTemplate(template, { 
      title: 'Homestead Blackout Audit',
      callsign: 'Delta 5',
      locationLabel: 'Main Cellar'
    });
    mission.manualNotes = 'Batteries verified at 80% charge level.';

    const relatedData = {
      includedAnswers: [
        { id: 'ans1', title: 'Solar charge calculations', relatedQuestion: 'Pantry solar size?', body: 'Use 200W solar panel minimum.' }
      ],
      includedSources: [
        { id: 'src1', title: 'Homestead Energy Handbook', page: '42', matchLabel: 'Strong Match', source: 'energy.pdf', excerpt: 'Always mount solar facing true south.' }
      ],
      includedNotes: [
        { id: 'note1', title: 'Check backup bulbs', noteType: 'inspection log', body: 'Flashlights checked.' }
      ]
    };

    const markdown = generateMissionMarkdownReport(mission, relatedData);

    assert.ok(markdown.includes('# SURVIVALOS MISSION REPORT: HOMESTEAD BLACKOUT AUDIT'));
    assert.ok(markdown.includes('**MISSION TYPE:** BLACKOUT'));
    assert.ok(markdown.includes('**OPERATOR CALLSIGN:** DELTA 5'));
    assert.ok(markdown.includes('**LOCATION/SECTOR:** MAIN CELLAR'));
    assert.ok(markdown.includes('## SECTION 1: MISSION OVERVIEW'));
    assert.ok(markdown.includes('## SECTION 2: OBJECTIVES STATUS'));
    assert.ok(markdown.includes('## SECTION 3: CHECKLIST & LOGISTICS TASKS'));
    assert.ok(markdown.includes('## SECTION 5: OPERATOR OBSERVATION SCRATCHPAD'));
    assert.ok(markdown.includes('Batteries verified at 80% charge level.'));
    assert.ok(markdown.includes('## SECTION 6: ATTACHED RANGER ANSWERS'));
    assert.ok(markdown.includes('Solar charge calculations'));
    assert.ok(markdown.includes('## SECTION 7: ATTACHED SOURCES REFERENCE'));
    assert.ok(markdown.includes('Homestead Energy Handbook'));
    assert.ok(markdown.includes('Always mount solar facing true south.'));
    assert.ok(markdown.includes('## SECTION 8: ATTACHED FIELD NOTES'));
    assert.ok(markdown.includes('Check backup bulbs'));
    assert.ok(markdown.includes('## SECTION 11: RISK DIRECTIVES & WARNINGS'));
    assert.ok(markdown.includes('**ELECTRICAL**'));
  });

  await t.test('6. Version 2 backup and backward compatibility validation', () => {
    // Valid Version 1 backup should succeed
    const v1Backup = {
      backupType: 'sos_session_backup',
      version: 1,
      exportedAt: '2026-07-03T15:00:00Z',
      data: {
        savedAnswers: [{ id: 'a1', createdAt: '2026-07-03T15:00:00Z' }],
        savedSources: [{ id: 's1', createdAt: '2026-07-03T15:00:00Z' }],
        fieldNotes: [{ id: 'n1', createdAt: '2026-07-03T15:00:00Z' }],
        reportDrafts: [{ id: 'r1', createdAt: '2026-07-03T15:00:00Z' }],
        activeSession: null
      }
    };
    const checkV1 = validateBackup(v1Backup);
    assert.ok(checkV1.valid, checkV1.error);

    // Valid Version 2 backup should succeed
    const v2Backup = {
      backupType: 'sos_session_backup',
      version: 2,
      exportedAt: '2026-07-03T15:00:00Z',
      data: {
        savedAnswers: [{ id: 'a1', createdAt: '2026-07-03T15:00:00Z' }],
        savedSources: [{ id: 's1', createdAt: '2026-07-03T15:00:00Z' }],
        fieldNotes: [{ id: 'n1', createdAt: '2026-07-03T15:00:00Z' }],
        reportDrafts: [{ id: 'r1', createdAt: '2026-07-03T15:00:00Z' }],
        activeSession: null,
        missions: [{ id: 'm1', createdAt: '2026-07-03T15:00:00Z' }],
        activeMission: null
      }
    };
    const checkV2 = validateBackup(v2Backup);
    assert.ok(checkV2.valid, checkV2.error);

    // Invalid Version 2 (missions not an array) should fail
    const badV2Backup = {
      backupType: 'sos_session_backup',
      version: 2,
      exportedAt: '2026-07-03T15:00:00Z',
      data: {
        savedAnswers: [],
        savedSources: [],
        fieldNotes: [],
        reportDrafts: [],
        activeSession: null,
        missions: 'not-an-array'
      }
    };
    const checkBad = validateBackup(badV2Backup);
    assert.strictEqual(checkBad.valid, false);
    assert.ok(checkBad.error.includes('array'));
  });

});
