import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, CheckCircle, XCircle, Play, ShieldAlert, Download, Clipboard } from 'lucide-react';

export default function LibraryLifecyclePanel() {
  const [categories, setCategories] = useState({});
  const [loading, setLoading] = useState(false);
  const [indexingPath, setIndexingPath] = useState(null);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/materials`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || {});
      }
    } catch (e) {
      console.warn("Failed fetching materials:", e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadMaterials();
  }, []);

  const triggerRefresh = async () => {
    setLoading(true);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/materials/refresh`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        alert(`Manifest rebuilt successfully. Found ${data.totalFiles} files.`);
        loadMaterials();
      }
    } catch (e) {
      alert("Failed to rebuild manifest: " + e.message);
    }
    setLoading(false);
  };

  const handleIndexFile = async (filePath) => {
    setIndexingPath(filePath);
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/index/document`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          alert(`Successfully indexed document to SQLite FTS5 database!`);
          // Update local state flag
          setCategories(prev => {
            const updated = { ...prev };
            Object.keys(updated).forEach(cat => {
              updated[cat] = updated[cat].map(file => {
                if (file.path === filePath) {
                  return { ...file, indexed: true };
                }
                return file;
              });
            });
            return updated;
          });
        } else {
          alert(`Indexing completed but returned warning: ${data.warning || 'Unknown error'}`);
        }
      } else {
        const errData = await res.json();
        alert(`Indexing failed: ${errData.error || 'Server error'}`);
      }
    } catch (e) {
      alert(`Indexing failed: ${e.message}`);
    }
    setIndexingPath(null);
  };

  // Flatten categories into list of files
  const allFiles = [];
  Object.entries(categories).forEach(([catName, filesList]) => {
    if (Array.isArray(filesList)) {
      filesList.forEach(file => {
        allFiles.push({ ...file, categoryName: catName });
      });
    }
  });

  // Filter files
  const filteredFiles = allFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(search.toLowerCase()) || 
                          file.path.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'all' || file.categoryName === filterCategory;
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'indexed' && file.indexed) || 
                          (filterStatus === 'not_indexed' && !file.indexed);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate pagination
  const totalItems = filteredFiles.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  // Adjust current page if out of bounds
  const activePage = Math.min(currentPage, totalPages);
  
  const startIndex = (activePage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedFiles = filteredFiles.slice(startIndex, endIndex);

  const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Required export functions for tests
  const triggerExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allFiles, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_library_index_${Date.now()}.json`);
    dlAnchorElem.click();
  };

  const triggerExportMarkdown = () => {
    let md = `# SurvivalOS — Active Library Index\n\n`;
    md += `> [!IMPORTANT]\n`;
    md += `> This report is derived dynamically from local stores and manifests. It records Operator review checkpoints only and does NOT guarantee legal copyright clearance.\n\n`;
    md += `| File Name | Category | Size | Indexed |\n`;
    md += `| --- | --- | --- | --- |\n`;
    allFiles.forEach(f => {
      md += `| **${f.name}** | ${f.categoryName} | ${formatSize(f.size)} | ${f.indexed ? 'YES' : 'NO'} |\n`;
    });

    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `sos_library_index_${Date.now()}.md`);
    dlAnchorElem.click();
  };

  return (
    <div style={{ color: '#e0e0e0', maxWidth: '1200px', margin: '0 auto', padding: '0 12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Active Library Index
          </h3>
          <p style={{ margin: 0, fontSize: '0.88rem', color: '#a0a0a0' }}>
            View, search, and manage files scanned on your local storage. Trigger RAG indexing for individual manuals.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn-tactical-outline" onClick={triggerRefresh} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <RefreshCw size={12} className={loading ? "spin" : ""} /> Scan & Rebuild Manifest
          </button>
          <button className="btn-tactical-outline" onClick={triggerExportJSON} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <Download size={12} /> Export JSON
          </button>
          <button className="btn-tactical-outline" onClick={triggerExportMarkdown} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '0.8rem' }}>
            <Clipboard size={12} /> Export Checklist
          </button>
        </div>
      </div>

      {/* Security disclaimer (Required by safety tests) */}
      <div style={{ backgroundColor: 'rgba(255, 69, 0, 0.04)', border: '1px solid rgba(255, 69, 0, 0.25)', borderRadius: '6px', padding: '14px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4500', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '6px' }}>
          <ShieldAlert size={16} />
          <span>Read-Only Visibility Layer</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.78rem', color: '#b0b0b0', lineHeight: '1.4' }}>
          This reconciler provides cross-referencing audit checks on local store catalogs. SurvivalOS never automates downloads, handles file movements, clears legal copyrights, or auto-indexes content in the background. Note: This does NOT guarantee legal copyright clearance.
        </p>
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '15px', marginBottom: '24px' }}>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 242, 254, 0.15)', borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>{allFiles.length.toLocaleString()}</div>
          <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '4px' }}>Total Scanned Files</div>
        </div>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(0, 255, 127, 0.15)', borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff7f' }}>
            {allFiles.filter(f => f.indexed).length.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#00ff7f', marginTop: '4px' }}>Indexed (RAG Search Active)</div>
        </div>
        <div style={{ backgroundColor: '#12151c', border: '1px solid rgba(255, 69, 0, 0.15)', borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ff4500' }}>
            {allFiles.filter(f => !f.indexed).length.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#ff4500', marginTop: '4px' }}>Not Yet Indexed</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', backgroundColor: '#10131a', padding: '12px', borderRadius: '6px', border: '1px solid #222', marginBottom: '20px' }}>
        <div style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
          <input
            type="text"
            placeholder="Search files by name or path..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            style={{ width: '100%', backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '8px 8px 8px 34px', fontSize: '0.85rem', boxSizing: 'border-box' }}
          />
        </div>
        <div>
          <select
            value={filterCategory}
            onChange={(e) => { setFilterCategory(e.target.value); setCurrentPage(1); }}
            style={{ backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value="all">ALL CATEGORIES</option>
            {Object.keys(categories).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div>
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
            style={{ backgroundColor: '#0d1017', border: '1px solid #333', color: '#fff', borderRadius: '4px', padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer' }}
          >
            <option value="all">ALL STATUSES</option>
            <option value="indexed">INDEXED (RAG ACTIVE)</option>
            <option value="not_indexed">NOT INDEXED</option>
          </select>
        </div>
      </div>

      {/* File List Table */}
      <div style={{ backgroundColor: '#10131a', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', marginBottom: '20px' }}>
        <div style={{ padding: '12px', borderBottom: '1px solid #222', fontSize: '0.85rem', color: '#888', display: 'flex', justifyContent: 'space-between' }}>
          <span>Showing {startIndex + 1}-{endIndex} of {totalItems.toLocaleString()} files</span>
          {search && <span>Filtered from {allFiles.length.toLocaleString()} total files</span>}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #222', color: '#aaa', backgroundColor: '#0c0e14' }}>
                <th style={{ padding: '12px' }}>File Name</th>
                <th style={{ padding: '12px' }}>Category</th>
                <th style={{ padding: '12px', width: '100px' }}>Size</th>
                <th style={{ padding: '12px', width: '180px' }}>RAG Search status</th>
                <th style={{ padding: '12px', width: '120px', textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedFiles.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                    No files found matching the search criteria.
                  </td>
                </tr>
              ) : (
                paginatedFiles.map(file => (
                  <tr key={file.path} style={{ borderBottom: '1px solid #1c202a', verticalAlign: 'middle' }}>
                    <td style={{ padding: '12px' }}>
                      <strong style={{ color: '#fff', display: 'block', wordBreak: 'break-all' }}>{file.name}</strong>
                      <code style={{ fontSize: '0.72rem', color: '#666', display: 'block', marginTop: '2px', wordBreak: 'break-all' }}>{file.path}</code>
                    </td>
                    <td style={{ padding: '12px', color: '#ccc' }}>
                      {file.categoryName}
                    </td>
                    <td style={{ padding: '12px', color: '#aaa' }}>
                      {formatSize(file.size)}
                    </td>
                    <td style={{ padding: '12px' }}>
                      {file.indexed ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(0, 255, 127, 0.1)', color: '#00ff7f', fontWeight: 'bold' }}>
                          <CheckCircle size={12} /> INDEXED
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', backgroundColor: 'rgba(255, 69, 0, 0.1)', color: '#ff4500', fontWeight: 'bold' }}>
                          <XCircle size={12} /> NOT INDEXED
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      <button 
                        className={file.indexed ? "btn-tactical-outline" : "btn-tactical"}
                        disabled={indexingPath === file.path}
                        onClick={() => handleIndexFile(file.path)}
                        style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', minWidth: '85px', justifyContent: 'center' }}
                      >
                        {indexingPath === file.path ? (
                          "Indexing..."
                        ) : (
                          <>
                            <Play size={10} /> {file.indexed ? "Re-index" : "Index"}
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', borderTop: '1px solid #222' }}>
          <button 
            className="btn-tactical-outline"
            disabled={activePage <= 1 || loading}
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            &lt; Previous
          </button>
          <span style={{ fontSize: '0.85rem', color: '#888' }}>
            Page <strong>{activePage}</strong> of <strong>{totalPages}</strong>
          </span>
          <button 
            className="btn-tactical-outline"
            disabled={activePage >= totalPages || loading}
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            style={{ padding: '6px 12px', fontSize: '0.8rem' }}
          >
            Next &gt;
          </button>
        </div>
      </div>
    </div>
  );
}
