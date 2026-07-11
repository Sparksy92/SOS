import React, { useState, useEffect } from 'react';
import { Radio, BookOpen, Clock, Heart, Plus, Trash } from 'lucide-react';

const FREQ_DIRECTORY = {
  noaa: [
    { name: "WX1", freq: "162.400 MHz", desc: "National Weather Service broadcast channel 1" },
    { name: "WX2", freq: "162.425 MHz", desc: "National Weather Service broadcast channel 2" },
    { name: "WX3", freq: "162.450 MHz", desc: "National Weather Service broadcast channel 3" },
    { name: "WX4", freq: "162.475 MHz", desc: "National Weather Service broadcast channel 4" },
    { name: "WX5", freq: "162.500 MHz", desc: "National Weather Service broadcast channel 5" },
    { name: "WX6", freq: "162.525 MHz", desc: "National Weather Service broadcast channel 6" },
    { name: "WX7", freq: "162.550 MHz", desc: "National Weather Service broadcast channel 7" }
  ],
  ham: [
    { name: "2m Calling", freq: "146.520 MHz", desc: "National VHF Simplex calling frequency (FM)" },
    { name: "70cm Calling", freq: "446.000 MHz", desc: "National UHF Simplex calling frequency (FM)" },
    { name: "AMPR/Packet", freq: "144.390 MHz", desc: "North American APRS packet reporting frequency" },
    { name: "6m Calling", freq: "52.525 MHz", desc: "VHF Simplex calling frequency (FM)" }
  ],
  gmrs_frs: [
    { name: "Ch 1-7", freq: "462.5625 - 462.7125 MHz", desc: "Shared FRS/GMRS. 5W limit GMRS / 2W FRS" },
    { name: "Ch 8-14", freq: "467.5625 - 467.7125 MHz", desc: "FRS/GMRS. 0.5W limit (FRS only / low power)" },
    { name: "Ch 15-22", freq: "462.5500 - 462.7250 MHz", desc: "FRS/GMRS. 50W limit GMRS (High Power) / 2W FRS" },
    { name: "Ch 15R-22R", freq: "467.5500 - 467.7250 MHz", desc: "GMRS Repeater input frequencies (offset +5.0 MHz)" }
  ],
  marine: [
    { name: "Ch 16", freq: "156.800 MHz", desc: "International distress, safety and calling channel" },
    { name: "Ch 9", freq: "156.450 MHz", desc: "Secondary calling channel (non-commercial)" },
    { name: "Ch 22A", freq: "157.100 MHz", desc: "US Coast Guard safety broadcasts liaison channel" }
  ]
};

export default function RadioCommsPanel() {
  const [activeTab, setActiveTab] = useState('noaa');
  const [logBook, setLogBook] = useState(() => {
    try {
      const saved = localStorage.getItem('sos_radio_logbook');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [form, setForm] = useState({
    frequency: '',
    mode: 'FM',
    location: '',
    signal: '59',
    notes: ''
  });

  useEffect(() => {
    localStorage.setItem('sos_radio_logbook', JSON.stringify(logBook));
  }, [logBook]);

  const handleAddLog = (e) => {
    e.preventDefault();
    if (!form.frequency.trim()) return;
    const newLog = {
      ...form,
      id: Date.now(),
      timestamp: new Date().toISOString()
    };
    setLogBook(prev => [newLog, ...prev]);
    setForm({
      frequency: '',
      mode: 'FM',
      location: '',
      signal: '59',
      notes: ''
    });
  };

  const handleDeleteLog = (id) => {
    setLogBook(prev => prev.filter(item => item.id !== id));
  };

  return (
    <div className="glass-panel" style={{ padding: '24px', color: '#e0e0e0', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Radio size={20} /> RADIO COMMS & LOGBOOK
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a0a0a0' }}>
          Consult NOAA, HAM, GMRS/FRS and marine channel references, and track active local repeaters or transmissions.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        
        {/* Frequency Directory Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.08)', gap: '4px', overflowX: 'auto', paddingBottom: '4px' }}>
            {Object.keys(FREQ_DIRECTORY).map(tab => (
              <button
                key={tab}
                className={activeTab === tab ? "btn-tactical" : "btn-tactical-outline"}
                style={{ padding: '4px 10px', fontSize: '0.75rem', textTransform: 'uppercase' }}
                onClick={() => setActiveTab(tab)}
              >
                {tab === 'gmrs_frs' ? 'GMRS/FRS' : tab}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', minHeight: '300px' }}>
            {FREQ_DIRECTORY[activeTab].map((f, i) => (
              <div 
                key={i} 
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.02)', 
                  border: '1px solid rgba(255,255,255,0.05)', 
                  padding: '12px', 
                  borderRadius: '6px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#fff' }}>{f.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#a0a0a0', marginTop: '2px' }}>{f.desc}</div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                  {f.freq}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logbook / Repeater Entry Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          <form onSubmit={handleAddLog} style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ margin: '0 0 6px 0', fontSize: '0.85rem', color: 'var(--brand-primary)' }}>LOG NEW TRANSMISSION</h4>
            
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>FREQ (MHz / CH)</span>
                <input 
                  type="text" 
                  value={form.frequency}
                  onChange={e => setForm(prev => ({ ...prev, frequency: e.target.value }))}
                  placeholder="e.g. 146.52"
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>MODE</span>
                <select 
                  value={form.mode}
                  onChange={e => setForm(prev => ({ ...prev, mode: e.target.value }))}
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                >
                  <option value="FM">FM</option>
                  <option value="AM">AM</option>
                  <option value="LSB">LSB</option>
                  <option value="USB">USB</option>
                  <option value="CW">CW</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 2 }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>LOCATION / STATION</span>
                <input 
                  type="text" 
                  value={form.location}
                  onChange={e => setForm(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="e.g. West Repeater"
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>SIGNAL (RST)</span>
                <input 
                  type="text" 
                  value={form.signal}
                  onChange={e => setForm(prev => ({ ...prev, signal: e.target.value }))}
                  placeholder="e.g. 59"
                  style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.75rem', color: '#888', display: 'block', marginBottom: '2px' }}>NOTES / CALLSIGN</span>
              <input 
                type="text" 
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="e.g. KO4XYZ Net Control"
                style={{ width: '100%', padding: '6px', backgroundColor: '#10141d', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
              />
            </div>

            <button type="submit" className="btn-tactical" style={{ width: '100%', padding: '8px', marginTop: '4px' }}>
              <Plus size={14} style={{ marginRight: '6px' }} /> ADD LOG RECORD
            </button>
          </form>

          {/* Active Log entries list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            <h5 style={{ margin: '0 0 4px 0', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>LOG BOOK HISTORY</h5>
            {logBook.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic', textAlign: 'center', padding: '12px' }}>
                No transmission records logged yet.
              </div>
            ) : (
              logBook.map(log => (
                <div 
                  key={log.id} 
                  style={{ 
                    backgroundColor: 'rgba(255,255,255,0.01)', 
                    border: '1px solid rgba(255,255,255,0.04)', 
                    padding: '8px 12px', 
                    borderRadius: '4px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)', fontWeight: 'bold' }}>{log.frequency} ({log.mode})</span>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>- RST: {log.signal}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#fff', marginTop: '2px' }}>
                      {log.location ? `${log.location}: ` : ''}{log.notes}
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDeleteLog(log.id)}
                    style={{ background: 'none', border: 'none', color: 'var(--brand-danger)', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash size={12} />
                  </button>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
