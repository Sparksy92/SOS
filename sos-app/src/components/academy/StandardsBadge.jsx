import React from 'react';
import { Award, ShieldCheck, Flag } from 'lucide-react';

export default function StandardsBadge({ standards = [] }) {
  if (!standards || standards.length === 0) return null;

  return (
    <div className="academy-standards-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' }}>
      {standards.map((std, idx) => {
        const isUS = std.startsWith('US.');
        const isCA = std.startsWith('CA.');
        const bg = isUS ? 'rgba(59, 130, 246, 0.15)' : isCA ? 'rgba(239, 68, 68, 0.15)' : 'rgba(74, 107, 75, 0.2)';
        const border = isUS ? 'rgba(59, 130, 246, 0.4)' : isCA ? 'rgba(239, 68, 68, 0.4)' : 'rgba(74, 107, 75, 0.4)';
        const textColor = isUS ? '#60A5FA' : isCA ? '#F87171' : '#A7F3D0';

        return (
          <span 
            key={idx} 
            title={isUS ? "US Curriculum Standard (NGSS/CCSS/CTE)" : isCA ? "Canadian Provincial Curriculum Standard (Ontario/BC/AB)" : "Educational Standard"}
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '4px',
              background: bg,
              border: `1px solid ${border}`,
              color: textColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            {isUS && <Flag size={10} color="#60A5FA" />}
            {isCA && <Award size={10} color="#F87171" />}
            {!isUS && !isCA && <ShieldCheck size={10} color="#A7F3D0" />}
            {std}
          </span>
        );
      })}
    </div>
  );
}
