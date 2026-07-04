import React, { useState, useEffect } from 'react';
import { 
  loadDismissedImports, 
  dismissImport, 
  resetDismissedImports 
} from '../../modules/toolkit/manualImportQueueStore.js';
import { loadLedger, saveRecord } from '../../modules/toolkit/importApprovalLedgerStore.js';
import { ShieldAlert, Info, AlertTriangle, ArrowRight, EyeOff, RefreshCw } from 'lucide-react';

export default function ManualImportQueuePanel({ setViewMode, setToolkitSubTab }) {
  const [stagedFiles, setStagedFiles] = useState([]);
  const [dismissedList, setDismissedList] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStagedFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/toolkit/staging`);
      const data = await res.json();
      if (res.ok) {
        setStagedFiles(data.stagedFiles || []);
      } else {
        setError(data.error || 'Failed to list staged files.');
      }
    } catch (err) {
      console.error(err);
      setError('Failed to reach backend staging API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setDismissedList(loadDismissedImports());
    setLedger(loadLedger());
    fetchStagedFiles();
  }, []);

  const handleDismiss = (filename) => {
    const updated = dismissImport(filename);
    setDismissedList(updated);
  };

  const handleResetDismissed = () => {
    if (window.confirm("Are you sure you want to show all previously dismissed staged files?")) {
      const updated = resetDismissedImports();
      setDismissedList(updated);
    }
  };

  const handleCreateReviewRecord = (file) => {
    try {
      const updatedLedger = saveRecord({
        filename: file.filename,
        sanitizedPath: file.sanitizedPath || `[IMPORT_STAGING]/${file.filename}`,
        detectedCategory: file.detectedCategory,
        riskCategory: file.riskCategory,
        suggestedLicenseStatus: file.suggestedLicenseStatus || 'unknown',
        matchConfidence: file.matchConfidence || 'none',
        operatorDecision: 'pending',
        operatorVerifiedSource: false
      });
      setLedger(updatedLedger);
    } catch (e) {
      alert(e.message);
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const visibleFiles = stagedFiles.filter(f => !dismissedList.includes(f.filename));

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Manual Import Workflow
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            Verify licensing compliance and manually import staged documents into your offline reference library.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-tactical-outline" onClick={fetchStagedFiles} disabled={loading} style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh list</span>
          </button>
          <button className="btn-tactical-outline" onClick={handleResetDismissed} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Restore Dismissed
          </button>
        </div>
      </div>

      {/* Warning Box */}
      <div style={{ backgroundColor: 'rgba(255, 69, 0, 0.03)', border: '1px solid rgba(255, 69, 0, 0.2)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#ff7f50', fontSize: '0.92rem', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ShieldAlert size={16} />
          Safety Isolation
        </h4>
        <p style={{ margin: 0, fontSize: '0.82rem', color: '#ccc', lineHeight: 1.4 }}>
          <strong>SurvivalOS does not auto-move, auto-delete, or auto-index staged files.</strong> Files inside `import-staging/offline-library/` are cataloged as metadata only. Read-only checks are enforced; file contents are never parsed.
        </p>
      </div>

      {/* Manual Steps Guidance */}
      <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Info size={16} style={{ color: 'var(--brand-primary)' }} />
          Step-by-Step Import Instructions
        </h4>
        <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '0.85rem', color: '#bbb', lineHeight: '1.4' }}>
          <li style={{ marginBottom: '6px' }}>Verify the document license clearance status in the checklist below.</li>
          <li style={{ marginBottom: '6px' }}>Copy the file manually from `import-staging/offline-library/` to your configured materials directory.</li>
          <li style={{ marginBottom: '6px' }}>Click <strong style={{ color: 'var(--brand-primary)', cursor: 'pointer' }} onClick={() => setViewMode('index-integrity')}>Go to Index Integrity</strong> to rebuild your materials manifest so J.A.R.V.I.S. and search can detect the new file.</li>
          <li>Once finished, manually delete the staged copy from the staging folder or dismiss it from this UI.</li>
        </ol>
      </div>

      {/* Visible staging files */}
      <div>
        <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 12px 0' }}>Staged Files Queue ({visibleFiles.length})</h4>
        
        {error && (
          <div style={{ color: '#ff4500', fontSize: '0.85rem', marginBottom: '16px' }}>{error}</div>
        )}

        {visibleFiles.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {visibleFiles.map((file, idx) => {
              const hasRisk = file.riskCategory !== null;
              const isRestricted = file.suggestedLicenseStatus === 'restricted';
              const existingRecord = ledger.find(r => r.filename === file.filename);
              return (
                <div 
                  key={idx} 
                  style={{
                    backgroundColor: '#12151c',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    padding: '16px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '0.98rem', display: 'block' }}>{file.filename}</strong>
                      <span style={{ fontSize: '0.78rem', color: '#888' }}>
                        Size: {formatSize(file.size)} | Path: <span style={{ color: '#ccc' }}>{file.sanitizedPath}</span>
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {existingRecord ? (
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <span style={{ fontSize: '0.78rem', color: '#00ff7f', fontWeight: 'bold' }}>
                            Operator-approved record exists.
                          </span>
                          <button 
                            className="btn-tactical" 
                            onClick={() => setToolkitSubTab('ledger')}
                            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          >
                            Open Approval Ledger
                          </button>
                        </div>
                      ) : (
                        <button 
                          className="btn-tactical" 
                          onClick={() => handleCreateReviewRecord(file)}
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                        >
                          Create Review Record
                        </button>
                      )}
                      <button 
                        className="btn-tactical-outline" 
                        onClick={() => handleDismiss(file.filename)}
                        style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <EyeOff size={14} />
                        <span>Dismiss</span>
                      </button>
                    </div>
                  </div>

                  {/* Metadata Indicators */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginTop: '12px', fontSize: '0.82rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                    <div><strong>Detected Category:</strong> {file.detectedCategory.replace(/_/g, ' ')}</div>
                    <div>
                      <strong>License Status:</strong>{' '}
                      <span style={{ color: '#ffd700', fontWeight: 'bold' }}>
                        {file.licenseStatus.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <strong>Suggested License:</strong>{' '}
                      <span style={{ 
                        color: isRestricted ? '#ff4500' : file.suggestedLicenseStatus === 'official_free' || file.suggestedLicenseStatus === 'public_domain' ? '#00ff7f' : '#ffd700',
                        fontWeight: 'bold'
                      }}>
                        {(file.suggestedLicenseStatus || 'unknown').toUpperCase()}
                      </span>
                    </div>
                    <div><strong>Verification Status:</strong> <span style={{ color: '#ffd700' }}>{file.verificationStatus.replace(/_/g, ' ').toUpperCase()}</span></div>
                    <div><strong>Match Confidence:</strong> {(file.matchConfidence || '').replace(/_/g, ' ')}</div>
                  </div>

                  {/* License Safety Wording Banner */}
                  <div style={{ marginTop: '12px', fontSize: '0.8rem', color: '#ff7f50', backgroundColor: 'rgba(255, 69, 0, 0.02)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid #ff7f50', lineHeight: '1.3' }}>
                    💡 Suggested license status is based on filename/audit metadata only. The operator must verify the file came from the official source before moving it into materials.
                  </div>

                  {/* Risk Disclaimer */}
                  {hasRisk && (
                    <div style={{ marginTop: '12px', display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'rgba(255, 69, 0, 0.04)', borderRadius: '4px', border: '1px solid rgba(255, 69, 0, 0.2)' }}>
                      <AlertTriangle size={16} style={{ color: '#ff4500', flexShrink: 0, marginTop: '2px' }} />
                      <span style={{ fontSize: '0.78rem', color: '#ff7f50', lineHeight: 1.3 }}>
                        ⚠️ Warning: Contains {file.riskCategory.replace(/_/g, ' ')} reference materials. Content is advisory only; do not attempt self-treatment or hazardous operations without formal offline training.
                      </span>
                    </div>
                  )}

                  {/* Manual guidance indicator */}
                  <div style={{ marginTop: '12px', fontSize: '0.78rem', color: '#888', fontStyle: 'italic' }}>
                    *Dismissing from view hides this entry in SOS but does not delete files from disk.
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', backgroundColor: '#12151c', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)', color: '#888', fontSize: '0.9rem' }}>
            No staged files detected in `import-staging/offline-library/`. Copy documents there to stage them.
          </div>
        )}
      </div>
    </div>
  );
}
