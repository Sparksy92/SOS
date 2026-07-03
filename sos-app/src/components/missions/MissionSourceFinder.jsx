import React, { useState } from 'react';
import { 
  Search, Filter, ShieldAlert, CheckCircle, Circle, 
  ExternalLink, Bookmark, Plus, Clock, Cpu, RefreshCw
} from 'lucide-react';
import { getMissionSourceRecommendations } from '../../modules/search/missionSourceRecommendations.js';
import { buildMissionSearchSummary } from '../../modules/search/missionSearchUtils.js';

const MissionSourceFinder = ({ 
  mission, 
  materials = [], 
  metadata = {}, 
  template = null, 
  onOpenDocument, 
  onSaveSource, 
  onAttachSource, 
  onQueueSource,
  onIndexDocument
}) => {
  const [recommendations, setRecommendations] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterQuery, setFilterQuery] = useState('');
  const [indexFilter, setIndexFilter] = useState('all'); // 'all', 'indexed', 'unindexed'
  const [riskFilter, setRiskFilter] = useState('all'); // 'all', 'safe', 'electrical', 'water_treatment', etc.
  const [extFilter, setExtFilter] = useState('all'); // 'all', 'pdf', 'txt', 'md'

  const handleSearch = () => {
    setLoading(true);
    // Simulate slight lag to look like a tactical scan
    setTimeout(() => {
      const results = getMissionSourceRecommendations({
        mission,
        materials,
        metadata,
        template,
        limit: 100, // retrieve more so we can filter locally in UI
      });
      setRecommendations(results.recommendations);
      setLoading(false);
    }, 400);
  };

  const getFilteredRecs = () => {
    if (!recommendations) return [];
    return recommendations.filter(r => {
      // Query search
      const q = filterQuery.toLowerCase();
      const matchesQuery = r.title.toLowerCase().includes(q) || r.sourcePath.toLowerCase().includes(q);

      // Index status
      let matchesIndex = true;
      if (indexFilter === 'indexed') matchesIndex = r.indexed === true;
      if (indexFilter === 'unindexed') matchesIndex = r.indexed !== true;

      // Risk category
      let matchesRisk = true;
      if (riskFilter === 'safe') matchesRisk = !r.riskCategory;
      else if (riskFilter !== 'all') matchesRisk = r.riskCategory === riskFilter;

      // File extension
      let matchesExt = true;
      if (extFilter !== 'all') matchesExt = r.extension === extFilter;

      return matchesQuery && matchesIndex && matchesRisk && matchesExt;
    });
  };

  const filtered = getFilteredRecs();
  const summary = recommendations ? buildMissionSearchSummary(filtered) : null;

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
            LOCAL MATERIAL RECOMMENDATION SYSTEM
          </h3>
          <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Scan offline material manifest to find reference guides matching objectives and checklist vectors.
          </p>
        </div>

        <button 
          className="btn-tactical" 
          onClick={handleSearch} 
          disabled={loading}
          style={{ padding: '8px 16px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', borderColor: 'var(--brand-primary)' }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          {recommendations ? 'RE-SCAN LIBRARY' : 'FIND SOURCES FOR MISSION'}
        </button>
      </div>

      {loading && (
        <div style={{ padding: '30px', textAlign: 'center', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
          SCANNING OFFLINE DIRECTORY MANIFEST...
        </div>
      )}

      {recommendations && !loading && (
        <>
          {/* Summary stats HUD */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', backgroundColor: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '4px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>TOTAL EVALUATED</div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--text-main)' }}>{summary.total}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>STRONG MATCHES</div>
              <strong style={{ fontSize: '1.1rem', color: '#00ff66' }}>{summary.strongMatches}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>INDEXED (READY)</div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--brand-primary)' }}>{summary.indexedCount}</strong>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>UNINDEXED (RAW)</div>
              <strong style={{ fontSize: '1.1rem', color: 'var(--brand-danger)' }}>{summary.unindexedCount}</strong>
            </div>
          </div>

          {/* Filters toolbar */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px', position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '6px 10px 6px 30px', fontSize: '0.75rem' }} 
                placeholder="Filter results..."
                value={filterQuery}
                onChange={e => setFilterQuery(e.target.value)}
              />
            </div>
            
            <select
              value={indexFilter}
              onChange={e => setIndexFilter(e.target.value)}
              className="search-input glass-panel"
              style={{ padding: '6px', fontSize: '0.75rem', backgroundColor: 'black', color: 'var(--text-main)' }}
            >
              <option value="all">INDEX STATUS: ALL</option>
              <option value="indexed">INDEXED ONLY</option>
              <option value="unindexed">UNINDEXED ONLY</option>
            </select>

            <select
              value={riskFilter}
              onChange={e => setRiskFilter(e.target.value)}
              className="search-input glass-panel"
              style={{ padding: '6px', fontSize: '0.75rem', backgroundColor: 'black', color: 'var(--text-main)' }}
            >
              <option value="all">RISK: ALL</option>
              <option value="safe">SAFE / NONE</option>
              <option value="electrical">ELECTRICAL</option>
              <option value="water_treatment">WATER TREATMENT</option>
              <option value="medical">MEDICAL</option>
              <option value="mechanical">MECHANICAL</option>
              <option value="chemical">CHEMICAL</option>
              <option value="food_preservation">FOOD PRESERVATION</option>
            </select>

            <select
              value={extFilter}
              onChange={e => setExtFilter(e.target.value)}
              className="search-input glass-panel"
              style={{ padding: '6px', fontSize: '0.75rem', backgroundColor: 'black', color: 'var(--text-main)' }}
            >
              <option value="all">TYPE: ALL</option>
              <option value="pdf">PDF ONLY</option>
              <option value="txt">TXT ONLY</option>
              <option value="md">MD ONLY</option>
            </select>
          </div>

          {/* Scored Recommendations Cards Grid */}
          {filtered.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              No offline library recommendations found matching the specified filters.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
              {filtered.map(rec => {
                const getLabelColor = (label) => {
                  if (label === 'Strong Match') return '#00ff66';
                  if (label === 'Related') return '#00e5ff';
                  if (label === 'Weak Match') return '#ffea00';
                  return 'var(--text-muted)';
                };

                return (
                  <div 
                    key={rec.sourcePath} 
                    className="glass-panel" 
                    style={{ 
                      padding: '14px 16px', 
                      borderLeft: `3px solid ${getLabelColor(rec.matchLabel)}`, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '8px',
                      backgroundColor: 'rgba(255,255,255,0.01)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--text-main)', fontFamily: 'var(--font-mono)' }}>
                            {rec.title}
                          </span>
                          <span style={{ fontSize: '0.65rem', backgroundColor: rec.indexed ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255, 0, 0, 0.1)', border: `1px solid ${rec.indexed ? '#00ff66' : 'var(--brand-danger)'}`, padding: '1px 5px', borderRadius: '3px', color: rec.indexed ? '#00ff66' : 'var(--brand-danger)', fontFamily: 'var(--font-mono)' }}>
                            {rec.indexed ? 'INDEXED' : 'UNINDEXED'}
                          </span>
                          {rec.riskCategory && (
                            <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255, 0, 0, 0.15)', border: '1px solid var(--brand-danger)', padding: '1px 5px', borderRadius: '3px', color: 'var(--brand-danger)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                              RISK: {rec.riskCategory.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                          {rec.sourcePath}
                        </div>
                      </div>
                      
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: getLabelColor(rec.matchLabel), fontFamily: 'var(--font-mono)' }}>
                          {rec.matchLabel.toUpperCase()}
                        </div>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          SCORE: {rec.score}
                        </div>
                      </div>
                    </div>

                    {rec.metadataSummary && (
                      <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                        {rec.metadataSummary}
                      </p>
                    )}

                    {/* Match Reasons */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '2px' }}>
                      {rec.reasons.map((reason, idx) => (
                        <span key={idx} style={{ fontSize: '0.65rem', color: 'var(--text-muted)', backgroundColor: 'rgba(255,255,255,0.03)', padding: '1px 6px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>
                          • {reason}
                        </span>
                      ))}
                    </div>

                    {/* Recommendations action toolbar */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px', borderTop: '1px solid rgba(255,255,255,0.02)', paddingTop: '8px' }}>
                      <button 
                        className="btn-tactical" 
                        onClick={() => onOpenDocument(rec.sourcePath)}
                        style={{ padding: '4px 8px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <ExternalLink size={10} /> OPEN DOCUMENT
                      </button>
                      <button 
                        className="btn-tactical" 
                        onClick={() => onSaveSource(rec)}
                        style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                      >
                        SAVE SOURCE
                      </button>
                      <button 
                        className="btn-tactical" 
                        onClick={() => onAttachSource(rec)}
                        style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                      >
                        ADD TO MISSION
                      </button>
                      <button 
                        className="btn-tactical" 
                        onClick={() => onQueueSource(rec)}
                        style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: '#00e5ff', color: '#00e5ff' }}
                      >
                        QUEUE FOR REVIEW
                      </button>
                      
                      {!rec.indexed && (
                        <button 
                          className="btn-tactical" 
                          onClick={() => {
                            if (onIndexDocument) {
                              onIndexDocument(rec.sourcePath);
                            } else {
                              alert("Single-document indexing is performed in the Library panel. Go to Library and click Index.");
                            }
                          }}
                          style={{ padding: '4px 8px', fontSize: '0.7rem', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
                        >
                          INDEX FROM LIBRARY PANEL
                        </button>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default MissionSourceFinder;
