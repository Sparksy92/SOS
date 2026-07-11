import React, { useState, useEffect } from 'react';
import { loadQueue, saveQueueItem, deleteQueueItem } from '../../modules/toolkit/acquisitionQueueStore.js';
import { Trash2, Plus, CheckCircle, Circle, Clipboard, BookOpen, Search } from 'lucide-react';

export default function AcquisitionQueuePanel({ selectedDocument, setSelectedDocument, categories = {} }) {
  const [readingList, setReadingList] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('reading'); // 'reading' or 'completed'

  const reloadReadingList = () => {
    const q = loadQueue();
    setReadingList(q);
  };

  useEffect(() => {
    reloadReadingList();
  }, [selectedDocument]);

  // Search all files in local library categories
  const allLibraryFiles = Object.entries(categories).reduce((acc, [catName, files]) => {
    if (Array.isArray(files)) {
      files.forEach(f => {
        acc.push({
          ...f,
          categoryName: catName
        });
      });
    }
    return acc;
  }, []);

  const filteredLibraryFiles = searchQuery.trim() === '' 
    ? [] 
    : allLibraryFiles.filter(f => 
        f.name.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 10);

  const handleAddBook = (file) => {
    try {
      // Check if already in reading list
      const existing = readingList.find(q => q.filePath === file.path || q.title.toLowerCase() === file.name.toLowerCase());
      if (existing) {
        alert("This book is already in your reading list.");
        setSearchQuery('');
        return;
      }

      saveQueueItem({
        title: file.name,
        filenameHint: file.name,
        category: file.categoryName || 'general_survival',
        filePath: file.path,
        acquisitionStatus: 'planned', // 'planned' = Reading
        sourceType: 'local_library',
        currentPage: 0,
        totalPages: 0,
        progressPercent: 0,
        lastReadAt: new Date().toISOString()
      });
      reloadReadingList();
      setSearchQuery('');
      setShowAddForm(false);
    } catch (e) {
      alert(e.message);
    }
  };

  const handleToggleCompleted = (item) => {
    try {
      const newStatus = item.acquisitionStatus === 'manually_acquired' ? 'planned' : 'manually_acquired';
      saveQueueItem({
        ...item,
        acquisitionStatus: newStatus,
        progressPercent: newStatus === 'manually_acquired' ? 100 : item.progressPercent
      });
      reloadReadingList();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDeleteItem = (id) => {
    if (confirm("Are you sure you want to remove this book from your reading list?")) {
      deleteQueueItem(id);
      reloadReadingList();
    }
  };

  const handleOpenBook = (item) => {
    if (setSelectedDocument && item.filePath) {
      // Reconstruct file object
      const name = item.filenameHint || item.title;
      const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
      setSelectedDocument({
        name,
        path: item.filePath,
        extension: ext,
        category: item.category
      });
    } else {
      alert("Unable to open book: File path not found.");
    }
  };

  const triggerExportMarkdown = () => {
    let md = `# SurvivalOS — Reading List Checklist\n\n`;
    md += `| Status | Book Title | Category | Progress | Last Read |\n`;
    md += `| --- | --- | --- | --- | --- |\n`;
    readingList.forEach(w => {
      const isComp = w.acquisitionStatus === 'manually_acquired';
      const statusText = isComp ? 'Completed' : 'Reading';
      const progressText = isComp ? '100%' : `${w.currentPage || 0} / ${w.totalPages || 0} pages`;
      const dateText = w.lastReadAt ? new Date(w.lastReadAt).toLocaleDateString() : 'Never';
      md += `| ${statusText} | **${w.title}** | ${w.category.replace(/_/g, ' ')} | ${progressText} | ${dateText} |\n`;
    });

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_reading_list_${Date.now()}.md`);
    dlAnchorElem.click();
  };

  const currentBooks = readingList.filter(item => 
    activeTab === 'reading' ? item.acquisitionStatus !== 'manually_acquired' : item.acquisitionStatus === 'manually_acquired'
  );

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '800px', margin: '0 auto', padding: '0 12px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Reading List & Progress
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            Track reference manuals you are currently reading or have completed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-tactical" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <Plus size={14} /> Add Book to List
          </button>
          <button className="btn-tactical-outline" onClick={triggerExportMarkdown} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <Clipboard size={12} /> Export Checklist
          </button>
        </div>
      </div>

      {showAddForm && (
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.3)', borderRadius: '6px', padding: '16px', marginBottom: '24px' }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#fff', fontSize: '1rem' }}>Add Book from Local Library</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '4px' }}>Search Library Files</label>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#0d1017', border: '1px solid #333', borderRadius: '4px', padding: '0 8px' }}>
                <Search size={14} color="#888" style={{ marginRight: '8px' }} />
                <input
                  type="text"
                  placeholder="Type book title to search..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '8px 0', backgroundColor: 'transparent', border: 'none', color: '#fff', outline: 'none' }}
                />
              </div>

              {filteredLibraryFiles.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#0d1017', border: '1px solid #333', borderRadius: '4px', marginTop: '4px', zIndex: 10, maxHeight: '200px', overflowY: 'auto' }}>
                  {filteredLibraryFiles.map(file => (
                    <div 
                      key={file.path} 
                      onClick={() => handleAddBook(file)}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid #222', fontSize: '0.85rem' }}
                      className="hover-bg-accent"
                    >
                      <div style={{ fontWeight: 'bold', color: '#fff' }}>{file.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#888' }}>Category: {file.categoryName.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                </div>
              )}
              {searchQuery.trim() !== '' && filteredLibraryFiles.length === 0 && (
                <div style={{ padding: '12px', fontSize: '0.85rem', color: '#888', backgroundColor: '#0d1017', border: '1px solid #333', borderRadius: '4px', marginTop: '4px' }}>
                  No matching books found in your library.
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-tactical-outline" onClick={() => setShowAddForm(false)} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
        <button 
          onClick={() => setActiveTab('reading')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'reading' ? 'var(--brand-primary)' : '#888',
            fontWeight: activeTab === 'reading' ? 'bold' : 'normal',
            borderBottom: activeTab === 'reading' ? '2px solid var(--brand-primary)' : 'none',
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          Currently Reading ({readingList.filter(i => i.acquisitionStatus !== 'manually_acquired').length})
        </button>
        <button 
          onClick={() => setActiveTab('completed')}
          style={{
            background: 'transparent',
            border: 'none',
            color: activeTab === 'completed' ? 'var(--brand-primary)' : '#888',
            fontWeight: activeTab === 'completed' ? 'bold' : 'normal',
            borderBottom: activeTab === 'completed' ? '2px solid var(--brand-primary)' : 'none',
            padding: '6px 16px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          Completed ({readingList.filter(i => i.acquisitionStatus === 'manually_acquired').length})
        </button>
      </div>

      {/* List Render */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {currentBooks.length === 0 ? (
          <div style={{ backgroundColor: '#10131a', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '6px', padding: '40px', textAlign: 'center', color: '#666' }}>
            {activeTab === 'reading' 
              ? "No books currently being read. Open a book in the library or search above to add one!"
              : "No completed books yet. Keep reading!"}
          </div>
        ) : (
          currentBooks.map(item => {
            const isCompleted = item.acquisitionStatus === 'manually_acquired';
            const percent = item.progressPercent || 0;
            return (
              <div 
                key={item.id} 
                className="glass-panel"
                style={{ 
                  backgroundColor: '#12151c', 
                  padding: '16px', 
                  borderRadius: '6px', 
                  borderLeft: isCompleted ? '3px solid #00ff7f' : '3px solid var(--brand-primary)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px'
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flex: 1 }}>
                  <button 
                    onClick={() => handleToggleCompleted(item)}
                    style={{ backgroundColor: 'transparent', border: 'none', color: isCompleted ? '#00ff7f' : '#888', cursor: 'pointer', padding: 0, marginTop: '2px' }}
                    title={isCompleted ? "Mark as Reading" : "Mark as Completed"}
                  >
                    {isCompleted ? <CheckCircle size={20} /> : <Circle size={20} />}
                  </button>
                  <div style={{ flex: 1 }}>
                    <span style={{ 
                      fontWeight: 'bold', 
                      color: isCompleted ? '#aaa' : '#fff', 
                      fontSize: '0.95rem'
                    }}>
                      {item.title}
                    </span>
                    <div style={{ fontSize: '0.78rem', color: '#888', marginTop: '3px' }}>
                      Category: <span style={{ color: '#ccc' }}>{item.category.replace(/_/g, ' ')}</span>
                      {item.lastReadAt && ` • Last read: ${new Date(item.lastReadAt).toLocaleDateString()} ${new Date(item.lastReadAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                    </div>

                    {/* Progress Bar & Inputs */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '10px', flexWrap: 'wrap' }}>
                      <div style={{ flex: '1 1 150px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, height: '6px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '3px', overflow: 'hidden' }}>
                          <div style={{ width: `${percent}%`, height: '100%', backgroundColor: isCompleted ? '#00ff7f' : 'var(--brand-primary)' }} />
                        </div>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: isCompleted ? '#00ff7f' : 'var(--brand-primary)', minWidth: '35px', textAlign: 'right' }}>
                          {percent}%
                        </span>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#bbb', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>Progress:</span>
                        <input 
                          type="number"
                          min="0"
                          value={item.currentPage || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const total = item.totalPages || 0;
                            const newPct = total > 0 ? Math.round((val / total) * 100) : 0;
                            saveQueueItem({
                              ...item,
                              currentPage: val,
                              progressPercent: newPct,
                              acquisitionStatus: (newPct >= 100 || (total > 0 && val === total)) ? 'manually_acquired' : 'planned'
                            });
                            reloadReadingList();
                          }}
                          style={{ width: '45px', padding: '2px', background: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '3px', textAlign: 'center', fontSize: '0.75rem' }}
                        />
                        <span>/</span>
                        <input 
                          type="number"
                          min="0"
                          value={item.totalPages || 0}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            const cur = item.currentPage || 0;
                            const newPct = val > 0 ? Math.round((cur / val) * 100) : 0;
                            saveQueueItem({
                              ...item,
                              totalPages: val,
                              progressPercent: newPct,
                              acquisitionStatus: (newPct >= 100 || (val > 0 && cur === val)) ? 'manually_acquired' : 'planned'
                            });
                            reloadReadingList();
                          }}
                          style={{ width: '45px', padding: '2px', background: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '3px', textAlign: 'center', fontSize: '0.75rem' }}
                        />
                        <span>pages</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => handleOpenBook(item)}
                    className="btn-tactical"
                    style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="Resume reading this book"
                  >
                    <BookOpen size={14} /> Open Book
                  </button>
                  <button 
                    onClick={() => handleDeleteItem(item.id)}
                    style={{ backgroundColor: 'transparent', border: 'none', color: '#ff4500', cursor: 'pointer', padding: '4px' }}
                    title="Remove from Reading List"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
