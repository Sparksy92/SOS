import { MapPin, Calendar, Lock, Unlock, Trash2 } from 'lucide-react';

export default function ObservationCard({ observation, onSelect, onDelete }) {
  const dateStr = observation.date ? new Date(observation.date).toLocaleDateString() : 'Unknown Date';
  const primaryPhoto = observation.photos?.[0];

  return (
    <div className="mycology-observation-card" onClick={() => onSelect && onSelect(observation)}>
      <div className="mycology-obs-image">
        {primaryPhoto?.url ? (
          <img src={primaryPhoto.url} alt="Field observation" />
        ) : (
          <div className="mycology-obs-no-img">No Photo</div>
        )}
      </div>

      <div className="mycology-obs-content">
        <div className="mycology-obs-header">
          <h4 className="mycology-obs-title">
            {observation.linkedEntry?.title || observation.locationName || 'Unidentified Observation'}
          </h4>
          <span className={`mycology-obs-conf conf-${observation.confidence}`}>
            {observation.confidence ? observation.confidence.toUpperCase() : 'UNIDENTIFIED'}
          </span>
        </div>

        <div className="mycology-obs-meta">
          <span><Calendar size={13} /> {dateStr}</span>
          {observation.locationName && (
            <span><MapPin size={13} /> {observation.locationName}</span>
          )}
          <span>
            {observation.isPrivate ? <Lock size={13} title="Private Observation" /> : <Unlock size={13} title="Shared" />}
            {observation.isPrivate ? ' Private' : ' Public'}
          </span>
        </div>

        {observation.notes && (
          <p className="mycology-obs-notes">{observation.notes.slice(0, 120)}...</p>
        )}
      </div>

      {onDelete && (
        <button 
          className="mycology-obs-delete-btn" 
          onClick={(e) => {
            e.stopPropagation();
            onDelete(observation.id);
          }}
          title="Delete observation"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
