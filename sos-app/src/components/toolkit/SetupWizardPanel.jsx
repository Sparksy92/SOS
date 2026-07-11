import React, { useState, useEffect } from 'react';
import { 
  DEFAULT_STEPS, 
  loadSetupProgress, 
  toggleStep, 
  resetSetupProgress 
} from '../../modules/toolkit/setupProgressStore.js';
import { CheckSquare, ArrowRight, RefreshCw, AlertTriangle, Compass } from 'lucide-react';

export default function SetupWizardPanel({ setViewMode }) {
  const [progress, setProgress] = useState({});
  const [instructionOverlay, setInstructionOverlay] = useState(null);

  useEffect(() => {
    setProgress(loadSetupProgress());
  }, []);

  const handleToggle = (stepId) => {
    const updated = toggleStep(stepId);
    setProgress(updated);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all setup wizard progress?")) {
      const updated = resetSetupProgress();
      setProgress(updated);
    }
  };

  // Calculate completed stats
  const stepsKeys = Object.keys(DEFAULT_STEPS);
  const totalSteps = stepsKeys.length;
  const completedCount = Object.values(progress).filter(Boolean).length;
  const percentage = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Manual actions mapping to help direct user
  const handleStepAction = (stepId) => {
    switch (stepId) {
      case 2: // Jarvis/Ollama
        setViewMode('settings');
        break;
      case 3: // SOS_MATERIALS_DIR
        setViewMode('settings');
        break;
      case 4: // Manifest refresh guidelines
        setInstructionOverlay({
          title: "Run Manual Material Manifest Refresh",
          text: "To rebuild your materials index, navigate to the INDEX INTEGRITY tab, verify that your materials directory path is configured properly, and click 'Scan Material Directory'. Rebuilding requires direct user activation and cannot be run in the background."
        });
        break;
      case 5: // Index test doc
        setViewMode('index-integrity');
        break;
      case 6: // Backup export
        setViewMode('settings');
        break;
      case 7: // Mission brief creation
        setViewMode('dashboard');
        break;
      case 8: // Report export
        setViewMode('reports-panel');
        break;
      case 9: // Tactical map / boundaries
        setViewMode('map');
        break;
      case 10: // Kiwix/ZIM availability
        setViewMode('settings');
        break;
      default:
        // Other steps are pure checklist items with text descriptions
        break;
    }
  };

  return (
    <div style={{ padding: '24px', color: '#e0e0e0', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 10px rgba(0, 242, 254, 0.4)' }}>
            Offline Setup Wizard
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#a0a0a0' }}>
            Follow these 12 manual steps to verify that your SurvivalOS installation is fully hardened for off-grid operations.
          </p>
        </div>
        <button 
          className="btn-tactical-outline" 
          onClick={handleReset}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          Reset Progress
        </button>
      </div>

      {/* Progress Bar Header */}
      <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '0.95rem' }}>
          <span>System Readiness Status: <strong>{percentage}% Prepared</strong></span>
          <span style={{ color: 'var(--brand-primary)' }}>{completedCount} of {totalSteps} verified</span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#1d222e', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: 'var(--brand-primary)', transition: 'width 0.3s ease-in-out', boxShadow: '0 0 10px rgba(0, 242, 254, 0.6)' }} />
        </div>
      </div>

      {/* Instruction Overlay modal if active */}
      {instructionOverlay && (
        <div style={{
          backgroundColor: '#1a1f29',
          border: '1px solid var(--brand-primary)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
          position: 'relative'
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Compass size={18} />
            {instructionOverlay.title}
          </h4>
          <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.4, color: '#bbb' }}>
            {instructionOverlay.text}
          </p>
          <button 
            style={{
              position: 'absolute',
              right: '12px',
              top: '12px',
              background: 'none',
              border: 'none',
              color: '#888',
              cursor: 'pointer',
              fontSize: '1rem'
            }}
            onClick={() => setInstructionOverlay(null)}
          >
            ✕
          </button>
        </div>
      )}

      {/* Checklist items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {stepsKeys.map(key => {
          const step = DEFAULT_STEPS[key];
          const isCompleted = progress[step.id] === true;
          const hasAction = [2, 3, 4, 5, 6, 7, 8, 9, 10].includes(step.id);

          return (
            <div 
              key={step.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '16px',
                backgroundColor: '#12151c',
                border: isCompleted ? '1px solid rgba(0, 255, 127, 0.2)' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                padding: '16px',
                transition: 'border-color 0.2s'
              }}
            >
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={() => handleToggle(step.id)}
                style={{
                  accentColor: '#00ff7f',
                  width: '20px',
                  height: '20px',
                  cursor: 'pointer',
                  marginTop: '2px',
                  flexShrink: 0
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '1.05rem', color: isCompleted ? '#00ff7f' : '#fff' }}>
                    {step.id}. {step.label}
                  </h4>
                  {hasAction && (
                    <button 
                      onClick={() => handleStepAction(step.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--brand-primary)',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        padding: 0,
                        textDecoration: 'underline',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <span>
                        {step.id === 4 ? "Show Help" : "Open Module"}
                      </span>
                      <ArrowRight size={12} />
                    </button>
                  )}
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#a0a0a0', lineHeight: 1.4 }}>
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
