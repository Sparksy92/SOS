import { test } from 'node:test';
import assert from 'node:assert';
import { calculateReadinessScore, getSafetyChecklist, buildMissionBrief } from '../../sos-app/src/modules/missions/missionBriefing.js';
import { detectMissionIntakeIntent, startMissionIntake, getMissionIntakeQuestions, updateMissionIntakeDraft, buildMissionDraftFromIntake, convertMissionDraftToMission } from '../../sos-app/src/modules/missions/missionIntake.js';

test('SOS Mission Briefing and guided intake logic suite', async (t) => {

  await t.test('1. briefing builds from mission with no attachments', () => {
    const mockMission = {
      id: 'm1',
      title: 'Blank Mission',
      objectives: [],
      checklist: [],
      tasks: [],
      riskCategory: null
    };

    const brief = buildMissionBrief(mockMission, [], [], [], []);
    assert.strictEqual(brief.title, 'Blank Mission');
    assert.strictEqual(brief.readiness.score, 50);
    assert.strictEqual(brief.readiness.label, 'Needs Setup');
    assert.strictEqual(brief.safetyChecklist.length, 0);
  });

  await t.test('2. briefing counts objectives/tasks correctly', () => {
    const mockMission = {
      id: 'm2',
      title: 'Work Mission',
      objectives: [
        { id: 'o1', status: 'done', label: 'Obj 1' },
        { id: 'o2', status: 'todo', label: 'Obj 2' }
      ],
      checklist: [
        { id: 'c1', status: 'done', label: 'Task 1', priority: 'medium' },
        { id: 'c2', status: 'todo', label: 'Task 2', priority: 'medium' }
      ],
      tasks: [],
      riskCategory: null
    };

    const brief = buildMissionBrief(mockMission, [], [], [], []);
    assert.strictEqual(brief.openObjectives.length, 1);
    assert.strictEqual(brief.openTasks.length, 1);
  });

  await t.test('3. organization score labels are correct', () => {
    const mockMission = { id: 'm3', title: 'Organization Score Test' };
    
    // score 50 => Needs Setup
    let scoreObj = calculateReadinessScore(mockMission, [], [], [], []);
    assert.strictEqual(scoreObj.label, 'Needs Setup');

    // score 70 => Needs Review
    scoreObj = calculateReadinessScore(mockMission, [{}], [{}], [], []);
    assert.strictEqual(scoreObj.label, 'Needs Review');

    // score 90 => Field Organized
    scoreObj = calculateReadinessScore(mockMission, [{}, {}], [{}, {}], [{}], []);
    assert.strictEqual(scoreObj.label, 'Field Organized');
  });

  await t.test('4. queued sources reduce organization score', () => {
    const mockMission = { id: 'm4', title: 'Queue Penalty Test' };
    const queue = [
      { id: 'q1', missionId: 'm4', status: 'queued', title: 'Danger' }
    ];
    // Baseline: 50. Deduct 5 for queued source => 45.
    const scoreObj = calculateReadinessScore(mockMission, [], [], [], queue);
    assert.strictEqual(scoreObj.score, 45);
  });

  await t.test('5. attached sources improve organization score', () => {
    const mockMission = { id: 'm5', title: 'Attached improvement' };
    const answers = [{}];
    const sources = [{}];
    // Baseline 50 + 10 (answer) + 10 (source) = 70.
    const scoreObj = calculateReadinessScore(mockMission, answers, sources, [], []);
    assert.strictEqual(scoreObj.score, 70);
  });

  await t.test('6. high-risk categories create safety warnings', () => {
    const checklist = getSafetyChecklist(['electrical', 'medical']);
    assert.strictEqual(checklist.length, 2);
    assert.strictEqual(checklist[0].category, 'electrical');
    assert.strictEqual(checklist[1].category, 'medical');
  });

  await t.test('7. medical mission does not generate treatment advice', () => {
    const checklist = getSafetyChecklist(['medical']);
    const warning = checklist[0].warning;
    assert.ok(warning.includes('does not provide medical diagnosis or treatment'));
    assert.ok(!warning.includes('inject'));
    assert.ok(!warning.includes('prescribe'));
  });

  await t.test('8. firearms risk does not generate tactical/offensive guidance', () => {
    const checklist = getSafetyChecklist(['firearms']);
    const warning = checklist[0].warning;
    assert.ok(warning.includes('does NOT provide tactical or offensive firearm guidance'));
    assert.ok(!warning.includes('aim'));
    assert.ok(!warning.includes('shoot'));
  });

  await t.test('9. detects "I wanna go fishing" as mission intake', () => {
    const intent = detectMissionIntakeIntent('I wanna go fishing');
    assert.strictEqual(intent, 'fishing');

    const intent2 = detectMissionIntakeIntent('I want to start a mission');
    assert.strictEqual(intent2, 'general_field_mission');

    const intentNone = detectMissionIntakeIntent('hello there');
    assert.strictEqual(intentNone, null);
  });

  await t.test('10. does not auto-create mission from one sentence', () => {
    const state = startMissionIntake('fishing');
    assert.strictEqual(state.active, true);
    assert.strictEqual(state.draftMission, null); // Stays null until questions complete
  });

  await t.test('11. asks fishing-specific questions', () => {
    const questions = getMissionIntakeQuestions('fishing');
    assert.ok(questions[0].text.includes('Where are you fishing'));
    assert.ok(questions[2].text.includes('targeting'));
  });

  await t.test('12. builds draft fishing mission from answers', () => {
    let state = startMissionIntake('fishing');
    state = updateMissionIntakeDraft(state, 'Creek');
    state = updateMissionIntakeDraft(state, 'shore');
    state = updateMissionIntakeDraft(state, 'Bass');
    state = updateMissionIntakeDraft(state, '2');
    state = updateMissionIntakeDraft(state, 'no');
    state = updateMissionIntakeDraft(state, 'yes');

    assert.ok(state.draftMission !== null);
    assert.strictEqual(state.draftMission.title, 'Fishing trip at Creek');
    assert.strictEqual(state.draftMission.riskCategory, 'water_treatment');
    assert.ok(state.draftMission.checklist.length > 0);
  });

  await t.test('13. requires user approval before creating mission', () => {
    let state = startMissionIntake('hiking');
    state = updateMissionIntakeDraft(state, 'Ridge');
    state = updateMissionIntakeDraft(state, '3 miles');
    state = updateMissionIntakeDraft(state, 'Self');
    state = updateMissionIntakeDraft(state, 'yes');

    assert.ok(state.draftMission !== null);
    // Convert to mission is explicitly triggered only upon save approval
    const finalMission = convertMissionDraftToMission(state.draftMission);
    assert.strictEqual(finalMission.title, 'Hiking: Ridge');
    assert.strictEqual(finalMission.status, 'active');
  });

});
