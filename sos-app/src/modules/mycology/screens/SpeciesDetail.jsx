import { useState } from 'react';
import SafetyBadge from '../components/SafetyBadge.jsx';
import { MycologyAIService } from '../ai/MycologyAIService.js';
import { getMushroomImage } from '../utils/mushroomImages.js';
import { 
  ArrowLeft, ShieldAlert, Sparkles, BookOpen, Layers, 
  MapPin, Calendar, Heart, AlertTriangle, CheckCircle, Image as ImageIcon
} from 'lucide-react';

export default function SpeciesDetail({ entry, onBack, onCompare }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  if (!entry) return null;

  const primaryMedia = entry.media?.find(m => m.url) || entry.media?.[0];
  const imgSrc = primaryMedia?.url && !primaryMedia.url.includes('/materials/mycology/') ? primaryMedia.url : getMushroomImage(entry.id);

  const handleAskRangerAI = async () => {
    setAiLoading(true);
    const res = await MycologyAIService.analyze({
      question: aiPrompt || `Explain key physical differences between ${entry.title} and its dangerous lookalikes.`,
      targetSpeciesId: entry.id
    });
    setAiResult(res.analysis);
    setAiLoading(false);
  };

  return (
    <div className="mycology-detail-screen">
      {/* Top Action Bar */}
      <div className="mycology-detail-top-bar">
        <button className="mycology-btn-back-prominent" onClick={onBack}>
          <ArrowLeft size={18} />
          <span>&larr; Return to Species Library</span>
        </button>

        {onCompare && (
          <button className="mycology-btn-secondary" onClick={() => onCompare(entry)}>
            Compare with Another Species
          </button>
        )}
      </div>

      {/* Hero Header Card */}
      <div className="mycology-detail-hero">
        <div className="mycology-detail-hero-media">
          <img src={imgSrc} alt={entry.title} className="mycology-detail-hero-img" />
          {primaryMedia?.angle && (
            <span className="mycology-angle-tag">Angle: {primaryMedia.angle.toUpperCase()}</span>
          )}
        </div>

        <div className="mycology-detail-hero-info">
          <div className="mycology-detail-taxonomy-header">
            <span className="mycology-pack-badge">Pack: {entry.packId}</span>
            <span className="mycology-version-badge">v{entry.version}</span>
          </div>

          <h1 className="mycology-detail-title">{entry.title}</h1>
          <h2 className="mycology-detail-scientific">
            <em>{entry.scientificName}</em> {entry.authority}
          </h2>

          <p className="mycology-detail-summary">{entry.content?.summary}</p>

          <SafetyBadge edibility={entry.content?.edibility} safetyRating={entry.safetyRating} />
        </div>
      </div>

      {/* Internal Navigation Tabs */}
      <div className="mycology-detail-nav-tabs">
        <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={activeTab === 'identification' ? 'active' : ''} onClick={() => setActiveTab('identification')}>Identification Traits</button>
        <button className={activeTab === 'safety' ? 'active' : ''} onClick={() => setActiveTab('safety')}>Safety & Toxicity</button>
        <button className={activeTab === 'traditional' ? 'active' : ''} onClick={() => setActiveTab('traditional')}>Traditional Knowledge</button>
        <button className={activeTab === 'lookalikes' ? 'active' : ''} onClick={() => setActiveTab('lookalikes')}>Lookalikes</button>
        <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => setActiveTab('ai')}>R.A.N.G.E.R. AI Advisory</button>
      </div>

      {/* Tab Contents */}
      <div className="mycology-detail-body">
        {activeTab === 'overview' && (
          <div className="mycology-tab-pane">
            <div className="mycology-detail-section">
              <h3>Morphological Overview</h3>
              <p className="mycology-prose">{entry.content?.description}</p>
            </div>

            <div className="mycology-detail-grid-2">
              <div className="mycology-info-box">
                <h4><MapPin size={16} /> Habitat & Substrate</h4>
                <p>{entry.content?.habitatDesc || 'Hardwood/conifer mycorrhizal association.'}</p>
              </div>

              <div className="mycology-info-box">
                <h4><Calendar size={16} /> Seasonality</h4>
                <p>{entry.content?.seasonalityDesc || 'Summer through autumn.'}</p>
              </div>
            </div>

            {/* Scientific Taxonomy Tree */}
            <div className="mycology-detail-section" style={{ marginTop: 20 }}>
              <h3>Scientific Taxonomy Hierarchy</h3>
              <div className="mycology-taxonomy-pills">
                <span>Kingdom: <strong>{entry.taxonomy?.kingdom}</strong></span>
                <span>Phylum: <strong>{entry.taxonomy?.phylum}</strong></span>
                <span>Class: <strong>{entry.taxonomy?.class}</strong></span>
                <span>Order: <strong>{entry.taxonomy?.order}</strong></span>
                <span>Family: <strong>{entry.taxonomy?.family}</strong></span>
                <span>Genus: <strong>{entry.taxonomy?.genus}</strong></span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'identification' && (
          <div className="mycology-tab-pane">
            <div className="mycology-detail-section">
              <h3>Diagnostic Identification Protocol</h3>
              <p className="mycology-prose">{entry.content?.identificationGuide}</p>
            </div>

            <div className="mycology-traits-table">
              <div className="mycology-trait-row">
                <span className="trait-key">Hymenophore:</span>
                <span className="trait-val">{entry.traits?.hymenophore?.map(t => t.label).join(', ') || 'N/A'}</span>
              </div>
              <div className="mycology-trait-row">
                <span className="trait-key">Cap Features:</span>
                <span className="trait-val">{entry.traits?.cap_color?.map(t => t.label).join(', ') || 'N/A'}</span>
              </div>
              <div className="mycology-trait-row">
                <span className="trait-key">Stem / Ring / Volva:</span>
                <span className="trait-val">{entry.traits?.stem?.map(t => t.label).join(', ') || 'N/A'}</span>
              </div>
              <div className="mycology-trait-row">
                <span className="trait-key">Spore Print Color:</span>
                <span className="trait-val">{entry.traits?.spore_print?.map(t => t.label).join(', ') || 'N/A'}</span>
              </div>
              <div className="mycology-trait-row">
                <span className="trait-key">Flesh Reaction:</span>
                <span className="trait-val">{entry.traits?.flesh?.map(t => t.label).join(', ') || 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="mycology-tab-pane">
            <div className="mycology-safety-alert-large">
              <ShieldAlert size={32} />
              <div>
                <h4>Safety Rating: {entry.content?.edibility?.toUpperCase()}</h4>
                <p>Identification Difficulty: <strong>{entry.safetyRating?.difficulty}</strong> | Risk Level: <strong>{entry.safetyRating?.risk}</strong></p>
              </div>
            </div>

            <div className="mycology-detail-section">
              <h3>Toxicity & Chemical Considerations</h3>
              <p className="mycology-prose">{entry.content?.toxicityDesc || 'No known toxic compounds reported.'}</p>
            </div>

            {entry.content?.medicinalDesc && (
              <div className="mycology-detail-section">
                <h3>Medicinal & Physiological Properties</h3>
                <p className="mycology-prose">{entry.content?.medicinalDesc}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'traditional' && (
          <div className="mycology-tab-pane">
            <h3>Multi-Source Attribution & Traditional Knowledge Layer</h3>
            {entry.sourcesAttribution?.length === 0 ? (
              <p className="mycology-muted">No specific traditional knowledge entry attached.</p>
            ) : (
              <div className="mycology-attribution-list">
                {entry.sourcesAttribution.map((src, idx) => (
                  <div key={idx} className="mycology-attribution-card">
                    <span className="mycology-attr-type">{src.type?.toUpperCase()}</span>
                    <h4>Contributor: {src.contributor}</h4>
                    <p>{src.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'lookalikes' && (
          <div className="mycology-tab-pane">
            <h3>Similar Species & Dangerous Lookalikes</h3>
            {entry.relationships?.length === 0 ? (
              <p className="mycology-muted">No lookalike relationships registered for this species.</p>
            ) : (
              <div className="mycology-lookalikes-list">
                {entry.relationships.map((rel, idx) => (
                  <div key={idx} className="mycology-lookalike-card">
                    <div className="mycology-lookalike-header">
                      <AlertTriangle size={18} color="var(--color-caution, #F59E0B)" />
                      <h4>Target Species ID: {rel.target_id} ({rel.relation_type?.toUpperCase()})</h4>
                    </div>
                    <p>{rel.notes}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ai' && (
          <div className="mycology-tab-pane">
            <div className="mycology-ai-box">
              <div className="mycology-ai-header">
                <Sparkles size={20} color="var(--color-moss, #4A6B4B)" />
                <h3>R.A.N.G.E.R. Local AI Advisory Analysis</h3>
              </div>

              <p className="mycology-muted">
                Ask R.A.N.G.E.R. to evaluate field traits, explain distinguishing characteristics vs lookalikes, or clarify habitat associations.
              </p>

              <div className="mycology-ai-input-group">
                <input 
                  type="text" 
                  placeholder={`Ask R.A.N.G.E.R. about ${entry.title}...`} 
                  value={aiPrompt} 
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
                <button className="mycology-btn-primary" onClick={handleAskRangerAI} disabled={aiLoading}>
                  {aiLoading ? 'Analyzing...' : 'Analyze with AI'}
                </button>
              </div>

              {aiResult && (
                <div className="mycology-ai-output">
                  <div className="mycology-ai-markdown" dangerouslySetInnerHTML={{ __html: aiResult.replace(/\n/g, '<br/>') }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
