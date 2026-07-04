import React, { useState } from 'react';
import { 
  buildMissionBrief 
} from '../../modules/missions/missionBriefing';
import { 
  generateMissionMarkdownReport, 
  generateMissionJSONReport, 
  downloadFile 
} from '../../modules/reports/reportExport';
import { 
  Clipboard, 
  Download, 
  AlertTriangle, 
  CheckCircle,
  FileText,
  HelpCircle,
  Shield,
  Info
} from 'lucide-react';

export default function MissionBriefingPanel({ 
  mission, 
  relatedAnswers = [], 
  relatedSources = [], 
  relatedNotes = [], 
  reviewQueue = [] 
}) {
  const [copied, setCopied] = useState(false);

  if (!mission) {
    return (
      <div className="glass-panel" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <HelpCircle size={24} style={{ display: 'block', margin: '0 auto 10px', color: 'var(--text-muted)' }} />
        SELECT OR START A MISSION TO LOAD BRIEFING INTEL
      </div>
    );
  }

  const brief = buildMissionBrief(mission, relatedAnswers, relatedSources, relatedNotes, reviewQueue);

  // Handle Copy Brief
  const handleCopyBrief = () => {
    let text = `SURVIVALOS MISSION BRIEF: ${brief.title.toUpperCase()}\n`;
    text += `Type: ${brief.missionType?.toUpperCase()} | Status: ${brief.status?.toUpperCase()}\n`;
    text += `Organization Score: ${brief.readiness.score}% (${brief.readiness.label})\n`;
    text += `Overview: ${brief.overview || 'None'}\n\n`;
    
    text += `Objectives:\n`;
    if (brief.openObjectives.length === 0) {
      text += `- All objectives completed.\n`;
    } else {
      brief.openObjectives.forEach(o => {
        text += `- [ ] ${o.label}\n`;
      });
    }
    
    text += `\nOpen Checklist/Tasks:\n`;
    if (brief.openTasks.length === 0) {
      text += `- All tasks completed.\n`;
    } else {
      brief.openTasks.forEach(t => {
        text += `- [ ] ${t.label} (${t.priority})\n`;
      });
    }

    if (brief.safetyChecklist.length > 0) {
      text += `\nSafety Directives:\n`;
      brief.safetyChecklist.forEach(c => {
        text += `[${c.category.toUpperCase()} WARNING] ${c.warning}\n`;
        c.directives.forEach(d => {
          text += `- ${d}\n`;
        });
      });
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export Markdown Handoff
  const handleExportMarkdown = () => {
    const relatedData = {
      includedAnswers: relatedAnswers,
      includedSources: relatedSources,
      includedNotes: relatedNotes,
      queuedSources: reviewQueue.filter(q => q.missionId === mission.id),
      recommendedSources: []
    };
    const md = generateMissionMarkdownReport(mission, relatedData);
    const filename = `${mission.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_handoff.md`;
    downloadFile(md, filename, 'text/markdown');
  };

  // Export JSON Handoff
  const handleExportJSON = () => {
    const relatedData = {
      includedAnswers: relatedAnswers,
      includedSources: relatedSources,
      includedNotes: relatedNotes,
      queuedSources: reviewQueue.filter(q => q.missionId === mission.id)
    };
    const json = generateMissionJSONReport(mission, relatedData);
    const filename = `${mission.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_handoff.json`;
    downloadFile(json, filename, 'application/json');
  };

  // Score Bar Color Helper
  const getScoreColorClass = (score) => {
    if (score >= 80) return '#00ff66';
    if (score >= 60) return '#ffea00';
    return 'var(--brand-danger)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      
      {/* Score Header Block */}
      <div className="glass-panel" style={{ padding: '20px', borderLeft: `4px solid ${getScoreColorClass(brief.readiness.score)}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>MISSION ORGANIZATION SCORE</span>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: getScoreColorClass(brief.readiness.score) }}>
              {brief.readiness.score}% <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 'normal' }}>— {brief.readiness.label.toUpperCase()}</span>
            </div>
          </div>
          <CheckCircle size={28} style={{ color: getScoreColorClass(brief.readiness.score) }} />
        </div>

        {/* Reasons list */}
        {brief.readiness.reasons.length > 0 && (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '10px' }}>
            {brief.readiness.reasons.map((reason, idx) => (
              <div key={idx}>• {reason}</div>
            ))}
          </div>
        )}
      </div>

      {/* Snapshot / Details */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          MISSION INTELLIGENCE SUMMARY
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
          <div><strong>MISSION NAME:</strong> {brief.title}</div>
          <div><strong>TYPE / PRIORITY:</strong> {brief.missionType?.toUpperCase()} // {brief.priority?.toUpperCase()}</div>
          {brief.locationLabel && <div><strong>SECTOR LOCATION:</strong> {brief.locationLabel}</div>}
          {brief.callsign && <div><strong>OPERATOR CALLSIGN:</strong> {brief.callsign}</div>}
          {brief.overview && (
            <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px', marginTop: '4px', color: 'var(--text-muted)' }}>
              {brief.overview}
            </div>
          )}
        </div>
      </div>

      {/* Checklist / Open Work */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <h3 style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
          OPEN TASKS & OBJECTIVES
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.8rem' }}>
          {brief.openObjectives.length > 0 && (
            <div>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>INCOMPLETE OBJECTIVES:</span>
              {brief.openObjectives.map(obj => (
                <div key={obj.id} style={{ paddingLeft: '8px', borderLeft: '2px solid var(--brand-primary)', marginBottom: '4px' }}>
                  {obj.label}
                </div>
              ))}
            </div>
          )}

          {brief.openTasks.length > 0 && (
            <div style={{ marginTop: '6px' }}>
              <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>OPEN CHECKLIST ITEMS:</span>
              {brief.openTasks.map(t => (
                <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', paddingLeft: '8px', borderLeft: '2px solid rgba(255,255,255,0.1)', marginBottom: '4px' }}>
                  <span>{t.label}</span>
                  {t.priority === 'high' && <span style={{ color: 'var(--brand-danger)', fontSize: '0.7rem', fontWeight: 'bold' }}>HIGH</span>}
                </div>
              ))}
            </div>
          )}

          {brief.openObjectives.length === 0 && brief.openTasks.length === 0 && (
            <div style={{ color: '#00ff66', textAlign: 'center', padding: '10px' }}>
              ✓ ALL MISSION OBJECTIVES AND LOGISTICS CHECKLISTS COMPLETED
            </div>
          )}
        </div>
      </div>

      {/* Review Queue Priorities */}
      {brief.queuedSources.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', borderLeft: '4px solid #ffea00' }}>
          <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#ffea00', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={16} /> QUEUED SOURCES FOR REVIEW
          </h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
            Verify these manual source files offline before proceeding.
          </span>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem', marginTop: '10px' }}>
            {brief.queuedSources.map(q => (
              <div key={q.id} style={{ display: 'flex', flexDirection: 'column', padding: '6px 8px', backgroundColor: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ fontWeight: 'bold' }}>{q.title}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{q.sourcePath}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* High-Risk Safety checklist disclaimers */}
      {brief.safetyChecklist.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {brief.safetyChecklist.map((check, idx) => (
            <div key={idx} className="glass-panel" style={{ padding: '20px', borderColor: 'var(--brand-danger)', boxShadow: 'var(--glow-danger)' }}>
              <div style={{ display: 'flex', gap: '8px', color: 'var(--brand-danger)', fontSize: '0.85rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
                <AlertTriangle size={18} /> Safety warning: {check.category}
              </div>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-main)', lineHeight: '1.4', margin: '0 0 10px 0' }}>
                <strong>Disclaimer:</strong> {check.warning}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.75rem' }}>
                {check.directives.map((dir, dIdx) => (
                  <div key={dIdx} style={{ display: 'flex', gap: '6px', color: 'var(--text-muted)' }}>
                    <span>•</span>
                    <span>{dir}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button 
          className="btn-tactical" 
          onClick={handleCopyBrief} 
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.8rem' }}
        >
          <Clipboard size={14} /> {copied ? 'COPIED TO CLIPBOARD' : 'COPY BRIEF TO CLIPBOARD'}
        </button>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-tactical" 
            onClick={handleExportMarkdown} 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.8rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
          >
            <Download size={14} /> EXPORT MARKDOWN
          </button>
          
          <button 
            className="btn-tactical" 
            onClick={handleExportJSON} 
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', fontSize: '0.8rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
          >
            <Download size={14} /> EXPORT JSON
          </button>
        </div>
      </div>

    </div>
  );
}
