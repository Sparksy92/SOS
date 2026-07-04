// Local-first guided mission intake module for SurvivalOS

export const MISSION_TEMPLATES = {
  fishing: {
    title: 'Fishing Expedition',
    missionType: 'food_gathering',
    riskCategory: 'water_treatment',
    defaultPriority: 'medium',
    description: 'Local fishing trip to secure food resources and monitor water health.',
    questions: [
      { key: 'location', text: 'Where are you fishing today?' },
      { key: 'method', text: 'Are you fishing from shore, dock, boat, kayak, or canoe?' },
      { key: 'species', text: 'What fish species are you targeting?' },
      { key: 'people', text: 'How many people are coming with you?' },
      { key: 'kids', text: 'Are children joining this trip? (yes/no)' },
      { key: 'checklist', text: 'Do you need a gear packing checklist? (yes/no)' }
    ],
    objectives: [
      'Confirm safety at target fishing site',
      'Deploy fishing gear and monitor catch logs'
    ],
    tasks: [
      'Pack rods, reels, tackle box, and fresh bait',
      'Pack drinking water, safety rations, and basic first aid kit',
      'Check local wind, tide, and weather forecasts manually',
      'Verify fishing permit or licenses manually',
      'Clean up the fishing site and pack out all waste'
    ]
  },
  camping: {
    title: 'Camping Field Session',
    missionType: 'survival_exercise',
    riskCategory: 'wild_plants',
    defaultPriority: 'medium',
    description: 'Overnight wilderness field session to test homestead readiness gear.',
    questions: [
      { key: 'location', text: 'Where is the campsite located?' },
      { key: 'duration', text: 'For how many days/nights are you camping?' },
      { key: 'people', text: 'Who is joining your group?' },
      { key: 'shelter', text: 'Do you need shelter and tent configuration checks? (yes/no)' }
    ],
    objectives: [
      'Establish wilderness camp perimeter',
      'Test shelter insulation and wood prep logs'
    ],
    tasks: [
      'Pack tent, stakes, sleeping bags, and insulated pads',
      'Pack fire starter, lighter, and dry kindling',
      'Verify water purification filter operation manually',
      'Verify campfire safety perimeter is clear of dry leaves',
      'Ensure all food is cached securely away from tents'
    ]
  },
  hiking: {
    title: 'Trail scouting & hiking',
    missionType: 'field_scouting',
    riskCategory: 'wild_plants',
    defaultPriority: 'medium',
    description: 'Local trail hike to inspect terrain, markers, and wild plants.',
    questions: [
      { key: 'trail', text: 'Which trail or sector are you hiking?' },
      { key: 'distance', text: 'What is the total estimated distance or duration?' },
      { key: 'people', text: 'Who is hiking with you?' },
      { key: 'navigation', text: 'Do you have physically printed maps and compass? (yes/no)' }
    ],
    objectives: [
      'Scout target trail conditions and markers',
      'Identify and log wild plant locations'
    ],
    tasks: [
      'Pack printed maps, hand compass, and headlight',
      'Pack water flask and energy trail snacks',
      'Pack insect repellent and tick extraction card',
      'Check trail closures and local sunset times manually'
    ]
  },
  water_run: {
    title: 'Water Logistics Run',
    missionType: 'homestead_readiness',
    riskCategory: 'water_treatment',
    defaultPriority: 'high',
    description: 'Bulk water collection, filtration, and transport to homestead reserves.',
    questions: [
      { key: 'source', text: 'What is the raw water source (creek, spring, pond)?' },
      { key: 'gallons', text: 'How many gallons are you transporting?' },
      { key: 'method', text: 'Which purification method will you use (filter, bleach, boil)?' }
    ],
    objectives: [
      'Collect raw water from source safely',
      'Complete filtration and treatment process'
    ],
    tasks: [
      'Inspect water jerrycans, gaskets, and clean transfer hoses',
      'Set up gravity filter or pump assembly',
      'Verify filter membrane integrity and purge line manually',
      'Add chlorine/bleach treatment safely in venting zone',
      'Store treated water in sanitized homestead containers'
    ]
  },
  generator_repair: {
    title: 'Generator Maintenance',
    missionType: 'maintenance',
    riskCategory: 'electrical',
    defaultPriority: 'high',
    description: 'Homestead backup generator inspection, oil check, and repairs.',
    questions: [
      { key: 'genType', text: 'What model/type of generator is this (gas, propane, solar)?' },
      { key: 'symptom', text: 'What is the primary symptom (cranks but no start, low voltage, leak)?' },
      { key: 'tools', text: 'Do you have spark plug socket, fresh oil, and air filter? (yes/no)' }
    ],
    objectives: [
      'Perform electrical and fuel safety isolation',
      'Clean fuel lines and verify spark plug spark'
    ],
    tasks: [
      'WARNING: Operate generator outdoors ONLY to prevent carbon monoxide poisoning',
      'WARNING: Disconnect generator from main house grid before maintenance',
      'Inspect oil level and replace spark plug if fouled',
      'Clean carburetor jets and inspect fuel line hose',
      'Run generator under 50% load and check output voltage'
    ]
  },
  supply_run: {
    title: 'Supply Procurement Run',
    missionType: 'logistics',
    riskCategory: null,
    defaultPriority: 'medium',
    description: 'Logistics run to procure hardware, dry food, or backup supplies.',
    questions: [
      { key: 'destination', text: 'What is the supply run destination?' },
      { key: 'priorities', text: 'What are the top priority items (food, hardware, medicine)?' },
      { key: 'transport', text: 'What transport vehicle are you using?' }
    ],
    objectives: [
      'Procure and verify supply list items',
      'Secure cargo and complete homestead inventory update'
    ],
    tasks: [
      'Draft priority shopping list',
      'Verify vehicle tires, fuel level, and spare parts',
      'Pack tie-down straps and cargo covers',
      'Catalog and count items into pantry reserves upon return'
    ]
  },
  firewood_run: {
    title: 'Wood Resource Gathering',
    missionType: 'resource_gathering',
    riskCategory: 'mechanical',
    defaultPriority: 'medium',
    description: 'Harvesting, split, and dry stacking of winter firewood logs.',
    questions: [
      { key: 'zone', text: 'Which wood harvest zone are you visiting?' },
      { key: 'equipment', text: 'What equipment are you operating (chainsaw, splitter, axe)?' },
      { key: 'assist', text: 'Who is assisting with harvesting and hauling?' }
    ],
    objectives: [
      'Harvest dry hardwood segments safely',
      'Haul and dry-stack wood logs at homestead storage'
    ],
    tasks: [
      'Pack chainsaw mix fuel, chain oil, and spare chain',
      'Pack helmet, visor, safety glasses, and gloves',
      'Inspect wood splitter hydraulic oil and spark plug gap',
      'Split logs to stove length and stack under dry cover'
    ]
  },
  general_field_mission: {
    title: 'General Field Session',
    missionType: 'custom',
    riskCategory: null,
    defaultPriority: 'medium',
    description: 'Custom homestead field mission session.',
    questions: [
      { key: 'title', text: 'What is the title of this mission?' },
      { key: 'overview', text: 'Provide a brief overview of the mission goal.' },
      { key: 'priority', text: 'What is the priority (low, medium, high)?' }
    ],
    objectives: [
      'Establish primary custom mission profile'
    ],
    tasks: [
      'Confirm safety directives checklist',
      'Log periodic status reports'
    ]
  }
};

/**
 * Checks if a user message implies starting a guided intake flow.
 */
export function detectMissionIntakeIntent(message) {
  if (!message || typeof message !== 'string') return null;
  const text = message.toLowerCase();
  
  // Specific templates triggers
  if (text.includes('fish')) return 'fishing';
  if (text.includes('camp')) return 'camping';
  if (text.includes('hike') || text.includes('trail')) return 'hiking';
  if (text.includes('water run') || text.includes('collect water')) return 'water_run';
  if (text.includes('generator') || text.includes('fix gen')) return 'generator_repair';
  if (text.includes('supply run') || text.includes('procure supply')) return 'supply_run';
  if (text.includes('wood') || text.includes('firewood') || text.includes('timber')) return 'firewood_run';
  
  // Generic trigger
  if (text.includes('start a mission') || text.includes('plan a mission') || text.includes('create a mission') || text.includes('new mission')) {
    return 'general_field_mission';
  }
  
  return null;
}

/**
 * Initializes intake session state.
 */
export function startMissionIntake(intentType) {
  const template = MISSION_TEMPLATES[intentType] || MISSION_TEMPLATES.general_field_mission;
  return {
    active: true,
    intentType,
    startedAt: new Date().toISOString(),
    currentQuestionIndex: 0,
    answers: {},
    draftMission: null
  };
}

/**
 * Gets the questions list.
 */
export function getMissionIntakeQuestions(intentType) {
  const template = MISSION_TEMPLATES[intentType] || MISSION_TEMPLATES.general_field_mission;
  return template.questions;
}

/**
 * Updates answers and state. Generates draft when finished.
 */
export function updateMissionIntakeDraft(intakeState, userResponse) {
  const template = MISSION_TEMPLATES[intakeState.intentType] || MISSION_TEMPLATES.general_field_mission;
  const questions = template.questions;
  const currentQ = questions[intakeState.currentQuestionIndex];
  
  if (currentQ) {
    intakeState.answers[currentQ.key] = userResponse;
    intakeState.currentQuestionIndex++;
  }
  
  if (intakeState.currentQuestionIndex >= questions.length) {
    intakeState.draftMission = buildMissionDraftFromIntake(intakeState);
  }
  
  return intakeState;
}

/**
 * Builds a preview draft from the answers.
 */
export function buildMissionDraftFromIntake(intakeState) {
  const template = MISSION_TEMPLATES[intakeState.intentType] || MISSION_TEMPLATES.general_field_mission;
  const answers = intakeState.answers;
  
  let title = template.title;
  let overview = template.description;
  let priority = template.defaultPriority;
  
  // Custom tweaks based on answers
  if (intakeState.intentType === 'fishing') {
    title = `Fishing trip at ${answers.location || 'Local Water'}`;
    overview = `Expedition to target ${answers.species || 'fish'} using ${answers.method || 'shore'} method. Total crew: ${answers.people || '1'}.`;
  } else if (intakeState.intentType === 'camping') {
    title = `Camping at ${answers.location || 'Wilderness'}`;
    overview = `Field session for ${answers.duration || '1 night'} overnight testing. Group members: ${answers.people || 'Self'}.`;
  } else if (intakeState.intentType === 'hiking') {
    title = `Hiking: ${answers.trail || 'Unknown Trail'}`;
    overview = `Scouting run spanning ${answers.distance || 'N/A'}. Group members: ${answers.people || 'Self'}.`;
  } else if (intakeState.intentType === 'water_run') {
    title = `Water extraction: ${answers.source || 'Water Source'}`;
    overview = `Logistics transport of ${answers.gallons || '5'} gallons using ${answers.method || 'gravity filter'} purification.`;
  } else if (intakeState.intentType === 'generator_repair') {
    title = `Repair ${answers.genType || 'Backup Generator'}`;
    overview = `Maintenance isolation to address symptom: ${answers.symptom || 'Not starting'}.`;
  } else if (intakeState.intentType === 'general_field_mission') {
    title = answers.title || 'General Field Mission';
    overview = answers.overview || 'Custom logged homestead session.';
    priority = answers.priority || 'medium';
  }
  
  const objectives = [...template.objectives];
  const checklist = template.tasks.map((taskLabel, idx) => ({
    id: `task_${idx}`,
    label: taskLabel,
    status: 'todo',
    priority: priority,
    riskCategory: template.riskCategory || null
  }));
  
  return {
    title,
    missionType: template.missionType,
    riskCategory: template.riskCategory,
    priority,
    overview,
    objectives: objectives.map((objLabel, idx) => ({
      id: `obj_${idx}`,
      label: objLabel,
      status: 'todo'
    })),
    checklist,
    tasks: []
  };
}

/**
 * Validates draft completeness.
 */
export function validateMissionDraft(draft) {
  if (!draft || !draft.title || !draft.title.trim()) {
    return { valid: false, error: 'Mission title is required.' };
  }
  return { valid: true };
}

/**
 * Converts draft into complete store-ready structure.
 */
export function convertMissionDraftToMission(draft) {
  const now = new Date().toISOString();
  
  // Make unique IDs
  const makeId = () => Math.random().toString(36).substring(2, 9);
  
  const objectives = (draft.objectives || []).map(obj => ({
    id: makeId(),
    label: obj.label,
    status: 'todo',
    createdAt: now,
    updatedAt: now
  }));
  
  const checklist = (draft.checklist || []).map(task => ({
    id: makeId(),
    label: task.label,
    status: 'todo',
    priority: task.priority || 'medium',
    riskCategory: task.riskCategory || null,
    createdAt: now,
    updatedAt: now,
    completedAt: null
  }));
  
  return {
    id: makeId(),
    createdAt: now,
    updatedAt: now,
    status: 'active',
    title: draft.title,
    missionType: draft.missionType || 'custom',
    priority: draft.priority || 'medium',
    riskCategory: draft.riskCategory || null,
    locationLabel: '',
    callsign: '',
    overview: draft.overview || '',
    objectives,
    checklist,
    tasks: [],
    savedAnswerIds: [],
    savedSourceIds: [],
    fieldNoteIds: [],
    reportDraftId: null,
    timeline: [
      {
        id: makeId(),
        createdAt: now,
        type: 'mission_created',
        label: 'Mission profile initialized from conversational guided intake.',
        details: { title: draft.title }
      }
    ],
    manualNotes: '',
    completedAt: null
  };
}
