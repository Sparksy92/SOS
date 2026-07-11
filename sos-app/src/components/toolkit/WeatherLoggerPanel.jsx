import React, { useState, useEffect } from 'react';
import { CloudRain, CloudSun, AlertTriangle, Plus, Trash } from 'lucide-react';

export default function WeatherLoggerPanel() {
  const [weatherLogs, setWeatherLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('sos_weather_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [form, setForm] = useState({
    temp: '22',
    humidity: '65',
    pressure: '1013', // hPa
    wind: '10',
    condition: 'Sunny'
  });

  useEffect(() => {
    localStorage.setItem('sos_weather_logs', JSON.stringify(weatherLogs));
  }, [weatherLogs]);

  const handleAddLog = (e) => {
    e.preventDefault();
    const newLog = {
      id: Date.now(),
      temp: parseFloat(form.temp) || 0,
      humidity: parseFloat(form.humidity) || 0,
      pressure: parseFloat(form.pressure) || 1013,
      wind: parseFloat(form.wind) || 0,
      condition: form.condition,
      timestamp: new Date().toISOString()
    };
    setWeatherLogs(prev => [newLog, ...prev]);
  };

  const handleDeleteLog = (id) => {
    setWeatherLogs(prev => prev.filter(item => item.id !== id));
  };

  // Analyze pressure trend from the last 2 records
  const getPressureTrend = () => {
    if (weatherLogs.length < 2) return { status: 'STABLE', color: '#a0a0a0', desc: 'Need at least 2 logs to calculate trends.' };
    const latest = weatherLogs[0].pressure;
    const previous = weatherLogs[1].pressure;
    const diff = latest - previous;
    
    if (diff < -2) {
      return {
        status: 'FALLING RAPIDLY',
        color: 'var(--brand-danger)',
        desc: `Pressure dropped by ${Math.abs(diff)} hPa. High warning of incoming storm, strong winds, or precipitation!`
      };
    } else if (diff < 0) {
      return {
        status: 'FALLING',
        color: '#ffb700',
        desc: `Pressure decreased by ${Math.abs(diff)} hPa. Weather conditions may degrade soon.`
      };
    } else if (diff > 2) {
      return {
        status: 'RISING RAPIDLY',
        color: '#00ff66',
        desc: `Pressure rose by ${diff} hPa. Clearing skies and stable, good weather incoming.`
      };
    } else if (diff > 0) {
      return {
        status: 'RISING',
        color: '#00ff66',
        desc: `Pressure increased by ${diff} hPa. Gradual improvement or stable conditions.`
      };
    } else {
      return {
        status: 'STABLE',
        color: 'var(--brand-primary)',
        desc: 'Barometric pressure remains steady.'
      };
    }
  };

  const trend = getPressureTrend();

  // Render pressure trend SVG chart
  const renderPressureChart = () => {
    if (weatherLogs.length < 2) {
      return (
        <div style={{ height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem', border: '1px dashed rgba(255,255,255,0.05)', borderRadius: '4px' }}>
          Add log entries to plot barometric chart.
        </div>
      );
    }

    const chartLogs = [...weatherLogs].slice(0, 8).reverse();
    const pressures = chartLogs.map(l => l.pressure);
    const minP = Math.min(...pressures) - 5;
    const maxP = Math.max(...pressures) + 5;
    const range = maxP - minP;

    const width = 360;
    const height = 120;
    const padding = 15;

    const points = chartLogs.map((log, idx) => {
      const x = padding + (idx * (width - padding * 2)) / (chartLogs.length - 1);
      const y = height - padding - ((log.pressure - minP) * (height - padding * 2)) / range;
      return { x, y, val: log.pressure, time: new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    });

    const pathD = points.reduce((acc, p, idx) => {
      return acc + `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    }, "");

    return (
      <div style={{ border: '1px solid rgba(255,255,255,0.05)', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#888', marginBottom: '8px' }}>
          <span>BAROMETRIC CHART (hPa)</span>
          <span>Last {chartLogs.length} readings</span>
        </div>
        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
          {/* Grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="rgba(255,255,255,0.05)" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="rgba(255,255,255,0.03)" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="rgba(255,255,255,0.05)" />

          {/* Line Path */}
          <path d={pathD} fill="none" stroke="var(--brand-primary)" strokeWidth="2.5" />

          {/* Dots & Labels */}
          {points.map((p, idx) => (
            <g key={idx}>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--brand-primary)" />
              <text x={p.x} y={p.y - 8} fill="#fff" fontSize="8" textAnchor="middle">{p.val}</text>
              <text x={p.x} y={height - 2} fill="#888" fontSize="7" textAnchor="middle">{p.time}</text>
            </g>
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', color: '#e0e0e0', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CloudSun size={20} /> WEATHER LOG & BAROMETRIC TRENDS
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a0a0a0' }}>
          Track local climate variables manually and analyze barometric trend drops to predict storms offline.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Readout and Trend Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Trend Gauge */}
          <div style={{ border: `1px solid ${trend.color}`, padding: '16px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.01)' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', display: 'block', marginBottom: '4px' }}>BAROMETRIC TREND RESOLUTION</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: trend.color, fontFamily: 'var(--font-mono)' }}>
              {trend.status}
            </div>
            <p style={{ fontSize: '0.8rem', color: '#d0d0d0', margin: '6px 0 0 0', lineHeight: '1.4' }}>
              {trend.desc}
            </p>
          </div>

          {/* SVG pressure chart */}
          {renderPressureChart()}

        </div>

        {/* Input & Form Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <form onSubmit={handleAddLog} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--brand-primary)' }}>LOG DAILY OBSERVATION</h4>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>TEMP (°C)</span>
                <input 
                  type="number" 
                  value={form.temp}
                  onChange={e => setForm(prev => ({ ...prev, temp: e.target.value }))}
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>HUMIDITY (%)</span>
                <input 
                  type="number" 
                  value={form.humidity}
                  onChange={e => setForm(prev => ({ ...prev, humidity: e.target.value }))}
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>PRESSURE (hPa)</span>
                <input 
                  type="number" 
                  value={form.pressure}
                  onChange={e => setForm(prev => ({ ...prev, pressure: e.target.value }))}
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>WIND SPEED (km/h)</span>
                <input 
                  type="number" 
                  value={form.wind}
                  onChange={e => setForm(prev => ({ ...prev, wind: e.target.value }))}
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>CONDITION</span>
              <select 
                value={form.condition}
                onChange={e => setForm(prev => ({ ...prev, condition: e.target.value }))}
                style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
              >
                <option value="Sunny">Sunny</option>
                <option value="Cloudy">Cloudy</option>
                <option value="Rainy">Rainy</option>
                <option value="Stormy">Stormy / High Wind</option>
                <option value="Snowing">Snowing</option>
              </select>
            </div>

            <button type="submit" className="btn-tactical" style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <Plus size={14} style={{ marginRight: '6px' }} /> LOG OBSERVATION
            </button>
          </form>

          {/* List of recent items */}
          <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>HISTORICAL READINGS</h5>
            {weatherLogs.slice(0, 5).map(log => (
              <div 
                key={log.id} 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.01)', 
                  border: '1px solid rgba(255,255,255,0.04)', 
                  padding: '8px 12px', 
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.8rem'
                }}
              >
                <div>
                  <span style={{ color: '#fff', fontWeight: 'bold' }}>{log.pressure} hPa</span>
                  <span style={{ color: '#888', marginLeft: '8px' }}>{log.temp}°C | {log.humidity}% Hum | {log.condition}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#555' }}>{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <button 
                    onClick={() => handleDeleteLog(log.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-danger)', cursor: 'pointer', padding: '0 4px' }}
                  >
                    <Trash size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
