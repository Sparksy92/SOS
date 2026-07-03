import React from 'react';
import { 
  Wheat, 
  AlertTriangle,
  Info,
  CheckSquare
} from 'lucide-react';
import { calculatePantryReserves, PANTRY_GUIDELINES } from '../../modules/food/pantryCalculations.js';

export default function PantryPanel({ 
  profile, 
  setProfile 
}) {
  const stats = calculatePantryReserves(profile.pantry, profile.peopleCount, profile.targetWeeks);

  const handleUpdateStock = (category, val) => {
    const num = val === '' ? '' : parseFloat(val);
    setProfile(prev => ({
      ...prev,
      pantry: {
        ...prev.pantry,
        [category]: num
      }
    }));
  };

  const handleUpdateProfileField = (field, val) => {
    const parsed = parseInt(val) || 0;
    setProfile(prev => ({
      ...prev,
      [field]: parsed
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="category-title" style={{ letterSpacing: '2px', margin: 0 }}>FOOD & PANTRY</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            MANAGE Configurable Survival Pantry Recommendation Weights and Homestead Stock Levels
          </div>
        </div>
      </div>

      {/* Configuration Controls */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>FAMILY SIZE (PEOPLE)</label>
          <input 
            type="number" 
            className="search-input glass-panel" 
            style={{ width: '100%', padding: '10px', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}
            min="1"
            value={profile.peopleCount}
            onChange={e => handleUpdateProfileField('peopleCount', e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '160px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>TARGET DURATION (WEEKS)</label>
          <input 
            type="number" 
            className="search-input glass-panel" 
            style={{ width: '100%', padding: '10px', fontSize: '1.1rem', fontFamily: 'var(--font-mono)' }}
            min="1"
            value={profile.targetWeeks}
            onChange={e => handleUpdateProfileField('targetWeeks', e.target.value)}
          />
        </div>
        <div style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', minWidth: '240px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--brand-primary)', marginBottom: '4px', fontWeight: 'bold' }}>
            <Info size={14} /> SYSTEM CALCULATION CORE
          </div>
          Weekly food targets are evaluated against your homestead population and target coverage weeks. Deficits indicate categories requiring urgent replenishment.
        </div>
      </div>

      {/* Grid of category inventory items */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1.5px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          SURVIVAL PANTRY RATINGS MATRIX
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Object.entries(PANTRY_GUIDELINES).map(([category, guide]) => {
            const data = stats.breakdown[category] || { current: 0, target: 0, diff: 0, percent: 100 };
            const isLow = data.diff < 0;

            return (
              <div 
                key={category} 
                className="glass-panel" 
                style={{ 
                  padding: '16px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between', 
                  flexWrap: 'wrap', 
                  gap: '16px',
                  borderColor: isLow ? 'var(--brand-danger)' : 'var(--border-subtle)',
                  backgroundColor: isLow ? 'rgba(255,0,0,0.01)' : 'rgba(255,255,255,0.01)'
                }}
              >
                {/* Info */}
                <div style={{ flex: '1 1 200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: isLow ? 'var(--brand-danger)' : 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                      {category.replace('_', ' ').toUpperCase()}
                    </span>
                    {isLow ? (
                      <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--brand-danger)', color: 'white', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                        DEFICIT: {Math.abs(data.diff).toFixed(1)} LBS
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.65rem', backgroundColor: '#00ff66', color: 'black', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold' }}>
                        SURPLUS: +{data.diff.toFixed(1)} LBS
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Recommended: {guide.recommendation_lbs_per_week} LBS / person / week. Target: {data.target.toFixed(1)} LBS.
                  </div>
                </div>

                {/* Meter progress bar */}
                <div style={{ flex: '1 1 180px', minWidth: '120px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                    <span>FULFILLMENT:</span>
                    <span style={{ color: isLow ? 'var(--brand-danger)' : '#00ff66', fontWeight: 'bold' }}>{data.percent.toFixed(0)}%</span>
                  </div>
                  <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        width: `${Math.min(data.percent, 100)}%`, 
                        height: '100%', 
                        backgroundColor: isLow ? 'var(--brand-danger)' : '#00ff66' 
                      }} 
                    />
                  </div>
                </div>

                {/* Edit Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CURRENT STOCK (LBS):</span>
                  <input 
                    type="number" 
                    className="search-input glass-panel" 
                    style={{ width: '90px', padding: '8px', textAlign: 'center', fontSize: '0.95rem', fontFamily: 'var(--font-mono)' }}
                    min="0"
                    value={profile.pantry[category] === undefined ? '' : profile.pantry[category]}
                    onChange={e => handleUpdateStock(category, e.target.value)}
                  />
                </div>

              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
