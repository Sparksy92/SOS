import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, BookOpen, Clock, FileText, ArrowLeft, 
  Trash2, ShieldAlert, CheckCircle, RotateCcw
} from 'lucide-react';
import { 
  loadMissions, loadActiveMission, saveActiveMission, 
  clearActiveMission, addMission, deleteMission, updateMission
} from '../../modules/missions/missionStore.js';
import { transitionMissionStatus } from '../../modules/missions/missionUtils.js';
import StartMissionModal from './StartMissionModal.jsx';
import ActiveMissionView from './ActiveMissionView.jsx';
import PanelErrorBoundary from '../common/PanelErrorBoundary.jsx';

const MissionModePanel = ({ callSign = 'Operator', onSendSuggestedPrompt }) => {
  const [missionsList, setMissionsList] = useState([]);
  const [activeMission, setActiveMission] = useState(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [viewingActive, setViewingActive] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'completed', 'archived'

  const reload = () => {
    setMissionsList(loadMissions());
    const active = loadActiveMission();
    setActiveMission(active);
    if (!active) {
      setViewingActive(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const handleStartMission = (newMission) => {
    addMission(newMission);
    saveActiveMission(newMission);
    setShowStartModal(false);
    reload();
    setViewingActive(true);
  };

  const handleResumeMission = (m) => {
    saveActiveMission(m);
    // If it was completed or archived, transition back to active
    if (m.status === 'completed' || m.status === 'archived') {
      const updated = transitionMissionStatus(m, 'active');
    }
    reload();
    setViewingActive(true);
  };

  const handleDelete = (id) => {
    if (window.confirm("CRITICAL: Permanently delete this offline mission log? This cannot be undone.")) {
      deleteMission(id);
      reload();
    }
  };

  const getFilteredMissions = () => {
    return missionsList.filter(m => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        m.title.toLowerCase().includes(query) ||
        m.missionType.toLowerCase().includes(query) ||
        (m.overview && m.overview.toLowerCase().includes(query));

      let matchesStatus = true;
      if (statusFilter === 'active') {
        matchesStatus = m.status === 'active' || m.status === 'paused';
      } else if (statusFilter === 'completed') {
        matchesStatus = m.status === 'completed';
      } else if (statusFilter === 'archived') {
        matchesStatus = m.status === 'archived';
      }

      return matchesSearch && matchesStatus;
    });
  };

  const filteredMissions = getFilteredMissions();

  if (activeMission && viewingActive) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button 
            className="btn-tactical" 
            onClick={() => setViewingActive(false)}
            style={{ padding: '8px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> BACK TO MISSION CONTROL
          </button>
          
          <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)' }}>
            ACTIVE OPERATIONAL FIELD SESSION // CALLSIGN: {callSign.toUpperCase()}
          </div>
        </div>

        <PanelErrorBoundary name="Active Mission View">
          <ActiveMissionView 
            mission={activeMission} 
            onSendSuggestedPrompt={onSendSuggestedPrompt}
            onUpdateState={reload}
          />
        </PanelErrorBoundary>
      </div>
    );
  }

  return (
    <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', minHeight: '80vh' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
            RANGER FIELD OPERATIONS CONTROL
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Launch user-guided offline checklists, timeline logs, and situation reports for active field operations.
          </p>
        </div>

        <button 
          className="btn-tactical" 
          onClick={() => setShowStartModal(true)}
          style={{ padding: '10px 18px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--brand-primary)' }}
        >
          <Plus size={16} /> START NEW MISSION
        </button>
      </div>

      {/* Active Session Alert banner */}
      {activeMission && (
        <div className="glass-panel" style={{
          padding: '14px 20px',
          borderColor: 'var(--brand-primary)',
          backgroundColor: 'rgba(0, 229, 255, 0.03)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
              ACTIVE MISSION LOG RUNNING
            </div>
            <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
              {activeMission.title.toUpperCase()}
            </strong>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={() => setViewingActive(true)} style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: 'var(--brand-primary)' }}>
              RESUME CONTROL
            </button>
            <button className="btn-tactical" onClick={() => { clearActiveMission(); reload(); }} style={{ padding: '6px 14px', fontSize: '0.8rem', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}>
              CLEAR HUD
            </button>
          </div>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, position: 'relative', minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            className="search-input glass-panel"
            style={{ width: '100%', padding: '8px 12px 8px 36px', fontSize: '0.85rem' }}
            placeholder="Search missions by name or type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <Filter size={14} style={{ color: 'var(--text-muted)' }} />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="search-input glass-panel"
            style={{ padding: '8px 12px', fontSize: '0.85rem', backgroundColor: 'black', color: 'var(--text-main)' }}
          >
            <option value="all">ALL STATUSES</option>
            <option value="active">ACTIVE / PAUSED</option>
            <option value="completed">COMPLETED</option>
            <option value="archived">ARCHIVED</option>
          </select>
        </div>
      </div>

      {/* Grid of Missions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: '10px 0 4px 0', fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          MISSION LOG HISTORY ({filteredMissions.length})
        </h3>
        
        {filteredMissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '0.9rem', border: '1px dashed var(--border-subtle)', borderRadius: '4px' }}>
            No matching offline mission logs detected. Click "Start New Mission" to begin tracking.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {filteredMissions.map(m => (
              <div 
                key={m.id} 
                className="glass-panel" 
                style={{ 
                  padding: '16px 20px', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '16px',
                  borderColor: m.status === 'active' ? 'var(--brand-primary)' : 'var(--border-subtle)',
                  backgroundColor: 'rgba(255,255,255,0.01)'
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`status-dot-${m.status === 'active' ? 'active' : 'idle'}`} style={{ width: '8px', height: '8px', borderRadius: '50%' }} />
                    <strong style={{ fontSize: '0.95rem', color: 'var(--text-main)' }}>
                      {m.title.toUpperCase()}
                    </strong>
                    <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.06)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>
                      {m.missionType.toUpperCase()}
                    </span>
                  </div>
                  
                  {m.overview && (
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {m.overview.substring(0, 120)}...
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <div>PRIORITY: {m.priority.toUpperCase()}</div>
                    {m.locationLabel && <div>LOCATION: {m.locationLabel}</div>}
                    <div>STARTED: {new Date(m.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn-tactical" 
                    onClick={() => handleResumeMission(m)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    RESUME / OPEN
                  </button>
                  <button 
                    className="btn-tactical" 
                    onClick={() => handleDelete(m.id)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Start Modal Trigger */}
      {showStartModal && (
        <StartMissionModal 
          onStart={handleStartMission} 
          onCancel={() => setShowStartModal(false)} 
        />
      )}

    </div>
  );
};

export default MissionModePanel;
