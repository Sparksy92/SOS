import React, { useState, useEffect } from 'react';
import { FileText, Save, X, PlusCircle, AlertTriangle } from 'lucide-react';

const FieldNoteEditor = ({ initialData = {}, onSave, onCancel, onSaveAndAddToReport }) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [noteType, setNoteType] = useState(initialData.noteType || initialData.type || 'general');
  const [riskCategory, setRiskCategory] = useState(initialData.riskCategory || '');
  const [tags, setTags] = useState(initialData.tags ? (Array.isArray(initialData.tags) ? initialData.tags.join(', ') : initialData.tags) : '');
  const [body, setBody] = useState(initialData.body || initialData.content || '');
  const [relatedSourcePaths, setRelatedSourcePaths] = useState(initialData.relatedSourcePaths || '');
  const [relatedRangerAnswer, setRelatedRangerAnswer] = useState(initialData.relatedRangerAnswer || '');

  // Auto-detect risk category if prefilled or derived from text
  useEffect(() => {
    if (initialData.riskCategory && !riskCategory) {
      setRiskCategory(initialData.riskCategory);
    }
  }, [initialData]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return null;
    return {
      title: title.trim(),
      noteType,
      riskCategory: riskCategory || null,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      body: body.trim(),
      relatedSourcePaths: relatedSourcePaths.trim(),
      relatedRangerAnswer: relatedRangerAnswer.trim(),
      type: 'note'
    };
  };

  const handleSaveClick = (e) => {
    const data = handleSubmit(e);
    if (data && onSave) onSave(data);
  };

  const handleSaveAndAddClick = (e) => {
    const data = handleSubmit(e);
    if (data && onSaveAndAddToReport) onSaveAndAddToReport(data);
  };

  const isHighRisk = !!riskCategory;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div className="glass-panel" style={{
        maxWidth: '650px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        borderColor: isHighRisk ? 'var(--brand-danger)' : 'var(--brand-primary)',
        backgroundColor: '#0c0c0c'
      }}>
        {/* Title Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)' }}>
            <FileText size={20} />
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>
              {initialData.id ? 'EDIT FIELD NOTE' : 'NEW FIELD NOTE'}
            </h3>
          </div>
          <button 
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              NOTE TITLE *
            </label>
            <input 
              type="text" 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px' }}
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Water Filter Gasket Repair"
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                NOTE TYPE
              </label>
              <select 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '10px', background: '#000', color: '#fff' }}
                value={noteType}
                onChange={e => setNoteType(e.target.value)}
              >
                <option value="general">General Note</option>
                <option value="observation">Observation</option>
                <option value="task">Task/Todo</option>
                <option value="supply note">Supply Note</option>
                <option value="repair note">Repair Note</option>
                <option value="field incident">Field Incident</option>
                <option value="research note">Research Note</option>
              </select>
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                RISK CATEGORY
              </label>
              <select 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '10px', background: '#000', color: isHighRisk ? 'var(--brand-danger)' : '#fff' }}
                value={riskCategory}
                onChange={e => setRiskCategory(e.target.value)}
              >
                <option value="">None (Low Risk)</option>
                <option value="medical">Medical / First Aid</option>
                <option value="water_treatment">Water Treatment</option>
                <option value="wild_plants">Wild Edible Plants</option>
                <option value="mushrooms">Wild Mushrooms</option>
                <option value="food_preservation">Food Canning/Preservation</option>
                <option value="electrical">Electrical / Battery</option>
                <option value="fuel_generator">Generators & Fuels</option>
                <option value="firearms">Firearms Safety</option>
                <option value="mechanical">Mechanical Repair</option>
                <option value="chemical">Chemical / Caustics</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              TAGS (COMMA SEPARATED)
            </label>
            <input 
              type="text" 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px' }}
              value={tags}
              onChange={e => setTags(e.target.value)}
              placeholder="e.g. water, plumbing, emergency"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              BODY / NOTE CONTENT *
            </label>
            <textarea 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px', height: '140px', fontFamily: 'var(--font-main)', resize: 'vertical' }}
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write your observation or research details here..."
            />
          </div>

          {relatedSourcePaths && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>
                RELATED SOURCE REFERENCED
              </label>
              <input 
                type="text" 
                readOnly 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', opacity: 0.8 }}
                value={relatedSourcePaths}
              />
            </div>
          )}

          {isHighRisk && (
            <div style={{
              display: 'flex',
              gap: '10px',
              backgroundColor: 'rgba(255, 0, 0, 0.05)',
              border: '1px solid var(--brand-danger)',
              borderRadius: '4px',
              padding: '12px',
              color: 'var(--brand-danger)',
              fontSize: '0.75rem',
              lineHeight: '1.4'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>
                <strong>HIGH-RISK WARNING:</strong> Appending medical, chemical, or energy systems procedures to this note tags it for validation checklists. Ensure any parameters are double checked before use.
              </div>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px', borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <button 
            className="btn-tactical" 
            onClick={onCancel}
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            CANCEL
          </button>
          <button 
            className="btn-tactical" 
            onClick={handleSaveAndAddClick}
            disabled={!title.trim() || !body.trim()}
            style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'var(--brand-primary)', opacity: (!title.trim() || !body.trim()) ? 0.5 : 1 }}
          >
            <PlusCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> SAVE & ADD TO REPORT
          </button>
          <button 
            className="btn-tactical" 
            onClick={handleSaveClick}
            disabled={!title.trim() || !body.trim()}
            style={{ padding: '8px 16px', fontSize: '0.85rem', borderColor: 'var(--brand-primary)', opacity: (!title.trim() || !body.trim()) ? 0.5 : 1 }}
          >
            <Save size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> SAVE NOTE
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldNoteEditor;
