import React, { useState, useEffect } from 'react';
import { OFFLINE_TOOLKIT_CATALOG } from '../../modules/toolkit/offlineToolkitCatalog.js';
import { 
  loadToolkitCheckmarks, 
  toggleToolkitCheckmark, 
  resetToolkitCheckmarks 
} from '../../modules/toolkit/setupProgressStore.js';
import { CheckSquare, ExternalLink, Search, ShieldAlert, Cpu } from 'lucide-react';

export default function OfflineToolkitPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('All');
  const [checkedTools, setCheckedTools] = useState([]);

  useEffect(() => {
    setCheckedTools(loadToolkitCheckmarks());
  }, []);

  const handleToggleCheck = (toolId) => {
    const updated = toggleToolkitCheckmark(toolId);
    setCheckedTools(updated);
  };

  const handleResetCheckmarks = () => {
    if (window.confirm("Are you sure you want to reset all verified toolkit checkmarks?")) {
      const updated = resetToolkitCheckmarks();
      setCheckedTools(updated);
    }
  };

  const filteredTools = OFFLINE_TOOLKIT_CATALOG.filter(tool => {
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === 'All' || tool.difficulty === difficultyFilter;
    return matchesSearch && matchesDifficulty;
  });

  return (
    <div style={{ padding: '24px', color: '#e0e0e0', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px', textShadow: '0 0 10px rgba(0, 242, 254, 0.4)' }}>
            Offline Toolkit
          </h2>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#a0a0a0' }}>
            Vetted off-grid reference applications. Maintain these tools locally to guarantee survival operations.
          </p>
        </div>
        <button 
          className="btn-tactical-outline" 
          onClick={handleResetCheckmarks}
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          Reset Checked Tools
        </button>
      </div>

      {/* Filter and Search Controls */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#888' }} />
          <input
            type="text"
            placeholder="Search tools by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              backgroundColor: '#161a22',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.95rem',
              boxSizing: 'border-box'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.9rem', color: '#888' }}>Difficulty:</span>
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            style={{
              padding: '10px 16px',
              backgroundColor: '#161a22',
              border: '1px solid rgba(0, 242, 254, 0.3)',
              borderRadius: '4px',
              color: '#fff',
              fontSize: '0.95rem',
              cursor: 'pointer'
            }}
          >
            <option value="All">All Difficulties</option>
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </div>
      </div>

      {/* Grid of Tool Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
        {filteredTools.map(tool => {
          const isChecked = checkedTools.includes(tool.id);
          return (
            <div 
              key={tool.id} 
              style={{
                backgroundColor: '#12151c',
                border: isChecked ? '1px solid var(--brand-primary)' : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'border-color 0.2s',
                boxShadow: isChecked ? '0 0 15px rgba(0, 242, 254, 0.15)' : 'none'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {tool.title}
                  </h3>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '3px 8px', 
                    borderRadius: '4px', 
                    backgroundColor: tool.difficulty === 'Easy' ? 'rgba(0, 255, 127, 0.1)' : tool.difficulty === 'Medium' ? 'rgba(255, 215, 0, 0.1)' : 'rgba(255, 69, 0, 0.1)',
                    color: tool.difficulty === 'Easy' ? '#00ff7f' : tool.difficulty === 'Medium' ? '#ffd700' : '#ff4500',
                    border: tool.difficulty === 'Easy' ? '1px solid rgba(0, 255, 127, 0.3)' : tool.difficulty === 'Medium' ? '1px solid rgba(255, 215, 0, 0.3)' : '1px solid rgba(255, 69, 0, 0.3)'
                  }}>
                    {tool.difficulty.toUpperCase()}
                  </span>
                </div>

                <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#c0c0c0', lineHeight: 1.4 }}>
                  {tool.description}
                </p>

                <div style={{ marginBottom: '14px', backgroundColor: 'rgba(0, 242, 254, 0.03)', padding: '10px', borderRadius: '4px', borderLeft: '3px solid var(--brand-primary)' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: 'var(--brand-primary)', marginBottom: '4px' }}>Offline Importance</strong>
                  <span style={{ fontSize: '0.85rem', color: '#e0e0e0', lineHeight: 1.3 }}>{tool.offlineImportance}</span>
                </div>

                <div style={{ fontSize: '0.85rem', color: '#a0a0a0', marginBottom: '10px' }}>
                  <div style={{ marginBottom: '4px' }}><strong>Platform Notes:</strong> {tool.platformNotes}</div>
                  <div><strong>Storage & Power:</strong> {tool.storagePowerNotes}</div>
                </div>

                {tool.riskNotes && tool.riskNotes.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', padding: '10px', backgroundColor: 'rgba(255, 69, 0, 0.05)', borderRadius: '4px', border: '1px solid rgba(255, 69, 0, 0.2)', marginBottom: '16px' }}>
                    <ShieldAlert size={16} style={{ color: '#ff4500', flexShrink: 0, marginTop: '2px' }} />
                    <span style={{ fontSize: '0.8rem', color: '#ff7f50', lineHeight: 1.3 }}>
                      {tool.riskNotes.join(' ')}
                    </span>
                  </div>
                )}

                <div style={{ marginBottom: '16px' }}>
                  <strong style={{ display: 'block', fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', marginBottom: '8px' }}>Manual Setup Guide</strong>
                  {tool.manualChecklist.map((step, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '8px', fontSize: '0.85rem', color: '#bbb', marginBottom: '6px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>{idx + 1}.</span>
                      <span style={{ lineHeight: 1.3 }}>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem', color: '#fff', flex: 1 }}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCheck(tool.id)}
                    style={{
                      accentColor: 'var(--brand-primary)',
                      width: '18px',
                      height: '18px',
                      cursor: 'pointer'
                    }}
                  />
                  <span>Mark as Verified</span>
                </label>

                {tool.officialUrls.map((url, index) => (
                  <a
                    key={index}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.8rem',
                      color: 'var(--brand-primary)',
                      textDecoration: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid rgba(0, 242, 254, 0.2)',
                      backgroundColor: 'rgba(0, 242, 254, 0.02)'
                    }}
                  >
                    <span>Official Link</span>
                    <ExternalLink size={12} />
                  </a>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
