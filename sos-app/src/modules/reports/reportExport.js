import { calculateReadinessScore, getSafetyChecklist } from '../missions/missionBriefing.js';

/**
 * Report Export Utility
 */

export const generateMarkdownReport = (report) => {
  const title = report.title || 'UNNAMED SESSION REPORT';
  const type = report.type || 'General Report';
  const timestamp = report.createdAt || new Date().toISOString();
  const author = report.author || 'OPERATOR';
  const summary = report.summary || 'No overview summary provided.';
  const manualNotes = report.manualNotes || '';
  const nextActions = report.nextActions || '';

  let md = `# SURVIVALOS SESSION REPORT: ${title.toUpperCase()}\n`;
  md += `**REPORT TYPE:** ${type.toUpperCase()}\n`;
  md += `**GENERATED ON:** ${new Date(timestamp).toLocaleString()}\n`;
  md += `**OPERATOR CALLSIGN:** ${author.toUpperCase()}\n\n`;

  md += `## SECTION 1: SITUATION OVERVIEW\n`;
  md += `${summary}\n\n`;

  if (manualNotes.trim()) {
    md += `## SECTION 2: OPERATOR LOG NOTES\n`;
    md += `${manualNotes}\n\n`;
  }

  // Section: Jarvis Verified Answers
  md += `## SECTION 3: JARVIS VERIFIED ANSWERS\n`;
  const answers = report.includedAnswers || [];
  if (answers.length === 0) {
    md += `*No Jarvis answers were appended to this report.*\n\n`;
  } else {
    answers.forEach((ans, idx) => {
      md += `### Answer #${idx + 1}: ${ans.title || 'Query'}\n`;
      md += `**Query:** *${ans.relatedQuestion || 'N/A'}*\n`;
      md += `**Status:** ${ans.relatedAnswerStatus || 'verified_local'}\n`;
      if (ans.riskCategory) {
        md += `**Risk Category:** ${ans.riskCategory.toUpperCase()}\n`;
      }
      md += `\n${ans.body || ans.content}\n\n`;
    });
  }

  // Section: Field Notes
  md += `## SECTION 4: FIELD NOTES & OBSERVATIONS\n`;
  const notes = report.includedNotes || [];
  if (notes.length === 0) {
    md += `*No field notes were appended to this report.*\n\n`;
  } else {
    notes.forEach((note, idx) => {
      md += `### Note #${idx + 1}: ${note.title || 'Note'} (${note.noteType || note.type || 'general'})\n`;
      if (note.tags && note.tags.length > 0) {
        md += `**Tags:** ${Array.isArray(note.tags) ? note.tags.join(', ') : note.tags}\n`;
      }
      if (note.riskCategory) {
        md += `**Risk Category:** ${note.riskCategory.toUpperCase()}\n`;
      }
      md += `\n${note.body || note.content}\n\n`;
    });
  }

  // Section: Local Sources Used
  md += `## SECTION 5: LOCAL SOURCES UTILIZED\n`;
  const sources = report.includedSources || [];
  if (sources.length === 0) {
    md += `*No source card references were appended to this report.*\n\n`;
  } else {
    sources.forEach((src) => {
      const loc = src.page ? `Page ${src.page}` : src.section ? `Section ${src.section}` : 'N/A';
      md += `*   **${src.title || 'Source'}** (Loc: ${loc}, Match: ${src.matchLabel || 'Related'})\n`;
      md += `    *Path:* \`${src.source || src.documentPath || 'N/A'}\`\n`;
      if (src.excerpt) {
        md += `    > Excerpt: "${src.excerpt.trim()}"\n`;
      }
      md += `\n`;
    });
  }

  // Section: Risks & Safety Warnings
  md += `## SECTION 6: DIRECTIVES & RISKS ASSESSMENTS\n`;
  const highRiskItems = [
    ...answers.filter(a => a.riskCategory),
    ...notes.filter(n => n.riskCategory),
    ...sources.filter(s => s.riskCategory)
  ];
  if (highRiskItems.length > 0) {
    md += `> [!WARNING]\n`;
    md += `> **CRITICAL SECURITY RISK WARNING**\n`;
    md += `> This session report contains references to high-risk logistics, medical, or engineering categories:\n`;
    const uniqueCats = [...new Set(highRiskItems.map(item => item.riskCategory))];
    uniqueCats.forEach(cat => {
      md += `> - **${cat.toUpperCase()}**\n`;
    });
    md += `> \n`;
    md += `> All technical instructions, chemical treatments, and medical protocols must be verified against physically published emergency manuals before deployment. Do not rely entirely on AI summaries in life-threatening scenarios.\n\n`;
  } else {
    md += `*No high-risk operations were identified during this session.*\n\n`;
  }

  if (nextActions.trim()) {
    md += `## SECTION 7: DIRECTIVE & NEXT ACTIONS\n`;
    md += `${nextActions}\n\n`;
  }

  md += `---\n*END OF REPORT // CONFIDENTIAL LOCAL HOMESTEAD ARCHIVE*\n`;
  return md;
};

export const generateJSONReport = (report) => {
  return JSON.stringify(report, null, 2);
};

export const downloadFile = (content, filename, contentType) => {
  if (typeof window === 'undefined') return; // Guard for Node test environment
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const generateMissionMarkdownReport = (mission, relatedData) => {
  const title = mission.title || 'UNNAMED MISSION';
  const type = mission.missionType || 'general';
  const timestamp = mission.createdAt || new Date().toISOString();
  const author = mission.callsign || 'OPERATOR';
  const summary = mission.overview || 'No overview summary provided.';
  const manualNotes = mission.manualNotes || '';
  
  const status = mission.status || 'active';
  const priority = mission.priority || 'medium';

  let md = `# SURVIVALOS MISSION REPORT: ${title.toUpperCase()}\n`;
  md += `**MISSION TYPE:** ${type.toUpperCase()}\n`;
  md += `**MISSION STATUS:** ${status.toUpperCase()}\n`;
  md += `**PRIORITY:** ${priority.toUpperCase()}\n`;
  md += `**STARTED ON:** ${new Date(timestamp).toLocaleString()}\n`;
  if (mission.completedAt) {
    md += `**COMPLETED ON:** ${new Date(mission.completedAt).toLocaleString()}\n`;
  }
  md += `**OPERATOR CALLSIGN:** ${author.toUpperCase()}\n`;
  if (mission.locationLabel) {
    md += `**LOCATION/SECTOR:** ${mission.locationLabel.toUpperCase()}\n`;
  }
  md += `\n`;

  md += `## SECTION 1: MISSION OVERVIEW\n`;
  md += `${summary}\n\n`;

  // Objectives
  md += `## SECTION 2: OBJECTIVES STATUS\n`;
  const objectives = mission.objectives || [];
  if (objectives.length === 0) {
    md += `*No objectives defined for this mission.*\n\n`;
  } else {
    objectives.forEach(obj => {
      const check = obj.status === 'done' ? '[x]' : '[ ]';
      md += `- ${check} ${obj.label}\n`;
    });
    md += `\n`;
  }

  // Checklist / Tasks
  md += `## SECTION 3: CHECKLIST & LOGISTICS TASKS\n`;
  const tasks = [...(mission.checklist || []), ...(mission.tasks || [])];
  if (tasks.length === 0) {
    md += `*No tasks or checklist items defined.*\n\n`;
  } else {
    tasks.forEach(task => {
      const check = task.status === 'done' ? '[x]' : '[ ]';
      const prio = task.priority !== 'medium' ? ` (${task.priority.toUpperCase()})` : '';
      md += `- ${check} ${task.label}${prio}\n`;
    });
    md += `\n`;
  }

  // Timeline
  md += `## SECTION 4: MISSION TIMELINE LOGS\n`;
  const timeline = mission.timeline || [];
  if (timeline.length === 0) {
    md += `*No timeline events logged.*\n\n`;
  } else {
    timeline.forEach(event => {
      md += `*   \`[${new Date(event.createdAt).toLocaleTimeString()}]\` ${event.label}\n`;
    });
    md += `\n`;
  }

  if (manualNotes.trim()) {
    md += `## SECTION 5: OPERATOR OBSERVATION SCRATCHPAD\n`;
    md += `${manualNotes}\n\n`;
  }

  // Attached Answers
  md += `## SECTION 6: ATTACHED JARVIS ANSWERS\n`;
  const answers = relatedData.includedAnswers || [];
  if (answers.length === 0) {
    md += `*No Jarvis answers attached to this mission.*\n\n`;
  } else {
    answers.forEach((ans, idx) => {
      md += `### Answer #${idx + 1}: ${ans.title || 'Query'}\n`;
      md += `**Query:** *${ans.relatedQuestion || 'N/A'}*\n`;
      md += `\n${ans.body || ans.content}\n\n`;
    });
  }

  // Attached Sources
  md += `## SECTION 7: ATTACHED SOURCES REFERENCE\n`;
  const sources = relatedData.includedSources || [];
  if (sources.length === 0) {
    md += `*No library source citations attached.*\n\n`;
  } else {
    sources.forEach((src) => {
      const loc = src.page ? `Page ${src.page}` : src.section ? `Section ${src.section}` : 'N/A';
      md += `*   **${src.title || 'Source'}** (Loc: ${loc}, Match: ${src.matchLabel || 'Related'})\n`;
      md += `    *Path:* \`${src.source || src.documentPath || 'N/A'}\`\n`;
      if (src.excerpt) {
        md += `    > Excerpt: "${src.excerpt.trim()}"\n`;
      }
      md += `\n`;
    });
  }

  // Attached Notes
  md += `## SECTION 8: ATTACHED FIELD NOTES\n`;
  const notes = relatedData.includedNotes || [];
  if (notes.length === 0) {
    md += `*No field notes attached.*\n\n`;
  } else {
    notes.forEach((note, idx) => {
      md += `### Note #${idx + 1}: ${note.title || 'Note'} (${note.noteType || 'general'})\n`;
      md += `\n${note.body || note.content}\n\n`;
    });
  }

  // Section 9: Queued Sources for Review
  const queued = relatedData.queuedSources || [];
  if (queued.length > 0) {
    md += `## SECTION 9: QUEUED SOURCES FOR REVIEW\n`;
    queued.forEach((item, idx) => {
      const risk = item.riskCategory ? ` [Risk: ${item.riskCategory.toUpperCase()}]` : '';
      md += `*   **${item.title}**${risk}\n`;
      md += `    *Path:* \`${item.sourcePath}\`\n`;
      if (item.reason) {
        md += `    *Reason:* ${item.reason}\n`;
      }
    });
    md += `\n`;
  }

  // Section 10: Recommended Sources from Manifest
  const recommended = relatedData.recommendedSources || [];
  if (recommended.length > 0) {
    md += `## SECTION 10: RECOMMENDED SOURCES FROM MANIFEST\n`;
    recommended.forEach((item, idx) => {
      const risk = item.riskCategory ? ` [Risk: ${item.riskCategory.toUpperCase()}]` : '';
      const ind = item.indexed ? 'Indexed' : 'Unindexed';
      md += `*   **${item.title}** (${item.matchLabel}, ${ind})${risk}\n`;
      md += `    *Path:* \`${item.sourcePath}\`\n`;
      if (item.reasons && item.reasons.length > 0) {
        md += `    *Reasons:* ${item.reasons.join(', ')}\n`;
      }
    });
    md += `\n`;
  }

  // Safety Warnings
  md += `## SECTION 11: RISK DIRECTIVES & WARNINGS\n`;
  const highRiskItems = [
    ...answers.filter(a => a.riskCategory),
    ...notes.filter(n => n.riskCategory),
    ...sources.filter(s => s.riskCategory),
    ...queued.filter(q => q.riskCategory),
    ...recommended.filter(r => r.riskCategory)
  ];
  if (mission.riskCategory) {
    highRiskItems.push({ riskCategory: mission.riskCategory });
  }

  const uniqueCats = [...new Set(highRiskItems.map(item => item.riskCategory).filter(Boolean))];

  if (highRiskItems.length > 0) {
    md += `> [!WARNING]\n`;
    md += `> **CRITICAL SECURITY RISK WARNING**\n`;
    md += `> This mission report logs active procedures in high-risk categories:\n`;
    uniqueCats.forEach(cat => {
      md += `> - **${cat.toUpperCase()}**\n`;
    });
    md += `> \n`;
    md += `> Cross-verify all technical, electrical, chemical, mechanical, and first-aid checklists with physically printed reference material. AI predictions must not be used as live instructions in hazard contexts.\n\n`;
  } else {
    md += `*No high-risk operations were identified during this mission.*\n\n`;
  }

  // Section 12: Mission Organization & Readiness Score
  md += `## SECTION 12: MISSION ORGANIZATION ASSESSMENT\n`;
  const readiness = calculateReadinessScore(mission, answers, sources, notes, queued);
  md += `**Mission Organization Score:** ${readiness.score}% (${readiness.label.toUpperCase()})\n\n`;
  md += `### Score Explanations:\n`;
  if (readiness.reasons.length === 0) {
    md += `- Baseline status (no additional setup adjustments).\n`;
  } else {
    readiness.reasons.forEach(r => {
      md += `- ${r}\n`;
    });
  }
  md += `\n`;

  // Section 13: Risk-Aware safety directives
  if (uniqueCats.length > 0) {
    md += `## SECTION 13: FIELD SAFETY DIRECTIVES & DISCLAIMERS\n`;
    const safetyChecklist = getSafetyChecklist(uniqueCats);
    safetyChecklist.forEach(check => {
      md += `### Safety Guidelines: ${check.category.toUpperCase()}\n`;
      md += `> [!CAUTION]\n`;
      md += `> **Disclaimer:** ${check.warning}\n\n`;
      md += `**Verifications Checklist:**\n`;
      check.directives.forEach(d => {
        md += `- [ ] ${d}\n`;
      });
      md += `\n`;
    });
  }

  md += `---\n*END OF FIELD MISSION REPORT // CONFIDENTIAL OFFLINE HOMESTEAD ARCHIVE*\n`;
  return md;
};

export const generateMissionJSONReport = (mission, relatedData) => {
  return JSON.stringify({
    reportType: 'sos_mission_report',
    version: 1,
    exportedAt: new Date().toISOString(),
    mission,
    relatedData
  }, null, 2);
};
