import React from 'react';
import { 
  ShieldAlert, 
  Droplet, 
  Wheat, 
  Activity, 
  Info,
  CheckSquare
} from 'lucide-react';
import { calculateReadinessScore } from '../../modules/readiness/readinessCalculator.js';

export default function ReadinessPanel({ 
  profile, 
  waterContainers 
}) {
  const readiness = calculateReadinessScore({
    waterContainers,
    pantryItems: profile.pantry,
    peopleCount: profile.peopleCount,
    targetWeeks: profile.targetWeeks,
    energyLevel: profile.energyLevel,
    selfRelianceLevel: profile.selfRelianceLevel
  });

  // Calculate labels
  let statusLabel = 'Weak';
  let statusColor = 'var(--brand-primary)';
  let desc = 'Reserves are insufficient for long-term shelter-in-place operations.';
  if (readiness.total >= 90) { 
    statusLabel = 'Field Ready'; 
    statusColor = '#00ff66'; 
    desc = 'Homestead reports 100% capacity reserves. Ready for sustained off-grid operations.';
  } else if (readiness.total >= 75) { 
    statusLabel = 'Strong'; 
    statusColor = 'var(--brand-primary)'; 
    desc = 'Reserves are adequate to exceed target duration goals. Minor improvements recommended.';
  } else if (readiness.total >= 50) { 
    statusLabel = 'Improving'; 
    statusColor = '#00E5FF'; 
    desc = 'Partial readiness achieved. Active storage is expanding but holds minor category deficits.';
  } else if (readiness.total >= 25) { 
    statusLabel = 'Weak'; 
    statusColor = '#ff6600'; 
    desc = 'Weak status. Immediate logistical replenishment required to cover target family duration.';
  } else { 
    statusLabel = 'Critical'; 
    statusColor = 'var(--brand-danger)'; 
    desc = 'CRITICAL LOGISTICAL RISK. Reserve levels are highly insufficient for immediate survival.';
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="category-header">
        <h2 className="category-title" style={{ letterSpacing: '2px', margin: 0 }}>READINESS EVALUATION</h2>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
          SURVIVAL readiness rating calculated from active homestead logistical metrics
        </div>
      </div>

      {/* Main score card */}
      <div className="glass-panel" style={{ padding: '32px', border: `1px solid ${statusColor}`, boxShadow: `0 0 16px ${statusColor}2a`, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
        <ShieldAlert size={64} style={{ color: statusColor }} />
        <div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', letterSpacing: '2px', fontWeight: 'bold' }}>COMPOSITE SCORE</span>
          <h1 className="text-glow" style={{ fontSize: '4.5rem', fontWeight: 'bold', color: statusColor, fontFamily: 'var(--font-mono)', margin: '8px 0', lineHeight: 1 }}>
            {readiness.total}%
          </h1>
          <span style={{ fontSize: '1.2rem', color: statusColor, fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>
            [{statusLabel}]
          </span>
        </div>
        <p style={{ fontSize: '0.95rem', color: 'var(--text-main)', maxWidth: '500px', lineHeight: '1.5', margin: 0 }}>
          {desc}
        </p>
      </div>

      {/* Breakdown Row */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '10px' }}>
          READINESS SUB-SYSTEM RATINGS
        </h3>

        {/* 1. Water */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
              <Droplet size={14} /> WATER SUFFICENCY (40% WEIGHT)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{readiness.breakdown.water}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${readiness.breakdown.water}%`, height: '100%', backgroundColor: 'var(--brand-primary)' }} />
          </div>
        </div>

        {/* 2. Food */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
              <Wheat size={14} /> FOOD INVENTORY FULFILLMENT (30% WEIGHT)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{readiness.breakdown.food}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${readiness.breakdown.food}%`, height: '100%', backgroundColor: 'var(--brand-primary)' }} />
          </div>
        </div>

        {/* 3. Energy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
              <Activity size={14} /> ENERGY RESERVES (15% WEIGHT)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{readiness.breakdown.energy}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${readiness.breakdown.energy}%`, height: '100%', backgroundColor: 'var(--brand-primary)' }} />
          </div>
        </div>

        {/* 4. Garden / Self-reliance */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold', color: 'var(--brand-primary)' }}>
              <CheckSquare size={14} /> SELF-RELIANCE & FORAGING (15% WEIGHT)
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{readiness.breakdown.garden}%</span>
          </div>
          <div style={{ height: '8px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${readiness.breakdown.garden}%`, height: '100%', backgroundColor: 'var(--brand-primary)' }} />
          </div>
        </div>

      </div>

      {/* Guide Info */}
      <div className="glass-panel" style={{ padding: '20px', display: 'flex', gap: '12px' }}>
        <Info size={24} style={{ color: 'var(--brand-primary)', flexShrink: 0 }} />
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
          <strong style={{ color: 'var(--text-main)' }}>HOW TO IMPROVE COMPOSITE READINESS:</strong><br />
          • Expand water reserve container capacity and keep filters/dates updated.<br />
          • Replenish food categories showing active deficits under target duration goals.<br />
          • Increase battery/generator offloads and garden sowing targets in profile settings.
        </div>
      </div>

    </div>
  );
}
