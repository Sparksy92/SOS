import React, { useState, useEffect } from 'react';
import { loadQueue, saveQueueItem, deleteQueueItem } from '../../modules/toolkit/acquisitionQueueStore.js';
import { Trash2, Plus, CheckCircle, Circle, Clipboard } from 'lucide-react';

export default function AcquisitionQueuePanel() {
  const [wishlist, setWishlist] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('general_survival');
  const [newNotes, setNewNotes] = useState('');

  const reloadWishlist = () => {
    const q = loadQueue();
    setWishlist(q);
  };

  useEffect(() => {
    reloadWishlist();
  }, []);

  const handleAddWish = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      saveQueueItem({
        title: newTitle.trim(),
        category: newCategory,
        operatorNotes: newNotes.trim(),
        acquisitionStatus: 'planned',
        sourceType: 'operator_entered'
      });
      reloadWishlist();
      setNewTitle('');
      setNewNotes('');
      setShowAddForm(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleToggleAcquired = (item) => {
    try {
      saveQueueItem({
        ...item,
        acquisitionStatus: item.acquisitionStatus === 'manually_acquired' ? 'planned' : 'manually_acquired'
      });
      reloadWishlist();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteWish = (id) => {
    if (confirm("Are you sure you want to remove this item from your wishlist?")) {
      deleteQueueItem(id);
      reloadWishlist();
    }
  };

  const triggerExportMarkdown = () => {
    let md = `# SurvivalOS — Librarian Content Wishlist\n\n`;
    md += `| [ ] | Title | Category | Notes |\n`;
    md += `| --- | --- | --- | --- |\n`;
    wishlist.forEach(w => {
      const checked = w.acquisitionStatus === 'manually_acquired' ? '[x]' : '[ ]';
      md += `| ${checked} | **${w.title}** | ${w.category.replace(/_/g, ' ')} | ${w.operatorNotes || 'None'} |\n`;
    });

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_librarian_wishlist_${Date.now()}.md`);
    dlAnchorElem.click();
  };

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '800px', margin: '0 auto', padding: '0 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Librarian Wishlist
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            Track reference guides, offline maps, or wikis you want to vet and add to your library next.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-tactical" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <Plus size={14} /> Add Wishlist Item
          </button>
          <button className="btn-tactical-outline" onClick={triggerExportMarkdown} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <Clipboard size={12} /> Export Markdown Checklist
          </button>
        </div>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddWish} style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1rem' }}>Add New Book / Resource to Wishlist</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Resource Title / Subject</label>
              <input
                type="text"
                placeholder="e.g. US Army Survival Manual FM 21-76"
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Library Category</label>
              <select
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', cursor: 'pointer' }}
              >
                <option value="general_survival">General Survival</option>
                <option value="homesteading">Homesteading</option>
                <option value="farming">Farming</option>
                <option value="water">Water & Sanitation</option>
                <option value="bushcraft">Bushcraft & Wilderness</option>
                <option value="shelter">Shelter & Construction</option>
                <option value="medical_reference">Medical & First Aid</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Research Notes</label>
              <textarea
                placeholder="Where to find it, specific version needed, or priority level..."
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" className="btn-tactical-outline" onClick={() => setShowAddForm(false)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Cancel</button>
              <button type="submit" className="btn-tactical" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Save to Wishlist</button>
            </div>
          </div>
        </form>
      )}

      {/* Wishlist Render */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {wishlist.length === 0 ? (
          <div style={{ backgroundColor: '#10131a', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '40px', textAlign: 'center', color: '#666' }}>
            No items in your wishlist. Click "Add Wishlist Item" to start planning your offline library collections!
          </div>
        ) : (
          wishlist.map(item => {
            const isAcquired = item.acquisitionStatus === 'manually_acquired';
            return (
              <div 
                key={item.id} 
                style={{ 
                  backgroundColor: '#12151c', 
                  padding: '14px', 
                  borderRadius: '6px', 
                  borderLeft: isAcquired ? '3px solid #00ff7f' : '3px solid #ffd700',
                  opacity: isAcquired ? 0.6 : 1,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'opacity 0.2s'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                  <button 
                    onClick={() => handleToggleAcquired(item)}
                    style={{ backgroundColor: 'transparent', border: 'none', color: isAcquired ? '#00ff7f' : '#888', cursor: 'pointer', padding: 0, marginTop: '2px' }}
                    title={isAcquired ? "Mark as Active Hunt" : "Mark as Acquired"}
                  >
                    {isAcquired ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </button>
                  <div>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: isAcquired ? '#aaa' : '#fff', 
                      fontSize: '0.95rem',
                      textDecoration: isAcquired ? 'line-through' : 'none'
                    }}>
                      {item.title}
                    </span>
                    <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '3px' }}>
                      Category: <span style={{ color: '#ccc' }}>{item.category.replace(/_/g, ' ')}</span>
                    </div>
                    {item.operatorNotes && (
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#bbb', lineHeight: '1.3' }}>
                        {item.operatorNotes}
                      </p>
                    )}
                  </div>
                </div>
                <button 
                  onClick={() => handleDeleteWish(item.id)}
                  style={{ backgroundColor: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer', padding: '4px' }}
                  title="Delete from Wishlist"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
