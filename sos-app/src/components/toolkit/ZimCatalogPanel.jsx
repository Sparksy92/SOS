import React, { useState, useEffect } from 'react';
import { Database, Search, FolderOpen, AlertTriangle } from 'lucide-react';
import { API_BASE } from '../../config.js';

export default function ZimCatalogPanel() {
  const [folderPath, setFolderPath] = useState(() => {
    return localStorage.getItem('sos_zim_folder_path') || '';
  });
  const [zimData, setZimData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetchZimCatalog();
  }, []);

  const handleScanClick = () => {
    fetchZimCatalog(folderPath);
  };

  const handleResetClick = () => {
    setFolderPath('');
    localStorage.removeItem('sos_zim_folder_path');
    fetchZimCatalog('');
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Kiwix ZIM Catalog
        </h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
          Lightweight metadata-only scanner for Kiwix ZIM archives. Kiwix allows browsing rich wikis and reference catalogs offline.
        </p>
      </div>

      {/* Directory configuration inputs */}
      <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff' }}>Configure ZIM Storage Path</h4>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <FolderOpen size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
            <input
              type="text"
              placeholder="e.g. C:/Users/Blair/Downloads/Kiwix"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                backgroundColor: '#161a22',
                border: '1px solid rgba(0, 242, 254, 0.3)',
                borderRadius: '4px',
                color: '#fff',
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
        <strong>Boundary Check:</strong> SurvivalOS only lists available archives. ZIM file contents are NOT opened or indexed by this application.
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

                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)', fontSize: '0.78rem', color: '#00ff7f', backgroundColor: 'rgba(0, 255, 127, 0.03)', padding: '6px 10px', borderRadius: '4px' }}>
                  💡 Open this archive inside your standalone Kiwix reader app to search full text articles.
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
