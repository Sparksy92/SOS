import SafetyBadge from './SafetyBadge.jsx';
import { AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

export default function ComparisonTable({ speciesA, speciesB, onClose }) {
  if (!speciesA || !speciesB) return null;

  const compareRows = [
    { label: 'Scientific Name', valA: speciesA.scientificName, valB: speciesB.scientificName },
    { label: 'Edibility Rating', comp: true, render: (entry) => <SafetyBadge edibility={entry.content?.edibility} compact={true} /> },
    { label: 'Identification Difficulty', valA: speciesA.safetyRating?.difficulty, valB: speciesB.safetyRating?.difficulty },
    { label: 'Hymenophore Structure', valA: speciesA.traits?.hymenophore?.map(t => t.label).join(', ') || 'N/A', valB: speciesB.traits?.hymenophore?.map(t => t.label).join(', ') || 'N/A' },
    { label: 'Cap Shape & Color', valA: speciesA.traits?.cap_color?.map(t => t.label).join(', ') || 'N/A', valB: speciesB.traits?.cap_color?.map(t => t.label).join(', ') || 'N/A' },
    { label: 'Stem & Volva/Ring', valA: speciesA.traits?.stem?.map(t => t.label).join(', ') || 'N/A', valB: speciesB.traits?.stem?.map(t => t.label).join(', ') || 'N/A' },
    { label: 'Spore Print Color', valA: speciesA.traits?.spore_print?.map(t => t.label).join(', ') || 'N/A', valB: speciesB.traits?.spore_print?.map(t => t.label).join(', ') || 'N/A' },
    { label: 'Flesh Reaction / Bruising', valA: speciesA.traits?.flesh?.map(t => t.label).join(', ') || 'N/A', valB: speciesB.traits?.flesh?.map(t => t.label).join(', ') || 'N/A' },
    { label: 'Habitat & Tree Association', valA: speciesA.content?.habitatDesc || 'N/A', valB: speciesB.content?.habitatDesc || 'N/A' },
    { label: 'Seasonality', valA: speciesA.content?.seasonalityDesc || 'N/A', valB: speciesB.content?.seasonalityDesc || 'N/A' },
    { label: 'Toxicity & Warnings', valA: speciesA.content?.toxicityDesc || 'None', valB: speciesB.content?.toxicityDesc || 'None' }
  ];

  return (
    <div className="mycology-comparison-view">
      <div className="mycology-comp-header">
        <h2>Side-by-Side Species Comparison</h2>
        {onClose && <button className="mycology-btn-secondary" onClick={onClose}>Back to Library</button>}
      </div>

      <div className="mycology-comp-table-wrap">
        <table className="mycology-comp-table">
          <thead>
            <tr>
              <th className="mycology-comp-col-feature">Diagnostic Trait</th>
              <th className="mycology-comp-col-species">
                <div className="mycology-comp-species-header">
                  <h3>{speciesA.title}</h3>
                  <p><em>{speciesA.scientificName}</em></p>
                </div>
              </th>
              <th className="mycology-comp-col-species">
                <div className="mycology-comp-species-header">
                  <h3>{speciesB.title}</h3>
                  <p><em>{speciesB.scientificName}</em></p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {compareRows.map((row, idx) => (
              <tr key={idx} className={row.label.includes('Edibility') || row.label.includes('Toxicity') ? 'mycology-row-highlight' : ''}>
                <td className="mycology-comp-feature-cell"><strong>{row.label}</strong></td>
                <td>
                  {row.render ? row.render(speciesA) : row.valA}
                </td>
                <td>
                  {row.render ? row.render(speciesB) : row.valB}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mycology-comp-diff-box">
        <div className="mycology-comp-diff-icon">
          <AlertTriangle size={24} color="var(--color-caution, #F59E0B)" />
        </div>
        <div>
          <h4>Key Distinguishing Diagnostic Directive</h4>
          <p>
            When comparing <strong>{speciesA.title}</strong> vs <strong>{speciesB.title}</strong>, focus on 
            hymenophore structure (false folds vs true gills), presence of buried volva sac at stem base, and interior flesh solidity.
          </p>
        </div>
      </div>
    </div>
  );
}
