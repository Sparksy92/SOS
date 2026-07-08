import React from 'react';
import { 
  User, 
  Settings, 
  Trash2, 
  Info,
  CheckSquare,
  Volume2
} from 'lucide-react';
import { localStore } from '../../services/localStore.js';

export default function ProfileSettingsPanel({ 
  profile, 
  setProfile, 
  dashboardWidgets, 
  setDashboardWidgets,
  voiceSettings = { voiceURI: '', rate: 1.05, pitch: 0.95 },
  setVoiceSettings,
  speakText
}) {

  const [voices, setVoices] = React.useState([]);

  React.useEffect(() => {
    const updateVoices = () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        setVoices(window.speechSynthesis.getVoices());
      }
    };
    updateVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }
  }, []);

  const handleUpdateVoiceField = (field, val) => {
    setVoiceSettings(prev => ({
      ...prev,
      [field]: val
    }));
  };

  const handleTestVoice = () => {
    if (speakText) {
      speakText("J.A.R.V.I.S. Audio synthesis online. Standby for instructions.");
    }
  };
  const handleUpdateProfileField = (field, val) => {
    let value = val;
    if (field === 'peopleCount' || field === 'targetWeeks') {
      value = Math.max(1, parseInt(val) || 1);
    } else if (field === 'energyLevel' || field === 'selfRelianceLevel') {
      value = Math.min(100, Math.max(0, parseInt(val) || 0));
    }
    setProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleToggleWidget = (widget) => {
    setDashboardWidgets(prev => ({
      ...prev,
      [widget]: !prev[widget]
    }));
  };

  const handleClearData = () => {
    const doubleCheck = window.confirm("WARNING: This will permanently wipe all local store data including container tracking, pantry stocks, profile details, and favorites. Continue?");
    if (doubleCheck) {
      localStore.clear();
      window.location.reload();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="category-header">
        <h2 className="category-title" style={{ letterSpacing: '2px', margin: 0 }}>SETTINGS & PROFILE</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          MANAGE Logistical parameters and local application configurations
        </div>
      </div>

      {/* Homestead Parameters */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={16} /> HOMESTEAD PROFILE DETAILS
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>HOMESTEAD / CALLSIGN NAME</label>
            <input 
              type="text" 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '8px' }}
              value={profile.name}
              onChange={e => handleUpdateProfileField('name', e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FAMILY SIZE (PEOPLE)</label>
              <input 
                type="number" 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '8px' }}
                min="1"
                value={profile.peopleCount}
                onChange={e => handleUpdateProfileField('peopleCount', e.target.value)}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TARGET DURATION (WEEKS)</label>
              <input 
                type="number" 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '8px' }}
                min="1"
                value={profile.targetWeeks}
                onChange={e => handleUpdateProfileField('targetWeeks', e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ENERGY RESERVES % (SURGE/POWER)</label>
              <input 
                type="number" 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '8px' }}
                min="0"
                max="100"
                value={profile.energyLevel}
                onChange={e => handleUpdateProfileField('energyLevel', e.target.value)}
              />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SELF-RELIANCE % (GARDEN/AGRI)</label>
              <input 
                type="number" 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '8px' }}
                min="0"
                max="100"
                value={profile.selfRelianceLevel}
                onChange={e => handleUpdateProfileField('selfRelianceLevel', e.target.value)}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Widget Visibility Toggles */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Settings size={16} /> DASHBOARD WIDGET CONFIGURATION
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
          {Object.entries(dashboardWidgets).map(([key, val]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                style={{ cursor: 'pointer' }}
                checked={val}
                onChange={() => handleToggleWidget(key)}
              />
              <span style={{ textTransform: 'uppercase', color: val ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {key.replace(/([A-Z])/g, ' $1').toUpperCase()} WIDGET VISIBILITY
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* J.A.R.V.I.S. Voice Configuration */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Volume2 size={16} /> J.A.R.V.I.S. VOICE CONFIGURATION
        </h3>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Configure text-to-speech audio feedback parameters. Selecting a British English voice (if installed on your system) is recommended to approximate the default JARVIS persona.
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Voice Dropdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SPEECH SYNTHESIS ENGINE VOICE</label>
            <select
              className="search-input glass-panel"
              style={{ width: '100%', padding: '8px', background: 'var(--bg-main)', color: 'var(--text-main)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}
              value={voiceSettings.voiceURI || ''}
              onChange={e => handleUpdateVoiceField('voiceURI', e.target.value)}
            >
              <option value="">Default (Auto-Selected British Accent)</option>
              {voices.map((v, idx) => (
                <option key={idx} value={v.voiceURI}>
                  {v.name} ({v.lang}) {v.localService ? '[Local]' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Speed Rate Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>PLAYBACK SPEED (RATE)</span>
              <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>{voiceSettings.rate}x</span>
            </div>
            <input 
              type="range"
              min="0.5"
              max="2.0"
              step="0.05"
              value={voiceSettings.rate}
              onChange={e => handleUpdateVoiceField('rate', parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
            />
          </div>

          {/* Pitch Slider */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>VOICE PITCH (TONALITY)</span>
              <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>{voiceSettings.pitch}</span>
            </div>
            <input 
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={voiceSettings.pitch}
              onChange={e => handleUpdateVoiceField('pitch', parseFloat(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
            />
          </div>

          {/* Test Audio Button */}
          <button 
            className="btn-tactical"
            onClick={handleTestVoice}
            style={{ 
              marginTop: '8px',
              padding: '10px',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            <Volume2 size={16} /> TEST AUDIO SYNTHESIS
          </button>
        </div>
      </div>

      {/* Wipe/Danger Zone */}
      <div className="glass-panel" style={{ padding: '24px', borderColor: 'var(--brand-danger)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-danger)', letterSpacing: '1.5px' }}>
          DANGER ZONE
        </h3>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          Wiping your local settings data resets all databases, profile counts, water tanks list, and pantry calculations to system factory defaults. This action cannot be undone.
        </p>
        <button 
          className="btn-tactical" 
          onClick={handleClearData}
          style={{ 
            borderColor: 'var(--brand-danger)', 
            color: 'var(--brand-danger)', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '8px',
            padding: '12px',
            fontSize: '0.9rem'
          }}
        >
          <Trash2 size={16} /> ERASE ALL LOCAL APP DATA
        </button>
      </div>

    </div>
  );
}
