import { useState, useEffect } from 'react';
import { mycologyService } from '../services/mycologyService.js';
import SpeciesCard from '../components/SpeciesCard.jsx';
import ObservationCard from '../components/ObservationCard.jsx';
import { Search, Compass, BookOpen, ShieldAlert, Sparkles, Plus, Layers } from 'lucide-react';

export default function MycologyDashboard({ onNavigate, onSelectSpecies, onCompare }) {
  const [entries, setEntries] = useState([]);
  const [observations, setObservations] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      const [allEntries, obsList] = await Promise.all([
        mycologyService.fetchEntries(),
        mycologyService.fetchObservations()
      ]);
      setEntries(allEntries);
      setObservations(obsList);
      setLoading(false);
    }
    loadDashboardData();
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (onNavigate) {
      onNavigate('library', { query: searchQuery });
    }
  };

  // Filter seasonal highlights (autumn/summer)
  const seasonalEntries = entries.filter(e => {
    const seasons = e.traits?.season?.map(s => s.name.toLowerCase()) || [];
    return seasons.includes('fall') || seasons.includes('autumn') || seasons.includes('summer') || seasons.includes('year_round');
  }).slice(0, 4);

  return (
    <div className="mycology-dashboard-screen">
      {/* Hero Banner */}
      <div className="mycology-hero-banner">
        <div className="mycology-hero-content">
          <h1>Mycology Field Knowledge Engine</h1>
          <p>Professional offline fungal species database, decision-tree identification assistant, field journal, and safety advisory.</p>
          
          <form className="mycology-hero-search-bar" onSubmit={handleSearchSubmit}>
            <Search size={18} className="mycology-search-icon" />
            <input 
              type="text" 
              placeholder="Search by common name, scientific name (e.g. Hericium), habitat, or traits..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button type="submit" className="mycology-btn-primary">Search</button>
          </form>
        </div>
      </div>

      {/* Safety Directive Card */}
      <div className="mycology-safety-banner">
        <div className="mycology-safety-icon">
          <ShieldAlert size={28} />
        </div>
        <div className="mycology-safety-text">
          <h3>Field Safety Protocol Directive</h3>
          <p>
            Never ingest wild mushrooms based solely on photograph or single-feature visual identification. 
            Always confirm spore print color, gill attachment, stem base volva structures, and consult multiple expert references.
          </p>
        </div>
      </div>

      {/* Action Quick Links */}
      <div className="mycology-action-cards-grid">
        <div className="mycology-action-card" onClick={() => onNavigate('library')}>
          <BookOpen size={24} className="mycology-action-icon" />
          <div className="mycology-action-info">
            <h4>Species Library</h4>
            <p>{entries.length} cataloged species with multi-trait filtering</p>
          </div>
        </div>

        <div className="mycology-action-card" onClick={() => onNavigate('assistant')}>
          <Compass size={24} className="mycology-action-icon" />
          <div className="mycology-action-info">
            <h4>Identification Assistant</h4>
            <p>Guided decision tree key engine for field traits</p>
          </div>
        </div>

        <div className="mycology-action-card" onClick={() => onNavigate('journal')}>
          <Plus size={24} className="mycology-action-icon" />
          <div className="mycology-action-info">
            <h4>Field Journal</h4>
            <p>{observations.length} logged field observations with GPS pins</p>
          </div>
        </div>

        <div className="mycology-action-card" onClick={() => onNavigate('packs')}>
          <Layers size={24} className="mycology-action-icon" />
          <div className="mycology-action-info">
            <h4>Knowledge Packs</h4>
            <p>Manage offline species bundles & custom datasets</p>
          </div>
        </div>
      </div>

      {/* Seasonal Highlights Section */}
      <div className="mycology-section">
        <div className="mycology-section-header">
          <h2>Seasonal & High-Value Species</h2>
          <button className="mycology-btn-text" onClick={() => onNavigate('library')}>View All Library &rarr;</button>
        </div>

        {seasonalEntries.length === 0 ? (
          <p className="mycology-muted">No species currently loaded in local cache.</p>
        ) : (
          <div className="mycology-grid-4">
            {seasonalEntries.map(entry => (
              <SpeciesCard 
                key={entry.id} 
                entry={entry} 
                onSelect={onSelectSpecies} 
                onCompare={onCompare}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recent Field Observations Section */}
      <div className="mycology-section">
        <div className="mycology-section-header">
          <h2>Recent Field Journal Log</h2>
          <button className="mycology-btn-text" onClick={() => onNavigate('journal')}>Open Journal &rarr;</button>
        </div>

        {observations.length === 0 ? (
          <div className="mycology-empty-box">
            <p>No field observations recorded yet. Log your first finding with GPS location and photo angle tags!</p>
            <button className="mycology-btn-secondary" onClick={() => onNavigate('journal')}>Record Observation</button>
          </div>
        ) : (
          <div className="mycology-grid-3">
            {observations.slice(0, 3).map(obs => (
              <ObservationCard 
                key={obs.id} 
                observation={obs} 
                onSelect={() => onNavigate('journal')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
