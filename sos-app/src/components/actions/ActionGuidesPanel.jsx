import React, { useState } from 'react';
import { 
  ClipboardList, 
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { ACTION_MODULES } from '../../modules/tools/actionModules.js';
import { getRiskLevel, getSafetyWarning } from '../../modules/safety/riskRules.js';

export default function ActionGuidesPanel({ 
  setViewMode, 
  setChatInput, 
  handleSendMessage 
}) {
  const [selectedGuide, setSelectedGuide] = useState(ACTION_MODULES[0]);
  const [checkedSteps, setCheckedSteps] = useState({});

  const toggleStep = (guideId, stepIdx) => {
    const key = `${guideId}-${stepIdx}`;
    setCheckedSteps(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleAskRanger = (guide, stepText = null) => {
    const query = stepText 
      ? `Provide detailed offline homestead guidance on this checklist step for "${guide.title}": "${stepText}"`
      : `Provide a detailed offline briefing for the homestead action guide: "${guide.title}". Detail steps for: ${guide.steps.join(', ')}`;
    
    // Set chat input and switch view mode to R.A.N.G.E.R.
    setChatInput(query);
    setViewMode('chat');
  };

  const risk = selectedGuide ? getRiskLevel({ name: selectedGuide.title, path: selectedGuide.id }) : { risk: 'LOW', category: null };

  return (
    <div style={{ display: 'flex', gap: '24px', width: '100%', maxWidth: '1100px', margin: '0 auto', flexWrap: 'wrap' }}>
      
      {/* Left Column: Guides List */}
      <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
          TACTICAL ACTION GUIDES
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {ACTION_MODULES.map(guide => {
            const isSelected = selectedGuide?.id === guide.id;
            return (
              <button
                key={guide.id}
                className={`btn-tactical ${isSelected ? 'active' : ''}`}
                onClick={() => setSelectedGuide(guide)}
                style={{
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '6px',
                  textAlign: 'left',
                  width: '100%',
                  borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)',
                  backgroundColor: isSelected ? 'var(--brand-primary-dim)' : 'rgba(0,0,0,0.2)'
                }}
              >
                <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-main)' }}>{guide.title.toUpperCase()}</span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CATEGORY: {guide.category.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right Column: Selected Guide Checklist */}
      {selectedGuide && (
        <div className="glass-panel" style={{ flex: '2 2 500px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header */}
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                MATRIX MODULE // {selectedGuide.category.toUpperCase()}
              </span>
              {risk.risk === 'HIGH' && (
                <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--brand-danger)', color: 'white', padding: '2px 8px', borderRadius: '3px', fontWeight: 'bold' }}>
                  HIGH RISK LOGISTICS
                </span>
              )}
            </div>
            <h2 style={{ margin: '8px 0 4px 0', color: 'var(--brand-primary)', fontSize: '1.4rem', fontFamily: 'var(--font-mono)' }}>
              {selectedGuide.title.toUpperCase()}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              {selectedGuide.description}
            </p>
          </div>

          {/* Safety alert if high risk */}
          {risk.risk === 'HIGH' && (
            <div style={{ padding: '12px', borderLeft: '3px solid var(--brand-danger)', backgroundColor: 'rgba(255, 0, 0, 0.03)', color: 'var(--brand-danger)', fontSize: '0.8rem', lineHeight: '1.4', fontFamily: 'var(--font-mono)' }}>
              <ShieldAlert size={14} style={{ display: 'inline', marginRight: '6px', marginBottom: '-2px' }} />
              {getSafetyWarning(risk.category).toUpperCase()}
            </div>
          )}

          {/* Checklist steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {selectedGuide.steps.map((step, idx) => {
              const isChecked = !!checkedSteps[`${selectedGuide.id}-${idx}`];
              return (
                <div 
                  key={idx} 
                  className="glass-panel" 
                  style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    gap: '16px',
                    borderColor: isChecked ? 'rgba(0,255,102,0.3)' : 'var(--border-subtle)',
                    backgroundColor: isChecked ? 'rgba(0,255,102,0.01)' : 'rgba(0,0,0,0.1)'
                  }}
                >
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', flex: 1 }}>
                    <input 
                      type="checkbox" 
                      style={{ marginTop: '3px', cursor: 'pointer' }}
                      checked={isChecked}
                      onChange={() => toggleStep(selectedGuide.id, idx)}
                    />
                    <span style={{ 
                      fontSize: '0.9rem', 
                      color: isChecked ? 'var(--text-muted)' : 'var(--text-main)',
                      textDecoration: isChecked ? 'line-through' : 'none',
                      lineHeight: '1.4'
                    }}>
                      {step}
                    </span>
                  </label>
                  <button 
                    className="btn-tactical" 
                    onClick={() => handleAskRanger(selectedGuide, step)}
                    style={{ padding: '6px 10px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Ask Ranger about this step"
                  >
                    <MessageSquare size={12} /> ASK AI
                  </button>
                </div>
              );
            })}
          </div>

          {/* General Ask Ranger Button */}
          <button 
            className="btn-tactical" 
            onClick={() => handleAskRanger(selectedGuide)}
            style={{ 
              width: '100%', 
              padding: '12px', 
              fontSize: '0.85rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              borderColor: 'var(--brand-primary)',
              marginTop: '10px'
            }}
          >
            <MessageSquare size={16} /> DEPLOY FULL BRIEFING VIA R.A.N.G.E.R.
          </button>

        </div>
      )}

    </div>
  );
}
