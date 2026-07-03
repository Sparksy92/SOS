import React, { useState } from 'react';
import { 
  Activity, 
  RefreshCw, 
  ShieldAlert, 
  Info,
  X
} from 'lucide-react';

export default function CrawlerControls({ 
  crawlerStatus, 
  API_BASE 
}) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [typedConfirm, setTypedConfirm] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const triggerSync = async (mode) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/crawler/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server error triggering sync.');
      }
      setSuccessMessage(`Sync initiated successfully: ${mode.toUpperCase()} MODE.`);
      if (mode === 'deep') {
        setShowConfirm(false);
        setTypedConfirm('');
      }
    } catch (e) {
      setErrorMessage(e.message);
    }
  };

  const handleRebuildSubmit = (e) => {
    e.preventDefault();
    if (typedConfirm !== 'REBUILD INDEX') {
      setErrorMessage('Confirmation string mismatch. Rebuild aborted.');
      return;
    }
    triggerSync('deep');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '700px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="category-header">
        <h2 className="category-title" style={{ letterSpacing: '2px', margin: 0 }}>INDEX & SYNC LOGISTICS</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          MANAGE Quick Synchronizations and Full Database Index Rebuilds
        </div>
      </div>

      {/* Status Details */}
      {crawlerStatus && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: crawlerStatus.isCrawling ? 'var(--brand-primary)' : 'var(--text-muted)', animation: crawlerStatus.isCrawling ? 'spin 4s linear infinite' : 'none' }} />
            SYNC STATUS MONITOR
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>CRAWLER SYNC STATE:</span>
              <span style={{ color: crawlerStatus.isCrawling ? 'var(--brand-primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                {crawlerStatus.isCrawling ? 'RUNNING (READ-ONLY SCAN)' : 'STANDBY IDLE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>STATUS TEXT:</span>
              <span>{crawlerStatus.statusText.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>DOCUMENTS SYNCED:</span>
              <span>{crawlerStatus.processedDocs} / {crawlerStatus.totalDocs} FILES</span>
            </div>
            {crawlerStatus.totalZips > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>ZIPS EXTRACTED:</span>
                <span>{crawlerStatus.processedZips} / {crawlerStatus.totalZips} ARCHIVES</span>
              </div>
            )}
            {crawlerStatus.isCrawling && crawlerStatus.currentFile && crawlerStatus.currentFile !== 'None' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>CURRENT RESOLVING FILE:</span>
                <span style={{ color: 'var(--text-main)', fontSize: '0.8rem', wordBreak: 'break-all' }}>{crawlerStatus.currentFile}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs/Feedback Banners */}
      {errorMessage && (
        <div className="glass-panel" style={{ padding: '16px', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
          <strong>ERROR:</strong> {errorMessage.toUpperCase()}
        </div>
      )}
      {successMessage && (
        <div className="glass-panel" style={{ padding: '16px', borderColor: '#00ff66', color: '#00ff66', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
          {successMessage.toUpperCase()}
        </div>
      )}

      {/* Action Buttons */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
          AVAILABLE COMMAND OPERATIONS
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          {/* Quick Sync */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button 
              className="btn-tactical" 
              onClick={() => triggerSync('quick')}
              disabled={crawlerStatus?.isCrawling}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '0.9rem' }}
            >
              <RefreshCw size={16} /> QUICK SYSTEM SYNC (INCREMENTAL)
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Scans directory layout for new or altered documents and indexes them. Skips already indexed files instantly. Safe to run.
            </span>
          </div>

          {/* Rebuild Search Index */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            <button 
              className="btn-tactical" 
              onClick={() => setShowConfirm(true)}
              disabled={crawlerStatus?.isCrawling}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', fontSize: '0.9rem', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
            >
              <ShieldAlert size={16} /> REBUILD SEARCH INDEX
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Wipes SQLite FTS5 index tables and starts a full rescan of all local documents page-by-page. Backups are automatically created on the server first.
            </span>
          </div>

        </div>
      </div>

      {/* Safety info note */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '10px' }}>
        <Info size={20} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          <strong>INDEX REBUILD GUARANTEE:</strong> Crawler operations run in a 100% read-only state. Under no circumstances will rebuilding indexes alter, delete, or rename original documents in your 500GB+ survival knowledge library.
        </div>
      </div>

      {/* Typed Confirmation Overlay Modal */}
      {showConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 20000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', border: '1px solid var(--brand-danger)', boxShadow: 'var(--glow-danger)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 0, 0, 0.2)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--brand-danger)', fontSize: '1.1rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> CONFIRM SEARCH INDEX REBUILD
              </h3>
              <button className="btn-tactical" onClick={() => setShowConfirm(false)} style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
              You are about to rebuild the database search index. This clears active text caches and rescans all local files. 
              <strong style={{ color: 'var(--brand-danger)', display: 'block', marginTop: '6px' }}>
                WARNING: On 500GB+ libraries, this full-text parse (FTS5) can take several hours depending on CPU speeds.
              </strong>
            </p>

            <form onSubmit={handleRebuildSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                  TYPE <span style={{ color: 'var(--brand-danger)', fontWeight: 'bold' }}>REBUILD INDEX</span> TO AUTHORIZE OPERATION:
                </label>
                <input 
                  type="text" 
                  className="search-input glass-panel" 
                  style={{ width: '100%', padding: '10px', fontSize: '1rem', textAlign: 'center', border: '1px solid var(--brand-danger)' }}
                  required
                  value={typedConfirm}
                  onChange={e => setTypedConfirm(e.target.value)}
                  placeholder="REBUILD INDEX"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn-tactical" onClick={() => setShowConfirm(false)}>
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  className="btn-tactical" 
                  disabled={typedConfirm !== 'REBUILD INDEX'}
                  style={{ backgroundColor: 'var(--brand-danger)', color: 'white', borderColor: 'var(--brand-danger)' }}
                >
                  AUTHORIZE REBUILD
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
