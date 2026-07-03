import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

const RiskSaveConfirmation = ({ riskCategory, onConfirm, onCancel }) => {
  const [acknowledged, setAcknowledged] = useState(false);

  const catName = riskCategory ? riskCategory.toUpperCase() : 'HIGH-RISK TECHNICAL';

  return (
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
      zIndex: 2000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '500px',
        width: '100%',
        padding: '24px',
        borderColor: 'var(--brand-danger)',
        backgroundColor: '#0c0202',
        boxShadow: '0 0 30px rgba(255, 0, 0, 0.25)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--brand-danger)' }}>
          <ShieldAlert size={24} className="glow-effect" style={{ filter: 'drop-shadow(0 0 8px var(--brand-danger))' }} />
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', letterSpacing: '1px' }}>
            CRITICAL SAFETY WARNING
          </h3>
        </div>

        {/* Warning text */}
        <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
          You are attempting to save or queue data concerning the high-risk operational category: 
          <strong style={{ color: 'var(--brand-danger)', display: 'block', marginTop: '4px', fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
            // {catName}
          </strong>
        </p>

        <div style={{
          backgroundColor: 'rgba(255, 0, 0, 0.05)',
          borderLeft: '3px solid var(--brand-danger)',
          padding: '12px',
          fontSize: '0.8rem',
          lineHeight: '1.4',
          color: 'var(--text-muted)'
        }}>
          <strong>ADVISORY:</strong> This content involves complex technical, medical, or logistical systems. Information extracted from local offline library manuals is auxiliary. You must cross-reference safety measures and technical metrics with physical manuals.
        </div>

        {/* Checkbox */}
        <label style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '10px', 
          cursor: 'pointer',
          userSelect: 'none',
          padding: '8px 0'
        }}>
          <input 
            type="checkbox" 
            checked={acknowledged}
            onChange={(e) => setAcknowledged(e.target.checked)}
            style={{ 
              marginTop: '4px',
              accentColor: 'var(--brand-danger)',
              width: '16px',
              height: '16px',
              cursor: 'pointer'
            }} 
          />
          <span style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
            I understand this saved item may involve high-risk material and should be verified before use.
          </span>
        </label>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
          <button 
            className="btn-tactical" 
            onClick={onCancel}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            ABORT OPERATION
          </button>
          
          <button 
            className="btn-tactical" 
            disabled={!acknowledged}
            onClick={onConfirm}
            style={{ 
              padding: '8px 16px', 
              fontSize: '0.85rem',
              borderColor: acknowledged ? 'var(--brand-danger)' : 'var(--border-subtle)',
              color: acknowledged ? 'var(--brand-danger)' : 'var(--text-muted)',
              cursor: acknowledged ? 'pointer' : 'not-allowed',
              opacity: acknowledged ? 1 : 0.5
            }}
          >
            CONFIRM SAVE
          </button>
        </div>
      </div>
    </div>
  );
};

export default RiskSaveConfirmation;
