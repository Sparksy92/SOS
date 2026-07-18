import React, { useState, useEffect } from 'react';
import { Database, Search, FolderOpen, AlertTriangle, Play, HelpCircle } from 'lucide-react';
import { API_BASE } from '../../config.js';

export default function ZimCatalogPanel() {
  const [folderPath, setFolderPath] = useState(() => {
    return localStorage.getItem('sos_zim_folder_path') || '';
  });
  const [zimData, setZimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ZIM Engine Process management states
  const [engineStatus, setEngineStatus] = useState({ installed: false, running: false, port: 3008 });
  const [activeArchive, setActiveArchive] = useState(null);
  const [viewerUrl, setViewerUrl] = useState(null);
  const [launching, setLaunching] = useState(false);

  const fetchZimCatalog = async (customPath = folderPath) => {
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE}/api/toolkit/zim${customPath ? `?folder=${encodeURIComponent(customPath)}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setZimData(data);
        if (customPath) {
          localStorage.setItem('sos_zim_folder_path', customPath);
        }
      } else {
        setError(data.error || 'Failed to scan directory.');
        setZimData(null);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to reach backend server.');
      setZimData(null);
    } finally {
      setLoading(false);
    }
  };

  const checkEngineStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/toolkit/zim/status`);
      const data = await res.json();
      setEngineStatus(data);
    } catch (err) {
      console.error("Failed to check ZIM engine status:", err);
    }
  };

  useEffect(() => {
    fetchZimCatalog();
    checkEngineStatus();

    // Cleanup: Make sure to stop the kiwix-serve backend server if the panel unmounts
    return () => {
      fetch(`${API_BASE}/api/toolkit/zim/stop`, { method: 'POST' }).catch(() => {});
    };
  }, []);

  const handleScanClick = () => {
    fetchZimCatalog(folderPath);
  };

  const handleResetClick = () => {
    setFolderPath('');
    localStorage.removeItem('sos_zim_folder_path');
    fetchZimCatalog('');
  };

  const handleLaunch = async (archive) => {
    setLaunching(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/toolkit/zim/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: archive.filename })
      });
      const data = await res.json();
      if (data.success) {
        setViewerUrl(data.url);
        setActiveArchive(archive);
        setEngineStatus(prev => ({ ...prev, running: true }));
      } else {
        setError(data.error || 'Failed to launch ZIM archive.');
      }
    } catch (err) {
      console.error(err);
      setError('Connection to launcher endpoint failed.');
    } finally {
      setLaunching(false);
    }
  };

  const handleClose = async () => {
    try {
      await fetch(`${API_BASE}/api/toolkit/zim/stop`, { method: 'POST' });
    } catch (err) {
      console.error(err);
    }
    setViewerUrl(null);
    setActiveArchive(null);
    setEngineStatus(prev => ({ ...prev, running: false }));
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 1. Embedded Viewer Mode Render
  if (activeArchive && viewerUrl) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '80vh', border: '1px solid var(--border-subtle)', borderRadius: '8px', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#12151c', padding: '12px 20px', borderBottom: '1px solid var(--border-strong)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Database size={18} style={{ color: 'var(--brand-primary)' }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--brand-primary)', fontWeight: 'bold', letterSpacing: '1px' }}>
              EMBEDDED KIWIX WEB SERVER: {activeArchive.title.toUpperCase()}
            </span>
          </div>
          <button 
            type="button" 
            className="btn-tactical-outline" 
            onClick={handleClose}
            style={{ padding: '6px 12px', fontSize: '0.8rem', color: 'var(--brand-danger)', borderColor: 'var(--brand-danger)' }}
          >
            CLOSE ARCHIVE (STOP SERVER)
          </button>
        </div>
        <iframe 
          src={viewerUrl}
          title="Kiwix ZIM Reader"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          style={{ width: '100%', flex: 1, border: 'none', backgroundColor: '#ffffff' }}
        />
      </div>
    );
  }

  // 2. Standard Catalog/Configuration List Render
  return (
    <div style={{ color: '#e0e0e0', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Kiwix ZIM Catalog
        </h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
          Scan and mount Kiwix ZIM archives locally. Start a server back-end to read full wikis and references directly inside the app.
        </p>
      </div>

      {/* ZIM engine warning if missing */}
      {!engineStatus.installed && (
        <div style={{ display: 'flex', gap: '12px', padding: '16px', backgroundColor: 'rgba(255, 183, 0, 0.04)', borderRadius: '6px', border: '1px solid rgba(255, 183, 0, 0.2)', marginBottom: '24px', color: 'var(--text-main)', fontSize: '0.88rem', lineHeight: '1.5' }}>
          <HelpCircle size={22} style={{ flexShrink: 0, color: 'var(--brand-primary)' }} />
          <div>
            <strong style={{ color: 'var(--brand-primary)' }}>Embedded ZIM Reader Engine (Kiwix) Not Detected</strong>
            <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
              To search and view `.zim` encyclopedias directly inside this tab, please install `kiwix-tools` on your host Linux Mint system:
            </div>
            <code style={{ display: 'block', marginTop: '8px', padding: '6px 10px', backgroundColor: '#090a0f', border: '1px solid var(--border-subtle)', borderRadius: '4px', fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)' }}>
              sudo apt install kiwix-tools
            </code>
          </div>
        </div>
      )}

      {/* Directory configuration inputs */}
      <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff' }}>Configure ZIM Storage Path</h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <FolderOpen size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              type="text"
              placeholder="e.g. /media/storage/kiwix"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              className="search-input glass-panel"
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                fontSize: '0.9rem',
                boxSizing: 'border-box'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={handleScanClick} disabled={loading} style={{ padding: '0 20px', height: '40px' }}>
              {loading ? 'Scanning...' : 'Scan Directory'}
            </button>
            <button className="btn-tactical-outline" onClick={handleResetClick} disabled={loading} style={{ padding: '0 16px', height: '40px' }}>
              Reset Path
            </button>
          </div>
        </div>
        <p style={{ margin: '8px 0 0 0', fontSize: '0.78rem', color: '#888', lineHeight: '1.3' }}>
          Backend scan path is controlled by SOS_ZIM_DIR or the default import-staging/kiwix folder. The path shown here is an operator note only and is not sent to the server.
        </p>
      </div>

      {error && (
        <div style={{ display: 'flex', gap: '8px', padding: '12px', backgroundColor: 'rgba(255, 69, 0, 0.05)', borderRadius: '6px', border: '1px solid rgba(255, 69, 0, 0.2)', marginBottom: '24px', color: '#ff7f50', fontSize: '0.85rem' }}>
          <AlertTriangle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {/* Security Boundary Warning */}
      <div style={{ backgroundColor: 'rgba(0, 242, 254, 0.02)', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '6px', padding: '12px', marginBottom: '24px', fontSize: '0.82rem', color: '#bbb' }}>
        <strong>Boundary Check:</strong> ZIM content is dynamically hosted on port `3008` in a local background sandbox. Zero parsing overhead is added to the database.
      </div>

      {/* Archives Catalog List */}
      <div>
        <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 12px 0' }}>Detected ZIM Archives</h4>
        {zimData && zimData.archives && zimData.archives.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {zimData.archives.map((archive, idx) => (
              <div 
                key={idx} 
                style={{
                  backgroundColor: '#12151c',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between'
                }}
              >
                <div>
                  <h5 style={{ margin: '0 0 4px 0', fontSize: '1.05rem', color: '#fff' }}>
                    {archive.title}
                  </h5>
                  <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    Language: {archive.language.toUpperCase()}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '4px' }}>
                    <strong>File Name:</strong> {archive.filename}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginBottom: '4px' }}>
                    <strong>Size:</strong> {formatSize(archive.size)}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#888', fontStyle: 'italic', wordBreak: 'break-all' }}>
                    <strong>Sanitized Path:</strong> {archive.path}
                  </div>
                </div>

                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                  {engineStatus.installed ? (
                    <button
                      type="button"
                      className="btn-tactical"
                      disabled={launching}
                      onClick={() => handleLaunch(archive)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '8px 12px', fontSize: '0.85rem' }}
                    >
                      <Play size={14} fill="currentColor" />
                      {launching ? 'LAUNCHING...' : 'LAUNCH WEB READER'}
                    </button>
                  ) : (
                    <div style={{ fontSize: '0.78rem', color: 'var(--brand-primary)', backgroundColor: 'var(--brand-primary-dim)', padding: '6px 10px', borderRadius: '4px' }}>
                      💡 Install `kiwix-tools` to unlock in-app reading.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#12151c', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
            <Database size={32} style={{ color: '#555', marginBottom: '12px' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#888' }}>
              No .zim files found. Configure a path or place ZIM files in `import-staging/kiwix/` and scan.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
