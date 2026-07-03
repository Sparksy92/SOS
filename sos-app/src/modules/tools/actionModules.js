/**
 * Pre-defined step-by-step action templates for offline survival checklists.
 */
export const ACTION_MODULES = [
  {
    id: 'emergency-plan',
    title: 'Emergency Communications Plan',
    description: 'Establish primary/secondary communications, staging areas, and contact manifests.',
    category: 'Planning',
    steps: [
      "Confirm local GMRS/FMR radio check-in procedures.",
      "Designate physical rally point Alpha (homestead site) and Beta (regional community center).",
      "Print physical paper contact sheets containing critical local numbers."
    ]
  },
  {
    id: 'evacuation-decision',
    title: 'Evacuation Decision Matrix',
    description: 'Tactical checklist to determine whether to shelter in place or bug out.',
    category: 'Tactical',
    steps: [
      "Log continuous wind speed and air quality values.",
      "Verify vehicle fuel storage reserves are at 100% capacity.",
      "Map out two primary evacuation routes avoiding high-risk bottlenecks."
    ]
  },
  {
    id: 'first-aid-triage',
    title: 'First Aid Triage Guide',
    description: 'Immediate action items for traumatic injury control.',
    category: 'Medical',
    steps: [
      "Assess scene safety and deploy protective gloves/goggles.",
      "Identify active hemorrhages and apply direct pressure or tourniquet immediately.",
      "Check airway clearance and protect core body heat to prevent shock."
    ]
  },
  {
    id: 'water-safety',
    title: 'Water Safety Protocol',
    description: 'Dosing and filtration schedules for suspicious water sources.',
    category: 'Sanitation',
    steps: [
      "Run raw water through a sediment pre-filter (coffee filter or cloth).",
      "Sanitize using chemical disinfection: add 8 drops of unscented liquid bleach per gallon, mix, and let sit for 30 minutes.",
      "Filter through active carbon stage to clear residual chlorine odor."
    ]
  },
  {
    id: 'winter-blackout',
    title: 'Winter Blackout Actions',
    description: 'Freeze-prevention checklists for home infrastructure.',
    category: 'Thermal',
    steps: [
      "Block drafts and isolate a single core living zone using blankets over doorways.",
      "Drain standing water from copper pipelines to prevent frozen fractures.",
      "Operate indoor combustion heaters only with active window ventilation."
    ]
  },
  {
    id: 'garden-planner',
    title: 'Homestead Sowing Schedule',
    description: 'Garden sowing windows calibrated to regional frost dates.',
    category: 'Homestead',
    steps: [
      "Confirm last spring frost date from local historical records.",
      "Start cold-hardy brassica seeds indoors 6-8 weeks before final frost.",
      "Transplant warm-weather crops (tomatoes, peppers) only after night temps remain above 50F (10C)."
    ]
  },
  {
    id: 'energy-audit',
    title: 'Off-Grid Energy Audit',
    description: 'Log and calculate critical appliance power consumption.',
    category: 'Infrastructure',
    steps: [
      "Log start-up surge wattage and running load for refrigeration.",
      "Calculate solar battery backup life under continuous cold weather offloads.",
      "Verify generator runtime schedule using wood, solar, or fossil backups."
    ]
  }
];
