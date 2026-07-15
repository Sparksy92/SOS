import React from 'react';
import { 
  Compass, FileText, ClipboardList, ShieldAlert, Cpu, 
  ExternalLink, Download, PlusSquare, BookOpen
} from 'lucide-react';
import { missionTemplates } from '../../modules/missions/missionTemplates.js';
import { generateMissionMarkdownReport, downloadFile } from '../../modules/reports/reportExport.js';
import { loadSavedAnswers, loadSavedSources, loadFieldNotes } from '../../modules/session/sessionStore.js';
import { buildMissionRelatedData } from '../../modules/missions/missionUtils.js';

const MissionRangerContextPanel = ({ 
  mission, 
  onSendPrompt, 
  onOpenFieldMode,
  onCreateMissionNote
}) => {
  const template = missionTemplates.find(t => t.missionType === mission.missionType || t.id === mission.id) || {};
  
  // Load attached counts
  const answers = loadSavedAnswers();
  const sources = loadSavedSources();
  const notes = loadFieldNotes();
  const related = buildMissionRelatedData(mission, answers, sources, notes);

  // Compute checklist progress
  const allTasks = [...(mission.checklist || []), ...(mission.tasks || [])];
  const completedTasks = allTasks.filter(t => t.status === 'done').length;

  const handleExportMarkdown = () => {
    const md = generateMissionMarkdownReport(mission, related);
    const filename = `mission_${mission.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_report.md`;
    downloadFile(md, filename, 'text/markdown');
  };

  // Compile suggested prompts
  const getSuggestedPrompts = () => {
    if (mission.missionType === 'water_filtration') {
      return [
        'Search my local library for water storage and filtration references relevant to this mission.',
        'Summarize the saved sources attached to this water mission.',
        'Create a cautious checklist of questions I should verify from local manuals before taking action.'
      ];
    }
    if (mission.missionType === 'first_aid') {
      return [
        'Search my local library for first-aid reference materials related to this mission.',
        'Summarize only what the local sources say, and include a warning that this is not medical advice.',
        'List what information I should verify with emergency services or a qualified medical professional if urgent.'
      ];
    }
    // Default fallback templates
    return [
      `Search my local library for materials relevant to the "${mission.title}" mission.`,
      `Summarize the objectives and check list for this ${mission.missionType} mission.`,
      `What safety precautions should I verify from offline documents regarding this operations?`
    ];
  };

  const prompts = getSuggestedPrompts();

  return (
    <div className="glass-panel" style={{
      width: '280px',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '14px',
      padding: '16px',
      borderLeft: '1px solid var(--brand-primary)',
      backgroundColor: 'rgba(0, 229, 255, 0.01)',
      maxHeight: '100%',
      overflowY: 'auto'
    }}>
      
      {/* Title Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
        <Compass size={18} className="text-glow" style={{ color: 'var(--brand-primary)' }} />
        <div>
          <h4 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
            MISSION LOG CONTEXT
          </h4>
          <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>OFFLINE INTEL HUB</span>
        </div>
      </div>

      {/* Active Mission HUD */}
      <div>
        <strong style={{ fontSize: '0.9rem', color: 'var(--text-main)', display: 'block', marginBottom: '4px' }}>
          {mission.title.toUpperCase()}
        </strong>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>
          <span style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '1px 5px', borderRadius: '3px' }}>
            TYPE: {mission.missionType.toUpperCase()}
          </span>
          <span style={{ backgroundColor: mission.priority === 'critical' ? 'rgba(255,0,0,0.1)' : 'rgba(0,255,102,0.08)', padding: '1px 5px', borderRadius: '3px', color: mission.priority === 'critical' ? 'var(--brand-danger)' : 'var(--brand-primary)', border: '1px solid currentColor' }}>
            {mission.priority.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Checklist progress */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
          <span>TASKS COMPLETED:</span>
          <span>{completedTasks} / {allTasks.length}</span>
        </div>
        <div style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            backgroundColor: 'var(--brand-primary)',
            width: `${allTasks.length > 0 ? (completedTasks / allTasks.length) * 100 : 0}%`,
            transition: 'width 0.3s ease'
          }} />
        </div>
      </div>

      {/* Counters HUD Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', textAlign: 'center' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{related.includedAnswers.length}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>ANSWERS</div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{related.includedSources.length}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>CITATIONS</div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{related.includedNotes.length}</div>
          <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>NOTES</div>
        </div>
      </div>

      {/* Suggested prompts HUD */}
      <div>
        <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '6px' }}>
          SUGGESTED MISSION QUESTIONS:
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {prompts.map((pText, i) => (
            <button
              key={i}
              className="btn-suggestive-text"
              onClick={() => onSendPrompt(pText)}
            >
              "{pText}"
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', marginTop: 'auto' }}>
        <button 
          className="btn-tactical" 
          onClick={onOpenFieldMode}
          style={{ width: '100%', padding: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: 'var(--brand-primary)' }}
        >
          <BookOpen size={12} /> OPEN FIELD MODE
        </button>
        <button 
          className="btn-tactical" 
          onClick={onCreateMissionNote}
          style={{ width: '100%', padding: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <PlusSquare size={12} /> CREATE MISSION NOTE
        </button>
        <button 
          className="btn-tactical" 
          onClick={handleExportMarkdown}
          style={{ width: '100%', padding: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
        >
          <Download size={12} /> EXPORT MISSION MD
        </button>
      </div>

    </div>
  );
};

export default MissionRangerContextPanel;
