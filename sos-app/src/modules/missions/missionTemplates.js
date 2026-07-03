// Standard offline local mission templates for SOS Field Mode

export const missionTemplates = [
  {
    id: 'template_blackout',
    title: 'Blackout / Power Outage',
    missionType: 'blackout',
    description: 'Guided session to assess reserves, manage backup power generators safely, and establish offline comms during a grid failure.',
    defaultPriority: 'high',
    riskCategory: 'electrical',
    objectives: [
      'Assess auxiliary backup power capability.',
      'Audit emergency lighting assets.',
      'Check heating/cooling insulation reserves.',
      'Validate localized offline radio communications.',
      'Evaluate cold-chain safety for stored food.'
    ],
    checklist: [
      'Inventory all flashlights, headlamps, and battery cells.',
      'Confirm emergency solar power stations are fully charged.',
      'Execute safety checklists before starting fuel generators.',
      'Set fridge/freezer preservation plan (minimize door openings).',
      'Establish family communications plan using local UHF/VHF frequencies.'
    ],
    suggestedJarvisPrompts: [
      'What are the critical safety steps to take before starting a fuel generator?',
      'How long can food stay safe in a closed refrigerator during a blackout?',
      'What is the recommended layout for a homestead emergency power backup system?'
    ],
    suggestedSourceSearches: [
      'generator safety',
      'emergency lighting',
      'off-grid communications'
    ],
    reportType: 'grid outage assessment'
  },
  {
    id: 'template_water_filtration',
    title: 'Water Issue / Filtration Review',
    missionType: 'water_filtration',
    description: 'Ensure clean drinking supply by identifying water sources, inspecting filters, and calculating sanitation parameters offline.',
    defaultPriority: 'critical',
    riskCategory: 'water_treatment',
    objectives: [
      'Locate and verify primary and backup water sources.',
      'Inspect stored emergency water stock.',
      'Review water filtration and purification protocols.',
      'Verify filtration replacement timeline integrity.'
    ],
    checklist: [
      'Measure total volume of stored water containers.',
      'Check containers visually for signs of leaks or algal growth.',
      'Verify date codes on gravity and active charcoal filters.',
      'Consult local chemical sanitation reference charts before treatment.'
    ],
    suggestedJarvisPrompts: [
      'What is the safe chemical dosage ratio for chlorinating emergency drinking water?',
      'How do I build a sand and gravel gravity water filter in the field?',
      'What are the safety indicators that show water requires boiling?'
    ],
    suggestedSourceSearches: [
      'water purification',
      'gravity filters',
      'emergency storage'
    ],
    reportType: 'water sanitization report'
  },
  {
    id: 'template_storm_prep',
    title: 'Storm Preparation',
    missionType: 'storm_prep',
    description: 'Secure homestead infrastructure, secure outdoor items, and audit emergency shelter readiness prior to incoming weather fronts.',
    defaultPriority: 'high',
    riskCategory: null,
    objectives: [
      'Secure property exterior structures.',
      'Audit emergency supplies and safety kits.',
      'Ensure device charges are maximized.',
      'Review storm shelter plans and emergency maps.'
    ],
    checklist: [
      'Secure loose outdoor items (tools, patio furniture, bins).',
      'Charge all communication devices and spare power banks.',
      'Inspect first aid kit and replace expired supplies.',
      'Review localized evacuation maps and shelter guides manually.'
    ],
    suggestedJarvisPrompts: [
      'What items are essential for a 72-hour storm emergency shelter kit?',
      'How do I secure residential structures against high wind damage?',
      'What are the guidelines for setting up storm shelter spaces?'
    ],
    suggestedSourceSearches: [
      'storm preparation',
      'first aid kit',
      'emergency shelter'
    ],
    reportType: 'infrastructure storm readiness'
  },
  {
    id: 'template_vehicle_repair',
    title: 'Vehicle Repair / Breakdown Planning',
    missionType: 'vehicle_repair',
    description: 'Collect vehicle symptoms, identify manual specifications, and list tools required for diagnostic repair.',
    defaultPriority: 'medium',
    riskCategory: 'mechanical',
    objectives: [
      'Document vehicle details and fault symptoms.',
      'Locate specific maintenance and repair manuals.',
      'Compile list of required tools and replacement parts.',
      'Establish safety parameters before starting mechanical diagnostics.'
    ],
    checklist: [
      'Record vehicle year, make, model, and engine type.',
      'List all visual symptoms (leaks, noises, warning codes).',
      'Perform visual inspection of fluids only when engine is cold.',
      'Gather manuals and reference guides from offline library.'
    ],
    suggestedJarvisPrompts: [
      'How do I diagnose a standard vehicle engine starter failure?',
      'What safety precautions are necessary when jacking up a vehicle in the field?',
      'What is the torque specification range for standard wheel lug nuts?'
    ],
    suggestedSourceSearches: [
      'vehicle maintenance',
      'mechanical safety',
      'engine diagnostics'
    ],
    reportType: 'mechanical diagnostic report'
  },
  {
    id: 'template_readiness_check',
    title: 'Homestead Readiness Check',
    missionType: 'readiness_check',
    description: 'Perform a comprehensive audit of water, pantry, energy, and notes to update overall homestead survival indicators.',
    defaultPriority: 'medium',
    riskCategory: null,
    objectives: [
      'Compile water reserve levels.',
      'Audit pantry reserve metrics.',
      'Verify auxiliary power systems.',
      'Review current survival scores and update task list.'
    ],
    checklist: [
      'Review readiness calculator metrics in settings.',
      'Update pantry log entries.',
      'Check physical water meter counts.',
      'Assess progress on overdue energy tasks.'
    ],
    suggestedJarvisPrompts: [
      'What pantry items have the longest shelf life for emergency homestead storage?',
      'How do I calculate emergency daily calorie requirements for a family of four?',
      'What are the core components of a homestead readiness audit?'
    ],
    suggestedSourceSearches: [
      'homestead readiness',
      'pantry shelf life',
      'calorie requirements'
    ],
    reportType: 'readiness status audit'
  },
  {
    id: 'template_first_aid_reference',
    title: 'First Aid Reference Lookup',
    missionType: 'first_aid',
    description: 'Reference medical manuals offline to log procedures, audit equipment, and document training actions. (REFERENCE ONLY: NOT MEDICAL DIAGNOSIS).',
    defaultPriority: 'medium',
    riskCategory: 'medical',
    objectives: [
      'Retrieve official first aid manual chapters.',
      'Audit trauma kit supplies and inventory.',
      'Document training procedures and drills.',
      'Maintain emergency service contact reference records.'
    ],
    checklist: [
      'NOTICE: If urgent, contact emergency services manually immediately.',
      'Review pressure bandage and tourniquet application instructions.',
      'Log location and status of all medical trauma kits.',
      'Verify emergency contact details are printed physically.'
    ],
    suggestedJarvisPrompts: [
      'What are the standard guidelines for treating minor burns in the field?',
      'What items should be included in an advanced trauma kit?',
      'How do I perform basic CPR according to current guidelines?'
    ],
    suggestedSourceSearches: [
      'first aid guidelines',
      'burn treatment',
      'trauma kit contents'
    ],
    reportType: 'first aid training audit'
  }
];
