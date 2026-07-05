import React, { useState, useEffect } from 'react';
import { 
  createOfflineToolkitBackup, 
  validateOfflineToolkitBackup, 
  previewOfflineToolkitBackup, 
  restoreOfflineToolkitBackup, 
  generateOfflineToolkitBackupMarkdown, 
  runOfflineToolkitIntegrityAudit,
  resetOfflineToolkitProfile,
  loadOfflineToolkitDemoData
} from '../../modules/toolkit/offlineToolkitBackupStore.js';
import { ShieldAlert, Download, RefreshCw, AlertTriangle, FileText, CheckCircle, XCircle } from 'lucide-react';

export default function OfflineToolkitBackupPanel({ setToolkitSubTab, setViewMode }) {
  const [auditReport, setAuditReport] = useState(null);
  const [importText, setImportText] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [restoreMode, setRestoreMode] = useState('merge'); // 'merge' or 'replace_known_keys'
  const [typedConfirm, setTypedConfirm] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [demoConfirm, setDemoConfirm] = useState('');
  const [ignoreUnknown, setIgnoreUnknown] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const handleResetProfile = () => {
    try {
      resetOfflineToolkitProfile(resetConfirm);
      showStatus("Local profile storage keys reset successfully.", "success");
      setResetConfirm('');
      handleRunAudit();
    } catch (e) {
      showStatus(e.message, "error");
    }
  };

  const handleLoadDemoData = () => {
    try {
      loadOfflineToolkitDemoData(demoConfirm);
      showStatus("Mock demo data loaded successfully.", "success");
      setDemoConfirm('');
      handleRunAudit();
    } catch (e) {
      showStatus(e.message, "error");
    }
  };

  const showStatus = (text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: '', type: '' });
    }, 5000);
  };

  const handleCreateBackup = () => {
    try {
      const backup = createOfflineToolkitBackup();
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backup, null, 2));
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `sos_toolkit_backup_${new Date().toISOString().split('T')[0]}.json`);
      dlAnchorElem.click();
      showStatus("Local JSON backup file generated and downloaded successfully.", "success");
    } catch (e) {
      showStatus(e.message, "error");
    }
  };

  const handleExportSummary = () => {
    try {
      const backup = createOfflineToolkitBackup();
      const md = generateOfflineToolkitBackupMarkdown(backup);
      const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
      const dlAnchorElem = document.createElement('a');
      dlAnchorElem.setAttribute("href", dataStr);
      dlAnchorElem.setAttribute("download", `sos_backup_summary_${new Date().toISOString().split('T')[0]}.md`);
      dlAnchorElem.click();
      showStatus("Markdown summary exported successfully.", "success");
    } catch (e) {
      showStatus(e.message, "error");
    }
  };

  const handlePreviewImport = () => {
    if (!importText.trim()) {
      showStatus("Please paste a JSON backup payload first.", "error");
      return;
    }
    const preview = previewOfflineToolkitBackup(importText, { ignoreUnknown });
    setPreviewData(preview);
    if (preview.dangerousValuesBlocked) {
      showStatus("Validation failed: Dangerous URLs, script blocks, or absolute paths detected.", "error");
    } else {
      showStatus("Backup validated. Preview generated below.", "success");
    }
  };

  const handleRestore = () => {
    if (!previewData || previewData.dangerousValuesBlocked) {
      showStatus("Please validate a clean backup payload before executing restore.", "error");
      return;
    }
    try {
      if (restoreMode === 'replace_known_keys') {
        if (typedConfirm !== 'RESTORE TOOLKIT BACKUP') {
          showStatus("Type confirmation phrase 'RESTORE TOOLKIT BACKUP' exactly to replace records.", "error");
          return;
        }
      }
      
      restoreOfflineToolkitBackup(importText, { mode: restoreMode, typedConfirm, ignoreUnknown });
      showStatus("Toolkit backup restored successfully.", "success");
      setImportText('');
      setPreviewData(null);
      setTypedConfirm('');
      handleRunAudit();
    } catch (e) {
      showStatus(e.message, "error");
    }
  };

  const handleRunAudit = () => {
    const report = runOfflineToolkitIntegrityAudit();
    setAuditReport(report);
  };

  useEffect(() => {
    handleRunAudit();
  }, []);

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '1200px', margin: '0 auto', padding: '0 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Offline Toolkit Backup & Audit
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            Create local state JSON backups, preview restore options, and run configuration integrity audits.
          </p>
        </div>
      </div>

      {/* Safety alert */}
      <div style={{ backgroundColor: 'rgba(255, 69, 0, 0.04)', border: '1px solid rgba(255, 69, 0, 0.25)', borderRadius: '6px', padding: '14px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4500', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px' }}>
          <ShieldAlert size={16} />
          <span>Local Storage Configuration Boundaries</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#b0b0b0', lineHeight: '1.4' }}>
          SurvivalOS does not support S3 cloud sync, remote backups, S3 integrations, or automated server-side file replication. Material files (PDF, ZIM, EPUB) and media blobs are not included in local configuration backups.
        </p>
      </div>

      {statusMessage.text && (
        <div style={{
          padding: '10px 14px',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '0.85rem',
          backgroundColor: statusMessage.type === 'error' ? 'rgba(255, 69, 0, 0.1)' : 'rgba(0, 255, 127, 0.1)',
          border: `1px solid ${statusMessage.type === 'error' ? '#ff4500' : '#00ff7f'}`,
          color: statusMessage.type === 'error' ? '#ff7f50' : '#00ff7f'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Two Column Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
        {/* Left: Create Backup & Integrity Audit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Create Backup */}
          <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: '#fff' }}>Create Toolkit Backup</h4>
            <p style={{ margin: '0 0 16px 0', fontSize: '0.8rem', color: '#aaa', lineHeight: 1.3 }}>
              Generate a local configuration state file. This protects setup wizard steps, checklist flags, ledger reviews, allowlists, and active mission settings.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-tactical" onClick={handleCreateBackup}>
                Create Local JSON Backup
              </button>
              <button className="btn-tactical-outline" onClick={handleExportSummary}>
                Export Backup Summary
              </button>
            </div>
          </div>

          {/* Integrity Audit */}
          <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '0.98rem', color: '#fff' }}>Integrity Audit Status</h4>
              <button className="btn-tactical-outline" onClick={handleRunAudit} style={{ padding: '3px 8px', fontSize: '0.72rem' }}>
                Run Integrity Audit
              </button>
            </div>

            {auditReport ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  {auditReport.status === 'healthy' ? (
                    <span style={{ color: '#00ff7f', fontWeight: 'bold', fontSize: '0.85rem' }}>🟢 ALL KEYS HEALTHY</span>
                  ) : auditReport.status === 'warning' ? (
                    <span style={{ color: '#ffd700', fontWeight: 'bold', fontSize: '0.85rem' }}>🟡 INCOMPLETE SCHEMAS DETECTED</span>
                  ) : (
                    <span style={{ color: '#ff4500', fontWeight: 'bold', fontSize: '0.85rem' }}>🔴 ERROR CORRUPT DATA DETECTED</span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: '#888' }}>({auditReport.checkedAt.split('T')[1].slice(0, 5)})</span>
                </div>

                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #222', borderRadius: '4px', padding: '8px', backgroundColor: '#0c0e14', marginBottom: '12px' }}>
                  {auditReport.findings.length === 0 ? (
                    <div style={{ fontSize: '0.78rem', color: '#888', fontStyle: 'italic' }}>No audit findings. All keys OK.</div>
                  ) : (
                    auditReport.findings.map((f, idx) => (
                      <div key={idx} style={{ fontSize: '0.75rem', marginBottom: '6px', color: f.severity === 'error' ? '#ff4500' : f.severity === 'warning' ? '#ffd700' : '#888' }}>
                        [{f.severity.toUpperCase()}] {f.key}: {f.message}
                      </div>
                    ))
                  )}
                </div>

                <div style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>
                  <strong>Recommendation:</strong> {auditReport.recommendedActions.join(' ')}
                </div>
              </div>
            ) : (
              <div style={{ fontSize: '0.78rem', color: '#888' }}>Run audit to scan local configuration state.</div>
            )}
          </div>

          {/* Navigation Quicklinks */}
          <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: '#fff' }}>Quicklinks</h4>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('lifecycle')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Lifecycle</button>
              <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('ledger')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Approval Ledger</button>
              <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('acq')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Acquisition Queue</button>
              <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('allowlist')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Source Allowlist</button>
              <button className="btn-tactical-outline" onClick={() => setViewMode('readiness')} style={{ fontSize: '0.78rem', padding: '4px 10px', color: 'var(--brand-primary)' }}>Open Mission Mode</button>
            </div>
          </div>

          {/* Profile Reset & Recovery Card */}
          <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255, 69, 0, 0.15)', borderRadius: '6px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: '#ff4500', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={16} /> Profile Reset & Recovery
            </h4>
            <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: '#aaa', lineHeight: 1.3 }}>
              Reset local configurations or populate demo data. <strong>Wiping data only affects registered localStorage keys and will not delete material files or disk backups.</strong> Export a backup first.
            </p>

            {/* Reset Action */}
            <div style={{ borderBottom: '1px solid #222', paddingBottom: '12px', marginBottom: '12px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: '#ff7f50', marginBottom: '4px' }}>
                Type phrase <strong>RESET PROFILE DATA</strong> to wipe storage:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={resetConfirm}
                  onChange={(e) => setResetConfirm(e.target.value)}
                  placeholder="Type confirmation..."
                  style={{ flex: 1, backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.78rem' }}
                />
                <button
                  className="btn-tactical-outline"
                  onClick={handleResetProfile}
                  disabled={resetConfirm !== 'RESET PROFILE DATA'}
                  style={{ color: resetConfirm === 'RESET PROFILE DATA' ? '#ff4500' : '#555', borderColor: resetConfirm === 'RESET PROFILE DATA' ? '#ff4500' : '#222', fontSize: '0.78rem' }}
                >
                  Reset Profile
                </button>
              </div>
            </div>

            {/* Load Demo Data Action */}
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--brand-primary)', marginBottom: '4px' }}>
                Type phrase <strong>LOAD DEMO DATA</strong> to populate mock records:
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  value={demoConfirm}
                  onChange={(e) => setDemoConfirm(e.target.value)}
                  placeholder="Type confirmation..."
                  style={{ flex: 1, backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.78rem' }}
                />
                <button
                  className="btn-tactical"
                  onClick={handleLoadDemoData}
                  disabled={demoConfirm !== 'LOAD DEMO DATA'}
                  style={{ fontSize: '0.78rem' }}
                >
                  Load Demo Data
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right: Validate & Restore Backup */}
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '16px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: '#fff' }}>Restore Toolkit Backup</h4>
          
          <textarea
            rows={6}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='Paste toolkit JSON backup data here...'
            style={{
              width: '100%',
              backgroundColor: '#0d1017',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              padding: '8px',
              boxSizing: 'border-box',
              marginBottom: '12px'
            }}
          />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
            <button className="btn-tactical" onClick={handlePreviewImport}>
              Preview Backup Import
            </button>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#aaa', cursor: 'pointer' }}>
              <input 
                type="checkbox" 
                checked={ignoreUnknown} 
                onChange={(e) => setIgnoreUnknown(e.target.checked)} 
              />
              Ignore unknown keys in backup
            </label>
          </div>

          {previewData && (
            <div style={{ border: '1px solid #333', borderRadius: '4px', padding: '12px', backgroundColor: '#0c0e14', marginBottom: '16px' }}>
              <h5 style={{ margin: '0 0 8px 0', fontSize: '0.85rem', color: '#fff' }}>Restore Preview Summary</h5>
              {previewData.dangerousValuesBlocked ? (
                <div style={{ color: '#ff4500', fontSize: '0.78rem', fontWeight: 'bold' }}>
                  🚫 DANGEROUS ATTRIBUTES DETECTED. RESTORE IS BLOCKED.
                </div>
              ) : (
                <div style={{ fontSize: '0.78rem', color: '#ccc', lineHeight: 1.4 }}>
                  <div>Keys recognized: <strong>{previewData.keysRecognized.length}</strong></div>
                  <div>Keys ignored: <strong>{previewData.keysIgnored.length}</strong></div>
                  {previewData.warnings.map((w, idx) => (
                    <div key={idx} style={{ color: '#ffd700', marginTop: '4px' }}>⚠️ {w}</div>
                  ))}
                  
                  {/* Restore mode options */}
                  <div style={{ marginTop: '12px', borderTop: '1px solid #222', paddingTop: '10px' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', color: '#aaa', marginBottom: '4px' }}>Restore Action:</label>
                    <div style={{ display: 'flex', gap: '16px', marginBottom: '10px' }}>
                      <label style={{ cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'merge'}
                          onChange={() => setRestoreMode('merge')}
                          style={{ marginRight: '6px' }}
                        />
                        Merge records
                      </label>
                      <label style={{ cursor: 'pointer', color: '#ff4500' }}>
                        <input
                          type="radio"
                          name="restoreMode"
                          checked={restoreMode === 'replace_known_keys'}
                          onChange={() => setRestoreMode('replace_known_keys')}
                          style={{ marginRight: '6px' }}
                        />
                        Replace known keys (Overwrite)
                      </label>
                    </div>

                    {restoreMode === 'replace_known_keys' && (
                      <div style={{ marginBottom: '10px' }}>
                        <label style={{ display: 'block', fontSize: '0.72rem', color: '#ff7f50', marginBottom: '4px' }}>
                          Type phrase <strong>RESTORE TOOLKIT BACKUP</strong> to confirm replace:
                        </label>
                        <input
                          type="text"
                          value={typedConfirm}
                          onChange={(e) => setTypedConfirm(e.target.value)}
                          placeholder="Type validation phrase..."
                          style={{ width: '100%', backgroundColor: '#10131a', border: '1px solid #ff4500', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
                        />
                      </div>
                    )}

                    <button 
                      className={restoreMode === 'replace_known_keys' ? "btn-tactical-outline" : "btn-tactical"}
                      onClick={handleRestore}
                      style={{ padding: '6px 12px', fontSize: '0.8rem', color: restoreMode === 'replace_known_keys' ? '#ff4500' : '' }}
                    >
                      {restoreMode === 'replace_known_keys' ? 'Replace Known Keys' : 'Merge Backup'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
