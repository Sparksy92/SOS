import React, { useState, useEffect } from 'react';
import { 
  FileText, Cpu, Link2, BookOpen, Trash2, Search, Filter, 
  ExternalLink, FileSpreadsheet, Plus, AlertTriangle, Database, Download, Upload, ShieldAlert
} from 'lucide-react';
import { 
  loadSavedAnswers, saveAnswers,
  loadSavedSources, saveSources,
  loadFieldNotes, saveFieldNotes,
  loadReportDrafts, saveReportDrafts,
  addReportDraft,
  exportAllSavedData, importSavedData, clearAllSavedData
} from '../../modules/session/sessionStore.js';
import FieldNoteEditor from '../notes/FieldNoteEditor.jsx';
import ReportBuilder from './ReportBuilder.jsx';
import { loadMissions } from '../../modules/missions/missionStore.js';

const NotesReportsPanel = ({ callSign = 'Operator' }) => {
  const [activeTab, setActiveTab] = useState('answers'); // 'answers', 'sources', 'notes', 'reports'
  
  // Storage states
  const [answers, setAnswers] = useState([]);
  const [sources, setSources] = useState([]);
  const [notes, setNotes] = useState([]);
  const [reports, setReports] = useState([]);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Active editors/builders
  const [editingNote, setEditingNote] = useState(null);
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [activeReportBuilder, setActiveReportBuilder] = useState(false);
  const [selectedItemDetails, setSelectedItemDetails] = useState(null);

  // Backup & Restore states
  const [showClearModal, setShowClearModal] = useState(false);
  const [clearInput, setClearInput] = useState('');
  const [importError, setImportError] = useState(null);

  const handleExportBackup = () => {
    const backupObj = exportAllSavedData();
    const json = JSON.stringify(backupObj, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sos_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const backupObj = JSON.parse(event.target.result);
        importSavedData(backupObj);
        alert("Backup imported and deduped successfully!");
        reloadData();
        setImportError(null);
      } catch (err) {
        console.error("Backup import error:", err);
        setImportError(err.message);
        alert(`IMPORT FAILED: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAllConfirm = () => {
    if (clearInput !== 'CLEAR ALL') return;
    clearAllSavedData();
    reloadData();
    setShowClearModal(false);
    setClearInput('');
    alert("All saved data has been successfully deleted.");
  };

  const [missions, setMissions] = useState([]);

  // Reload everything from local storage
  const reloadData = () => {
    setAnswers(loadSavedAnswers());
    setSources(loadSavedSources());
    setNotes(loadFieldNotes());
    setReports(loadReportDrafts());
    setMissions(loadMissions());
  };

  useEffect(() => {
    reloadData();
  }, []);

  const getAttachedMission = (item) => {
    return missions.find(m => 
      (m.savedAnswerIds || []).includes(item.id) ||
      (m.savedSourceIds || []).includes(item.id) ||
      (m.fieldNoteIds || []).includes(item.id)
    );
  };

  const handleDeleteItem = (id, type) => {
    if (!window.confirm("Are you sure you want to permanently delete this item?")) return;

    if (type === 'answer') {
      const updated = answers.filter(a => a.id !== id);
      saveAnswers(updated);
      setAnswers(updated);
    } else if (type === 'source') {
      const updated = sources.filter(s => s.id !== id);
      saveSources(updated);
      setSources(updated);
    } else if (type === 'note') {
      const updated = notes.filter(n => n.id !== id);
      saveFieldNotes(updated);
      setNotes(updated);
    } else if (type === 'report') {
      const updated = reports.filter(r => r.id !== id);
      saveReportDrafts(updated);
      setReports(updated);
    }
  };

  const handleSaveNote = (noteData) => {
    const noteList = loadFieldNotes();
    if (editingNote && editingNote.id) {
      // Edit mode
      const idx = noteList.findIndex(n => n.id === editingNote.id);
      if (idx !== -1) {
        noteList[idx] = { ...editingNote, ...noteData, updatedAt: new Date().toISOString() };
      }
      saveFieldNotes(noteList);
    } else {
      // Create mode
      const newNote = {
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...noteData
      };
      noteList.push(newNote);
      saveFieldNotes(noteList);
    }
    setEditingNote(null);
    setIsCreatingNote(false);
    reloadData();
  };

  const handleSaveReportDraft = (reportObj) => {
    const draftList = loadReportDrafts();
    if (reportObj.id) {
      const idx = draftList.findIndex(r => r.id === reportObj.id);
      if (idx !== -1) {
        draftList[idx] = { ...reportObj, updatedAt: new Date().toISOString() };
      } else {
        draftList.push(reportObj);
      }
    } else {
      reportObj.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9);
      draftList.push(reportObj);
    }
    saveReportDrafts(draftList);
    reloadData();
  };

  // Filter items based on criteria
  const getFilteredItems = () => {
    let list = [];
    if (activeTab === 'answers') list = answers;
    else if (activeTab === 'sources') list = sources;
    else if (activeTab === 'notes') list = notes;
    else if (activeTab === 'reports') list = reports;

    return list.filter(item => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        (item.title && item.title.toLowerCase().includes(query)) ||
        (item.body && item.body.toLowerCase().includes(query)) ||
        (item.content && item.content.toLowerCase().includes(query)) ||
        (item.relatedQuestion && item.relatedQuestion.toLowerCase().includes(query)) ||
        (item.source && item.source.toLowerCase().includes(query));

      const matchesRisk = !riskFilter || item.riskCategory === riskFilter;
      const matchesType = !typeFilter || item.noteType === typeFilter || item.type === typeFilter;

      return matchesSearch && matchesRisk && matchesType;
    });
  };

  const filteredItems = getFilteredItems();

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', minHeight: '80vh' }}>
      
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
            SAVED LOGS & SESSION REPORTS
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Access and compile saved library source citations, Jarvis logs, and manual observations.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button 
            className="btn-tactical" 
            onClick={handleExportBackup}
            style={{ padding: '10px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Export all saved answers, sources, field notes, and reports to a JSON file"
          >
            <Download size={15} /> EXPORT
          </button>
          
          <label 
            className="btn-tactical" 
            style={{ padding: '10px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', margin: 0 }}
            title="Restore local data from JSON backup"
          >
            <Upload size={15} /> IMPORT
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImportBackup} 
              style={{ display: 'none' }} 
            />
          </label>

          <button 
            className="btn-tactical" 
            onClick={() => setShowClearModal(true)}
            style={{ padding: '10px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
            title="Wipe all local saved records"
          >
            <Trash2 size={15} /> CLEAR ALL
          </button>

          <button 
            className="btn-tactical" 
            onClick={() => setIsCreatingNote(true)}
            style={{ padding: '10px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--brand-primary)' }}
          >
            <Plus size={15} /> NEW NOTE
          </button>
          
          <button 
            className="btn-tactical" 
            onClick={() => setActiveReportBuilder(true)}
            style={{ padding: '10px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--brand-primary)' }}
          >
            <FileSpreadsheet size={15} /> BUILD REPORT
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', gap: '4px' }}>
        <button 
          onClick={() => { setActiveTab('answers'); reloadData(); }}
          style={{
            padding: '12px 20px',
            background: activeTab === 'answers' ? 'var(--brand-primary-dim)' : 'none',
            border: 'none',
            borderBottom: activeTab === 'answers' ? '3px solid var(--brand-primary)' : '3px solid transparent',
            color: activeTab === 'answers' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          SAVED ANSWERS ({answers.length})
        </button>
        <button 
          onClick={() => { setActiveTab('sources'); reloadData(); }}
          style={{
            padding: '12px 20px',
            background: activeTab === 'sources' ? 'var(--brand-primary-dim)' : 'none',
            border: 'none',
            borderBottom: activeTab === 'sources' ? '3px solid var(--brand-primary)' : '3px solid transparent',
            color: activeTab === 'sources' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          SAVED SOURCES ({sources.length})
        </button>
        <button 
          onClick={() => { setActiveTab('notes'); reloadData(); }}
          style={{
            padding: '12px 20px',
            background: activeTab === 'notes' ? 'var(--brand-primary-dim)' : 'none',
            border: 'none',
            borderBottom: activeTab === 'notes' ? '3px solid var(--brand-primary)' : '3px solid transparent',
            color: activeTab === 'notes' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          FIELD NOTES ({notes.length})
        </button>
        <button 
          onClick={() => { setActiveTab('reports'); reloadData(); }}
          style={{
            padding: '12px 20px',
            background: activeTab === 'reports' ? 'var(--brand-primary-dim)' : 'none',
            border: 'none',
            borderBottom: activeTab === 'reports' ? '3px solid var(--brand-primary)' : '3px solid transparent',
            color: activeTab === 'reports' ? 'var(--brand-primary)' : 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.85rem',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          REPORTS ({reports.length})
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="search-input glass-panel" 
            style={{ width: '100%', padding: '10px 10px 10px 38px' }}
            placeholder={`SEARCH ${activeTab.toUpperCase()}...`}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          
          <select 
            className="search-input glass-panel" 
            style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#000', color: '#fff' }}
            value={riskFilter}
            onChange={e => setRiskFilter(e.target.value)}
          >
            <option value="">All Risk Levels</option>
            <option value="medical">Medical</option>
            <option value="water_treatment">Water Treatment</option>
            <option value="wild_plants">Wild Plants</option>
            <option value="mushrooms">Mushrooms</option>
            <option value="food_preservation">Canning</option>
            <option value="electrical">Electrical</option>
            <option value="fuel_generator">Fuel/Gen</option>
            <option value="firearms">Firearms</option>
            <option value="mechanical">Mechanical</option>
            <option value="chemical">Chemical</option>
          </select>

          {activeTab === 'notes' && (
            <select 
              className="search-input glass-panel" 
              style={{ padding: '8px 12px', fontSize: '0.8rem', background: '#000', color: '#fff' }}
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
            >
              <option value="">All Note Types</option>
              <option value="general">General</option>
              <option value="observation">Observation</option>
              <option value="task">Task</option>
              <option value="supply note">Supply</option>
              <option value="repair note">Repair</option>
              <option value="field incident">Field Incident</option>
              <option value="research note">Research</option>
            </select>
          )}
        </div>
      </div>

      {/* Items list container */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredItems.length === 0 ? (
          <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            No saved entries matched your filters. Start saving content from your conversations or create new field notes.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
            {filteredItems.map((item) => {
              const dateStr = new Date(item.createdAt || item.savedAt).toLocaleDateString();
              const isHighRisk = !!item.riskCategory;

              return (
                <div 
                  key={item.id} 
                  className="glass-panel" 
                  style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderColor: isHighRisk ? 'var(--brand-danger)' : 'var(--border-subtle)',
                    backgroundColor: 'rgba(255, 255, 255, 0.01)'
                  }}
                >
                  <div>
                    {/* Header info */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          fontFamily: 'var(--font-mono)', 
                          backgroundColor: 'rgba(255,255,255,0.05)', 
                          padding: '2px 6px', 
                          borderRadius: '3px',
                          color: 'var(--brand-primary)',
                          fontWeight: 'bold'
                        }}>
                          {activeTab === 'notes' ? (item.noteType || 'general').toUpperCase() : activeTab.toUpperCase()}
                        </span>
                        {(() => {
                          const attached = getAttachedMission(item);
                          if (attached) {
                            return (
                              <span style={{ 
                                fontSize: '0.65rem', 
                                fontFamily: 'var(--font-mono)', 
                                backgroundColor: 'rgba(0, 229, 255, 0.08)', 
                                border: '1px solid var(--brand-primary)',
                                padding: '2px 6px', 
                                borderRadius: '3px',
                                color: 'var(--brand-primary)',
                                fontWeight: 'bold'
                              }}>
                                MISSION: {attached.title.toUpperCase()}
                              </span>
                            );
                          }
                          return null;
                        })()}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{dateStr}</span>
                    </div>

                    {/* Title */}
                    <h4 
                      onClick={() => setSelectedItemDetails(item)}
                      style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-main)', cursor: 'pointer', fontFamily: 'var(--font-mono)' }}
                    >
                      {(item.title || item.relatedQuestion || 'Untitled Entry').toUpperCase()}
                    </h4>

                    {/* Excerpt Body */}
                    <p style={{ 
                      margin: 0, 
                      fontSize: '0.75rem', 
                      color: 'var(--text-muted)', 
                      lineHeight: '1.4', 
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {item.body || item.content || item.excerpt || 'No summary text available.'}
                    </p>
                  </div>

                  {/* Footer actions */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {isHighRisk && (
                        <span style={{ 
                          fontSize: '0.65rem', 
                          backgroundColor: 'rgba(255,0,0,0.1)', 
                          color: 'var(--brand-danger)', 
                          padding: '2px 6px', 
                          borderRadius: '3px',
                          fontWeight: 'bold',
                          fontFamily: 'var(--font-mono)'
                        }}>
                          RISK: {item.riskCategory.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '8px' }}>
                      {activeTab === 'notes' && (
                        <button 
                          className="btn-tactical" 
                          onClick={() => setEditingNote(item)}
                          style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                        >
                          EDIT
                        </button>
                      )}
                      <button 
                        className="btn-tactical" 
                        onClick={() => setSelectedItemDetails(item)}
                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                      >
                        VIEW
                      </button>
                      <button 
                        className="btn-tactical" 
                        onClick={() => handleDeleteItem(item.id, activeTab.slice(0, -1))}
                        style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: 'rgba(255,0,0,0.3)', color: 'var(--brand-danger)' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Modal Overlays */}
      {isCreatingNote && (
        <FieldNoteEditor 
          onSave={handleSaveNote}
          onCancel={() => setIsCreatingNote(false)}
          onSaveAndAddToReport={(noteData) => {
            handleSaveNote(noteData);
            setActiveReportBuilder(true);
          }}
        />
      )}

      {editingNote && (
        <FieldNoteEditor 
          initialData={editingNote}
          onSave={handleSaveNote}
          onCancel={() => setEditingNote(null)}
          onSaveAndAddToReport={(noteData) => {
            handleSaveNote(noteData);
            setActiveReportBuilder(true);
          }}
        />
      )}

      {activeReportBuilder && (
        <ReportBuilder 
          savedAnswers={answers}
          fieldNotes={notes}
          savedSources={sources}
          defaultAuthor={callSign}
          onSaveDraft={handleSaveReportDraft}
          onClose={() => {
            setActiveReportBuilder(false);
            reloadData();
          }}
        />
      )}

      {/* Details Viewer Modal Overlay */}
      {selectedItemDetails && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 1500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '600px',
            width: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backgroundColor: '#0a0a0a',
            borderColor: selectedItemDetails.riskCategory ? 'var(--brand-danger)' : 'var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                DETAILED RECORD ENTRY // {activeTab.toUpperCase()}
              </span>
              <button 
                onClick={() => setSelectedItemDetails(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                {(selectedItemDetails.title || selectedItemDetails.relatedQuestion || 'Untitled').toUpperCase()}
              </h3>
              
              <div style={{ display: 'flex', gap: '10px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Created: {new Date(selectedItemDetails.createdAt || selectedItemDetails.savedAt).toLocaleString()}</span>
                {selectedItemDetails.noteType && <span>Type: {selectedItemDetails.noteType}</span>}
              </div>

              {selectedItemDetails.riskCategory && (
                <div style={{
                  backgroundColor: 'rgba(255, 0, 0, 0.05)',
                  border: '1px solid var(--brand-danger)',
                  padding: '10px',
                  borderRadius: '4px',
                  color: 'var(--brand-danger)',
                  fontSize: '0.75rem',
                  lineHeight: '1.4',
                  fontFamily: 'var(--font-mono)'
                }}>
                  ⚠️ <strong>HIGH-RISK CATEGORY IDENTIFIED: {selectedItemDetails.riskCategory.toUpperCase()}</strong>
                  <br />
                  Exercise extreme technical care. This summary has not been verified under live physical supervision. Cross-reference specifications before deployment.
                </div>
              )}

              {/* Related question info */}
              {selectedItemDetails.relatedQuestion && (
                <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontStyle: 'italic', backgroundColor: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderLeft: '2px solid var(--brand-primary)' }}>
                  Question: "{selectedItemDetails.relatedQuestion}"
                </div>
              )}

              {/* Main Content Area */}
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto', 
                padding: '12px', 
                backgroundColor: 'rgba(0,0,0,0.3)', 
                border: '1px solid var(--border-subtle)', 
                borderRadius: '4px',
                fontSize: '0.85rem',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap'
              }}>
                {selectedItemDetails.body || selectedItemDetails.content || selectedItemDetails.excerpt}
              </div>

              {selectedItemDetails.source && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  Source Path: <code>{selectedItemDetails.source}</code>
                </div>
              )}

              {selectedItemDetails.tags && selectedItemDetails.tags.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '4px' }}>
                  {selectedItemDetails.tags.map((tag, idx) => (
                    <span key={idx} style={{ fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', padding: '2px 6px', borderRadius: '3px' }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                className="btn-tactical" 
                onClick={() => setSelectedItemDetails(null)}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Clear Confirmation Modal */}
      {showClearModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000,
          padding: '20px'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '460px',
            width: '100%',
            padding: '24px',
            borderColor: 'var(--brand-danger)',
            backgroundColor: '#0c0202',
            boxShadow: '0 0 20px rgba(255, 0, 0, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-danger)' }}>
              <ShieldAlert size={22} />
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
                WIPE LOCAL DATABASES
              </h3>
            </div>

            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              CRITICAL WARNING: This action will permanently erase all saved answers, field notes, references, and report drafts. This operation cannot be undone.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
                TYPE "CLEAR ALL" TO CONFIRM:
              </label>
              <input 
                type="text" 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '10px', borderColor: clearInput === 'CLEAR ALL' ? '#00ff66' : 'var(--brand-danger)' }}
                value={clearInput}
                onChange={e => setClearInput(e.target.value)}
                placeholder="CLEAR ALL"
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
              <button 
                className="btn-tactical" 
                onClick={() => {
                  setShowClearModal(false);
                  setClearInput('');
                }}
                style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              >
                ABORT
              </button>
              
              <button 
                className="btn-tactical" 
                disabled={clearInput !== 'CLEAR ALL'}
                onClick={handleClearAllConfirm}
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '0.85rem',
                  borderColor: clearInput === 'CLEAR ALL' ? 'var(--brand-danger)' : 'var(--border-subtle)',
                  color: clearInput === 'CLEAR ALL' ? 'var(--brand-danger)' : 'var(--text-muted)',
                  cursor: clearInput === 'CLEAR ALL' ? 'pointer' : 'not-allowed',
                  opacity: clearInput === 'CLEAR ALL' ? 1 : 0.5
                }}
              >
                CONFIRM WIPE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotesReportsPanel;
