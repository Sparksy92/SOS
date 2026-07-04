import React, { useState, useEffect } from 'react';
import { 
  loadAllowlist, 
  saveAllowlistEntry, 
  deleteAllowlistEntry, 
  validateAndImportAllowlist, 
  generateAllowlistMarkdownReport 
} from '../../modules/toolkit/sourceAllowlistStore.js';
import { ShieldAlert, Download, Upload, Clipboard, Trash2, Edit2, CheckSquare, Square, Plus } from 'lucide-react';

export default function SourceAllowlistPanel() {
  const [list, setList] = useState([]);
  const [editingEntry, setEditingEntry] = useState(null);
  const [importJson, setImportJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({
    label: '',
    officialSourceUrl: '',
    sourceType: 'public_domain_archive',
    sourceEvidence: '',
    categories: [],
    riskCategories: [],
    operatorTrusted: false,
    operatorNotes: ''
  });

  useEffect(() => {
    setList(loadAllowlist());
  }, []);

  const handleSaveEntry = (entry) => {
    try {
      const updated = saveAllowlistEntry(entry);
      setList(updated);
      setEditingEntry(null);
      if (showAddForm) {
        setShowAddForm(false);
        setNewEntry({
          label: '',
          officialSourceUrl: '',
          sourceType: 'public_domain_archive',
          sourceEvidence: '',
          categories: [],
          riskCategories: [],
          operatorTrusted: false,
          operatorNotes: ''
        });
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteEntry = (id) => {
    if (confirm("Are you sure you want to delete this source from the allowlist?")) {
      const updated = deleteAllowlistEntry(id);
      setList(updated);
    }
  };

  const handleClearAll = () => {
    if (confirm("CRITICAL: Clear your entire source allowlist? This action is local and cannot be undone.")) {
      localStorage.removeItem('sos_source_allowlist');
      setList([]);
    }
  };

  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => alert("Official URL copied to clipboard!"))
      .catch(() => alert("Failed to copy URL."));
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(list, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_source_allowlist_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const handleExportMarkdown = () => {
    const md = generateAllowlistMarkdownReport(list);
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_allowlist_report_${Date.now()}.md`);
    dlAnchorElem.click();
  };

  const handleImportJson = () => {
    try {
      const updated = validateAndImportAllowlist(importJson);
      setList(updated);
      setImportJson('');
      setShowImportArea(false);
      alert("Source Allowlist imported successfully!");
    } catch (e) {
      alert(e.message);
    }
  };

  const toggleCategory = (entry, cat, isNew = false) => {
    const target = isNew ? newEntry : entry;
    const cats = target.categories || [];
    const updatedCats = cats.includes(cat)
      ? cats.filter(c => c !== cat)
      : [...cats, cat];
    
    if (isNew) {
      setNewEntry({ ...newEntry, categories: updatedCats });
    } else {
      setEditingEntry({ ...editingEntry, categories: updatedCats });
    }
  };

  const CATEGORY_OPTIONS = [
    'general_survival',
    'homesteading',
    'farming',
    'water',
    'bushcraft',
    'shelter',
    'medical_reference'
  ];

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '1000px', margin: '0 auto', padding: '0 12px' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Source Allowlist
        </h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
          Maintain a local registry of trusted official repositories and archives. Wording references operator-trust decisions only.
        </p>
      </div>

      {/* Security Alert */}
      <div style={{ backgroundColor: 'rgba(255, 69, 0, 0.04)', border: '1px solid rgba(255, 69, 0, 0.25)', borderRadius: '6px', padding: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4500', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px' }}>
          <ShieldAlert size={16} />
          <span>Operator Verification Standard</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#b0b0b0', lineHeight: '1.4' }}>
          An entry marked as "Operator Trusted" indicates the operator trusts this mirror for manual reviews. It does NOT mean SurvivalOS has verified legal copyright clearances or license accuracy.
        </p>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-tactical" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}>
            <Plus size={14} /> Add Allowlisted Source
          </button>
          <button className="btn-tactical-outline" onClick={() => setShowImportArea(!showImportArea)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}>
            <Upload size={14} /> Import Backup
          </button>
          <button className="btn-tactical-outline" onClick={handleExportJson} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}>
            <Download size={14} /> Export JSON
          </button>
          <button className="btn-tactical-outline" onClick={handleExportMarkdown} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}>
            <Clipboard size={14} /> Export Report
          </button>
        </div>
        <div>
          {list.length > 0 && (
            <button className="btn-tactical-outline" onClick={handleClearAll} style={{ color: '#ff4500', borderColor: 'rgba(255, 69, 0, 0.2)' }}>
              Clear Allowlist
            </button>
          )}
        </div>
      </div>

      {/* Import Backup */}
      {showImportArea && (
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '6px' }}>Paste Source Allowlist JSON:</label>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            style={{ width: '100%', height: '100px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '8px', fontSize: '0.8rem', fontFamily: 'monospace', resize: 'vertical' }}
            placeholder='[ { "label": "Internet Archive", "officialSourceUrl": "..." } ]'
          />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={handleImportJson}>Confirm Import</button>
            <button className="btn-tactical-outline" onClick={() => setShowImportArea(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add Entry Form */}
      {showAddForm && (
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--brand-primary)' }}>Register New Allowed Source</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Source Label / Description *</label>
              <input
                type="text"
                value={newEntry.label}
                onChange={(e) => setNewEntry({ ...newEntry, label: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
                placeholder="e.g. Internet Archive — FM 21-76"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Official URL *</label>
              <input
                type="text"
                value={newEntry.officialSourceUrl}
                onChange={(e) => setNewEntry({ ...newEntry, officialSourceUrl: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
                placeholder="https://..."
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Source Type</label>
              <select
                value={newEntry.sourceType}
                onChange={(e) => setNewEntry({ ...newEntry, sourceType: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
              >
                <option value="public_domain_archive">Public Domain Archive</option>
                <option value="official_source">Official Source</option>
                <option value="open_access_publisher">Open Access Publisher</option>
                <option value="operator_entered">Operator Entered</option>
                <option value="unknown">Unknown</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
              <button 
                onClick={() => setNewEntry({ ...newEntry, operatorTrusted: !newEntry.operatorTrusted })}
                style={{ background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: 0 }}
              >
                {newEntry.operatorTrusted ? <CheckSquare size={16} /> : <Square size={16} />}
                <span style={{ fontSize: '0.8rem', color: '#fff' }}>Operator Trusted</span>
              </button>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Categories (Applicable)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(null, cat, true)}
                    style={{ 
                      backgroundColor: newEntry.categories.includes(cat) ? 'rgba(0, 242, 254, 0.15)' : '#0d1017',
                      color: newEntry.categories.includes(cat) ? '#00f2fe' : '#aaa',
                      border: newEntry.categories.includes(cat) ? '1px solid #00f2fe' : '1px solid #333',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Evidence / Verifications</label>
              <input
                type="text"
                value={newEntry.sourceEvidence}
                onChange={(e) => setNewEntry({ ...newEntry, sourceEvidence: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
                placeholder="e.g. Verified gov publication index / public domain archive details"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Notes</label>
              <textarea
                value={newEntry.operatorNotes}
                onChange={(e) => setNewEntry({ ...newEntry, operatorNotes: e.target.value })}
                style={{ width: '100%', height: '60px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem', resize: 'vertical' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={() => handleSaveEntry(newEntry)}>Save Source</button>
            <button className="btn-tactical-outline" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Entry Form Modal */}
      {editingEntry && (
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.4)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--brand-primary)' }}>Edit Entry: {editingEntry.label}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Official URL</label>
              <input
                type="text"
                value={editingEntry.officialSourceUrl}
                onChange={(e) => setEditingEntry({ ...editingEntry, officialSourceUrl: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '20px' }}>
              <button 
                onClick={() => setEditingEntry({ ...editingEntry, operatorTrusted: !editingEntry.operatorTrusted })}
                style={{ background: 'none', border: 'none', color: '#00f2fe', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: 0 }}
              >
                {editingEntry.operatorTrusted ? <CheckSquare size={16} /> : <Square size={16} />}
                <span style={{ fontSize: '0.8rem', color: '#fff' }}>Operator Trusted</span>
              </button>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Categories (Applicable)</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORY_OPTIONS.map(cat => (
                  <button
                    key={cat}
                    onClick={() => toggleCategory(editingEntry, cat, false)}
                    style={{ 
                      backgroundColor: (editingEntry.categories || []).includes(cat) ? 'rgba(0, 242, 254, 0.15)' : '#0d1017',
                      color: (editingEntry.categories || []).includes(cat) ? '#00f2fe' : '#aaa',
                      border: (editingEntry.categories || []).includes(cat) ? '1px solid #00f2fe' : '1px solid #333',
                      borderRadius: '4px',
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      cursor: 'pointer'
                    }}
                  >
                    {cat.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Notes</label>
              <textarea
                value={editingEntry.operatorNotes}
                onChange={(e) => setEditingEntry({ ...editingEntry, operatorNotes: e.target.value })}
                style={{ width: '100%', height: '60px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem', resize: 'vertical' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={() => handleSaveEntry(editingEntry)}>Save Changes</button>
            <button className="btn-tactical-outline" onClick={() => setEditingEntry(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Allowlist entries list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {list.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#666', border: '1px dashed #222', borderRadius: '6px' }}>
            No allowed sources registered. Click "Add Allowlisted Source" to begin.
          </div>
        ) : (
          list.map(entry => (
            <div 
              key={entry.id} 
              style={{ 
                backgroundColor: '#12151c', 
                border: '1px solid rgba(255, 255, 255, 0.05)', 
                borderRadius: '6px', 
                padding: '16px',
                borderLeft: entry.operatorTrusted ? '4px solid #00ff7f' : '4px solid #333'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong style={{ color: '#fff', fontSize: '1rem' }}>{entry.label}</strong>
                  <span style={{ fontSize: '0.72rem', color: '#888', marginLeft: '8px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.05)' }}>
                    {entry.sourceType.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button 
                    onClick={() => handleSaveEntry({ ...entry, operatorTrusted: !entry.operatorTrusted })}
                    style={{ background: 'none', border: 'none', color: entry.operatorTrusted ? '#00ff7f' : '#666', cursor: 'pointer', display: 'flex', padding: 0 }}
                    title={entry.operatorTrusted ? "Trusted" : "Untrusted"}
                  >
                    {entry.operatorTrusted ? <CheckSquare size={16} /> : <Square size={16} />}
                  </button>
                  <button 
                    className="btn-tactical-outline" 
                    onClick={() => setEditingEntry(entry)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #333' }}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    className="btn-tactical-outline" 
                    onClick={() => handleDeleteEntry(entry.id)}
                    style={{ padding: '4px 8px', fontSize: '0.75rem', border: '1px solid rgba(255,69,0,0.1)', color: '#ff4500' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: '#ccc' }}>
                {entry.categories.length > 0 && (
                  <div>
                    <strong>Categories:</strong> {entry.categories.map(c => c.replace(/_/g, ' ')).join(', ')}
                  </div>
                )}
                <div>
                  <strong>Evidence:</strong> {entry.sourceEvidence || 'None registered'}
                </div>
                {entry.officialSourceUrl && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#888' }}>URL:</span>
                    <code style={{ fontSize: '0.78rem', color: 'var(--brand-primary)' }}>{entry.officialSourceUrl}</code>
                    <button 
                      onClick={() => handleCopyUrl(entry.officialSourceUrl)}
                      style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'inline-flex', padding: 0 }}
                      title="Copy URL"
                    >
                      <Clipboard size={12} />
                    </button>
                  </div>
                )}
                {entry.operatorNotes && (
                  <div style={{ fontSize: '0.78rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px', color: '#aaa' }}>
                    <strong>Notes:</strong> {entry.operatorNotes}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
