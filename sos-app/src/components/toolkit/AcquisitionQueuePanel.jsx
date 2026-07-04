import React, { useState, useEffect } from 'react';
import { 
  loadQueue, 
  saveQueueItem, 
  deleteQueueItem, 
  validateAndImportQueue, 
  generateQueueMarkdownChecklist, 
  ACQ_STATUSES 
} from '../../modules/toolkit/acquisitionQueueStore.js';
import { ShieldAlert, Download, Upload, Clipboard, Trash2, Edit2, CheckCircle, Plus } from 'lucide-react';

export default function AcquisitionQueuePanel() {
  const [queue, setQueue] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [editingItem, setEditingItem] = useState(null);
  const [importJson, setImportJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    filenameHint: '',
    category: 'general_survival',
    sourceType: 'operator_entered',
    officialSourceUrl: '',
    sourceEvidence: '',
    operatorNotes: '',
    acquisitionStatus: 'planned'
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setQueue(loadQueue());
  }, []);

  const handleSaveItem = (item) => {
    try {
      const updated = saveQueueItem(item);
      setQueue(updated);
      setEditingItem(null);
      if (showAddForm) {
        setShowAddForm(false);
        setNewItem({
          title: '',
          filenameHint: '',
          category: 'general_survival',
          sourceType: 'operator_entered',
          officialSourceUrl: '',
          sourceEvidence: '',
          operatorNotes: '',
          acquisitionStatus: 'planned'
        });
      }
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteItem = (id) => {
    if (confirm("Are you sure you want to remove this item from the acquisition queue?")) {
      const updated = deleteQueueItem(id);
      setQueue(updated);
    }
  };

  const handleClearAll = () => {
    if (confirm("CRITICAL: Clear your entire local acquisition queue? This action is local and cannot be undone.")) {
      localStorage.removeItem('sos_acquisition_queue');
      setQueue([]);
    }
  };

  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => alert("Official Source URL copied to clipboard!"))
      .catch(() => alert("Failed to copy URL."));
  };

  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(queue, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_acquisition_queue_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const handleExportMarkdown = () => {
    const md = generateQueueMarkdownChecklist(queue);
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_acquisition_checklist_${Date.now()}.md`);
    dlAnchorElem.click();
  };

  const handleImportJson = () => {
    try {
      const updated = validateAndImportQueue(importJson);
      setQueue(updated);
      setImportJson('');
      setShowImportArea(false);
      alert("Acquisition Queue imported successfully!");
    } catch (e) {
      alert(e.message);
    }
  };

  const filteredQueue = queue.filter(item => {
    const matchStatus = filterStatus === 'all' || item.acquisitionStatus === filterStatus;
    const matchCategory = filterCategory === 'all' || item.category === filterCategory;
    return matchStatus && matchCategory;
  });

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '1000px', margin: '0 auto', padding: '0 12px' }}>
      <div style={{ marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Acquisition Queue
        </h3>
        <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
          Manage local planning checklists for manually gathering reference library documents. SurvivalOS does not automate downloads.
        </p>
      </div>

      {/* Security Boundaries Alert */}
      <div style={{ backgroundColor: 'rgba(255, 69, 0, 0.04)', border: '1px solid rgba(255, 69, 0, 0.25)', borderRadius: '6px', padding: '14px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4500', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px' }}>
          <ShieldAlert size={16} />
          <span>Local Planning Layer Only</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#b0b0b0', lineHeight: '1.4' }}>
          This checklist tracks candidate references and operator staging notes. It does NOT verify legal copyright clearance, perform downloads, or copy/move actual files on your storage drive.
        </p>
      </div>

      {/* Buttons controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-tactical" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}>
            <Plus size={14} /> Add Planned Item
          </button>
          <button className="btn-tactical-outline" onClick={() => setShowImportArea(!showImportArea)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}>
            <Upload size={14} /> Import Backup
          </button>
          <button className="btn-tactical-outline" onClick={handleExportJson} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}>
            <Download size={14} /> Export JSON
          </button>
          <button className="btn-tactical-outline" onClick={handleExportMarkdown} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '8px 14px' }}>
            <Clipboard size={14} /> Export Checklist
          </button>
        </div>
        <div>
          {queue.length > 0 && (
            <button className="btn-tactical-outline" onClick={handleClearAll} style={{ color: '#ff4500', borderColor: 'rgba(255, 69, 0, 0.2)' }}>
              Clear Queue
            </button>
          )}
        </div>
      </div>

      {/* Import Backup Textarea */}
      {showImportArea && (
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#aaa', marginBottom: '6px' }}>Paste Acquisition Queue JSON backup:</label>
          <textarea
            value={importJson}
            onChange={(e) => setImportJson(e.target.value)}
            style={{ width: '100%', height: '100px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '8px', fontSize: '0.8rem', fontFamily: 'monospace', resize: 'vertical' }}
            placeholder='[ { "title": "...", "acquisitionStatus": "planned" } ]'
          />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={handleImportJson}>Confirm Import</button>
            <button className="btn-tactical-outline" onClick={() => setShowImportArea(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Add Item Form */}
      {showAddForm && (
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.2)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--brand-primary)' }}>Register New Planned Acquisition</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Document Title *</label>
              <input
                type="text"
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
                placeholder="e.g. FM 21-76 Survival Manual"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Filename Hint</label>
              <input
                type="text"
                value={newItem.filenameHint}
                onChange={(e) => setNewItem({ ...newItem, filenameHint: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
                placeholder="FM_21-76_Survival_Manual.pdf"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Category</label>
              <select
                value={newItem.category}
                onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
              >
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
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Official Source URL</label>
              <input
                type="text"
                value={newItem.officialSourceUrl}
                onChange={(e) => setNewItem({ ...newItem, officialSourceUrl: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
                placeholder="https://..."
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Source Evidence / Authorities</label>
              <input
                type="text"
                value={newItem.sourceEvidence}
                onChange={(e) => setNewItem({ ...newItem, sourceEvidence: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
                placeholder="e.g. Public distribution record / Government publication"
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Operator Notes</label>
              <textarea
                value={newItem.operatorNotes}
                onChange={(e) => setNewItem({ ...newItem, operatorNotes: e.target.value })}
                style={{ width: '100%', height: '60px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem', resize: 'vertical' }}
                placeholder="Manual staging notes, mirror URLs, or local print locations..."
              />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={() => handleSaveItem(newItem)}>Save Entry</button>
            <button className="btn-tactical-outline" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Form Modal */}
      {editingItem && (
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.4)', borderRadius: '6px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: 'var(--brand-primary)' }}>Edit Queue Item: {editingItem.title}</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Acquisition Status</label>
              <select
                value={editingItem.acquisitionStatus}
                onChange={(e) => setEditingItem({ ...editingItem, acquisitionStatus: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
              >
                <option value="planned">PLANNED</option>
                <option value="manually_acquired">MANUALLY ACQUIRED</option>
                <option value="manually_staged">MANUALLY STAGED</option>
                <option value="blocked">BLOCKED</option>
                <option value="skipped">SKIPPED</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Official Source URL</label>
              <input
                type="text"
                value={editingItem.officialSourceUrl}
                onChange={(e) => setEditingItem({ ...editingItem, officialSourceUrl: e.target.value })}
                style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem' }}
              />
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: '#aaa', marginBottom: '4px' }}>Operator Notes</label>
              <textarea
                value={editingItem.operatorNotes}
                onChange={(e) => setEditingItem({ ...editingItem, operatorNotes: e.target.value })}
                style={{ width: '100%', height: '60px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '6px', fontSize: '0.8rem', resize: 'vertical' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
            <button className="btn-tactical" onClick={() => handleSaveItem(editingItem)}>Save Changes</button>
            <button className="btn-tactical-outline" onClick={() => setEditingItem(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', backgroundColor: '#10131a', padding: '12px', borderRadius: '6px', border: '1px solid #222', marginBottom: '20px' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#aaa', marginRight: '6px' }}>Status Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
          >
            <option value="all">ALL STATUSES</option>
            <option value="planned">PLANNED</option>
            <option value="manually_acquired">MANUALLY ACQUIRED</option>
            <option value="manually_staged">MANUALLY STAGED</option>
            <option value="blocked">BLOCKED</option>
            <option value="skipped">SKIPPED</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#aaa', marginRight: '6px' }}>Category Filter:</label>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{ backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '4px 8px', fontSize: '0.8rem' }}
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
      </div>

      {/* Queue items list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredQueue.length === 0 ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#666', border: '1px dashed #222', borderRadius: '6px' }}>
            No planned items found matching active filters.
          </div>
        ) : (
          filteredQueue.map(item => {
            let statusColor = '#a0a0a0';
            if (item.acquisitionStatus === 'manually_acquired') statusColor = '#00ff7f';
            if (item.acquisitionStatus === 'manually_staged') statusColor = '#00f2fe';
            if (item.acquisitionStatus === 'blocked') statusColor = '#ff4500';
            if (item.acquisitionStatus === 'skipped') statusColor = '#ff7f50';

            return (
              <div 
                key={item.id} 
                style={{ 
                  backgroundColor: '#12151c', 
                  border: '1px solid rgba(255, 255, 255, 0.05)', 
                  borderRadius: '6px', 
                  padding: '16px',
                  borderLeft: `4px solid ${statusColor}`
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '1rem' }}>{item.title}</strong>
                    <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '4px' }}>
                      Category: <span style={{ color: '#ccc' }}>{item.category.replace(/_/g, ' ')}</span>
                      {item.filenameHint && <span> | File Hint: <code style={{ color: '#00f2fe' }}>{item.filenameHint}</code></span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span 
                      style={{ 
                        fontSize: '0.72rem', 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        backgroundColor: 'rgba(255,255,255,0.05)', 
                        color: statusColor, 
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}
                    >
                      {item.acquisitionStatus.replace(/_/g, ' ')}
                    </span>
                    <button 
                      className="btn-tactical-outline" 
                      onClick={() => setEditingItem(item)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', border: '1px solid #333' }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <button 
                      className="btn-tactical-outline" 
                      onClick={() => handleDeleteItem(item.id)}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', border: '1px solid rgba(255,69,0,0.1)', color: '#ff4500' }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>

                <div style={{ marginTop: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.8rem', color: '#ccc' }}>
                  <div>
                    <strong>Evidence Notes:</strong> {item.sourceEvidence || 'None registered'}
                  </div>
                  <div>
                    <strong>Ledger status:</strong> <span style={{ color: item.ledgerDecision === 'approved' ? '#00ff7f' : '#ff4500', fontWeight: 'bold' }}>{item.ledgerDecision.toUpperCase()}</span>
                  </div>
                  {item.riskCategory && (
                    <div style={{ gridColumn: 'span 2', color: '#ffd700', fontSize: '0.75rem', backgroundColor: 'rgba(255,215,0,0.03)', padding: '4px 8px', borderRadius: '4px' }}>
                      ⚠️ Warning: Content involves {item.riskCategory.replace(/_/g, ' ')}. Requires manual review.
                    </div>
                  )}
                  {item.officialSourceUrl && (
                    <div style={{ gridColumn: 'span 2', display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#888' }}>Source:</span>
                      <code style={{ fontSize: '0.78rem', color: 'var(--brand-primary)' }}>{item.officialSourceUrl}</code>
                      <button 
                        onClick={() => handleCopyUrl(item.officialSourceUrl)}
                        style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', display: 'inline-flex', padding: 0 }}
                        title="Copy URL"
                      >
                        <Clipboard size={12} />
                      </button>
                    </div>
                  )}
                  {item.operatorNotes && (
                    <div style={{ gridColumn: 'span 2', fontSize: '0.78rem', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '6px', color: '#aaa' }}>
                      <strong>Operator notes:</strong> {item.operatorNotes}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
