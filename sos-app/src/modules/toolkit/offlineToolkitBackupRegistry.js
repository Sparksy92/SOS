export const BACKUP_KEYS_REGISTRY = [
  {
    key: "sos_setup_progress",
    legacyAliases: ["setup_progress"],
    label: "Setup Wizard Progress",
    category: "setup",
    required: false,
    expectedType: "object",
    versionIntroduced: "phase_12",
    description: "Tracks progress checkmarks through the Offline Setup Wizard."
  },
  {
    key: "sos_toolkit_checkmarks",
    legacyAliases: ["toolkit_checkmarks"],
    label: "Toolkit Checklist State",
    category: "setup",
    required: false,
    expectedType: "object",
    versionIntroduced: "phase_12",
    description: "Saves checklist item ticks across Offline Toolkit Cards."
  },
  {
    key: "sos_import_queue_dismissed",
    legacyAliases: ["import_queue_dismissed"],
    label: "Manual Import Dismissed List",
    category: "library_governance",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_13",
    description: "Dismissed staging files hidden from Manual Import."
  },
  {
    key: "sos_import_approval_ledger",
    legacyAliases: ["import_approval_ledger"],
    label: "Approval Ledger Records",
    category: "library_governance",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_13",
    description: "Operator audit trace logs and source review decisions."
  },
  {
    key: "sos_acquisition_queue",
    legacyAliases: ["acquisition_queue"],
    label: "Acquisition Queue Records",
    category: "library_governance",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_14",
    description: "Acquisition checklist entries with planned/acquired state."
  },
  {
    key: "sos_source_allowlist",
    legacyAliases: ["source_allowlist"],
    label: "Source Allowlist Records",
    category: "library_governance",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_14",
    description: "Trusted online content repositories allowed by operator."
  },
  {
    key: "saved_answers",
    legacyAliases: ["sos_saved_answers", "saved-answers"],
    label: "Saved Intake Answers",
    category: "session_notes",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_6",
    description: "Responses gathered during mission planning intakes."
  },
  {
    key: "saved_sources",
    legacyAliases: ["sos_saved_sources", "saved-sources"],
    label: "Saved Mission Sources",
    category: "session_notes",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_6",
    description: "Reference documents selected by the operator."
  },
  {
    key: "field_notes",
    legacyAliases: ["sos_field_notes", "field-notes"],
    label: "Saved Field Notes",
    category: "session_notes",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_6",
    description: "Operational notes logged during active missions."
  },
  {
    key: "report_drafts",
    legacyAliases: ["sos_report_drafts", "report-drafts"],
    label: "Report Drafts",
    category: "reports",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_6",
    description: "Drafts of compiled mission logs and reports."
  },
  {
    key: "reports",
    legacyAliases: ["sos_reports"],
    label: "Completed Reports",
    category: "reports",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_6",
    description: "Archived finalized reports."
  },
  {
    key: "missions",
    legacyAliases: ["sos_missions"],
    label: "Missions Records",
    category: "missions",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_10",
    description: "Historical and active mission parameters."
  },
  {
    key: "active_mission",
    legacyAliases: ["sos_active_mission"],
    label: "Active Mission State",
    category: "missions",
    required: false,
    expectedType: "object",
    versionIntroduced: "phase_10",
    description: "Metadata for currently running mission."
  },
  {
    key: "source_review_queue",
    legacyAliases: ["sos_source_review_queue"],
    label: "Source Review Queue",
    category: "review_queues",
    required: false,
    expectedType: "array",
    versionIntroduced: "phase_11",
    description: "Operator document review recommendations."
  }
];
