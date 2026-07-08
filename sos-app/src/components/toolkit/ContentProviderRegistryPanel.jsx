import React, { useState, useEffect } from 'react';
import { loadAllowlist, saveAllowlistEntry, deleteAllowlistEntry } from '../../modules/toolkit/sourceAllowlistStore.js';
import { ExternalLink, Trash2, Plus, Globe, BookOpen } from 'lucide-react';

const STATIC_DIRECTORIES = [
  {
    id: 'gutenberg',
    label: 'Project Gutenberg',
    officialSourceUrl: 'https://www.gutenberg.org/',
    sourceType: 'Public Domain Archive',
    operatorNotes: 'Over 70,000 free eBooks. Focuses on older literature, history, and classic science manuals.'
  },
  {
    id: 'kiwix',
    label: 'Kiwix ZIM Library',
    officialSourceUrl: 'https://download.kiwix.org/zim/',
    sourceType: 'Offline Content Archives',
    operatorNotes: 'The master folder of all Kiwix ZIM files. Download full Wikipedia, WikiHow, StackExchange, and medical wikis for local use.'
  },
  {
    id: 'hesperian',
    label: 'Hesperian Health Guides',
    officialSourceUrl: 'https://hesperian.org/',
    sourceType: 'Medical & Survival Guides',
    operatorNotes: 'Highly vetted offline medical resources including "Where There Is No Doctor" and community health guides.'
  },
  {
    id: 'archive_org',
    label: 'Internet Archive',
    officialSourceUrl: 'https://archive.org/',
    sourceType: 'Digital Library',
    operatorNotes: 'Excellent repository for scanned military training manuals, historical agricultural textbooks, and government publications.'
  },
  {
    id: 'libgen',
    label: 'Library Genesis',
    officialSourceUrl: 'https://libgen.is/',
    sourceType: 'Academic Textbooks',
    operatorNotes: 'Comprehensive search directory for modern scientific textbooks, engineering manuals, and reference guides.'
  }
];

export default function ContentProviderRegistryPanel() {
  const [customList, setCustomList] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const reloadCustomList = () => {
    setCustomList(loadAllowlist());
  };

  useEffect(() => {
    reloadCustomList();
  }, []);

  const handleAddCustom = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newUrl.trim()) return;

    try {
      const updated = saveAllowlistEntry({
        label: newLabel.trim(),
        officialSourceUrl: newUrl.trim(),
        operatorNotes: newNotes.trim(),
        sourceType: 'operator_custom',
        operatorTrusted: true
      });
      setCustomList(updated);
      setNewLabel('');
      setNewUrl('');
      setNewNotes('');
      setShowAddForm(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteCustom = (id) => {
    if (confirm("Are you sure you want to remove this download directory?")) {
      const updated = deleteAllowlistEntry(id);
      setCustomList(updated);
    }
  };

  const handleCopyUrl = (url) => {
    if (!url) return;
    navigator.clipboard.writeText(url)
      .then(() => alert("URL copied to clipboard!"))
      .catch(() => alert("Failed to copy URL."));
  };

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '800px', margin: '0 auto', padding: '0 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Download Directories
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            A curated directory of websites where you can find, download, and manually vet offline documents before adding them to your library.
          </p>
        </div>
        <button className="btn-tactical" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
          <Plus size={14} /> Add Custom Link
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCustom} style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1.05rem' }}>Add Custom Download Resource</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Resource Name</label>
              <input
                type="text"
                placeholder="e.g. CDC Emergency Preparedness PDF Catalog"
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Official URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={newUrl}
                onChange={e => setNewUrl(e.target.value)}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', boxSizing: 'border-box' }}
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Notes / Vetting tips</label>
              <textarea
                placeholder="Types of documents found here, search instructions..."
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '8px', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
              <button type="button" className="btn-tactical-outline" onClick={() => setShowAddForm(false)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Cancel</button>
              <button type="submit" className="btn-tactical" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Save Resource</button>
            </div>
          </div>
        </form>
      )}

      {/* Recommended Directories */}
      <div style={{ marginBottom: '30px' }}>
        <h4 style={{ color: '#fff', fontSize: '1.05rem', margin: '0 0 12px 0', borderBottom: '1px solid #222', paddingBottom: '6px' }}>Vetted Survival Resources</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {STATIC_DIRECTORIES.map(dir => (
            <div key={dir.id} style={{ backgroundColor: '#12151c', border: '1px solid rgba(255, 255, 255, 0.03)', borderRadius: '6px', padding: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <strong style={{ color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <BookOpen size={16} style={{ color: 'var(--brand-primary)' }} /> {dir.label}
                  </strong>
                  <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginTop: '3px' }}>
                    Category: {dir.sourceType}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button className="btn-tactical-outline" onClick={() => handleCopyUrl(dir.officialSourceUrl)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                    Copy URL
                  </button>
                  <a href={dir.officialSourceUrl} target="_blank" rel="noopener noreferrer" className="btn-tactical" style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#000', fontWeight: 'bold' }}>
                    <span>Visit Site</span> <ExternalLink size={12} />
                  </a>
                </div>
              </div>
              <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#bbb', lineHeight: '1.4' }}>
                {dir.operatorNotes}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Directories */}
      <div>
        <h4 style={{ color: '#fff', fontSize: '1.05rem', margin: '0 0 12px 0', borderBottom: '1px solid #222', paddingBottom: '6px' }}>Custom Download Resources</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {customList.length === 0 ? (
            <div style={{ backgroundColor: '#10131a', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '30px', textAlign: 'center', color: '#666' }}>
              No custom download resources added yet. Click "Add Custom Link" to catalog your own personal book sites!
            </div>
          ) : (
            customList.map(dir => (
              <div key={dir.id} style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '6px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '10px' }}>
                  <div>
                    <strong style={{ color: '#fff', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={16} style={{ color: '#00f2fe' }} /> {dir.label}
                    </strong>
                    <span style={{ fontSize: '0.72rem', color: '#00f2fe', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginTop: '3px' }}>
                      Source: Custom Web Link
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button className="btn-tactical-outline" onClick={() => handleCopyUrl(dir.officialSourceUrl)} style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                      Copy URL
                    </button>
                    <a href={dir.officialSourceUrl} target="_blank" rel="noopener noreferrer" className="btn-tactical" style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#000', fontWeight: 'bold' }}>
                      <span>Visit Site</span> <ExternalLink size={12} />
                    </a>
                    <button onClick={() => handleDeleteCustom(dir.id)} style={{ backgroundColor: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer', padding: '4px', marginLeft: '6px' }} title="Delete Directory">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {dir.operatorNotes && (
                  <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#bbb', lineHeight: '1.4' }}>
                    {dir.operatorNotes}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
