import React, { useState } from 'react';
import { Shield, ShieldAlert, CheckCircle, AlertTriangle, RefreshCw, Cpu, Database } from 'lucide-react';
import { API_BASE } from '../../config.js';

const IndexIntegrityPanel = ({ onRefreshManifest }) => {
  const [auditReport, setAuditReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [repairResult, setRepairResult] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const runRefresh = async () => {
    setRefreshing(true);
    setRepairResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/materials/refresh`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        // Notify parent to load fresh manifest categories in library browser view
        if (onRefreshManifest) {
          await onRefreshManifest();
        }
        // Run audit automatically to show fresh stats
        const auditRes = await fetch(`${API_BASE}/api/index/audit`, { method: 'POST' });
        const auditData = await auditRes.json();
        setAuditReport(auditData);
      } else {
        alert("Refresh failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      alert("Refresh failed: " + err.message);
    } finally {
      setRefreshing(false);
    }
  };

  const runAudit = async () => {
    setLoading(true);
    setRepairResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/index/audit`, { method: 'POST' });
      const data = await res.json();
      setAuditReport(data);
    } catch (err) {
      alert("Audit failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const runRepair = async () => {
    setRepairing(true);
    try {
      const res = await fetch(`${API_BASE}/api/index/repair-status`, { method: 'POST' });
      const data = await res.json();
      setRepairResult(data);
      
      // Re-run audit to show fresh state
      await runAudit();
      
      // Notify parent to load fresh manifest flags in library view
      if (onRefreshManifest) {
        onRefreshManifest();
      }
    } catch (err) {
      alert("Repair failed: " + err.message);
    } finally {
      setRepairing(false);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
            LOCAL RETRIEVAL INTEGRITY AUDITOR
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Audit index status flags against the actual SQLite RAG chunk database without folder crawlers or cloud sync.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn-tactical" 
            onClick={runRefresh} 
            disabled={refreshing || loading}
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--brand-primary)', color: 'var(--text-main)' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'REBUILDING...' : 'REBUILD MANIFEST'}
          </button>

          <button 
            className="btn-tactical" 
            onClick={runAudit} 
            disabled={loading}
            style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--brand-primary)' }}
          >
            <Cpu size={14} className={loading ? 'spin' : ''} />
            {auditReport ? 'RE-AUDIT RETRIEVAL' : 'RUN RETRIEVAL AUDIT'}
          </button>

          {auditReport && auditReport.mismatchedCount > 0 && (
            <button 
              className="btn-tactical" 
              onClick={runRepair} 
              disabled={repairing}
              style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: '#ffea00', color: '#ffea00' }}
            >
              <RefreshCw size={14} className={repairing ? 'spin' : ''} />
              REPAIR MANIFEST FLAGS
            </button>
          )}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
          AUDITING SQLite DOCUMENT CHUNKS TABLE...
        </div>
      )}

      {repairResult && (
        <div style={{
          backgroundColor: 'rgba(0, 255, 102, 0.05)',
          border: '1px solid #00ff66',
          padding: '12px',
          borderRadius: '4px',
          color: '#00ff66',
          fontSize: '0.8rem',
          fontFamily: 'var(--font-mono)'
        }}>
          ✅ REPAIR COMPLETE: Repaired {repairResult.repairedCount} incorrect manifest flags. Manifest has been updated on disk.
        </div>
      )}

      {auditReport && !loading && (
        <>
          {/* Stats HUD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TOTAL FILES AUDITED</div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{auditReport.totalAudited}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>INDEXED IN SQLITE</div>
              <strong style={{ fontSize: '1.1rem', color: '#00ff66' }}>{auditReport.indexedCount}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>UNINDEXED FILES</div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>{auditReport.unindexedCount}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>MISMATCHED FLAGS</div>
              <strong style={{ fontSize: '1.1rem', color: auditReport.mismatchedCount > 0 ? '#ffea00' : '#00ff66' }}>{auditReport.mismatchedCount}</strong>
            </div>
          </div>

          {/* Audit Results */}
          {auditReport.mismatchedCount === 0 ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'rgba(0, 255, 102, 0.03)',
              border: '1px solid rgba(0, 255, 102, 0.2)',
              padding: '16px',
              borderRadius: '4px',
              color: 'var(--text-main)',
              fontSize: '0.85rem'
            }}>
              <CheckCircle size={20} style={{ color: '#00ff66' }} />
              <div>
                <strong>INTEGRITY STATUS: OK</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  All material manifest indexing flags are in perfect sync with actual SQLite database contents.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                color: '#ffea00',
                fontSize: '0.8rem',
                fontFamily: 'var(--font-mono)',
                backgroundColor: 'rgba(255, 234, 0, 0.05)',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid rgba(255, 234, 0, 0.2)'
              }}>
                <AlertTriangle size={16} />
                <span>Found {auditReport.mismatchedCount} files where the manifest flag mismatches SQLite RAG database state.</span>
              </div>

              <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left', fontFamily: 'var(--font-mono)' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                      <th style={{ padding: '8px' }}>DOCUMENT NAME</th>
                      <th style={{ padding: '8px' }}>MANIFEST FLAG</th>
                      <th style={{ padding: '8px' }}>SQLITE CHUNKS</th>
                      <th style={{ padding: '8px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditReport.mismatched.map(m => (
                      <tr key={m.path} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                        <th style={{ padding: '8px', fontWeight: 'normal', color: 'var(--text-main)' }}>{m.name}</th>
                        <td style={{ padding: '8px', color: m.manifestFlag ? '#00ff66' : 'var(--text-muted)' }}>
                          {m.manifestFlag ? 'INDEXED' : 'UNINDEXED'}
                        </td>
                        <td style={{ padding: '8px', color: m.chunks > 0 ? '#00ff66' : 'var(--text-muted)' }}>
                          {m.chunks} chunks
                        </td>
                        <td style={{ padding: '8px', color: '#ffea00' }}>
                          {!m.manifestFlag && m.actualFlag ? 'Flag Missing' : 'Stray Flag'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default IndexIntegrityPanel;
