import React, { useState, useEffect } from 'react';
import { loadLedger } from '../../modules/toolkit/importApprovalLedgerStore.js';
import { loadQueue } from '../../modules/toolkit/acquisitionQueueStore.js';
import { loadAllowlist } from '../../modules/toolkit/sourceAllowlistStore.js';
import { GAP_ANALYSIS_DATA } from '../../modules/toolkit/gapAnalysisData.js';
import { computeLifecycleRecords } from '../../modules/toolkit/libraryLifecycleAnalyzer.js';
import { ShieldAlert, Download, RefreshCw, AlertTriangle, ExternalLink, HelpCircle, Clipboard } from 'lucide-react';

export default function LibraryLifecyclePanel({ setToolkitSubTab, setViewMode }) {
  const [records, setRecords] = useState([]);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [manifestCategories, setManifestCategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStage, setFilterStage] = useState('all');
  const [manifestChecked, setManifestChecked] = useState(true);

  const loadAllMetadata = async () => {
    setLoading(true);
    let staged = [];
    let manifestCats = {};
    let checked = false;
    
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/toolkit/staging`);
      if (res.ok) {
        const data = await res.json();
        staged = data.stagedFiles || [];
        setStagedFiles(staged);
      }
    } catch (e) {
      console.warn("Failed fetching staged files for lifecycle overlays:", e);
    }

    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/materials`);
      if (res.ok) {
        const data = await res.json();
        manifestCats = data.categories || {};
        setManifestCategories(manifestCats);
        checked = true;
      }
    } catch (e) {
      console.warn("Failed fetching materials categories for lifecycle overlays:", e);
    }
    setManifestChecked(checked);

    const ledger = loadLedger();
    const queue = loadQueue();
    const allowlist = loadAllowlist();

    const lifeRecords = computeLifecycleRecords(GAP_ANALYSIS_DATA, ledger, queue, allowlist, staged, manifestCats, checked);
    setRecords(lifeRecords);
    setLoading(false);
  };

  useEffect(() => {
    loadAllMetadata();
  }, []);

  const triggerExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(records, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_library_lifecycle_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const triggerExportMarkdown = () => {
    let md = `# SurvivalOS — Library Lifecycle Reconciliation Audit\n\n`;
    md += `> [!IMPORTANT]\n`;
    md += `> This report is derived dynamically from local stores and manifests. It records Operator review checkpoints only and does NOT guarantee legal copyright clearance.\n\n`;
    
    md += `| Title | Category | Stage | Evidence | Index Status | Recommended Next Step |\n`;
    md += `| --- | --- | --- | --- | --- | --- |\n`;
    records.forEach(r => {
      md += `| **${r.title}** | ${r.category} | ${r.lifecycleStage.toUpperCase()} | ${r.evidenceStatus.toUpperCase()} | ${r.indexStatus.toUpperCase()} | ${r.recommendedNextStep} |\n`;
    });

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_lifecycle_reconciliation_${Date.now()}.md`);
    dlAnchorElem.click();
  };

  // Metrics counts
  const candidateOnly = records.filter(r => r.gapStatus !== 'not_in_gap_audit' && r.ledgerStatus === 'none' && r.queueStatus === 'none').length;
  const pendingApproval = records.filter(r => r.ledgerStatus === 'pending').length;
  const approvedNotQueued = records.filter(r => r.ledgerStatus === 'approved' && r.queueStatus === 'none').length;
  const planned = records.filter(r => r.queueStatus === 'planned').length;
  const manuallyAcquired = records.filter(r => r.queueStatus === 'manually_acquired').length;
  const manuallyStaged = records.filter(r => r.queueStatus === 'manually_staged' || r.stagingStatus === 'staged_metadata_only').length;
  const manifestIndexUnknown = records.filter(r => r.indexStatus === 'unknown' || r.manifestStatus === 'unknown').length;
  const blockedRejected = records.filter(r => r.lifecycleStage === 'blocked' || r.lifecycleStage === 'rejected').length;
  const missingEvidence = records.filter(r => r.evidenceStatus === 'missing').length;
  const highRisk = records.filter(r => r.riskCategory !== null).length;

  const filtered = records.filter(r => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) || (r.filenameHint && r.filenameHint.toLowerCase().includes(search.toLowerCase()));
    const matchCategory = filterCategory === 'all' || r.category === filterCategory;
    const matchStage = filterStage === 'all' || r.lifecycleStage === filterStage;
    return matchSearch && matchCategory && matchStage;
  });

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '1200px', margin: '0 auto', padding: '0 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Library Lifecycle Analyzer
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            Reconcile library gaps, operator approval ledgers, acquisition plans, staging metadata, and material indices.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-tactical-outline" onClick={loadAllMetadata} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={12} className={loading ? "spin" : ""} /> Refresh Dashboard
          </button>
          <button className="btn-tactical-outline" onClick={triggerExportJSON} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <Download size={12} /> Export JSON
          </button>
          <button className="btn-tactical-outline" onClick={triggerExportMarkdown} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <Clipboard size={12} /> Export Checklist
          </button>
        </div>
      </div>

      {/* Security alert */}
      <div style={{ backgroundColor: 'rgba(255, 69, 0, 0.04)', border: '1px solid rgba(255, 69, 0, 0.25)', borderRadius: '6px', padding: '14px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4500', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px' }}>
          <ShieldAlert size={16} />
          <span>Read-Only Visibility Layer</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#b0b0b0', lineHeight: '1.4' }}>
          This reconciler provides cross-referencing audit checks on local store catalogs. SurvivalOS never automates downloads, handles file movements, clears legal copyrights, or auto-indexes content in the background.
        </p>
      </div>

      {!manifestChecked && (
        <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.05)', border: '1px solid rgba(255, 215, 0, 0.25)', borderRadius: '6px', padding: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ffd700', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px' }}>
            <AlertTriangle size={16} />
            <span>Materials Manifest Offline / Unreachable</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#b0b0b0', lineHeight: '1.4' }}>
            Unable to fetch category items from `/api/materials`. Some files may display manifest status as <strong>UNKNOWN</strong>. Open Index Integrity or refresh materials manifest.
          </p>
        </div>
      )}

      {/* Metrics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{records.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '4px' }}>Total Catalog Records</div>
        </div>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffd700' }}>{pendingApproval}</div>
          <div style={{ fontSize: '0.75rem', color: '#ffd700', marginTop: '4px' }}>Pending Approval</div>
        </div>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00f2fe' }}>{planned}</div>
          <div style={{ fontSize: '0.75rem', color: '#00f2fe', marginTop: '4px' }}>Acquisition Planned</div>
        </div>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00ff7f' }}>{manuallyStaged}</div>
          <div style={{ fontSize: '0.75rem', color: '#00ff7f', marginTop: '4px' }}>Staged / Acquired</div>
        </div>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff4500' }}>{blockedRejected}</div>
          <div style={{ fontSize: '0.75rem', color: '#ff4500', marginTop: '4px' }}>Blocked / Rejected</div>
        </div>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ff7f50' }}>{missingEvidence}</div>
          <div style={{ fontSize: '0.75rem', color: '#ff7f50', marginTop: '4px' }}>Missing Evidence</div>
        </div>
      </div>

      {/* Navigation Quicklinks */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('gap')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Gap Analyzer</button>
        <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('ledger')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Approval Ledger</button>
        <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('acq')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Acquisition Queue</button>
        <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('allowlist')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Source Allowlist</button>
        <button className="btn-tactical-outline" onClick={() => setToolkitSubTab('import')} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>Open Manual Import</button>
        <button className="btn-tactical-outline" onClick={() => setViewMode('index-integrity')} style={{ fontSize: '0.78rem', padding: '4px 10px', color: 'var(--brand-primary)' }}>Open Index Integrity</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', backgroundColor: '#10131a', padding: '12px', borderRadius: '6px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ flex: '1', minWidth: '200px' }}>
          <input
            type="text"
            placeholder="Search records by title or filename hint..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
          />
        </div>
        <div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
          >
            <option value="all">ALL CATEGORIES</option>
            <option value="general_survival">General Survival</option>
            <option value="homesteading">Homesteading</option>
            <option value="farming">Farming</option>
            <option value="water">Water</option>
            <option value="bushcraft">Bushcraft</option>
            <option value="shelter">Shelter</option>
            <option value="medical_reference">Medical Reference</option>
          </select>
        </div>
        <div>
          <select
            value={filterStage}
            onChange={(e) => setFilterStage(e.target.value)}
            style={{ backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
          >
            <option value="all">ALL LIFECYCLE STAGES</option>
            <option value="candidate_review">CANDIDATE REVIEW</option>
            <option value="approval_review">APPROVAL REVIEW</option>
            <option value="acquisition_planned">ACQUISITION PLANNED</option>
            <option value="manually_acquired">MANUALLY ACQUIRED</option>
            <option value="staged">STAGED</option>
            <option value="in_materials">IN MATERIALS</option>
            <option value="indexed">INDEXED</option>
            <option value="blocked">BLOCKED</option>
            <option value="rejected">REJECTED</option>
          </select>
        </div>
      </div>

      {/* Grid table */}
      <div style={{ overflowX: 'auto', backgroundColor: '#10131a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #222', color: '#aaa', backgroundColor: '#0c0e14' }}>
              <th style={{ padding: '12px' }}>Title / Hint</th>
              <th style={{ padding: '12px' }}>Category</th>
              <th style={{ padding: '12px' }}>Stage</th>
              <th style={{ padding: '12px' }}>Ledger</th>
              <th style={{ padding: '12px' }}>Queue</th>
              <th style={{ padding: '12px' }}>Allowlist</th>
              <th style={{ padding: '12px' }}>Manifest</th>
              <th style={{ padding: '12px' }}>Index</th>
              <th style={{ padding: '12px' }}>Evidence</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#666' }}>
                  No lifecycle records match active filter criteria.
                </td>
              </tr>
            ) : (
              filtered.map(r => {
                let stageColor = '#a0a0a0';
                if (r.lifecycleStage === 'indexed') stageColor = '#00ff7f';
                if (r.lifecycleStage === 'in_materials') stageColor = '#00f2fe';
                if (r.lifecycleStage === 'staged') stageColor = '#00f2fe';
                if (r.lifecycleStage === 'manually_acquired') stageColor = '#ffd700';
                if (r.lifecycleStage === 'blocked' || r.lifecycleStage === 'rejected') stageColor = '#ff4500';

                return (
                  <tr key={r.id} style={{ borderBottom: '1px solid #1c202a', verticalAlign: 'top' }}>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#fff', display: 'block' }}>{r.title}</strong>
                      {r.filenameHint && <code style={{ fontSize: '0.72rem', color: '#888' }}>{r.filenameHint}</code>}
                      {r.matchConfidence === 'possible_match' && (
                        <div style={{ color: '#ff7f50', fontSize: '0.7rem', marginTop: '4px' }}>
                          ⚠️ Possible match only (Review filename stems)
                        </div>
                      )}
                      {r.warnings.map((w, idx) => (
                        <div key={idx} style={{ color: '#ffd700', fontSize: '0.7rem', marginTop: '2px' }}>
                          ⚠️ {w}
                        </div>
                      ))}
                      <div style={{ fontSize: '0.75rem', color: '#00f2fe', marginTop: '6px' }}>
                        👉 <em>{r.recommendedNextStep}</em>
                      </div>
                    </td>
                    <td style={{ padding: '12px', color: '#ccc' }}>
                      {r.category.replace(/_/g, ' ')}
                    </td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: stageColor }}>
                      {r.lifecycleStage.replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td style={{ padding: '12px', color: r.ledgerStatus === 'approved' ? '#00ff7f' : r.ledgerStatus === 'none' ? '#555' : '#ffd700' }}>
                      {r.ledgerStatus.toUpperCase()}
                    </td>
                    <td style={{ padding: '12px', color: r.queueStatus === 'none' ? '#555' : '#00f2fe' }}>
                      {r.queueStatus.toUpperCase()}
                    </td>
                    <td style={{ padding: '12px', color: r.allowlistStatus === 'operator_trusted' ? '#00ff7f' : r.allowlistStatus === 'none' ? '#555' : '#ccc' }}>
                      {r.allowlistStatus.toUpperCase()}
                    </td>
                    <td style={{ padding: '12px', color: r.manifestStatus === 'present_in_manifest' ? '#00ff7f' : '#555' }}>
                      {r.manifestStatus.replace(/_/g, ' ').toUpperCase()}
                    </td>
                    <td style={{ padding: '12px', color: r.indexStatus === 'indexed' ? '#00ff7f' : '#555' }}>
                      {r.indexStatus.toUpperCase()}
                    </td>
                    <td style={{ padding: '12px', color: r.evidenceStatus === 'present' ? '#00ff7f' : r.evidenceStatus === 'partial' ? '#ffd700' : '#ff4500' }}>
                      {r.evidenceStatus.toUpperCase()}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
