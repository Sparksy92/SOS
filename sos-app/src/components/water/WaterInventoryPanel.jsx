import React, { useState } from 'react';
import { 
  Droplet, 
  Plus, 
  Trash2, 
  Edit3, 
  AlertTriangle,
  Info,
  X
} from 'lucide-react';
import { calculateWaterReserves } from '../../modules/water/waterCalculations.js';

const emptyForm = {
  name: '',
  capacity: '',
  currentLevel: '',
  unit: 'Gallons',
  filterType: '',
  filterChangeDate: '',
  lastTestDate: '',
  lastTestResult: 'Safe',
  notes: ''
};

export default function WaterInventoryPanel({ 
  waterContainers, 
  setWaterContainers, 
  profile 
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingContainer, setEditingContainer] = useState(null);
  const [formData, setFormData] = useState(emptyForm);

  // Compute total reserve details
  const stats = calculateWaterReserves(waterContainers, profile.peopleCount, profile.targetWeeks);

  const resetForm = () => {
    setFormData(emptyForm);
  };

  const handleOpenAdd = () => {
    resetForm();
    setEditingContainer(null);
    setShowAddForm(true);
  };

  const handleOpenEdit = (container) => {
    setFormData({
      name: container.name || '',
      capacity: container.capacity.toString(),
      currentLevel: container.currentLevel.toString(),
      unit: container.unit || 'Gallons',
      filterType: container.filterType || '',
      filterChangeDate: container.filterChangeDate || '',
      lastTestDate: container.lastTestDate || '',
      lastTestResult: container.lastTestResult || 'Safe',
      notes: container.notes || ''
    });
    setEditingContainer(container);
    setShowAddForm(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const parsedCapacity = parseFloat(formData.capacity) || 0;
    const parsedLevel = parseFloat(formData.currentLevel) || 0;

    if (editingContainer) {
      // Edit
      const updated = waterContainers.map(c => c.id === editingContainer.id ? {
        ...formData,
        id: editingContainer.id,
        capacity: parsedCapacity,
        currentLevel: Math.min(parsedLevel, parsedCapacity)
      } : c);
      setWaterContainers(updated);
    } else {
      // Add
      const newContainer = {
        ...formData,
        id: Date.now(),
        capacity: parsedCapacity,
        currentLevel: Math.min(parsedLevel, parsedCapacity)
      };
      setWaterContainers([...waterContainers, newContainer]);
    }

    setShowAddForm(false);
    setEditingContainer(null);
    resetForm();
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this water storage container?")) {
      setWaterContainers(waterContainers.filter(c => c.id !== id));
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', width: '100%', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header */}
      <div className="category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 className="category-title" style={{ letterSpacing: '2px', margin: 0 }}>WATER INVENTORY</h2>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
            MANAGE Homestead Cisterns, Rain Barrels, and Storage Tanks
          </div>
        </div>
        <button className="btn-tactical" onClick={handleOpenAdd} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Plus size={16} /> ADD STORAGE CONTAINER
        </button>
      </div>

      {/* Reserves Summary Card */}
      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
          CAPACITY COVERAGE ASSESSMENT
        </h3>
        <div className="file-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TOTAL STORAGE CAPACITY</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--text-main)', marginTop: '4px' }}>
              {stats.totalCapacity.toFixed(0)} GAL
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ACTIVE RESERVES HELD</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: 'var(--brand-primary)', marginTop: '4px' }}>
              {stats.totalReserve.toFixed(0)} GAL
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FILL PERCENTAGE</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: stats.fillPercentage <= 25 ? 'var(--brand-danger)' : '#00ff66', marginTop: '4px' }}>
              {stats.fillPercentage.toFixed(0)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>DAYS OF COVERAGE ({profile.peopleCount} PAX)</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: stats.durationDays < 7 ? 'var(--brand-danger)' : '#00E5FF', marginTop: '4px' }}>
              {stats.durationDays === Infinity ? 'N/A' : `${stats.durationDays} DAYS`}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ height: '10px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
            <div 
              style={{ 
                width: `${Math.min(stats.fillPercentage, 100)}%`, 
                height: '100%', 
                backgroundColor: stats.fillPercentage <= 25 ? 'var(--brand-danger)' : 'var(--brand-primary)',
                boxShadow: `0 0 10px ${stats.fillPercentage <= 25 ? 'var(--brand-danger)' : 'var(--brand-primary)'}` 
              }} 
            />
          </div>
        </div>
      </div>

      {/* Warnings & Alerts */}
      {stats.warnings.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px', borderColor: 'var(--brand-danger)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ margin: 0, color: 'var(--brand-danger)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', letterSpacing: '1px' }}>
            <AlertTriangle size={16} /> CRITICAL WATER SYSTEM WARNINGS
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {stats.warnings.map((w, idx) => (
              <div key={idx} style={{ color: 'var(--brand-danger)', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}>
                • {w.toUpperCase()}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Container List */}
      <div className="file-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        {waterContainers.map(c => {
          const fill = c.capacity > 0 ? (c.currentLevel / c.capacity) * 100 : 0;
          const isUnsafe = c.lastTestResult?.toLowerCase() === 'unsafe';

          return (
            <div key={c.id} className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', border: isUnsafe ? '1px solid var(--brand-danger)' : '1px solid var(--border-subtle)' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h4 style={{ margin: 0, color: isUnsafe ? 'var(--brand-danger)' : 'var(--brand-primary)', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
                    {c.name.toUpperCase()}
                  </h4>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>UNIT ID: {c.id}</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn-tactical" onClick={() => handleOpenEdit(c)} style={{ padding: '4px 8px' }} title="Edit Container">
                    <Edit3 size={12} />
                  </button>
                  <button className="btn-tactical" onClick={() => handleDelete(c.id)} style={{ padding: '4px 8px', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }} title="Delete Container">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontFamily: 'var(--font-mono)' }}>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      className="btn-tactical" 
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => {
                        const updated = waterContainers.map(w => w.id === c.id ? { ...w, currentLevel: Math.max(0, Number(w.currentLevel) - 5) } : w);
                        setWaterContainers(updated);
                      }}
                      title="Decrease by 5 Gallons"
                    >
                      -5
                    </button>
                    <button 
                      className="btn-tactical" 
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => {
                        const updated = waterContainers.map(w => w.id === c.id ? { ...w, currentLevel: Math.max(0, Number(w.currentLevel) - 1) } : w);
                        setWaterContainers(updated);
                      }}
                      title="Decrease by 1 Gallon"
                    >
                      -1
                    </button>
                  </div>

                  <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 'bold' }}>
                    {c.currentLevel} / {c.capacity} GAL
                  </span>

                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <button 
                      className="btn-tactical" 
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => {
                        const updated = waterContainers.map(w => w.id === c.id ? { ...w, currentLevel: Math.min(w.capacity, Number(w.currentLevel) + 1) } : w);
                        setWaterContainers(updated);
                      }}
                      title="Increase by 1 Gallon"
                    >
                      +1
                    </button>
                    <button 
                      className="btn-tactical" 
                      style={{ padding: '2px 6px', fontSize: '0.7rem' }}
                      onClick={() => {
                        const updated = waterContainers.map(w => w.id === c.id ? { ...w, currentLevel: Math.min(w.capacity, Number(w.currentLevel) + 5) } : w);
                        setWaterContainers(updated);
                      }}
                      title="Increase by 5 Gallons"
                    >
                      +5
                    </button>
                    <span style={{ marginLeft: '6px', color: fill <= 25 ? 'var(--brand-danger)' : '#00ff66', fontWeight: 'bold' }}>
                      {fill.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.min(fill, 100)}%`, height: '100%', backgroundColor: fill <= 25 ? 'var(--brand-danger)' : 'var(--brand-primary)' }} />
                </div>
              </div>

              {/* Specs */}
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                <div>FILTER: <span style={{ color: 'var(--text-main)' }}>{c.filterType || 'NONE'}</span></div>
                <div>FILTER EXPIRY: <span style={{ color: 'var(--text-main)' }}>{c.filterChangeDate || 'N/A'}</span></div>
                <div>TEST STATUS: <span style={{ color: isUnsafe ? 'var(--brand-danger)' : '#00ff66', fontWeight: 'bold' }}>{c.lastTestResult?.toUpperCase() || 'UNKNOWN'} ({c.lastTestDate || 'N/A'})</span></div>
                {c.notes && <div style={{ fontStyle: 'italic', marginTop: '4px' }}>"{c.notes}"</div>}
              </div>

            </div>
          );
        })}
      </div>

      {/* Add / Edit Form Overlay Modal */}
      {showAddForm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 20000,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          backdropFilter: 'blur(8px)', padding: '20px'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '480px', padding: '24px', border: '1px solid var(--brand-primary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, color: 'var(--brand-primary)', fontSize: '1.1rem', letterSpacing: '1px' }}>
                {editingContainer ? 'EDIT WATER CONTAINER' : 'ADD NEW WATER CONTAINER'}
              </h3>
              <button className="btn-tactical" onClick={() => setShowAddForm(false)} style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CONTAINER NAME</label>
                <input 
                  type="text" 
                  className="search-input glass-panel" 
                  style={{ width: '100%', padding: '8px' }}
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Rain Barrel C"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MAX CAPACITY (GAL)</label>
                  <input 
                    type="number" 
                    className="search-input glass-panel" 
                    style={{ width: '100%', padding: '8px' }}
                    required
                    min="0"
                    value={formData.capacity}
                    onChange={e => setFormData({ ...formData, capacity: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>CURRENT LEVEL (GAL)</label>
                  <input 
                    type="number" 
                    className="search-input glass-panel" 
                    style={{ width: '100%', padding: '8px' }}
                    required
                    min="0"
                    value={formData.currentLevel}
                    onChange={e => setFormData({ ...formData, currentLevel: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FILTER SPECIFICATION</label>
                <input 
                  type="text" 
                  className="search-input glass-panel" 
                  style={{ width: '100%', padding: '8px' }}
                  value={formData.filterType}
                  onChange={e => setFormData({ ...formData, filterType: e.target.value })}
                  placeholder="e.g. Ceramic Gravity, Activated Carbon"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>FILTER EXPIRY / REPLACEMENT DATE</label>
                <input 
                  type="date" 
                  className="search-input glass-panel" 
                  style={{ width: '100%', padding: '8px', color: 'var(--text-main)' }}
                  value={formData.filterChangeDate}
                  onChange={e => setFormData({ ...formData, filterChangeDate: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>LAST TESTED DATE</label>
                  <input 
                    type="date" 
                    className="search-input glass-panel" 
                    style={{ width: '100%', padding: '8px', color: 'var(--text-main)' }}
                    value={formData.lastTestDate}
                    onChange={e => setFormData({ ...formData, lastTestDate: e.target.value })}
                  />
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>TEST RESULT STATUS</label>
                  <select 
                    className="search-input glass-panel"
                    style={{ width: '100%', padding: '8px', backgroundColor: '#0a0a0a', color: 'var(--text-main)' }}
                    value={formData.lastTestResult}
                    onChange={e => setFormData({ ...formData, lastTestResult: e.target.value })}
                  >
                    <option value="Safe">Safe</option>
                    <option value="Unsafe">Unsafe</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>NOTES / DISCLOSURES</label>
                <textarea 
                  className="search-input glass-panel" 
                  style={{ width: '100%', padding: '8px', height: '60px', resize: 'none' }}
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="e.g. Minor sediment noticed, rain overflow active"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
                <button type="button" className="btn-tactical" onClick={() => setShowAddForm(false)}>
                  CANCEL
                </button>
                <button type="submit" className="btn-tactical" style={{ backgroundColor: 'var(--brand-primary)', color: 'black' }}>
                  {editingContainer ? 'SAVE CHANGES' : 'CREATE STORAGE'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
