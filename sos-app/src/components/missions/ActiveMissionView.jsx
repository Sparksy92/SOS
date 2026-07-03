import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Clock, Play, Pause, CheckCircle, Circle, 
  Plus, Trash2, Send, FileText, Download, Volume2, ExternalLink
} from 'lucide-react';
import { 
  updateMission, updateMissionTask, addMissionTask, 
  attachSavedAnswerToMission, attachSavedSourceToMission, attachFieldNoteToMission
} from '../../modules/missions/missionStore.js';
import { createMissionTask, detectMissionRisks, buildMissionRelatedData, transitionMissionStatus } from '../../modules/missions/missionUtils.js';
import { loadSavedAnswers, loadSavedSources, loadFieldNotes, addSavedSource } from '../../modules/session/sessionStore.js';
import { generateMissionMarkdownReport, generateMissionJSONReport, downloadFile } from '../../modules/reports/reportExport.js';
import MissionSourceFinder from './MissionSourceFinder.jsx';
import { 
  addSourceToReviewQueue, loadSourceReviewQueue, removeSourceReviewQueueItem 
} from '../../modules/search/sourceReviewQueueStore.js';

const ActiveMissionView = ({ mission, onSendSuggestedPrompt, onUpdateState }) => {
  const [newTaskLabel, setNewTaskLabel] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');
  const [manualNotes, setManualNotes] = useState(mission.manualNotes || '');

  // Lists for local manifest/metadata evaluation
  const [materials, setMaterials] = useState([]);
  const [metadataList, setMetadataList] = useState({});
  const [reviewQueue, setReviewQueue] = useState([]);

  // Load resources to resolve attached data
  const answers = loadSavedAnswers();
  const sources = loadSavedSources();
  const notes = loadFieldNotes();

  const related = buildMissionRelatedData(mission, answers, sources, notes);
  const risks = detectMissionRisks(mission, related.includedAnswers, related.includedSources, related.includedNotes);

  // Sync notes changes
  useEffect(() => {
    setManualNotes(mission.manualNotes || '');
    setReviewQueue(loadSourceReviewQueue().filter(x => x.missionId === mission.id));

    // Fetch materials manifest and metadata list from local API endpoints
    const API_BASE = `http://${window.location.hostname}:3001`;
    Promise.all([
      fetch(`${API_BASE}/api/materials`).then(res => res.json()).catch(() => ({ categories: {} })),
      fetch(`${API_BASE}/api/metadata`).then(res => res.json()).catch(() => ({}))
    ]).then(([materialsData, metadataData]) => {
      const flattened = [];
      Object.entries(materialsData.categories || {}).forEach(([catName, filesList]) => {
        filesList.forEach(file => {
          flattened.push({
            name: file.name,
            path: file.path,
            category: catName,
            indexed: !!file.indexed
          });
        });
      });
      setMaterials(flattened);
      setMetadataList(metadataData || {});
    }).catch(err => {
      console.error("Error fetching local library manifest:", err);
    });
  }, [mission.id]);

  const handleNotesChange = (e) => {
    const val = e.target.value;
    setManualNotes(val);
    updateMission(mission.id, { manualNotes: val });
    if (onUpdateState) onUpdateState();
  };

  const handleStatusChange = (newStatus) => {
    const updated = transitionMissionStatus(mission, newStatus);
    if (onUpdateState) onUpdateState();
  };

  const handleToggleObjective = (objId) => {
    const objectives = (mission.objectives || []).map(o => {
      if (o.id === objId) {
        const nextStatus = o.status === 'done' ? 'todo' : 'done';
        return { ...o, status: nextStatus, updatedAt: new Date().toISOString() };
      }
      return o;
    });
    updateMission(mission.id, { objectives });
    if (onUpdateState) onUpdateState();
  };

  const handleToggleTask = (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'done' ? 'todo' : 'done';
    updateMissionTask(mission.id, taskId, { status: nextStatus });
    if (onUpdateState) onUpdateState();
  };

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskLabel.trim()) return;
    const taskObj = createMissionTask(newTaskLabel.trim(), newTaskPriority);
    addMissionTask(mission.id, taskObj);
    setNewTaskLabel('');
    if (onUpdateState) onUpdateState();
  };

  const handleExportMarkdown = () => {
    const md = generateMissionMarkdownReport(mission, related);
    const filename = `mission_${mission.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_report.md`;
    downloadFile(md, filename, 'text/markdown');
  };

  const handleExportJSON = () => {
    const json = generateMissionJSONReport(mission, related);
    const filename = `mission_${mission.title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_report.json`;
    downloadFile(json, filename, 'application/json');
  };

  // Recommendations Finder actions
  const handleOpenDocument = (path) => {
    const url = `http://${window.location.hostname}:3001/api/materials/view?path=${encodeURIComponent(path)}`;
    window.open(url, '_blank');
  };

  const handleSaveSource = (rec) => {
    addSavedSource({
      source: rec.sourcePath,
      title: rec.title,
      page: null,
      section: null,
      matchLabel: rec.matchLabel,
      riskCategory: rec.riskCategory || null,
      excerpt: rec.metadataSummary
    });
    // Add timeline event
    updateMission(mission.id, {
      timeline: [
        ...(mission.timeline || []),
        {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString(),
          type: 'source_saved',
          label: `Source reference saved: "${rec.title}"`,
          details: { sourcePath: rec.sourcePath }
        }
      ]
    });
    if (onUpdateState) onUpdateState();
    alert(`Source reference "${rec.title}" saved successfully!`);
  };

  const handleAttachSource = (rec) => {
    const newItem = addSavedSource({
      source: rec.sourcePath,
      title: rec.title,
      page: null,
      section: null,
      matchLabel: rec.matchLabel,
      riskCategory: rec.riskCategory || null,
      excerpt: rec.metadataSummary
    });
    attachSavedSourceToMission(mission.id, newItem.id);
    if (onUpdateState) onUpdateState();
    alert(`Source "${rec.title}" attached to active mission!`);
  };

  const handleQueueSource = (rec) => {
    const queuedItem = addSourceToReviewQueue({
      missionId: mission.id,
      sourcePath: rec.sourcePath,
      title: rec.title,
      reason: rec.reasons.join(', '),
      riskCategory: rec.riskCategory,
      status: 'queued'
    });
    if (queuedItem) {
      updateMission(mission.id, {
        timeline: [
          ...(mission.timeline || []),
          {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
            createdAt: new Date().toISOString(),
            type: 'source_queued',
            label: `Source queued for review: "${rec.title}"`,
            details: { sourcePath: rec.sourcePath }
          }
        ]
      });
      setReviewQueue(loadSourceReviewQueue().filter(x => x.missionId === mission.id));
      if (onUpdateState) onUpdateState();
      alert(`Source "${rec.title}" queued for review!`);
    } else {
      alert("This source is already in the review queue for this mission.");
    }
  };

  const handleRemoveFromQueue = (id) => {
    removeSourceReviewQueueItem(id);
    setReviewQueue(loadSourceReviewQueue().filter(x => x.missionId === mission.id));
    // Add timeline event
    updateMission(mission.id, {
      timeline: [
        ...(mission.timeline || []),
        {
          id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          createdAt: new Date().toISOString(),
          type: 'source_unqueued',
          label: `Source dismissed from review queue.`,
          details: { queueItemId: id }
        }
      ]
    });
    if (onUpdateState) onUpdateState();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '30px' }}>
      
      {/* Risk Alert HUD */}
      {risks.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(255, 0, 0, 0.05)',
          border: '1px solid var(--brand-danger)',
          padding: '16px',
          borderRadius: '8px',
          color: 'var(--brand-danger)',
          fontSize: '0.85rem',
          lineHeight: '1.5',
          fontFamily: 'var(--font-mono)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px' }}>
            <ShieldAlert size={20} />
            <span>⚠️ CRITICAL SAFETY DIRECTIVE // MISSION CONTAINS HIGH-RISK MATERIAL</span>
          </div>
          <div>
            ACTIVE HAZARD CATEGORIES INVOLVED: <strong>{risks.map(r => r.toUpperCase()).join(', ')}</strong>
            <br />
            Emergency Action Warning: Verify chemical, electrical, medical, mechanical, or purification procedures with verified paper checklists. Avoid reliance on AI logs in volatile environments.
          </div>
        </div>
      )}

      {/* Mission profile HUD card */}
      <div className="glass-panel" style={{ padding: '20px', border: '1px solid var(--brand-primary)', position: 'relative' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`status-dot-${mission.status === 'active' ? 'active' : 'idle'}`} style={{ width: '10px', height: '10px', borderRadius: '50%' }} />
              <h2 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                {mission.title.toUpperCase()}
              </h2>
              <span style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-subtle)', padding: '2px 8px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>
                {mission.missionType.toUpperCase()}
              </span>
            </div>
            <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {mission.overview}
            </p>
            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
              <div>PRIORITY: <span style={{ color: mission.priority === 'critical' ? 'var(--brand-danger)' : 'var(--brand-primary)', fontWeight: 'bold' }}>{mission.priority.toUpperCase()}</span></div>
              {mission.locationLabel && <div>LOCATION: <span style={{ color: 'var(--text-main)' }}>{mission.locationLabel}</span></div>}
              {mission.callsign && <div>OPERATOR: <span style={{ color: 'var(--text-main)' }}>{mission.callsign}</span></div>}
              <div>STARTED: <span style={{ color: 'var(--text-muted)' }}>{new Date(mission.createdAt).toLocaleString()}</span></div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {mission.status === 'active' ? (
              <button className="btn-tactical" onClick={() => handleStatusChange('paused')} style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Pause size={12} /> PAUSE SESSION
              </button>
            ) : (
              <button className="btn-tactical" onClick={() => handleStatusChange('active')} style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px', borderColor: 'var(--brand-primary)' }}>
                <Play size={12} /> RESUME SESSION
              </button>
            )}
            
            {mission.status !== 'completed' && (
              <button className="btn-tactical" onClick={() => handleStatusChange('completed')} style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: '#00ff66', color: '#00ff66' }}>
                COMPLETE MISSION
              </button>
            )}
            
            {mission.status !== 'archived' && (
              <button className="btn-tactical" onClick={() => handleStatusChange('archived')} style={{ fontSize: '0.8rem', padding: '6px 12px', borderColor: 'var(--text-muted)', color: 'var(--text-muted)' }}>
                ARCHIVE
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Workspace split */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flexWrap: 'wrap' }}>
        
        {/* Left column: checklist & tasks */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Objectives */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              MISSION OBJECTIVES
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(mission.objectives || []).map(obj => (
                <div 
                  key={obj.id} 
                  onClick={() => handleToggleObjective(obj.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {obj.status === 'done' ? (
                    <CheckCircle size={16} style={{ color: '#00ff66', flexShrink: 0 }} />
                  ) : (
                    <Circle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                  )}
                  <span style={{ textDecoration: obj.status === 'done' ? 'line-through' : 'none', color: obj.status === 'done' ? 'var(--text-muted)' : 'var(--text-main)' }}>
                    {obj.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Checklist Tasks */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              TASKS & LOGISTICS CHECKLIST
            </h3>
            
            {/* Add Custom Task */}
            <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
              <input 
                type="text" 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '8px 12px', fontSize: '0.8rem' }}
                placeholder="Add custom task..."
                value={newTaskLabel}
                onChange={e => setNewTaskLabel(e.target.value)}
              />
              <select
                value={newTaskPriority}
                onChange={e => setNewTaskPriority(e.target.value)}
                className="search-input glass-panel"
                style={{ width: '120px', padding: '8px', backgroundColor: 'black', color: 'var(--text-main)', fontSize: '0.8rem' }}
              >
                <option value="low">LOW</option>
                <option value="medium">MED</option>
                <option value="high">HIGH</option>
              </select>
              <button type="submit" className="btn-tactical" style={{ padding: '8px 16px', fontSize: '0.8rem' }}>
                ADD
              </button>
            </form>

            {/* Tasks Lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto' }}>
              {[...(mission.checklist || []), ...(mission.tasks || [])].map(task => (
                <div 
                  key={task.id} 
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', borderBottom: '1px solid rgba(255,255,255,0.02)', gap: '10px' }}
                >
                  <div 
                    onClick={() => handleToggleTask(task.id, task.status)}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.85rem', flex: 1 }}
                  >
                    {task.status === 'done' ? (
                      <CheckCircle size={16} style={{ color: '#00ff66', flexShrink: 0 }} />
                    ) : (
                      <Circle size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    )}
                    <span style={{ textDecoration: task.status === 'done' ? 'line-through' : 'none', color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-main)' }}>
                      {task.label}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {task.priority && task.priority !== 'medium' && (
                      <span style={{ fontSize: '0.6rem', color: task.priority === 'high' ? 'var(--brand-danger)' : 'var(--text-muted)', border: '1px solid currentColor', padding: '1px 4px', borderRadius: '3px' }}>
                        {task.priority.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: notes & Timeline & review queue */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Source Review Queue */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              SOURCE REVIEW QUEUE ({reviewQueue.length})
            </h3>
            {reviewQueue.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                No reference documents currently queued for operator review.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                {reviewQueue.map(item => (
                  <div 
                    key={item.id} 
                    className="glass-panel" 
                    style={{ 
                      padding: '10px', 
                      fontSize: '0.8rem', 
                      backgroundColor: 'rgba(255,255,255,0.01)', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      gap: '8px' 
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <strong style={{ display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{item.title}</strong>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.sourcePath}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn-tactical" 
                        onClick={() => handleOpenDocument(item.sourcePath)}
                        style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      >
                        OPEN
                      </button>
                      <button 
                        className="btn-tactical" 
                        onClick={() => handleRemoveFromQueue(item.id)}
                        style={{ padding: '2px 6px', fontSize: '0.7rem', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
                      >
                        DISMISS
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '180px' }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              MISSION LOG TIMELINE
            </h3>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
              {(mission.timeline || []).map(event => (
                <div key={event.id} style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', borderLeft: '2px solid var(--border-subtle)', paddingLeft: '8px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--brand-primary)' }}>
                    <span>{event.label}</span>
                    <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mission Manual Notes */}
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', flex: 1 }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              OPERATOR LOG SCRATCHPAD (AUTOSAVED)
            </h3>
            <textarea 
              value={manualNotes} 
              onChange={handleNotesChange}
              className="search-input glass-panel" 
              style={{ width: '100%', flex: 1, minHeight: '120px', padding: '12px', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'var(--font-mono)' }}
              placeholder="Enter observations, symptoms, checklists, or comments during this session..."
            />
          </div>
        </div>
      </div>

      {/* Suggested Jarvis prompts & Searches */}
      {mission.suggestedJarvisPrompts && mission.suggestedJarvisPrompts.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px' }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
            SUGGESTED NEURAL ASSISTANCE (J.A.R.V.I.S.)
          </h3>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {mission.suggestedJarvisPrompts.map((promptText, i) => (
              <button 
                key={i} 
                className="btn-tactical" 
                onClick={() => onSendSuggestedPrompt(promptText)}
                style={{ fontSize: '0.75rem', padding: '6px 12px', textTransform: 'none', textAlign: 'left' }}
              >
                "{promptText}"
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Offline Material Recommendation System */}
      <MissionSourceFinder 
        mission={mission}
        materials={materials}
        metadata={metadataList}
        template={null}
        onOpenDocument={handleOpenDocument}
        onSaveSource={handleSaveSource}
        onAttachSource={handleAttachSource}
        onQueueSource={handleQueueSource}
      />

      {/* Attached resources section */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
          ATTACHED RESOURCES ({related.includedAnswers.length} Answers, {related.includedSources.length} Citations, {related.includedNotes.length} Notes)
        </h3>
        
        {related.includedAnswers.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>SAVED JARVIS LOGS</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {related.includedAnswers.map(ans => (
                <div key={ans.id} className="glass-panel" style={{ padding: '10px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <strong>Q: {ans.relatedQuestion}</strong>
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{ans.body.substring(0, 150)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {related.includedSources.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>VERIFIED CITATIONS</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {related.includedSources.map(src => (
                <div key={src.id} className="glass-panel" style={{ padding: '10px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <strong>{src.title}</strong> (page: {src.page || 'N/A'}, match: {src.matchLabel})
                </div>
              ))}
            </div>
          </div>
        )}

        {related.includedNotes.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>FIELD NOTES</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {related.includedNotes.map(n => (
                <div key={n.id} className="glass-panel" style={{ padding: '10px', fontSize: '0.8rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
                  <strong>{n.title}</strong> ({n.noteType})
                  <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>{n.body.substring(0, 150)}...</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Export Reports section */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border-subtle)' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
            MISSION REPORT EXPORT LOGISTICS
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Compile checklist status, objectives, timeline events, and linked notes into local files.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn-tactical" onClick={handleExportMarkdown} style={{ fontSize: '0.8rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> EXPORT MD REPORT
          </button>
          <button className="btn-tactical" onClick={handleExportJSON} style={{ fontSize: '0.8rem', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Download size={14} /> EXPORT JSON DATA
          </button>
        </div>
      </div>

    </div>
  );
};

export default ActiveMissionView;
