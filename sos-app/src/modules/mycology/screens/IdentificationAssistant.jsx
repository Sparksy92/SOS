import { useState, useEffect } from 'react';
import { mycologyService } from '../services/mycologyService.js';
import SpeciesCard from '../components/SpeciesCard.jsx';
import { Compass, CheckCircle2, RefreshCw, AlertTriangle, ArrowRight, Sparkles } from 'lucide-react';

export default function IdentificationAssistant({ onSelectSpecies, onCompare }) {
  const [selectedTraits, setSelectedTraits] = useState({
    hymenophore: '',
    cap_color: '',
    habitat: '',
    spore_print: ''
  });

  const [matchesResult, setMatchesResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState('hymenophore');

  const traitOptions = {
    hymenophore: [
      { label: 'Gills (blade-like ridges under cap)', value: 'gills' },
      { label: 'Pores (sponge-like tiny holes)', value: 'pores' },
      { label: 'Teeth / Spines (icicle-like hangings)', value: 'teeth' },
      { label: 'Blunt Folds / Wrinkles (decurrent ridges)', value: 'folds' },
      { label: 'Honeycomb Pits (pitted cap surface)', value: 'pits' }
    ],
    cap_color: [
      { label: 'White / Cream', value: 'white' },
      { label: 'Golden Yellow / Orange', value: 'yellow' },
      { label: 'Dark Brown / Black', value: 'brown' },
      { label: 'Olive Green / Yellowish Green', value: 'green' }
    ],
    habitat: [
      { label: 'Hardwood / Oak / Beech Trees', value: 'hardwood' },
      { label: 'Birch Trees Exclusively', value: 'birch' },
      { label: 'Soil / Mossy Forest Floor', value: 'soil' }
    ]
  };

  const handleTraitSelect = (category, value) => {
    const updated = { ...selectedTraits, [category]: value };
    setSelectedTraits(updated);
    runEvaluation(updated);
  };

  const runEvaluation = async (traitsToEvaluate) => {
    setLoading(true);
    const res = await mycologyService.evaluateTraits(traitsToEvaluate);
    setMatchesResult(res);
    setLoading(false);
  };

  useEffect(() => {
    runEvaluation(selectedTraits);
  }, []);

  const resetAssistant = () => {
    const cleared = { hymenophore: '', cap_color: '', habitat: '', spore_print: '' };
    setSelectedTraits(cleared);
    runEvaluation(cleared);
  };

  return (
    <div className="mycology-assistant-screen">
      <div className="mycology-assistant-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Compass size={28} color="var(--color-moss, #4A6B4B)" />
          <div>
            <h2>Guided Identification Key Engine</h2>
            <p>Select observed field traits below. The decision matrix filters candidate species by exact trait matches.</p>
          </div>
        </div>

        <button className="mycology-btn-secondary" onClick={resetAssistant}>
          <RefreshCw size={14} /> Reset Decision Matrix
        </button>
      </div>

      {/* Trait Selector Decision Matrix */}
      <div className="mycology-trait-matrix">
        {/* Step 1: Hymenophore */}
        <div className="mycology-trait-step-box">
          <div className="mycology-step-title">
            <span className="step-num">1</span>
            <h4>Hymenophore (Under Cap Structure)</h4>
          </div>
          <div className="mycology-trait-options-grid">
            {traitOptions.hymenophore.map(opt => (
              <button
                key={opt.value}
                className={`mycology-trait-btn ${selectedTraits.hymenophore === opt.value ? 'selected' : ''}`}
                onClick={() => handleTraitSelect('hymenophore', opt.value)}
              >
                {selectedTraits.hymenophore === opt.value && <CheckCircle2 size={16} />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Cap Features */}
        <div className="mycology-trait-step-box">
          <div className="mycology-step-title">
            <span className="step-num">2</span>
            <h4>Cap Surface & Color</h4>
          </div>
          <div className="mycology-trait-options-grid">
            {traitOptions.cap_color.map(opt => (
              <button
                key={opt.value}
                className={`mycology-trait-btn ${selectedTraits.cap_color === opt.value ? 'selected' : ''}`}
                onClick={() => handleTraitSelect('cap_color', opt.value)}
              >
                {selectedTraits.cap_color === opt.value && <CheckCircle2 size={16} />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 3: Habitat */}
        <div className="mycology-trait-step-box">
          <div className="mycology-step-title">
            <span className="step-num">3</span>
            <h4>Habitat & Tree Association</h4>
          </div>
          <div className="mycology-trait-options-grid">
            {traitOptions.habitat.map(opt => (
              <button
                key={opt.value}
                className={`mycology-trait-btn ${selectedTraits.habitat === opt.value ? 'selected' : ''}`}
                onClick={() => handleTraitSelect('habitat', opt.value)}
              >
                {selectedTraits.habitat === opt.value && <CheckCircle2 size={16} />}
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Candidates Results Section */}
      <div className="mycology-section" style={{ marginTop: 24 }}>
        <div className="mycology-section-header">
          <h3>
            Matching Candidates ({matchesResult?.candidateCount || 0})
          </h3>
        </div>

        {loading ? (
          <div className="mycology-loading">
            <RefreshCw size={24} className="spin" />
            <p>Evaluating Decision Matrix Candidates...</p>
          </div>
        ) : !matchesResult || matchesResult.matches.length === 0 ? (
          <div className="mycology-empty-box">
            <p>Select traits above to view matching candidate species.</p>
          </div>
        ) : (
          <div className="mycology-candidates-list">
            {matchesResult.matches.map(({ entry, matchPercentage, matchReasons }) => (
              <div key={entry.id} className="mycology-candidate-card" onClick={() => onSelectSpecies(entry)}>
                <div className="mycology-candidate-match-badge">
                  <span>{matchPercentage}% Match</span>
                </div>

                <div className="mycology-candidate-info">
                  <h4>{entry.title}</h4>
                  <p><em>{entry.scientificName}</em></p>

                  <div className="mycology-match-reasons">
                    {matchReasons.map((r, i) => (
                      <span key={i} className="reason-tag">{r}</span>
                    ))}
                  </div>
                </div>

                <div className="mycology-candidate-actions">
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
                  <button className="mycology-btn-primary mycology-btn-sm">
                    View Guide &rarr;
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
