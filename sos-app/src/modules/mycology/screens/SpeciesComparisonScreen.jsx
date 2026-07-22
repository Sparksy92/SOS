import { useState, useEffect } from 'react';
import { mycologyService } from '../services/mycologyService.js';
import ComparisonTable from '../components/ComparisonTable.jsx';
import { Layers, RefreshCw } from 'lucide-react';

export default function SpeciesComparisonScreen({ initialSpeciesA = null, initialSpeciesB = null }) {
  const [entries, setEntries] = useState([]);
  const [speciesA, setSpeciesA] = useState(initialSpeciesA);
  const [speciesB, setSpeciesB] = useState(initialSpeciesB);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const data = await mycologyService.fetchEntries();
      setEntries(data);
      if (data.length >= 2) {
        if (!speciesA) setSpeciesA(data[0]);
        if (!speciesB) setSpeciesB(data[1]);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  const handleSelectA = (id) => {
    const found = entries.find(e => e.id === id);
    if (found) setSpeciesA(found);
  };

  const handleSelectB = (id) => {
    const found = entries.find(e => e.id === id);
    if (found) setSpeciesB(found);
  };

  return (
    <div className="mycology-comparison-screen">
      <div className="mycology-comp-selectors-bar">
        <div className="mycology-selector-box">
          <label>Species A (Primary Target):</label>
          <select value={speciesA?.id || ''} onChange={(e) => handleSelectA(e.target.value)}>
            {entries.map(e => (
              <option key={e.id} value={e.id}>{e.title} ({e.scientificName})</option>
            ))}
          </select>
        </div>

        <div className="mycology-comp-vs-badge">VS</div>

        <div className="mycology-selector-box">
          <label>Species B (Comparison / Lookalike):</label>
          <select value={speciesB?.id || ''} onChange={(e) => handleSelectB(e.target.value)}>
            {entries.map(e => (
              <option key={e.id} value={e.id}>{e.title} ({e.scientificName})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="mycology-loading">
          <RefreshCw size={24} className="spin" />
          <p>Loading Comparison Engine...</p>
        </div>
      ) : (
        <ComparisonTable speciesA={speciesA} speciesB={speciesB} />
      )}
    </div>
  );
}
