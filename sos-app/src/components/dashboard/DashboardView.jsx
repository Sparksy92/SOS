import React from 'react';
import { 
  ShieldAlert, 
  Activity, 
  Cpu, 
  Droplet, 
  Wheat, 
  Settings, 
  Terminal, 
  AlertTriangle,
  ClipboardList
} from 'lucide-react';
import { calculateWaterReserves } from '../../modules/water/waterCalculations.js';
import { calculatePantryReserves } from '../../modules/food/pantryCalculations.js';
import { calculateReadinessScore } from '../../modules/readiness/readinessCalculator.js';
import { ACTION_MODULES } from '../../modules/tools/actionModules.js';

export default function DashboardView({ 
  profile, 
  waterContainers, 
  crawlerStatus, 
  setViewMode, 
  categories, 
  metadata 
}) {
  // Calculate fulfillment stats
  const waterRes = calculateWaterReserves(waterContainers, profile.peopleCount, profile.targetWeeks);
  const foodRes = calculatePantryReserves(profile.pantry, profile.peopleCount, profile.targetWeeks);
  const readiness = calculateReadinessScore({
    waterContainers,
    pantryItems: profile.pantry,
    peopleCount: profile.peopleCount,
    targetWeeks: profile.targetWeeks,
    energyLevel: profile.energyLevel,
    selfRelianceLevel: profile.selfRelianceLevel
  });

  // Calculate readiness status color/labels
  let statusLabel = 'Weak';
  let statusColor = 'var(--brand-primary)';
  if (readiness.total >= 90) { statusLabel = 'Field Ready'; statusColor = '#00ff66'; }
  else if (readiness.total >= 75) { statusLabel = 'Strong'; statusColor = 'var(--brand-primary)'; }
  else if (readiness.total >= 50) { statusLabel = 'Improving'; statusColor = '#00E5FF'; }
  else if (readiness.total >= 25) { statusLabel = 'Weak'; statusColor = '#ff6600'; }
  else { statusLabel = 'Critical'; statusColor = 'var(--brand-danger)'; }

  // Aggregate warning list
  const allWarnings = [...waterRes.warnings, ...foodRes.warnings];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Dashboard Top Header */}
      <div className="category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 className="category-title" style={{ letterSpacing: '3px', margin: 0 }}>
            {profile.name.toUpperCase()} // COMMAND DASHBOARD
          </h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            LOCAL SURVIVAL DASHBOARD // ACTIVE MONITOR
          </div>
        </div>
        <div className="dashboard-header-badge">
          POPULATION: {profile.peopleCount} PAX // TARGET RESERVES: {profile.targetWeeks} WEEKS
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="dashboard-stats-grid">
        
        {/* Readiness Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', border: `1px solid ${statusColor}`, boxShadow: `0 0 12px ${statusColor}1a`, position: 'relative', overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1.5px', fontWeight: 'bold' }}>SURVIVAL READINESS</span>
            <ShieldAlert size={18} style={{ color: statusColor }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', margin: '10px 0' }}>
            <span className="text-glow" style={{ fontSize: '3.5rem', fontWeight: 'bold', color: statusColor, fontFamily: 'var(--font-mono)', lineHeight: 1 }}>
              {readiness.total}%
            </span>
            <span style={{ fontSize: '1.1rem', color: statusColor, fontWeight: 'bold', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              [{statusLabel}]
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
            Mathematical assessment of homestead reserves: Water (40%), Food (30%), Energy (15%), and Self-reliance (15%).
          </div>
          <button className="btn-tactical" onClick={() => setViewMode('readiness')} style={{ width: '100%', padding: '10px', fontSize: '0.8rem', marginTop: 'auto' }}>
            ANALYZE READINESS RATINGS
          </button>
        </div>

        {/* Water Level Widget */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1.5px', fontWeight: 'bold' }}>WATER RESERVES</span>
            <Droplet size={18} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
              <span>{waterRes.totalReserve.toFixed(0)} / {waterRes.totalCapacity.toFixed(0)} GAL</span>
              <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>{waterRes.fillPercentage.toFixed(0)}%</span>
            </div>
            <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden', border: '1px solid var(--border-subtle)', marginBottom: '8px' }}>
              <div 
                style={{ 
                  width: `${Math.min(waterRes.fillPercentage, 100)}%`, 
                  height: '100%', 
                  backgroundColor: waterRes.fillPercentage <= 25 ? 'var(--brand-danger)' : 'var(--brand-primary)', 
                  boxShadow: `0 0 10px ${waterRes.fillPercentage <= 25 ? 'var(--brand-danger)' : 'var(--brand-primary)'}`,
                  transition: 'width 0.5s ease-in-out'
                }} 
              />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
            <span>ESTIMATED DURATION:</span>
            <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
              {waterRes.durationDays === Infinity ? 'N/A' : `${waterRes.durationDays} DAYS`}
            </span>
          </div>
          <button className="btn-tactical" onClick={() => setViewMode('water')} style={{ width: '100%', padding: '10px', fontSize: '0.8rem', marginTop: 'auto' }}>
            MANAGE STORAGE CONTAINERS
          </button>
        </div>

        {/* Food Stock Widget */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1.5px', fontWeight: 'bold' }}>FOOD INVENTORY</span>
            <Wheat size={18} style={{ color: 'var(--brand-primary)' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
              <span>CATEGORIES STOCK:</span>
              <span style={{ color: foodRes.isCritical ? 'var(--brand-danger)' : '#00ff66', fontWeight: 'bold' }}>
                {foodRes.isCritical ? 'DEFICIT REPORTED' : 'ADEQUATE'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '3px', marginTop: '6px' }}>
              {Object.entries(foodRes.breakdown).map(([cat, b]) => {
                const isLow = b.diff < 0;
                return (
                  <div 
                    key={cat} 
                    title={`${cat.replace('_', ' ').toUpperCase()}: ${b.percent.toFixed(0)}%`}
                    style={{ 
                      flex: 1, 
                      height: '8px', 
                      backgroundColor: isLow ? 'var(--brand-danger)' : '#00ff66', 
                      boxShadow: isLow ? 'none' : '0 0 4px #00ff663a',
                      opacity: 0.8 
                    }} 
                  />
                );
              })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '8px' }}>
            <span>CATEGORY RATINGS:</span>
            <span style={{ color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              {Object.values(foodRes.breakdown).filter(b => b.diff >= 0).length} / {Object.keys(foodRes.breakdown).length} STABLE
            </span>
          </div>
          <button className="btn-tactical" onClick={() => setViewMode('food')} style={{ width: '100%', padding: '10px', fontSize: '0.8rem', marginTop: 'auto' }}>
            MANAGE PANTRY SUPPLIES
          </button>
        </div>

      </div>

      {/* System Infrastructure Details & Warnings */}
      <div className="dashboard-infra-grid">
        
        {/* Infrastructure Panel */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)', letterSpacing: '1.5px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            INFRASTRUCTURE STATUS
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>KNOWLEDGE SYSTEM (AI):</span>
              <span style={{ color: '#00ff66', fontWeight: 'bold' }}>R.A.N.G.E.R. (llama3.1:8b)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>LOCAL TEXT INDEX:</span>
              <span style={{ color: 'var(--brand-primary)' }}>13,465 RECORDS</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-muted)' }}>CRAWLER SAFETY GUARD:</span>
              <span style={{ color: 'var(--brand-primary)' }}>AUTO-START DISABLED</span>
            </div>
            {crawlerStatus && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '10px', marginTop: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>SYNC SCANNER STATUS:</span>
                  <span style={{ color: crawlerStatus.isCrawling ? 'var(--brand-primary)' : 'var(--text-muted)', fontWeight: 'bold' }}>
                    {crawlerStatus.isCrawling ? 'SYNC ACTIVE' : 'IDLE STANDBY'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>CURRENT STATE:</span>
                  <span>{crawlerStatus.statusText}</span>
                </div>
              </div>
            )}
          </div>
          <button className="btn-tactical" onClick={() => setViewMode('settings')} style={{ width: '100%', padding: '8px', fontSize: '0.8rem', marginTop: 'auto' }}>
            MANAGE INDEX & SYNC
          </button>
        </div>

        {/* Action Alerts Warnings */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)', letterSpacing: '1.5px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
            TACTICAL NOTICES ({allWarnings.length})
          </h3>
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '180px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {allWarnings.length === 0 ? (
              <div style={{ color: '#00ff66', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 0', justifyContent: 'center' }}>
                <Activity size={18} style={{ color: '#00ff66' }} />
                <span>ALL MONITORS REPORTING OPTIMAL STATUS</span>
              </div>
            ) : (
              allWarnings.map((warning, idx) => (
                <div 
                  key={idx} 
                  style={{ 
                    color: 'var(--brand-danger)', 
                    fontSize: '0.8rem', 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    gap: '8px', 
                    lineHeight: '1.4', 
                    backgroundColor: 'rgba(255, 0, 0, 0.03)', 
                    padding: '10px', 
                    borderRadius: '4px', 
                    borderLeft: '3px solid var(--brand-danger)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>{warning.toUpperCase()}</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Quick Action Guides Grid */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '8px' }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)', letterSpacing: '1.5px' }}>
            QUICK ACTION WIZARDS
          </h3>
          <ClipboardList size={18} style={{ color: 'var(--brand-primary)' }} />
        </div>
        <div className="dashboard-wizards-grid">
          {ACTION_MODULES.slice(0, 4).map(guide => (
            <div 
              key={guide.id}
              className="glass-panel"
              style={{
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: '8px',
                backgroundColor: 'rgba(255,255,255,0.01)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '6px'
              }}
            >
              <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                {guide.title.toUpperCase()}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', flex: 1 }}>
                {guide.description}
              </span>
              <button 
                className="btn-tactical" 
                onClick={() => setViewMode('action-guides')}
                style={{ width: '100%', padding: '6px', fontSize: '0.75rem', marginTop: '10px' }}
              >
                DEPLOY STEP MATRIX
              </button>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
