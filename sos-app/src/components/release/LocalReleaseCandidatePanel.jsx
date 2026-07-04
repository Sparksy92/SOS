import React, { useState, useEffect } from 'react';
import { buildLocalReleaseReadinessReport } from '../../modules/release/localReleaseReadiness.js';
import { runOfflineToolkitIntegrityAudit, createOfflineToolkitBackup } from '../../modules/toolkit/offlineToolkitBackupStore.js';
import { loadLedger } from '../../modules/toolkit/importApprovalLedgerStore.js';
import { loadQueue } from '../../modules/toolkit/acquisitionQueueStore.js';
import { loadAllowlist } from '../../modules/toolkit/sourceAllowlistStore.js';
import { computeLifecycleRecords } from '../../modules/toolkit/libraryLifecycleAnalyzer.js';
import { ShieldCheck, ShieldAlert, AlertTriangle, RefreshCw, Download, Info, ExternalLink, FileText } from 'lucide-react';

export default function LocalReleaseCandidatePanel({ setViewMode, setToolkitSubTab, API_BASE }) {
  const [report, setReport] = useState(null);
  const [backendHealth, setBackendHealth] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const fetchHealthAndAudit = async () => {
    setLoading(true);
    let health = null;
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        health = await res.json();
      }
    } catch (e) {
      console.warn("Backend health API unreachable:", e);
    }
    setBackendHealth(health);

    const audit = runOfflineToolkitIntegrityAudit();
    const backupSummary = createOfflineToolkitBackup();

    const ledger = loadLedger();
    const queue = loadQueue();
    const allowlist = loadAllowlist();
    const lifeRecords = computeLifecycleRecords({}, ledger, queue, allowlist, [], {});
    const lifecycleSummary = {
      candidates: lifeRecords.length,
      staged: lifeRecords.filter(r => r.lifecycleStage === 'staged').length
    };

    const generatedReport = buildLocalReleaseReadinessReport({
      backendHealth: health,
      toolkitAudit: audit,
      backupSummary,
      lifecycleSummary,
      environmentHints: {
        SOS_MATERIALS_DIR: health ? health.materialRootConfigured : false
      }
    });

    setReport(generatedReport);
    setLoading(false);
  };

  useEffect(() => {
    fetchHealthAndAudit();
  }, []);

  const handleExportJSON = () => {
    if (!report) return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(report, null, 2));
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `sos_readiness_report_${new Date().toISOString().split('T')[0]}.json`);
      dlAnchor.click();
      setStatusMessage("JSON report exported successfully.");
    } catch (e) {
      setStatusMessage(`Export failed: ${e.message}`);
    }
  };

  const handleExportMarkdown = () => {
    if (!report) return;
    try {
      let md = `# SurvivalOS Release Readiness Report\n\n`;
      md += `Checked At: **${report.checkedAt}**\n`;
      md += `Overall Status: **${report.status.toUpperCase()}**\n`;
      md += `Readiness Score: **${report.score}/100**\n\n`;

      md += `## Section Checks\n`;
      report.sections.forEach(s => {
        md += `### ${s.label}: **${s.status.toUpperCase()}**\n`;
        md += `- Summary: ${s.summary}\n`;
        md += `- Recommended Action: ${s.recommendedAction}\n\n`;
      });

      if (report.blockers.length > 0) {
        md += `## Blockers\n`;
        report.blockers.forEach(b => { md += `- 🔴 ${b}\n`; });
        md += `\n`;
      }
      if (report.warnings.length > 0) {
        md += `## Warnings\n`;
        report.warnings.forEach(w => { md += `- ⚠️ ${w}\n`; });
        md += `\n`;
      }

      md += `## Next Recommended Steps\n`;
      report.nextSteps.forEach(ns => { md += `1. ${ns}\n`; });

      const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
      const dlAnchor = document.createElement('a');
      dlAnchor.setAttribute("href", dataStr);
      dlAnchor.setAttribute("download", `sos_readiness_report_${new Date().toISOString().split('T')[0]}.md`);
      dlAnchor.click();
      setStatusMessage("Markdown report exported successfully.");
    } catch (e) {
      setStatusMessage(`Export failed: ${e.message}`);
    }
  };

  const navigateTo = (view, subtab = '') => {
    setViewMode(view);
    if (subtab) {
      setToolkitSubTab(subtab);
    }
  };

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '1200px', margin: '0 auto', padding: '0 24px var(--spacing-xxl)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Release Candidate Check
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            Command-center for read-only local setup diagnostics, startup verification, and offline runbooks.
          </p>
        </div>
        <button 
          className="btn-tactical" 
          onClick={fetchHealthAndAudit} 
          disabled={loading}
          style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          Refresh Release Check
        </button>
      </div>

      {/* Safety Notice */}
      <div style={{ backgroundColor: 'rgba(0, 242, 254, 0.04)', border: '1px solid rgba(0, 242, 254, 0.25)', borderRadius: '6px', padding: '14px', marginBottom: '24px' }}>
        <p style={{ margin: 0, fontSize: '0.8rem', color: '#00f2fe', fontWeight: 'bold' }}>
          ℹ This release check is read-only. It does not change files, download references, index documents, upload logs, or alter local storage.
        </p>
      </div>

      {statusMessage && (
        <div style={{ padding: '10px 14px', borderRadius: '4px', marginBottom: '20px', fontSize: '0.85rem', backgroundColor: 'rgba(0, 255, 127, 0.1)', border: '1px solid #00ff7f', color: '#00ff7f' }}>
          {statusMessage}
        </div>
      )}

      {/* Two Column Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '24px', alignItems: 'flex-start' }}>
        {/* Left Column: Diagnostics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {report ? (
            <>
              {/* Scoreboard Widget */}
              <div style={{ 
                backgroundColor: '#12151c', 
                border: '1px solid rgba(255,255,255,0.05)', 
                borderRadius: '8px', 
                padding: '20px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                boxShadow: report.status === 'ready' ? '0 0 15px rgba(0,255,127,0.05)' : report.status === 'warning' ? '0 0 15px rgba(255,215,0,0.05)' : '0 0 15px rgba(255,69,0,0.05)'
              }}>
                <div>
                  <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Release Candidate Status</div>
                  <div style={{ 
                    fontSize: '1.8rem', 
                    fontWeight: 'bold', 
                    color: report.status === 'ready' ? '#00ff7f' : report.status === 'warning' ? '#ffd700' : '#ff4500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    {report.status === 'ready' ? <ShieldCheck size={28} /> : report.status === 'warning' ? <AlertTriangle size={28} /> : <ShieldAlert size={28} />}
                    {report.status.toUpperCase()}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Readiness Score</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#fff' }}>
                    {report.score}<span style={{ fontSize: '1rem', color: '#666' }}>/100</span>
                  </div>
                </div>
              </div>

              {/* Blockers & Warnings */}
              {(report.blockers.length > 0 || report.warnings.length > 0) && (
                <div style={{ backgroundColor: '#181b24', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '8px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Audit Findings</h4>
                  
                  {report.blockers.map((b, idx) => (
                    <div key={idx} style={{ color: '#ff7f50', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: '#ff4500', fontWeight: 'bold' }}>[BLOCKER]</span> {b}
                    </div>
                  ))}

                  {report.warnings.map((w, idx) => (
                    <div key={idx} style={{ color: '#ffd700', fontSize: '0.85rem', marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 'bold' }}>[WARNING]</span> {w}
                    </div>
                  ))}
                </div>
              )}

              {/* Checks list */}
              <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ margin: '0 0 16px 0', fontSize: '0.98rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>System Component Checklists</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {report.sections.map((sec, idx) => (
                    <div key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                      <div style={{ flex: 1, minWidth: '250px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ color: '#fff', fontSize: '0.92rem' }}>{sec.label}</strong>
                          <span style={{
                            fontSize: '0.72rem',
                            padding: '1px 6px',
                            borderRadius: '3px',
                            fontWeight: 'bold',
                            backgroundColor: sec.status === 'ready' ? 'rgba(0,255,127,0.08)' : sec.status === 'warning' ? 'rgba(255,215,0,0.08)' : 'rgba(255,69,0,0.08)',
                            color: sec.status === 'ready' ? '#00ff7f' : sec.status === 'warning' ? '#ffd700' : '#ff4500'
                          }}>
                            {sec.status.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ margin: '4px 0 0 0', fontSize: '0.78rem', color: '#aaa' }}>{sec.summary}</p>
                      </div>
                      <div style={{ fontSize: '0.75rem', textAlign: 'right', color: '#888' }}>
                        <span style={{ display: 'block', fontSize: '0.7rem', color: '#555', textTransform: 'uppercase' }}>Action Required</span>
                        <span style={{ color: sec.status === 'ready' ? '#888' : 'var(--brand-primary)' }}>{sec.recommendedAction}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div style={{ color: '#888', fontStyle: 'italic', padding: '40px', textAlign: 'center' }}>No readiness checks executed yet.</div>
          )}
        </div>

        {/* Right Column: Guidance & Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Static First-Run guidance */}
          <div style={{ backgroundColor: '#181b24', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.98rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Info size={16} style={{ color: 'var(--brand-primary)' }} />
              Start here (First-Run Checklist)
            </h4>
            <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '0.8rem', color: '#ccc', lineHeight: '1.6' }}>
              <li style={{ marginBottom: '8px' }}>Run Release Check (Refresh)</li>
              <li style={{ marginBottom: '8px' }}>Open Backup and create a local JSON backup</li>
              <li style={{ marginBottom: '8px' }}>Open Offline Toolkit</li>
              <li style={{ marginBottom: '8px' }}>Check materials/index status</li>
              <li style={{ marginBottom: '8px' }}>Create or open a mission</li>
            </ol>
          </div>

          {/* Quick Actions Panel */}
          <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 16px 0', fontSize: '0.95rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Audit Navigation</h4>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn-tactical-outline" onClick={() => navigateTo('offline-toolkit')} style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '10px' }}>
                Open Offline Toolkit
              </button>
              <button className="btn-tactical-outline" onClick={() => navigateTo('offline-toolkit', 'backup')} style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '10px' }}>
                Open Backup
              </button>
              <button className="btn-tactical-outline" onClick={() => navigateTo('offline-toolkit', 'lifecycle')} style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '10px' }}>
                Open Lifecycle
              </button>
              <button className="btn-tactical-outline" onClick={() => navigateTo('index-integrity')} style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '10px' }}>
                Open Index Integrity
              </button>
              <button className="btn-tactical-outline" onClick={() => navigateTo('field-mode')} style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '10px', color: 'var(--brand-primary)' }}>
                Open Mission Mode
              </button>
              <button className="btn-tactical-outline" onClick={() => navigateTo('settings')} style={{ fontSize: '0.8rem', justifyContent: 'flex-start', padding: '10px' }}>
                Open Settings
              </button>
            </div>
          </div>

          {/* Report Exports */}
          {report && (
            <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#fff' }}>Export Readiness Audit</h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '0.78rem', color: '#888', lineHeight: 1.3 }}>
                Save a local log of setup diagnostics and checklist completions.
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn-tactical" onClick={handleExportJSON} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '6px 12px' }}>
                  <Download size={14} /> Export Readiness Report JSON
                </button>
                <button className="btn-tactical-outline" onClick={handleExportMarkdown} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', padding: '6px 12px' }}>
                  <FileText size={14} /> Export Readiness Report Markdown
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
