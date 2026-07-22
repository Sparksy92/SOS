import SafetyBadge from './SafetyBadge.jsx';
import { ArrowRight, Image as ImageIcon, MapPin } from 'lucide-react';
import { getMushroomImage } from '../utils/mushroomImages.js';

export default function SpeciesCard({ entry, onSelect, onCompare }) {
  const primaryMedia = entry.media?.find(m => m.url) || entry.media?.[0];
  const imgSrc = primaryMedia?.url && !primaryMedia.url.includes('/materials/mycology/') ? primaryMedia.url : getMushroomImage(entry.id);

  return (
    <div className="mycology-species-card" onClick={() => onSelect(entry)}>
      <div className="mycology-card-image-wrap">
        <img src={imgSrc} alt={entry.title} className="mycology-card-img" />
        <div className="mycology-card-badge-overlay">
          <SafetyBadge edibility={entry.content?.edibility} compact={true} />
        </div>
      </div>

      <div className="mycology-card-body">
        <h3 className="mycology-card-title">{entry.title}</h3>
        <p className="mycology-card-scientific"><em>{entry.scientificName}</em> {entry.authority}</p>
        
        <p className="mycology-card-summary">
          {entry.content?.summary || entry.content?.description?.slice(0, 100) + '...'}
        </p>

        <div className="mycology-card-tags">
          {entry.traits?.hymenophore?.[0] && (
            <span className="mycology-mini-tag">Hymenophore: {entry.traits.hymenophore[0].label}</span>
          )}
          {entry.traits?.habitat?.[0] && (
            <span className="mycology-mini-tag">Habitat: {entry.traits.habitat[0].label}</span>
          )}
        </div>
      </div>

      <div className="mycology-card-footer">
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
          <span>Field Guide</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
