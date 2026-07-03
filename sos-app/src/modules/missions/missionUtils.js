// Pure JavaScript utility functions for SOS Mission Mode (fully testable under Node.js)

export const createMissionFromTemplate = (template, fields = {}) => {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  
  const objectives = (template.objectives || []).map(obj => ({
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    label: obj,
    status: 'todo',
    createdAt: now,
    updatedAt: now
  }));

  const checklistTasks = (template.checklist || []).map(item => ({
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    label: item,
    description: '',
    status: 'todo',
    priority: 'medium',
    riskCategory: template.riskCategory || null,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  }));

  return {
    id,
    createdAt: now,
    updatedAt: now,
    status: 'active',
    title: fields.title || template.title || 'New Mission',
    missionType: template.missionType || fields.missionType || 'custom',
    priority: fields.priority || template.defaultPriority || 'medium',
    riskCategory: template.riskCategory || fields.riskCategory || null,
    locationLabel: fields.locationLabel || '',
    callsign: fields.callsign || '',
    overview: fields.overview || template.description || '',
    objectives,
    checklist: checklistTasks, // template tasks
    tasks: [], // custom additional tasks
    savedAnswerIds: [],
    savedSourceIds: [],
    fieldNoteIds: [],
    reportDraftId: null,
    timeline: [
      {
        id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        createdAt: now,
        type: 'mission_created',
        label: 'Mission profile initialized.',
        details: { title: fields.title || template.title }
      }
    ],
    readinessSnapshot: fields.readinessSnapshot || null,
    manualNotes: '',
    completedAt: null
  };
};

export const createMissionTask = (label, priority = 'medium', riskCategory = null) => {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  return {
    id,
    label,
    description: '',
    status: 'todo',
    priority,
    riskCategory,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  };
};

export const addTimelineEvent = (mission, type, label, details = {}) => {
  const id = (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  const newEvent = { id, createdAt: now, type, label, details };
  
  return {
    ...mission,
    updatedAt: now,
    timeline: [...(mission.timeline || []), newEvent]
  };
};

export const transitionMissionStatus = (mission, newStatus) => {
  const now = new Date().toISOString();
  let completedAt = mission.completedAt;
  if (newStatus === 'completed') {
    completedAt = now;
  } else if (newStatus === 'active' || newStatus === 'paused') {
    completedAt = null;
  }

  const updatedMission = {
    ...mission,
    status: newStatus,
    updatedAt: now,
    completedAt
  };

  return addTimelineEvent(
    updatedMission,
    'status_changed',
    `Mission status changed to ${newStatus.toUpperCase()}.`,
    { status: newStatus }
  );
};

export const detectMissionRisks = (mission, relatedAnswers = [], relatedSources = [], relatedNotes = []) => {
  const risks = new Set();
  
  if (mission.riskCategory) risks.add(mission.riskCategory);
  
  // Scan tasks & checklist items
  const allTasks = [...(mission.checklist || []), ...(mission.tasks || [])];
  allTasks.forEach(t => {
    if (t.riskCategory) risks.add(t.riskCategory);
  });

  // Scan linked records
  relatedAnswers.forEach(a => {
    if (a.riskCategory) risks.add(a.riskCategory);
  });
  
  relatedSources.forEach(s => {
    if (s.riskCategory) risks.add(s.riskCategory);
  });

  relatedNotes.forEach(n => {
    if (n.riskCategory) risks.add(n.riskCategory);
  });

  return Array.from(risks);
};

export const buildMissionRelatedData = (mission, allAnswers = [], allSources = [], allNotes = []) => {
  const savedAnswerIds = mission.savedAnswerIds || [];
  const savedSourceIds = mission.savedSourceIds || [];
  const fieldNoteIds = mission.fieldNoteIds || [];

  return {
    includedAnswers: allAnswers.filter(a => savedAnswerIds.includes(a.id)),
    includedSources: allSources.filter(s => savedSourceIds.includes(s.id)),
    includedNotes: allNotes.filter(n => fieldNoteIds.includes(n.id))
  };
};
