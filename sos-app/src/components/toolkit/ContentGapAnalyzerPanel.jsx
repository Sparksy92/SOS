import React, { useState, useEffect } from 'react';
import { GAP_ANALYSIS_DATA } from '../../modules/toolkit/gapAnalysisData.js';
import { loadLedger } from '../../modules/toolkit/importApprovalLedgerStore.js';
import { loadQueue, saveQueueItem } from '../../modules/toolkit/acquisitionQueueStore.js';
import { loadAllowlist, saveAllowlistEntry } from '../../modules/toolkit/sourceAllowlistStore.js';
import { ShieldAlert, BookOpen, AlertTriangle, CheckCircle, ExternalLink, Plus, Check, Clipboard } from 'lucide-react';

export default function ContentGapAnalyzerPanel({ setToolkitSubTab }) {
  const { categoryCoverage, candidateItems, blockedItems } = GAP_ANALYSIS_DATA;
  const [ledger, setLedger] = useState([]);
  const [queue, setQueue] = useState([]);
  const [allowlist, setAllowlist] = useState([]);

  useEffect(() => {
    setLedger(loadLedger());
    setQueue(loadQueue());
    setAllowlist(loadAllowlist());
  }, []);

  const getLedgerStatus = (item) => {
    const record = ledger.find(r => {
      const matchFile = r.filename.toLowerCase();
      const itemTitle = item.title.toLowerCase();
      if (item.filename && matchFile === item.filename.toLowerCase()) return true;
      if (matchFile.includes(itemTitle) || itemTitle.includes(matchFile)) return true;
      return false;
    });

    if (!record) {
      return { status: 'No local review yet', color: '#888', decision: null, exact: false };
    }

    const isExact = (item.filename && record.filename.toLowerCase() === item.filename.toLowerCase()) || 
                    record.filename.toLowerCase().replace(/[^a-z0-9]/g, '') === item.title.toLowerCase().replace(/[^a-z0-9]/g, '');

    let statusText = '';
    let color = '';
    switch (record.operatorDecision) {
      case 'approved':
        statusText = isExact ? 'Operator-approved record exists' : 'Possible ledger match (Approved)';
        color = '#00ff7f';
        break;
      case 'rejected':
        statusText = isExact ? 'Rejected' : 'Possible ledger match (Rejected)';
        color = '#ff4500';
        break;
      case 'needs_more_evidence':
        statusText = isExact ? 'Needs more evidence' : 'Possible ledger match (Needs Evidence)';
        color = '#ffd700';
        break;
      default:
        statusText = isExact ? 'Pending review' : 'Possible ledger match (Pending)';
        color = '#a0a0a0';
    }

    return { status: statusText, color, decision: record.operatorDecision, exact: isExact, rawRecord: record };
  };

  const getQueueStatus = (item) => {
    const record = queue.find(q => q.title.toLowerCase() === item.title.toLowerCase() || (item.filename && q.filenameHint && q.filenameHint.toLowerCase() === item.filename.toLowerCase()));
    return record ? record.acquisitionStatus : 'not_queued';
  };

  const getAllowlistStatus = (item) => {
    if (!item.officialSourceUrl) return 'not_listed';
    const entry = allowlist.find(l => l.officialSourceUrl && l.officialSourceUrl.toLowerCase() === item.officialSourceUrl.toLowerCase());
    if (!entry) return 'not_listed';
    return entry.operatorTrusted ? 'trusted' : 'not_trusted';
  };

  const handleAddToQueue = (item, ledgerRecord) => {
    try {
      const updated = saveQueueItem({
        title: item.title,
        filenameHint: item.filename || '',
        category: item.category,
        riskCategory: item.riskCategory || null,
        sourceType: 'official_source',
        officialSourceUrl: item.officialSourceUrl || '',
        sourceEvidence: item.licenseEvidence || '',
        suggestedLicenseStatus: item.licenseStatus || 'unknown',
        ledgerRecordId: ledgerRecord ? ledgerRecord.id : '',
        ledgerDecision: ledgerRecord ? ledgerRecord.operatorDecision : 'none',
        acquisitionStatus: 'planned'
      });
      setQueue(updated);
      alert(`"${item.title}" successfully added to the local acquisition queue.`);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleAddToAllowlist = (item) => {
    try {
      const updated = saveAllowlistEntry({
        label: `${item.title} Source`,
        officialSourceUrl: item.officialSourceUrl || '',
        sourceType: 'official_source',
        sourceEvidence: item.licenseEvidence || '',
        categories: [item.category],
        riskCategories: item.riskCategory ? [item.riskCategory] : [],
        operatorTrusted: true
      });
      setAllowlist(updated);
      alert("Official source URL allowlisted and marked as Operator Trusted.");
    } catch (e) {
      alert(e.message);
    }
  };

  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => alert("URL copied to clipboard!"))
      .catch(() => alert("Failed to copy URL."));
  };

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '900px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Content Gap Analyzer
        </h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
          Compare your offline library files against survival directory schemas to locate gaps and catalog acquisition options.
        </p>
      </div>

      {/* Safety Boundary Banner */}
      <div style={{ backgroundColor: 'rgba(255, 69, 0, 0.04)', border: '1px solid rgba(255, 69, 0, 0.25)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#ff7f50', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.95rem', textTransform: 'uppercase' }}>
          <ShieldAlert size={18} />
          Copyright & Safety Boundaries
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.82rem', color: '#ccc', lineHeight: '1.4' }}>
          <li style={{ marginBottom: '4px' }}><strong>The reference audit does not prove copyright clearance.</strong> All items must be vetted individually.</li>
          <li style={{ marginBottom: '4px' }}>Unknown or restricted items require manual review and cannot be processed automatically.</li>
          <li>Only operator-approved allowlist items with official source evidence may be considered for any future download tool.</li>
        </ul>
      </div>

      {/* Category Coverage Status */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 12px 0' }}>Library Coverage Metrics</h4>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {categoryCoverage.map(cat => {
            const isMissing = cat.coverage === 'missing';
            return (
              <div 
                key={cat.category} 
                style={{
                  backgroundColor: '#12151c',
                  border: isMissing ? '1px solid rgba(255, 69, 0, 0.15)' : '1px solid rgba(0, 255, 127, 0.15)',
                  borderRadius: '6px',
                  padding: '14px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontWeight: 'bold', color: '#fff', textTransform: 'uppercase', fontSize: '0.9rem' }}>
                    {cat.category.replace(/_/g, ' ')}
                  </span>
                  <span style={{ 
                    fontSize: '0.72rem', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    backgroundColor: isMissing ? 'rgba(255, 69, 0, 0.1)' : 'rgba(0, 255, 127, 0.1)',
                    color: isMissing ? '#ff4500' : '#00ff7f'
                  }}>
                    {cat.coverage.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.8rem', color: '#a0a0a0' }}>
                  <span>Local Count: <strong>{cat.localCount}</strong></span>
                  <span style={{ margin: '0 8px' }}>|</span>
                  <span>Candidates available: <strong>{cat.externalCandidateCount}</strong></span>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.78rem', color: '#888' }}>{cat.notes}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Candidate list */}
      <div style={{ marginBottom: '24px' }}>
        <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 12px 0' }}>Candidate Sources for Operator Review</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {candidateItems.filter(item => item.recommendedAction === 'approved_download').map((item, idx) => {
            const ledgerStatus = getLedgerStatus(item);
            const qStatus = getQueueStatus(item);
            const aStatus = getAllowlistStatus(item);
            return (
              <div key={idx} style={{ backgroundColor: '#12151c', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #00ff7f' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{item.title}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '3px' }}>
                      Category: <span style={{ color: '#ccc' }}>{item.category.replace(/_/g, ' ')}</span> | License: <span style={{ color: '#00ff7f' }}>{item.licenseStatus.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: ledgerStatus.color, fontWeight: 'bold' }}>
                        LEDGER: {ledgerStatus.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: qStatus === 'not_queued' ? '#888' : '#00f2fe', fontWeight: 'bold' }}>
                        QUEUE: {qStatus.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: aStatus === 'trusted' ? '#00ff7f' : '#888', fontWeight: 'bold' }}>
                        ALLOWLIST: {aStatus.toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#a0a0a0' }}>
                  <strong>License Evidence:</strong> {item.licenseEvidence}
                </p>
                {item.riskCategory && (
                  <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#ffd700', backgroundColor: 'rgba(255, 215, 0, 0.04)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block' }}>
                    ⚠️ Risk Warning: This document relates to {item.riskCategory.replace(/_/g, ' ')}. Content is strictly for educational guidance; operator review required.
                  </div>
                )}
                {/* Safe Actions */}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                  {qStatus === 'not_queued' && (
                    <button 
                      className="btn-tactical" 
                      onClick={() => handleAddToQueue(item, ledgerStatus.rawRecord)}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Add to Acquisition Queue
                    </button>
                  )}
                  {item.officialSourceUrl && aStatus === 'not_listed' && (
                    <button 
                      className="btn-tactical" 
                      onClick={() => handleAddToAllowlist(item)}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Add Official Source to Allowlist
                    </button>
                  )}
                  {item.officialSourceUrl && (
                    <button 
                      className="btn-tactical-outline" 
                      onClick={() => handleCopyUrl(item.officialSourceUrl)}
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Clipboard size={12} /> Copy Official Source URL
                    </button>
                  )}
                  {ledgerStatus.rawRecord && setToolkitSubTab && (
                    <button 
                      className="btn-tactical-outline" 
                      onClick={() => setToolkitSubTab('ledger')}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Open Approval Ledger
                    </button>
                  )}
                  {setToolkitSubTab && (
                    <button 
                      className="btn-tactical-outline" 
                      onClick={() => setToolkitSubTab('lifecycle')}
                      style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--brand-primary)', borderColor: 'rgba(0, 242, 254, 0.4)' }}
                    >
                      Open Lifecycle
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Restricted queue / manual review items */}
      <div>
        <h4 style={{ color: '#fff', fontSize: '1.1rem', margin: '0 0 12px 0' }}>Restricted or Unknown License Catalog (Requires Manual Review)</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {candidateItems.filter(item => item.recommendedAction === 'manual_review').map((item, idx) => {
            const ledgerStatus = getLedgerStatus(item);
            const qStatus = getQueueStatus(item);
            const aStatus = getAllowlistStatus(item);
            return (
              <div key={idx} style={{ backgroundColor: '#12151c', padding: '14px', borderRadius: '6px', borderLeft: '3px solid #ff4500' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '0.95rem' }}>{item.title}</strong>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '3px' }}>
                      Category: <span style={{ color: '#ccc' }}>{item.category.replace(/_/g, ' ')}</span> | License: <span style={{ color: '#ff4500' }}>{item.licenseStatus.toUpperCase()}</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: ledgerStatus.color, fontWeight: 'bold' }}>
                        LEDGER: {ledgerStatus.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: qStatus === 'not_queued' ? '#888' : '#00f2fe', fontWeight: 'bold' }}>
                        QUEUE: {qStatus.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)', color: aStatus === 'trusted' ? '#00ff7f' : '#888', fontWeight: 'bold' }}>
                        ALLOWLIST: {aStatus.toUpperCase()}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 69, 0, 0.1)', color: '#ff4500', fontWeight: 'bold' }}>
                      LOCKED
                    </span>
                  </div>
                </div>
                <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#a0a0a0' }}>
                  <strong>Licensing Issue:</strong> {item.licenseEvidence}
                </p>
                <div style={{ marginTop: '8px', fontSize: '0.78rem', color: '#ff7f50', backgroundColor: 'rgba(255, 69, 0, 0.03)', padding: '4px 8px', borderRadius: '4px', display: 'inline-block', border: '1px solid rgba(255,69,0,0.1)' }}>
                  🔒 Excluded from automated lists. Must be manually purchased or verified by the operator outside SurvivalOS.
                </div>
                {/* Safe Actions */}
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                  {qStatus === 'not_queued' && (
                    <button 
                      className="btn-tactical" 
                      onClick={() => handleAddToQueue(item, ledgerStatus.rawRecord)}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Add to Acquisition Queue
                    </button>
                  )}
                  {item.officialSourceUrl && aStatus === 'not_listed' && (
                    <button 
                      className="btn-tactical" 
                      onClick={() => handleAddToAllowlist(item)}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Add Official Source to Allowlist
                    </button>
                  )}
                  {item.officialSourceUrl && (
                    <button 
                      className="btn-tactical-outline" 
                      onClick={() => handleCopyUrl(item.officialSourceUrl)}
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Clipboard size={12} /> Copy Official Source URL
                    </button>
                  )}
                  {ledgerStatus.rawRecord && setToolkitSubTab && (
                    <button 
                      className="btn-tactical-outline" 
                      onClick={() => setToolkitSubTab('ledger')}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      Open Approval Ledger
                    </button>
                  )}
                  {setToolkitSubTab && (
                    <button 
                      className="btn-tactical-outline" 
                      onClick={() => setToolkitSubTab('lifecycle')}
                      style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--brand-primary)', borderColor: 'rgba(0, 242, 254, 0.4)' }}
                    >
                      Open Lifecycle
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
