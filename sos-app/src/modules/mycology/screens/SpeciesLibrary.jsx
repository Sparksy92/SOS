import { useState, useEffect } from 'react';
import { mycologyService } from '../services/mycologyService.js';
import { filterAndSearchEntries } from '../search/mycologySearch.js';
import SpeciesCard from '../components/SpeciesCard.jsx';
import SafetyBadge from '../components/SafetyBadge.jsx';
import { Search, Filter, SlidersHorizontal, LayoutGrid, List, RefreshCw } from 'lucide-react';

export default function SpeciesLibrary({ initialQuery = '', onSelectSpecies, onCompare }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [edibilityFilter, setEdibilityFilter] = useState('');
  const [habitatFilter, setHabitatFilter] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [sortBy, setSortBy] = useState('title');
  const [viewStyle, setViewStyle] = useState('grid'); // 'grid' | 'list'

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await mycologyService.fetchEntries();
      setEntries(data);
      setLoading(false);
    }
    loadData();
  }, []);

  const filteredEntries = filterAndSearchEntries(entries, {
    query: searchQuery,
    edibility: edibilityFilter,
    habitat: habitatFilter,
    season: seasonFilter,
    safetyDifficulty: difficultyFilter,
    sortBy: sortBy
  });

  const clearFilters = () => {
    setSearchQuery('');
    setEdibilityFilter('');
    setHabitatFilter('');
    setSeasonFilter('');
    setDifficultyFilter('');
    setSortBy('title');
  };

  return (
    <div className="mycology-library-screen">
      {/* Search & Filter Header */}
      <div className="mycology-library-controls">
        <div className="mycology-search-row">
          <div className="mycology-input-with-icon">
            <Search size={18} />
            <input 
              type="text" 
              placeholder="Filter by species name, scientific taxonomy, or characteristics..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="mycology-controls-actions">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="mycology-select">
              <option value="title">Sort by Common Name</option>
              <option value="scientific">Sort by Scientific Name</option>
              <option value="difficulty">Sort by Difficulty</option>
            </select>

            <div className="mycology-view-toggle">
              <button 
                className={`mycology-toggle-btn ${viewStyle === 'grid' ? 'active' : ''}`}
                onClick={() => setViewStyle('grid')}
                title="Grid View"
              >
                <LayoutGrid size={16} />
              </button>
              <button 
                className={`mycology-toggle-btn ${viewStyle === 'list' ? 'active' : ''}`}
                onClick={() => setViewStyle('list')}
                title="List View"
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills Bar */}
        <div className="mycology-filters-bar">
          <div className="mycology-filter-group">
            <label>Edibility:</label>
            <select value={edibilityFilter} onChange={(e) => setEdibilityFilter(e.target.value)}>
              <option value="">All Edibility</option>
              <option value="choice">Choice Edible</option>
              <option value="edible">Edible</option>
              <option value="edible_with_caution">Caution Required</option>
              <option value="inedible">Inedible</option>
              <option value="poisonous">Poisonous</option>
              <option value="deadly">Deadly Poisonous</option>
            </select>
          </div>

          <div className="mycology-filter-group">
            <label>Season:</label>
            <select value={seasonFilter} onChange={(e) => setSeasonFilter(e.target.value)}>
              <option value="">All Seasons</option>
              <option value="spring">Spring</option>
              <option value="summer">Summer</option>
              <option value="fall">Autumn / Fall</option>
              <option value="winter">Winter</option>
              <option value="year_round">Year-Round</option>
            </select>
          </div>

          <div className="mycology-filter-group">
            <label>Habitat:</label>
            <select value={habitatFilter} onChange={(e) => setHabitatFilter(e.target.value)}>
              <option value="">All Habitats</option>
              <option value="hardwood">Hardwood / Oak / Maple</option>
              <option value="conifer">Conifer / Pine</option>
              <option value="birch">Birch Trees</option>
              <option value="soil">Soil / Moss</option>
            </select>
          </div>

          <div className="mycology-filter-group">
            <label>Difficulty:</label>
            <select value={difficultyFilter} onChange={(e) => setDifficultyFilter(e.target.value)}>
              <option value="">All Skill Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="expert">Expert</option>
            </select>
          </div>

          {(searchQuery || edibilityFilter || habitatFilter || seasonFilter || difficultyFilter) && (
            <button className="mycology-btn-text" onClick={clearFilters}>Clear Filters</button>
          )}
        </div>
      </div>

      {/* Results Header */}
      <div className="mycology-results-header">
        <span>Showing {filteredEntries.length} of {entries.length} Species</span>
      </div>

      {/* Species List Rendering */}
      {loading ? (
        <div className="mycology-loading">
          <RefreshCw size={24} className="spin" />
          <p>Loading Species Database...</p>
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="mycology-empty-box">
          <p>No species match your current search and filter criteria.</p>
          <button className="mycology-btn-secondary" onClick={clearFilters}>Reset Filters</button>
        </div>
      ) : viewStyle === 'grid' ? (
        <div className="mycology-grid-4">
          {filteredEntries.map(entry => (
            <SpeciesCard 
              key={entry.id} 
              entry={entry} 
              onSelect={onSelectSpecies}
              onCompare={onCompare}
            />
          ))}
        </div>
      ) : (
        <div className="mycology-list-view">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="mycology-list-row" onClick={() => onSelectSpecies(entry)}>
              <div className="mycology-list-cell-title">
                <strong>{entry.title}</strong>
                <p><em>{entry.scientificName}</em></p>
              </div>
              <div className="mycology-list-cell-badge">
                <SafetyBadge edibility={entry.content?.edibility} compact={true} />
              </div>
              <div className="mycology-list-cell-traits">
                <span>Hymenophore: {entry.traits?.hymenophore?.[0]?.label || 'N/A'}</span>
                <span>Habitat: {entry.traits?.habitat?.[0]?.label || 'N/A'}</span>
              </div>
              <div className="mycology-list-cell-actions">
                {onCompare && (
                  <button 
                    className="mycology-btn-secondary mycology-btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onCompare(entry);
                    }}
                  >
                    Compare
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
