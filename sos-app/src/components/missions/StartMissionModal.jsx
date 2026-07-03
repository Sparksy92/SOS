import React, { useState, useEffect } from 'react';
import { ShieldAlert, Plus, Trash2, X } from 'lucide-react';
import { missionTemplates } from '../../modules/missions/missionTemplates.js';
import { createMissionFromTemplate } from '../../modules/missions/missionUtils.js';

const StartMissionModal = ({ onStart, onCancel }) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(missionTemplates[0].id);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [locationLabel, setLocationLabel] = useState('');
  const [callsign, setCallsign] = useState('Operator');
  const [overview, setOverview] = useState('');
  const [objectives, setObjectives] = useState([]);
  const [checklist, setChecklist] = useState([]);

  const selectedTemplate = missionTemplates.find(t => t.id === selectedTemplateId) || missionTemplates[0];

  useEffect(() => {
    if (selectedTemplate) {
      setTitle(selectedTemplate.title);
      setPriority(selectedTemplate.defaultPriority || 'medium');
      setOverview(selectedTemplate.description || '');
      setObjectives([...(selectedTemplate.objectives || [])]);
      setChecklist([...(selectedTemplate.checklist || [])]);
    }
  }, [selectedTemplateId]);

  const handleStart = () => {
    if (!title.trim()) {
      alert("Please provide a mission title.");
      return;
    }
    const templateCopy = {
      ...selectedTemplate,
      objectives,
      checklist
    };
    const fields = {
      title: title.trim(),
      priority,
      locationLabel: locationLabel.trim(),
      callsign: callsign.trim(),
      overview: overview.trim()
    };
    const mission = createMissionFromTemplate(templateCopy, fields);
    onStart(mission);
  };

  const handleAddObjective = () => {
    setObjectives(prev => [...prev, 'New Objective']);
  };

  const handleUpdateObjective = (idx, val) => {
    setObjectives(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleRemoveObjective = (idx) => {
    setObjectives(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAddChecklist = () => {
    setChecklist(prev => [...prev, 'New checklist task']);
  };

  const handleUpdateChecklist = (idx, val) => {
    setChecklist(prev => {
      const copy = [...prev];
      copy[idx] = val;
      return copy;
    });
  };

  const handleRemoveChecklist = (idx) => {
    setChecklist(prev => prev.filter((_, i) => i !== idx));
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000, padding: '24px', backdropFilter: 'blur(6px)'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '700px', width: '100%', maxHeight: '90vh',
        overflowY: 'auto', padding: '32px', border: '1px solid var(--brand-primary)',
        display: 'flex', flexDirection: 'column', gap: '20px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <h2 style={{ margin: 0, color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', fontSize: '1.4rem' }}>
            START NEW FIELD MISSION
          </h2>
          <button className="btn-tactical" onClick={onCancel} style={{ padding: '6px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Template Select */}
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontFamily: 'var(--font-mono)' }}>
            MISSION TEMPLATE LOGISTICS
          </label>
          <select 
            value={selectedTemplateId} 
            onChange={e => setSelectedTemplateId(e.target.value)}
            className="search-input glass-panel"
            style={{ width: '100%', padding: '10px', backgroundColor: 'black', color: 'var(--text-main)' }}
          >
            {missionTemplates.map(t => (
              <option key={t.id} value={t.id}>{t.title.toUpperCase()}</option>
            ))}
          </select>
        </div>

        {/* Safety Warning */}
        {selectedTemplate.riskCategory && (
          <div style={{
            backgroundColor: 'rgba(255, 0, 0, 0.05)',
            border: '1px solid var(--brand-danger)',
            padding: '12px 16px',
            borderRadius: '4px',
            color: 'var(--brand-danger)',
            fontSize: '0.8rem',
            lineHeight: '1.5',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px'
          }}>
            <ShieldAlert size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>⚠️ CRITICAL SAFETY NOTICE (RISK CATEGORY: {selectedTemplate.riskCategory.toUpperCase()})</strong>
              <br />
              This mission checklist involves technical operations. Do not deploy these protocols in active hazard scenarios without secondary manual verification using physical books or checking safety directives.
            </div>
          </div>
        )}

        {/* Parameters Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>MISSION TITLE</label>
            <input 
              type="text" 
              value={title} 
              onChange={e => setTitle(e.target.value)} 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px' }} 
              placeholder="e.g. Winter Freeze Prep"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>PRIORITY LEVEL</label>
            <select 
              value={priority} 
              onChange={e => setPriority(e.target.value)}
              className="search-input glass-panel"
              style={{ width: '100%', padding: '10px', backgroundColor: 'black', color: 'var(--text-main)' }}
            >
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
              <option value="critical">CRITICAL</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>LOCATION / SECTOR LABEL</label>
            <input 
              type="text" 
              value={locationLabel} 
              onChange={e => setLocationLabel(e.target.value)} 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px' }} 
              placeholder="e.g. Sector B-3 / Main Shed"
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>OPERATOR CALLSIGN</label>
            <input 
              type="text" 
              value={callsign} 
              onChange={e => setCallsign(e.target.value)} 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px' }} 
              placeholder="Operator"
            />
          </div>
        </div>

        {/* Overview */}
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>SITUATION OVERVIEW</label>
          <textarea 
            value={overview} 
            onChange={e => setOverview(e.target.value)} 
            className="search-input glass-panel" 
            rows={2} 
            style={{ width: '100%', padding: '10px', resize: 'vertical' }}
            placeholder="Describe the current operational objectives..."
          />
        </div>

        {/* Objectives Builder */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>MISSION OBJECTIVES</label>
            <button className="btn-tactical" onClick={handleAddObjective} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
              <Plus size={10} style={{ display: 'inline', marginRight: '4px' }} /> ADD
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
            {objectives.map((obj, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={obj} 
                  onChange={e => handleUpdateObjective(i, e.target.value)} 
                  className="search-input glass-panel" 
                  style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
                />
                <button className="btn-tactical" onClick={() => handleRemoveObjective(i)} style={{ padding: '6px', borderColor: 'var(--brand-danger)' }}>
                  <Trash2 size={12} className="text-glow" style={{ color: 'var(--brand-danger)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Checklist Builder */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>INITIAL CHECKLIST TASKS</label>
            <button className="btn-tactical" onClick={handleAddChecklist} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
              <Plus size={10} style={{ display: 'inline', marginRight: '4px' }} /> ADD
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }}>
            {checklist.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px' }}>
                <input 
                  type="text" 
                  value={item} 
                  onChange={e => handleUpdateChecklist(i, e.target.value)} 
                  className="search-input glass-panel" 
                  style={{ width: '100%', padding: '8px', fontSize: '0.8rem' }}
                />
                <button className="btn-tactical" onClick={() => handleRemoveChecklist(i)} style={{ padding: '6px', borderColor: 'var(--brand-danger)' }}>
                  <Trash2 size={12} className="text-glow" style={{ color: 'var(--brand-danger)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: '10px' }}>
          <button className="btn-tactical" onClick={onCancel} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
            ABORT PROTOCOL
          </button>
          <button 
            className="btn-tactical" 
            onClick={handleStart} 
            style={{ padding: '10px 24px', fontSize: '0.9rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
          >
            START MISSION PROTOCOL
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartMissionModal;
