import React, { useState } from 'react';
import { 
  Activity, 
  RefreshCw, 
  ShieldAlert, 
  Info,
  X,
  FileText,
  Archive,
  Eye,
  CheckSquare
} from 'lucide-react';

export default function CrawlerControls({ 
  crawlerStatus, 
  API_BASE 
}) {
  const [typedConfirm, setTypedConfirm] = useState('');
  const [typedZipConfirm, setTypedZipConfirm] = useState('');
  const [showRebuildConfirm, setShowRebuildConfirm] = useState(false);
  const [showZipConfirm, setShowZipConfirm] = useState(false);
  
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const triggerSync = async (mode, extraParams = {}) => {
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch(`${API_BASE}/api/crawler/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, ...extraParams })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Server error triggering crawler operation.');
      }
      
      let modeText = mode.toUpperCase();
      if (extraParams.dryRun) modeText += ' (DRY RUN)';
      if (extraParams.rebuild) modeText += ' (REBUILD)';
      
      setSuccessMessage(`Crawler execution started: ${modeText} mode.`);
      
      // Close modals
      setShowRebuildConfirm(false);
      setShowZipConfirm(false);
      setTypedConfirm('');
      setTypedZipConfirm('');
    } catch (e) {
      setErrorMessage(e.message);
    }
  };

  const handleRebuildSubmit = (e) => {
    e.preventDefault();
    if (typedConfirm !== 'REBUILD INDEX') {
      setErrorMessage('Confirmation mismatch. Rebuild aborted.');
      return;
    }
    triggerSync('index', { rebuild: true });
  };

  const handleZipSubmit = (e) => {
    e.preventDefault();
    if (typedZipConfirm !== 'EXTRACT ZIP ARCHIVES') {
      setErrorMessage('Confirmation mismatch. ZIP extraction aborted.');
      return;
    }
    triggerSync('extract-zips', { confirmation: 'EXTRACT ZIP ARCHIVES' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '750px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="category-header">
        <h2 className="category-title" style={{ letterSpacing: '2px', margin: 0 }}>OFFLINE CRAWLER & ARCHIVE COMMANDS</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          Execute safe inventory scanning, index local reference chunks, or authorize secure ZIP extractions.
        </div>
      </div>

      {/* Status Details */}
      {crawlerStatus && (
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity size={18} style={{ color: crawlerStatus.isCrawling ? 'var(--brand-primary)' : 'var(--text-muted)', animation: crawlerStatus.isCrawling ? 'spin 4s linear infinite' : 'none' }} />
            SYSTEM ACTIVITY MONITOR
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>CRAWLER STATUS:</span>
              <span style={{ color: crawlerStatus.isCrawling ? '#00ff66' : 'var(--text-muted)', fontWeight: 'bold' }}>
                {crawlerStatus.isCrawling ? `ACTIVE [${crawlerStatus.mode?.toUpperCase()}]` : 'STANDBY IDLE'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>DIAGNOSTIC STATUS:</span>
              <span>{crawlerStatus.statusText.toUpperCase()}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>DOCUMENTS RESOLVED:</span>
              <span>{crawlerStatus.processedDocs} / {crawlerStatus.totalDocs} FILES</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>ZIP EXTRACTIONS:</span>
              <span>{crawlerStatus.processedZips} / {crawlerStatus.totalZips} ARCHIVES</span>
            </div>
            {crawlerStatus.dryRunZips && crawlerStatus.dryRunZips.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ color: 'var(--brand-primary)', fontSize: '0.75rem' }}>DRY RUN ZIP ARCHIVES DISCOVERED:</span>
                <div style={{ maxHeight: '80px', overflowY: 'auto', padding: '6px', backgroundColor: 'rgba(0,0,0,0.2)', fontSize: '0.7rem' }}>
                  {crawlerStatus.dryRunZips.map((z, idx) => (
                    <div key={idx}>• {z}</div>
                  ))}
                </div>
              </div>
            )}
            {crawlerStatus.isCrawling && crawlerStatus.currentFile && crawlerStatus.currentFile !== 'None' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ color: 'var(--text-muted)' }}>RESOLVING TARGET:</span>
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
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
          CONTROL OPERATIONS
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          
          {/* Action 1: Refresh Manifest */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <button 
              className="btn-tactical" 
              onClick={() => triggerSync('inventory')}
              disabled={crawlerStatus?.isCrawling}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '0.85rem' }}
            >
              <RefreshCw size={14} /> Refresh Manifest / Inventory Scan
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Performs a lightweight directory scan to catalog documents and rebuild the manifest cache. <strong>Does not index text pages or extract ZIPs.</strong> Fully safe and fast.
            </span>
          </div>

          {/* Action 2: Index Library */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-tactical" 
                onClick={() => triggerSync('index')}
                disabled={crawlerStatus?.isCrawling}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '0.85rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
              >
                <FileText size={14} /> Index Local Library
              </button>
              
              <button 
                className="btn-tactical" 
                onClick={() => setShowRebuildConfirm(true)}
                disabled={crawlerStatus?.isCrawling}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '0.85rem', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
              >
                <ShieldAlert size={14} /> FULL REBUILD INDEX
              </button>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Parses local reference documents page-by-page to generate text RAG chunks for J.A.R.V.I.S. Chat. <strong>Does not extract zips.</strong> Deep Rebuild wipes database chunks first.
            </span>
          </div>

          {/* Action 3: ZIP Dry Run */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '16px' }}>
            <button 
              className="btn-tactical" 
              onClick={() => triggerSync('extract-zips', { dryRun: true })}
              disabled={crawlerStatus?.isCrawling}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '0.85rem', borderColor: '#00e5ff', color: '#00e5ff' }}
            >
              <Eye size={14} /> ZIP Extraction Dry Run
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Scans your library folder for unextracted ZIP packages and returns their filenames. <strong>Does not extract or move anything.</strong> Use this to preview potential disk usage.
            </span>
          </div>

          {/* Action 4: ZIP Extraction */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button 
              className="btn-tactical" 
              onClick={() => setShowZipConfirm(true)}
              disabled={crawlerStatus?.isCrawling}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '12px', fontSize: '0.85rem', borderColor: '#ffea00', color: '#ffea00' }}
            >
              <Archive size={14} /> Extract ZIP Archives
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
              Extracts discovered ZIP packages into their respective subdirectories and archives original ZIP files to prevent reprocessing. <strong>Consumes disk space and CPU. Requires typed authorization.</strong>
            </span>
          </div>

        </div>
      </div>

      {/* Safety info note */}
      <div className="glass-panel" style={{ padding: '16px', display: 'flex', gap: '10px' }}>
        <Info size={20} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          <strong>CRAWLER PRINCIPLES:</strong> All crawl operations run completely offline and local-first on your machine. We never communicate with external servers, cloud databases, or telemetry metrics. ZIP extraction and index building are strictly user-triggered.
        </div>
      </div>

      {/* Rebuild Confirmation overlay */}
      {showRebuildConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 20000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', border: '1px solid var(--brand-danger)', boxShadow: 'var(--glow-danger)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 0, 0, 0.2)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--brand-danger)', fontSize: '1.1rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} /> CONFIRM DATABASE REBUILD
              </h3>
              <button className="btn-tactical" onClick={() => setShowRebuildConfirm(false)} style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
              This will wipe the current local index tables. A full rescan of all local manual files page-by-page will be initiated. 
              <strong style={{ color: 'var(--brand-danger)', display: 'block', marginTop: '6px' }}>
                WARNING: On large libraries (500GB+), parsing text and extracting structures can take several hours depending on CPU hardware.
              </strong>
            </p>

            <form onSubmit={handleRebuildSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                  TYPE <span style={{ color: 'var(--brand-danger)', fontWeight: 'bold' }}>REBUILD INDEX</span> TO AUTHORIZE:
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
                <button type="button" className="btn-tactical" onClick={() => setShowRebuildConfirm(false)}>
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

      {/* ZIP Extraction Confirmation overlay */}
      {showZipConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 20000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '440px', padding: '24px', border: '1px solid #ffea00', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255, 234, 0, 0.2)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: '#ffea00', fontSize: '1.1rem', letterSpacing: '1px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Archive size={18} /> AUTHORIZE ZIP EXTRACTION
              </h3>
              <button className="btn-tactical" onClick={() => setShowZipConfirm(false)} style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
              You are authorizing the system to expand archive packages. This scans for raw `.zip` files, extracts them, and archives the original zips.
              <strong style={{ color: '#ffea00', display: 'block', marginTop: '6px' }}>
                WARNING: ZIP expansion consumes disk space. Ensure you have sufficient local storage before starting.
              </strong>
            </p>

            <form onSubmit={handleZipSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
                  TYPE <span style={{ color: '#ffea00', fontWeight: 'bold' }}>EXTRACT ZIP ARCHIVES</span> TO AUTHORIZE:
                </label>
                <input 
                  type="text" 
                  className="search-input glass-panel" 
                  style={{ width: '100%', padding: '10px', fontSize: '1rem', textAlign: 'center', border: '1px solid #ffea00' }}
                  required
                  value={typedZipConfirm}
                  onChange={e => setTypedZipConfirm(e.target.value)}
                  placeholder="EXTRACT ZIP ARCHIVES"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn-tactical" onClick={() => setShowZipConfirm(false)}>
                  CANCEL
                </button>
                <button 
                  type="submit" 
                  className="btn-tactical" 
                  disabled={typedZipConfirm !== 'EXTRACT ZIP ARCHIVES'}
                  style={{ backgroundColor: '#ffea00', color: 'black', borderColor: '#ffea00' }}
                >
                  EXTRACT ARCHIVES
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
