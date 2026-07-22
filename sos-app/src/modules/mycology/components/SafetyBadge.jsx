import { EDIBILITY_BADGES } from '../models/knowledgeEntry.js';
import { ShieldAlert, AlertTriangle, ShieldCheck, Info } from 'lucide-react';

export default function SafetyBadge({ edibility, safetyRating, compact = false }) {
  const badgeInfo = EDIBILITY_BADGES[edibility?.toLowerCase()] || EDIBILITY_BADGES.unknown;
  const risk = safetyRating?.risk || 'moderate';
  const difficulty = safetyRating?.difficulty || 'intermediate';

  if (compact) {
    return (
      <span 
        className="mycology-badge-compact" 
        style={{ color: badgeInfo.color, backgroundColor: badgeInfo.bg }}
      >
        {edibility === 'deadly' || edibility === 'poisonous' ? (
          <ShieldAlert size={12} style={{ display: 'inline', marginRight: 4 }} />
        ) : (
          <ShieldCheck size={12} style={{ display: 'inline', marginRight: 4 }} />
        )}
        {badgeInfo.label}
      </span>
    );
  }

  return (
    <div className="mycology-safety-badge-box">
      <div 
        className="mycology-edibility-pill"
        style={{ color: badgeInfo.color, backgroundColor: badgeInfo.bg, borderColor: badgeInfo.color }}
      >
        {edibility === 'deadly' || edibility === 'poisonous' ? <ShieldAlert size={16} /> : <ShieldCheck size={16} />}
        <span>{badgeInfo.label}</span>
      </div>

      <div className="mycology-safety-metrics">
        <div className="mycology-metric-item">
          <span className="mycology-metric-label">Difficulty:</span>
          <span className={`mycology-difficulty-tag diff-${difficulty}`}>{difficulty.toUpperCase()}</span>
        </div>
        <div className="mycology-metric-item">
          <span className="mycology-metric-label">Risk Level:</span>
          <span className={`mycology-risk-tag risk-${risk}`}>{risk.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}
