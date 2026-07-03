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
