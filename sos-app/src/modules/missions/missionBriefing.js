// Pure JavaScript utilities for local, deterministic mission briefs and readiness scoring
import { detectMissionRisks } from './missionUtils.js';

/**
 * Calculates the Mission Organization Score (0 to 100).
 */
export const calculateReadinessScore = (mission, relatedAnswers = [], relatedSources = [], relatedNotes = [], reviewQueue = []) => {
  let score = 50; // Baseline
  const reasons = [];

  // 1. Attached Answers: +10 each (max 20)
  const answersCount = relatedAnswers.length;
  if (answersCount > 0) {
    const points = Math.min(20, answersCount * 10);
    score += points;
    reasons.push(`+${points} points: Attached ${answersCount} Ranger answers.`);
  }

  // 2. Attached Sources: +10 each (max 20)
  const sourcesCount = relatedSources.length;
  if (sourcesCount > 0) {
    const points = Math.min(20, sourcesCount * 10);
    score += points;
    reasons.push(`+${points} points: Attached ${sourcesCount} reference sources.`);
  }

  // 3. Field Notes: +5 each (max 10)
  const notesCount = relatedNotes.length;
  if (notesCount > 0) {
    const points = Math.min(10, notesCount * 5);
    score += points;
    reasons.push(`+${points} points: Logged ${notesCount} field notes.`);
  }

  // 4. Objectives: +10 for each completed objective (max 20)
  const objectives = mission.objectives || [];
  const completedObjectives = objectives.filter(o => o.status === 'done').length;
  if (completedObjectives > 0) {
    const points = Math.min(20, completedObjectives * 10);
    score += points;
    reasons.push(`+${points} points: Completed ${completedObjectives} mission objectives.`);
  }

  // 5. Tasks/Checklist: +5 for each completed task (max 20)
  const tasks = [...(mission.checklist || []), ...(mission.tasks || [])];
  const completedTasks = tasks.filter(t => t.status === 'done').length;
  if (completedTasks > 0) {
    const points = Math.min(20, completedTasks * 5);
    score += points;
    reasons.push(`+${points} points: Completed ${completedTasks} checklist/tasks.`);
  }

  // Deductions:
  // - Queued Sources: -5 for each unreviewed item (max -20)
  const missionQueue = reviewQueue.filter(q => q.missionId === mission.id && q.status === 'queued');
  const unreviewedCount = missionQueue.length;
  if (unreviewedCount > 0) {
    const deduction = Math.min(20, unreviewedCount * 5);
    score -= deduction;
    reasons.push(`-${deduction} points: ${unreviewedCount} sources queued for review.`);
  }

  // - Open High-Priority Tasks: -5 for each (max -10)
  const openHighTasks = tasks.filter(t => t.status !== 'done' && t.priority === 'high').length;
  if (openHighTasks > 0) {
    const deduction = Math.min(10, openHighTasks * 5);
    score -= deduction;
    reasons.push(`-${deduction} points: ${openHighTasks} high-priority tasks are open.`);
  }

  // Constrain
  score = Math.max(0, Math.min(100, score));

  // Wording label (Safer labeling to avoid certifying actual physical safety)
  let label = 'Needs Setup';
  if (score >= 80) label = 'Field Organized';
  else if (score >= 60) label = 'Needs Review';

  return {
    score,
    label,
    reasons
  };
};

/**
 * Generates the risk-aware safety checklist disclaimers.
 */
export const getSafetyChecklist = (riskCategories) => {
  const checklist = [];
  
  riskCategories.forEach(cat => {
    switch (cat.toLowerCase()) {
      case 'medical':
        checklist.push({
          category: 'medical',
          warning: 'Do not attempt invasive procedures without certified local training. This system is for general library reference only and does not provide medical diagnosis or treatment.',
          directives: [
            'Cross-verify sanitation, hydration, and wound-management protocols against physical books.',
            'Locate local trauma supplies and verify expiration dates.'
          ]
        });
        break;
      case 'firearms':
        checklist.push({
          category: 'firearms',
          warning: 'Ensure safe range practices and adhere strictly to local rules. This system does NOT provide tactical or offensive firearm guidance.',
          directives: [
            'Inspect actions, safety locks, and barrel clearances.',
            'Confirm secure, dry ammunition storage.'
          ]
        });
        break;
      case 'water_treatment':
        checklist.push({
          category: 'water_treatment',
          warning: 'Ensure water quality is tested and double-purified (filter + boil/sanitize) for consumption.',
          directives: [
            'Check filter membrane integrity for microscopic punctures.',
            'Validate chemical expiration dates (bleach/chlorine tabs).'
          ]
        });
        break;
      case 'food_preservation':
        checklist.push({
          category: 'food_preservation',
          warning: 'Improper preservation (canning/curing) can cause fatal botulism. Always double-check temperature gauges and pH indicators.',
          directives: [
            'Sterilize jars and inspect lid seals for negative pressure vacuum.',
            'Maintain accurate pressure gauge calibrations.'
          ]
        });
        break;
      case 'electrical':
        checklist.push({
          category: 'electrical',
          warning: 'Ensure generator is operated outdoors only to prevent lethal carbon monoxide poisoning. Disconnect main breaker before connecting generator.',
          directives: [
            'Disconnect main grid circuit breaker before backup backfeeding.',
            'Test grounding pins and circuit interrupt resets.'
          ]
        });
        break;
      case 'fuel_generator':
        checklist.push({
          category: 'fuel_generator',
          warning: 'Store all liquid/gas fuels in vented containers away from living quarters and ignition sources.',
          directives: [
            'Inspect fuel lines for dry rot or micro-leaks.',
            'Ensure carbon monoxide detectors are active and battery-fresh.'
          ]
        });
        break;
      case 'mechanical':
        checklist.push({
          category: 'mechanical',
          warning: 'Relieve pressure from hydraulic or pneumatic lines before maintenance.',
          directives: [
            'Check safety pins, belt tension, and fluid levels.',
            'Ensure protective shrouds and guards are mounted.'
          ]
        });
        break;
      case 'chemical':
        checklist.push({
          category: 'chemical',
          warning: 'Always mix chemicals outdoors or in high-ventilation zones. Never mix bleach with ammonia.',
          directives: [
            'Maintain SDS (Safety Data Sheets) physically available.',
            'Equip acid-resistant gloves and protective eye shields.'
          ]
        });
        break;
      default:
        break;
    }
  });

  return checklist;
};

/**
 * Builds the complete structured briefing profile.
 */
export const buildMissionBrief = (mission, relatedAnswers = [], relatedSources = [], relatedNotes = [], reviewQueue = []) => {
  const readiness = calculateReadinessScore(mission, relatedAnswers, relatedSources, relatedNotes, reviewQueue);
  const risks = detectMissionRisks(mission, relatedAnswers, relatedSources, relatedNotes);
  const safetyChecklist = getSafetyChecklist(risks);

  const openObjectives = (mission.objectives || []).filter(o => o.status !== 'done');
  const openTasks = [...(mission.checklist || []), ...(mission.tasks || [])].filter(t => t.status !== 'done');
  const queuedSources = reviewQueue.filter(q => q.missionId === mission.id && q.status === 'queued');

  return {
    missionId: mission.id,
    title: mission.title,
    missionType: mission.missionType,
    status: mission.status,
    priority: mission.priority,
    locationLabel: mission.locationLabel,
    callsign: mission.callsign,
    overview: mission.overview,
    readiness,
    risks,
    safetyChecklist,
    openObjectives,
    openTasks,
    queuedSources,
    attachedAnswersCount: relatedAnswers.length,
    attachedSourcesCount: relatedSources.length,
    fieldNotesCount: relatedNotes.length
  };
};
