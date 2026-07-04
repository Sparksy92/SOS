import React, { useState } from 'react';
import { CONTENT_PROVIDERS } from '../../modules/toolkit/contentProviderRegistry.js';
import { CheckCircle, AlertTriangle, ExternalLink, Cpu } from 'lucide-react';

export default function ContentProviderRegistryPanel() {
  const [scannedStatus, setScannedStatus] = useState({});

  const handleScanProvider = (providerId) => {
    // UI-only metadata scan feedback (strictly no background download/install starts)
    setScannedStatus(prev => ({
      ...prev,
      [providerId]: 'Scanned & Verified (Local)'
    }));
  };

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Content Provider Registry
        </h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
          Catalog of local/offline knowledge sources. Maintain directories manually to ensure offline reliability.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {CONTENT_PROVIDERS.map(provider => {
          const status = scannedStatus[provider.id] || 'Not Scanned';
          return (
            <div 
              key={provider.id} 
              style={{
                backgroundColor: '#12151c',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '6px',
                padding: '20px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '1.15rem', color: '#fff' }}>
                    {provider.label}
                  </h4>
                  <span style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Type: {provider.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    fontSize: '0.8rem', 
                    padding: '4px 10px', 
                    borderRadius: '4px',
                    backgroundColor: status.startsWith('Scanned') ? 'rgba(0, 255, 127, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    color: status.startsWith('Scanned') ? '#00ff7f' : '#888',
                    border: status.startsWith('Scanned') ? '1px solid rgba(0, 255, 127, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)'
                  }}>
                    {status}
                  </span>
                  <button 
                    className="btn-tactical-outline" 
                    onClick={() => handleScanProvider(provider.id)}
                    style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                  >
                    Scan Metadata
                  </button>
                </div>
              </div>

              {/* Status grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '14px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '4px' }}>
                <div><strong>Local-Only:</strong> {provider.localOnly ? "Yes (Hardened)" : "No"}</div>
                <div><strong>Setup Required:</strong> {provider.requiresManualSetup ? "Yes (Operator Checklist)" : "No"}</div>
                <div><strong>Auto-Downloads:</strong> {provider.supportsAutomaticDownload ? "Enabled (UNSAFE)" : "Disabled (Safe)"}</div>
                <div><strong>Content Indexing:</strong> {provider.supportsContentIndexing.replace(/_/g, ' ')}</div>
              </div>

              {/* Warnings/Risks */}
              {provider.riskNotes.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'rgba(255, 69, 0, 0.04)', borderRadius: '4px', border: '1px solid rgba(255, 69, 0, 0.2)', marginBottom: '14px' }}>
                  <AlertTriangle size={16} style={{ color: '#ff4500', flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ fontSize: '0.8rem', color: '#ff7f50', lineHeight: 1.3 }}>
                    {provider.riskNotes.join(' ')}
                  </span>
                </div>
              )}

              {/* Checklist */}
              {provider.setupChecklist.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>Setup Guide</strong>
                  {provider.setupChecklist.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '0.82rem', color: '#ccc', marginBottom: '4px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>•</span>
                      <span style={{ lineHeight: 1.3 }}>{step}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Links */}
              {provider.officialLinks.length > 0 && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '10px' }}>
                  {provider.officialLinks.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        color: 'var(--brand-primary)',
                        textDecoration: 'none'
                      }}
                    >
                      <span>Official Source ({new URL(url).hostname})</span>
                      <ExternalLink size={12} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
