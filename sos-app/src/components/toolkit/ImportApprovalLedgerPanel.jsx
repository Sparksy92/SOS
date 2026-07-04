import React, { useState, useEffect } from 'react';
import { 
  loadLedger, 
  saveRecord, 
  deleteRecord, 
  validateAndImport, 
  generateMarkdownReport, 
  DECISIONS, 
  isValidUrl 
} from '../../modules/toolkit/importApprovalLedgerStore.js';
import { ShieldAlert, Download, Upload, Trash2, Edit3, Save, CheckCircle, XCircle, Clock, FileText, AlertTriangle } from 'lucide-react';

export default function ImportApprovalLedgerPanel() {
  const [ledger, setLedger] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  
  // Editor State
  const [editFilename, setEditFilename] = useState('');
  const [editCategory, setEditCategory] = useState('general_survival');
  const [editDecision, setEditDecision] = useState('pending');
  const [editVerified, setEditVerified] = useState(false);
  const [editSourceUrl, setEditSourceUrl] = useState('');
  const [editMirrorUrl, setEditMirrorUrl] = useState('');
  const [editEvidence, setEditEvidence] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editReviewer, setEditReviewer] = useState('');
  
  const [importText, setImportText] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    setLedger(loadLedger());
  }, []);

  const showStatus = (text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage({ text: '', type: '' });
    }, 4000);
  };

  const handleSelectRecord = (record) => {
    setSelectedRecord(record);
    setEditFilename(record.filename);
    setEditCategory(record.detectedCategory);
    setEditDecision(record.operatorDecision);
    setEditVerified(record.operatorVerifiedSource);
    setEditSourceUrl(record.officialSourceUrl);
    setEditMirrorUrl(record.thirdPartyMirrorUrl);
    setEditEvidence(record.licenseEvidence);
    setEditNotes(record.reviewNotes);
    setEditReviewer(record.reviewedBy || '');
  };

  const handleAddNewRecord = () => {
    setSelectedRecord({
      isNew: true,
      filename: '',
      detectedCategory: 'general_survival',
      operatorDecision: 'pending',
      operatorVerifiedSource: false,
      officialSourceUrl: '',
      thirdPartyMirrorUrl: '',
      licenseEvidence: '',
      reviewNotes: '',
      reviewedBy: ''
    });
    setEditFilename('');
    setEditCategory('general_survival');
    setEditDecision('pending');
    setEditVerified(false);
    setEditSourceUrl('');
    setEditMirrorUrl('');
    setEditEvidence('');
    setEditNotes('');
    setEditReviewer('');
  };

  const handleSave = () => {
    if (!editFilename.trim()) {
      showStatus("Filename is required.", "error");
      return;
    }
    if (!isValidUrl(editSourceUrl) || !isValidUrl(editMirrorUrl)) {
      showStatus("URLs must start with http:// or https://", "error");
      return;
    }

    try {
      const records = saveRecord({
        id: selectedRecord?.isNew ? undefined : selectedRecord?.id,
        filename: editFilename,
        sanitizedPath: selectedRecord?.sanitizedPath || `[IMPORT_STAGING]/${editFilename}`,
        detectedCategory: editCategory,
        riskCategory: selectedRecord?.riskCategory || null,
        suggestedLicenseStatus: selectedRecord?.suggestedLicenseStatus || 'unknown',
        matchConfidence: selectedRecord?.matchConfidence || 'none',
        operatorDecision: editDecision,
        operatorVerifiedSource: editVerified,
        officialSourceUrl: editSourceUrl,
        thirdPartyMirrorUrl: editMirrorUrl,
        licenseEvidence: editEvidence,
        reviewNotes: editNotes,
        reviewedBy: editReviewer
      });
      setLedger(records);
      setSelectedRecord(null);
      showStatus("Approval record saved successfully.", "success");
    } catch (e) {
      showStatus(e.message, "error");
    }
  };

  const handleDelete = (filename) => {
    if (window.confirm(`Are you sure you want to delete the approval log for "${filename}"?`)) {
      const records = deleteRecord(filename);
      setLedger(records);
      setSelectedRecord(null);
      showStatus("Record deleted from ledger.", "success");
    }
  };

  const handleClearAll = () => {
    if (window.confirm("CRITICAL WARNING: This will permanently wipe the entire operator approval ledger. This action is local-only and cannot be undone. Proceed?")) {
      localStorage.removeItem('sos_import_approval_ledger');
      setLedger([]);
      setSelectedRecord(null);
      showStatus("Approval ledger successfully cleared.", "success");
    }
  };

  const triggerExportJSON = () => {
    const dataStr = JSON.stringify(ledger, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sos_approval_ledger_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    showStatus("JSON export completed.", "success");
  };

  const triggerExportMarkdown = () => {
    const md = generateMarkdownReport(ledger);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sos_approval_ledger_report_${new Date().toISOString().split('T')[0]}.md`;
    link.click();
    showStatus("Markdown report generated and downloaded.", "success");
  };

  const handleImportJSON = () => {
    if (!importText.trim()) {
      showStatus("Import input cannot be empty.", "error");
      return;
    }
    try {
      const records = validateAndImport(importText);
      setLedger(records);
      setImportText('');
      setShowImportArea(false);
      showStatus("Ledger successfully imported and merged.", "success");
    } catch (e) {
      showStatus(e.message, "error");
    }
  };

  const getDecisionBadge = (decision) => {
    switch (decision) {
      case 'approved':
        return <span style={{ color: '#00ff7f', backgroundColor: 'rgba(0, 255, 127, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>APPROVED</span>;
      case 'rejected':
        return <span style={{ color: '#ff4500', backgroundColor: 'rgba(255, 69, 0, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>REJECTED</span>;
      case 'needs_more_evidence':
        return <span style={{ color: '#ffd700', backgroundColor: 'rgba(255, 215, 0, 0.1)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>NEEDS EVIDENCE</span>;
      default:
        return <span style={{ color: '#a0a0a0', backgroundColor: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 'bold' }}>PENDING</span>;
    }
  };

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Library Governance & Operator Approval Ledger
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            Document licensing audits, mirror verifications, and safety checklists for staged reference materials.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-tactical-outline" onClick={handleAddNewRecord} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Add Entry
          </button>
          <button className="btn-tactical-outline" onClick={() => setShowImportArea(!showImportArea)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
            Import Backup
          </button>
        </div>
      </div>

      {/* Disclaimers Banner */}
      <div style={{ backgroundColor: 'rgba(255, 215, 0, 0.02)', border: '1px solid rgba(255, 215, 0, 0.15)', borderRadius: '6px', padding: '12px', marginBottom: '20px' }}>
        <h5 style={{ margin: '0 0 6px 0', color: '#ffd700', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase' }}>
          <ShieldAlert size={14} />
          Operator Audit Trace Disclaimer
        </h5>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#ccc', lineHeight: '1.3' }}>
          <strong>Operator-approved record exists.</strong> This ledger records subjective audit checkpoints and evidence url notes. It does NOT automatically verify legal copyright clearances or guarantee document safety boundaries.
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

      {/* Backup Import Block */}
      {showImportArea && (
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255, 255, 255, 0.05)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '0.92rem', color: '#fff' }}>Paste Ledger Backup JSON</h4>
          <textarea
            rows={5}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder='[ { "filename": "example.pdf", "operatorDecision": "approved", ... } ]'
            style={{
              width: '100%',
              backgroundColor: '#161a22',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              color: '#fff',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              padding: '10px',
              boxSizing: 'border-box',
              marginBottom: '10px'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={handleImportJSON} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
              Verify & Import
            </button>
            <button className="btn-tactical-outline" onClick={() => setShowImportArea(false)} style={{ padding: '4px 12px', fontSize: '0.8rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Two Column Layout: List and Editor */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
        {/* Left Side: Ledger Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0, color: '#fff', fontSize: '0.98rem' }}>Ledger Entries ({ledger.length})</h4>
            {ledger.length > 0 && (
              <div style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-tactical-outline" onClick={triggerExportJSON} title="Export JSON" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                  <Download size={12} />
                  <span>JSON</span>
                </button>
                <button className="btn-tactical-outline" onClick={triggerExportMarkdown} title="Export Report" style={{ padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem' }}>
                  <FileText size={12} />
                  <span>Report</span>
                </button>
                <button className="btn-tactical-outline" onClick={handleClearAll} title="Clear Ledger" style={{ padding: '4px 8px', color: '#ff4500', borderColor: 'rgba(255,69,0,0.2)' }}>
                  <Trash2 size={12} />
                </button>
              </div>
            )}
          </div>

          {ledger.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
              {ledger.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleSelectRecord(item)}
                  style={{
                    backgroundColor: selectedRecord?.filename === item.filename ? '#19202c' : '#12151c',
                    border: selectedRecord?.filename === item.filename ? '1px solid var(--brand-primary)' : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '6px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#fff', fontSize: '0.88rem', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                      {item.filename}
                    </strong>
                    {getDecisionBadge(item.operatorDecision)}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>
                    Category: <span style={{ color: '#ccc' }}>{item.detectedCategory.replace(/_/g, ' ')}</span>
                  </div>
                  {item.operatorVerifiedSource && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', color: '#00ff7f', marginTop: '4px' }}>
                      <CheckCircle size={10} />
                      <span>Source Manually Verified</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: '#12151c', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.03)', color: '#888', fontSize: '0.85rem' }}>
              No approval entries. Use "Create Review Record" in the Manual Import tab, or click "Add Entry" to log a record manually.
            </div>
          )}
        </div>

        {/* Right Side: Record Editor */}
        <div>
          {selectedRecord ? (
            <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '16px' }}>
              <h4 style={{ margin: '0 0 16px 0', fontSize: '0.98rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Edit3 size={16} style={{ color: 'var(--brand-primary)' }} />
                {selectedRecord.isNew ? 'New Approval Entry' : 'Edit Review Entry'}
              </h4>

              {/* Filename */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Filename</label>
                <input
                  type="text"
                  value={editFilename}
                  onChange={(e) => setEditFilename(e.target.value)}
                  disabled={!selectedRecord.isNew}
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#161a22',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                  placeholder="FM_21-76_Survival.pdf"
                />
              </div>

              {/* Category & Decision */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Category</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#161a22',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="general_survival">General Survival</option>
                    <option value="medical_reference">Medical Reference</option>
                    <option value="water">Water Sanitation</option>
                    <option value="homesteading">Homesteading</option>
                    <option value="farming">Farming</option>
                    <option value="bushcraft">Bushcraft</option>
                    <option value="shelter">Shelter</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Operator Decision</label>
                  <select
                    value={editDecision}
                    onChange={(e) => setEditDecision(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px',
                      backgroundColor: '#161a22',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '0.82rem',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                    <option value="needs_more_evidence">Needs Evidence</option>
                  </select>
                </div>
              </div>

              {/* Manual Verification Checkbox */}
              <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  id="source-verified-cb"
                  checked={editVerified}
                  onChange={(e) => setEditVerified(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <label htmlFor="source-verified-cb" style={{ fontSize: '0.78rem', color: '#aaa', cursor: 'pointer' }}>
                  Mark source URL manually verified
                </label>
              </div>

              {/* Official Source URL */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Official Source URL (https only)</label>
                <input
                  type="text"
                  value={editSourceUrl}
                  onChange={(e) => setEditSourceUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#161a22',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Mirror URL */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Mirror URL (https only)</label>
                <input
                  type="text"
                  value={editMirrorUrl}
                  onChange={(e) => setEditMirrorUrl(e.target.value)}
                  placeholder="https://..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#161a22',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* License Evidence */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>License/Authority Evidence</label>
                <input
                  type="text"
                  value={editEvidence}
                  onChange={(e) => setEditEvidence(e.target.value)}
                  placeholder="e.g. Public domain due to US Government publication"
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#161a22',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Notes */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Audit/Review Notes</label>
                <textarea
                  rows={3}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Enter evaluation details, contents audit remarks..."
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#161a22',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box',
                    fontFamily: 'sans-serif'
                  }}
                />
              </div>

              {/* Reviewer callsign */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Reviewer Name/Callsign</label>
                <input
                  type="text"
                  value={editReviewer}
                  onChange={(e) => setEditReviewer(e.target.value)}
                  placeholder="Operator 01 / Callsign"
                  style={{
                    width: '100%',
                    padding: '8px',
                    backgroundColor: '#161a22',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '0.82rem',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                {!selectedRecord.isNew && (
                  <button className="btn-tactical-outline" onClick={() => handleDelete(editFilename)} style={{ color: '#ff4500', borderColor: 'rgba(255,69,0,0.2)' }}>
                    Delete Record
                  </button>
                )}
                <button className="btn-tactical-outline" onClick={() => setSelectedRecord(null)}>
                  Cancel
                </button>
                <button className="btn-tactical" onClick={handleSave} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Save size={14} />
                  <span>Save Record</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px', backgroundColor: '#12151c', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.05)', color: '#888' }}>
              <FileText size={48} style={{ color: '#444', marginBottom: '12px' }} />
              <h5 style={{ margin: '0 0 6px 0', color: '#ccc' }}>No Entry Selected</h5>
              <p style={{ margin: 0, fontSize: '0.78rem', color: '#888' }}>
                Select an entry in the ledger index or create a new entry to inspect and modify reviews.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
