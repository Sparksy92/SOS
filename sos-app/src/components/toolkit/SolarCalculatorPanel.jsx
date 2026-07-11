import React, { useState } from 'react';
import { Sun, Battery, Cpu, AlertTriangle } from 'lucide-react';

export default function SolarCalculatorPanel() {
  const [solarWatts, setSolarWatts] = useState(400); // W
  const [sunHours, setSunHours] = useState(5.5); // hours
  const [batteryAh, setBatteryAh] = useState(200); // Ah
  const [batteryVoltage, setBatteryVoltage] = useState(12); // V
  const [activeLoad, setActiveLoad] = useState(150); // W

  // Calculations
  const batteryWh = batteryAh * batteryVoltage;
  const dailyGenWh = solarWatts * sunHours * 0.85; // 15% efficiency losses (temp, dust, inverter)
  const dailyConsWh = activeLoad * 24;
  const netDailyWh = dailyGenWh - dailyConsWh;
  const runtimeHours = activeLoad > 0 ? (batteryWh * 0.8) / activeLoad : 0; // 80% usable depth of discharge (DoD) for LiFePO4

  return (
    <div className="glass-panel" style={{ padding: '24px', color: '#e0e0e0', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sun size={20} /> SOLAR & BATTERY DIAGNOSTICS
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a0a0a0' }}>
          Analyze daily off-grid solar generation, battery capacity reserves, and appliance load runtime estimates.
        </p>
      </div>

      {/* Grid Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Controls Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Solar Panel Config */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--brand-primary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>SOLAR GENERATION ARRAY</span>
              <span>{solarWatts} Watts</span>
            </h4>
            <input 
              type="range" 
              min="50" 
              max="2000" 
              step="50"
              value={solarWatts} 
              onChange={e => setSolarWatts(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888', marginTop: '6px' }}>
              <span>50W</span>
              <span>2000W</span>
            </div>

            <div style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                <span>PEAK SUNLIGHT HOURS</span>
                <span style={{ color: '#fff' }}>{sunHours} hrs/day</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="12" 
                step="0.5"
                value={sunHours} 
                onChange={e => setSunHours(parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
              />
            </div>
          </div>

          {/* Battery Bank Config */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--brand-primary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>BATTERY BANK STORAGE</span>
              <span>{batteryAh} Ah</span>
            </h4>
            <input 
              type="range" 
              min="20" 
              max="1000" 
              step="10"
              value={batteryAh} 
              onChange={e => setBatteryAh(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888', marginTop: '6px' }}>
              <span>20Ah</span>
              <span>1000Ah</span>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.8rem', color: '#888', display: 'block', marginBottom: '4px' }}>VOLTAGE</span>
                <select 
                  value={batteryVoltage}
                  onChange={e => setBatteryVoltage(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                >
                  <option value={12}>12V (Standard)</option>
                  <option value={24}>24V (Mid-sized)</option>
                  <option value={48}>48V (Advanced Home)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Load Config */}
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--brand-primary)', display: 'flex', justifyContent: 'space-between' }}>
              <span>CONTINUOUS DEVICE LOAD</span>
              <span>{activeLoad} W</span>
            </h4>
            <input 
              type="range" 
              min="5" 
              max="2000" 
              step="5"
              value={activeLoad} 
              onChange={e => setActiveLoad(parseInt(e.target.value))}
              style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--brand-primary)' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888', marginTop: '6px' }}>
              <span>5W (Router)</span>
              <span>2000W (Heater)</span>
            </div>
          </div>

        </div>

        {/* Diagnostics & Readout Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', justifyContent: 'space-between' }}>
          
          {/* Main Gauges */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            
            {/* Runtime Indicator */}
            <div style={{ border: '1px solid rgba(0, 242, 254, 0.3)', padding: '20px', borderRadius: '8px', background: 'rgba(0, 242, 254, 0.02)', textAlign: 'center' }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--brand-primary)', marginBottom: '6px' }}>
                ESTIMATED BACKUP RUNTIME (80% DoD)
              </div>
              <div style={{ fontSize: '2.2rem', fontWeight: 'bold', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {runtimeHours.toFixed(1)} <span style={{ fontSize: '1.2rem', color: 'var(--brand-primary)' }}>HOURS</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a0a0a0', marginTop: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                <Battery size={14} /> Total Reserve Capacity: {batteryWh} Wh
              </div>
            </div>

            {/* Daily Net Balance */}
            <div style={{ 
              border: `1px solid ${netDailyWh >= 0 ? 'rgba(0,255,102,0.3)' : 'rgba(255,69,0,0.3)'}`, 
              padding: '20px', 
              borderRadius: '8px', 
              background: netDailyWh >= 0 ? 'rgba(0,255,102,0.02)' : 'rgba(255,69,0,0.02)', 
              textAlign: 'center' 
            }}>
              <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: netDailyWh >= 0 ? '#00ff66' : '#ff4500', marginBottom: '6px' }}>
                DAILY NET ENERGY STATUS
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', fontFamily: 'var(--font-mono)' }}>
                {netDailyWh >= 0 ? '+' : ''}{netDailyWh.toFixed(0)} <span style={{ fontSize: '1.1rem', color: netDailyWh >= 0 ? '#00ff66' : '#ff4500' }}>Wh/day</span>
              </div>
              <div style={{ fontSize: '0.8rem', color: '#c0c0c0', marginTop: '6px' }}>
                Gen: {dailyGenWh.toFixed(0)} Wh | Consumed: {dailyConsWh.toFixed(0)} Wh
              </div>
            </div>

          </div>

          {/* Guidelines info card */}
          <div style={{ padding: '14px', backgroundColor: 'rgba(255, 183, 0, 0.05)', border: '1px solid rgba(255, 183, 0, 0.2)', borderRadius: '6px', display: 'flex', gap: '10px' }}>
            <AlertTriangle size={16} style={{ color: '#ffb700', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.78rem', color: '#ffb300', lineHeight: '1.4' }}>
              <strong>OPERATOR WARNING:</strong> Run calculations are nominal guidelines based on a standard 80% usable depth of discharge (DoD) for LiFePO4 batteries. Lead-acid batteries must only be discharged to 50% capacity to prevent cell damage.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
