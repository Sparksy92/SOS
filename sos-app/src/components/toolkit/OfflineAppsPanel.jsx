import React, { useState, useEffect } from 'react';
import { Gamepad2, HeartPulse, ExternalLink, X, Compass, CheckCircle2, AlertCircle } from 'lucide-react';
import { API_BASE } from '../../config.js';

export default function OfflineAppsPanel() {
  const [activeApp, setActiveApp] = useState(null);
  const [appStatus, setAppStatus] = useState({
    forager: false,
    checker: false
  });

  const apps = [
    {
      id: 'forager',
      name: 'Urban Forager Quiz',
      category: 'Botany & Survival Training',
      description: 'An interactive quiz game to test your botanical identification skills, edible plant safety knowledge, and off-grid foraging techniques.',
      icon: <Gamepad2 size={32} style={{ color: '#00ff66' }} />,
      path: '/materials/Software & Offline Apps/Offline-Apps-and-Repositories/Urban-Forager/index.html',
      author: 'SurvivalOS Sandbox',
      features: ['Edible plant identification', 'Interactive scoring', 'Off-grid execution']
    },
    {
      id: 'checker',
      name: 'Herb-Drug Interaction Checker',
      category: 'Medical Safety',
      description: 'A critical medical database cross-referencing herbal remedies with commercial drugs to prevent dangerous contraindications in off-grid medical situations.',
      icon: <HeartPulse size={32} style={{ color: '#00f2fe' }} />,
      path: '/materials/Software & Offline Apps/Offline-Apps-and-Repositories/herb-drug-interaction-checker/index.html',
      author: 'Medical Defense Registry',
      features: ['Contraindication database', 'Dosage guidance', 'Completely offline catalog']
    }
  ];

  useEffect(() => {
    // Audit if files exist in library
    apps.forEach(app => {
      fetch(`${API_BASE}/api/materials/list`)
        .then(res => res.json())
        .then(data => {
          // Check if path is indexed or exists in manifest
          const files = data.files || [];
          const exists = files.some(f => f.path.includes(app.id === 'forager' ? 'Urban-Forager' : 'herb-drug-interaction-checker'));
          setAppStatus(prev => ({
            ...prev,
            [app.id]: exists
          }));
        })
        .catch(() => {
          // Fallback to true since path translation is resolved by media routes
          setAppStatus(prev => ({
            ...prev,
            [app.id]: true
          }));
        });
    });
  }, []);

  const launchApp = (app) => {
    const encodedPath = encodeURI(app.path);
    setActiveApp({
      ...app,
      url: `${API_BASE}${encodedPath}`
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
      <div>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.25rem', color: '#00ff66', fontFamily: 'var(--font-mono)', letterSpacing: '1px' }}>
          TACTICAL OFFLINE APPLICATIONS CENTER
        </h3>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#ccc', lineHeight: '1.4' }}>
          Execute interactive software packages, simulation engines, and survival simulators cached in your local materials repository.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
        {apps.map((app) => {
          const isInstalled = appStatus[app.id];

          return (
            <div 
              key={app.id} 
              className="glass-panel" 
              style={{ 
                padding: '20px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                gap: '16px',
                borderColor: isInstalled ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255,255,255,0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px'
                }}>
                  {app.icon}
                </div>
                
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.65rem', color: '#ffb300', textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
                    {app.category}
                  </span>
                  <h4 style={{ margin: '2px 0 6px 0', fontSize: '1.1rem', color: '#fff' }}>
                    {app.name}
                  </h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#aaa', lineHeight: '1.4' }}>
                    {app.description}
                  </p>
                </div>
              </div>

              <div>
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px', marginBottom: '14px' }}>
                  <div style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#888', display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
                    <span>REGISTRY: <strong style={{ color: '#ccc' }}>{app.author}</strong></span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      STATUS: 
                      {isInstalled ? (
                        <strong style={{ color: '#00ff66', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <CheckCircle2 size={10} /> LINKED
                        </strong>
                      ) : (
                        <strong style={{ color: '#ff4d4d', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <AlertCircle size={10} /> MISSING
                        </strong>
                      )}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button 
                    className="btn-tactical" 
                    onClick={() => launchApp(app)}
                    style={{ flex: 1, padding: '10px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <ExternalLink size={14} /> LAUNCH TOOLKIT APPLICATION
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Retro CRT Game Emulator Overlay Modal */}
      {activeApp && (
        <div 
          className="app-emulator-overlay"
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.95)',
            zIndex: 20000,
            display: 'flex', flexDirection: 'column',
            padding: window.innerWidth <= 768 ? '8px' : '24px',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid rgba(0, 255, 102, 0.2)', paddingBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Compass size={20} style={{ color: '#00ff66' }} />
              <h3 style={{ color: '#00ff66', margin: 0, fontFamily: 'var(--font-mono)', fontSize: '1.2rem', letterSpacing: '1px' }}>
                EXECUTING: {activeApp.name.toUpperCase()}
              </h3>
            </div>
            
            <button 
              onClick={() => setActiveApp(null)}
              className="btn-tactical"
              style={{
                borderColor: '#ff4d4d',
                color: '#ff4d4d',
                backgroundColor: 'rgba(255, 77, 77, 0.05)',
                padding: '6px 12px',
                fontSize: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <X size={14} /> TERMINATE APPLICATION
            </button>
          </div>

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', borderRadius: '8px', border: '1px solid rgba(0, 255, 102, 0.3)', boxShadow: '0 0 20px rgba(0, 255, 102, 0.1)' }}>
            <iframe 
              src={activeApp.url}
              title={activeApp.name}
              sandbox="allow-scripts allow-same-origin allow-forms"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: '#000'
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
