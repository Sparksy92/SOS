import React, { useState, useEffect } from 'react';
import { FileText, Download, Clipboard, X, CheckSquare, Square, Eye } from 'lucide-react';
import { generateMarkdownReport, generateJSONReport, downloadFile } from '../../modules/reports/reportExport.js';

const ReportBuilder = ({ 
  savedAnswers = [], 
  fieldNotes = [], 
  savedSources = [], 
  defaultAuthor = 'Operator',
  onSaveDraft,
  onClose 
}) => {
  const [title, setTitle] = useState('Incident and Readiness Log');
  const [reportType, setReportType] = useState('field report');
  const [author, setAuthor] = useState(defaultAuthor);
  const [summary, setSummary] = useState('');
  const [manualNotes, setManualNotes] = useState('');
  const [nextActions, setNextActions] = useState('');

  // Selected arrays of IDs
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [selectedNotes, setSelectedNotes] = useState([]);
  const [selectedSources, setSelectedSources] = useState([]);

  // Preview toggle
  const [isPreviewMode, setIsPreviewMode] = useState(true);

  // Initialize checks (auto check all items when launching)
  useEffect(() => {
    setSelectedAnswers(savedAnswers.map(a => a.id));
    setSelectedNotes(fieldNotes.map(n => n.id));
    setSelectedSources(savedSources.map(s => s.id));
  }, [savedAnswers, fieldNotes, savedSources]);

  // Compile full report object
  const buildReportObject = () => {
    return {
      title: title.trim(),
      type: reportType,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: author.trim(),
      summary: summary.trim(),
      manualNotes: manualNotes.trim(),
      nextActions: nextActions.trim(),
      includedAnswers: savedAnswers.filter(a => selectedAnswers.includes(a.id)),
      includedNotes: fieldNotes.filter(n => selectedNotes.includes(n.id)),
      includedSources: savedSources.filter(s => selectedSources.includes(s.id))
    };
  };

  const mdPreview = generateMarkdownReport(buildReportObject());

  const handleExportMarkdown = () => {
    const reportObj = buildReportObject();
    const md = generateMarkdownReport(reportObj);
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_report.md`;
    downloadFile(md, filename, 'text/markdown');
  };

  const handleExportJSON = () => {
    const reportObj = buildReportObject();
    const json = generateJSONReport(reportObj);
    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_report.json`;
    downloadFile(json, filename, 'application/json');
  };

  const handleCopyToClipboard = () => {
    const reportObj = buildReportObject();
    const md = generateMarkdownReport(reportObj);
    navigator.clipboard.writeText(md);
    alert("Report Markdown copied to clipboard!");
  };

  const handleSaveDraft = () => {
    const reportObj = buildReportObject();
    if (onSaveDraft) {
      onSaveDraft(reportObj);
      alert("Report saved locally!");
    }
  };

  const toggleAnswer = (id) => {
    setSelectedAnswers(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleNote = (id) => {
    setSelectedNotes(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const toggleSource = (id) => {
    setSelectedSources(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      padding: '20px'
    }}>
      {/* Header bar */}
      <div className="glass-panel" style={{
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '2px solid var(--brand-primary)',
        marginBottom: '20px',
        backgroundColor: 'rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--brand-primary)' }}>
          <FileText size={22} className="glow-effect" />
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', letterSpacing: '1px' }}>
            TACTICAL REPORT BUILDER
          </h2>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button 
            className="btn-tactical" 
            onClick={handleSaveDraft}
            style={{ padding: '8px 14px', fontSize: '0.85rem' }}
          >
            SAVE AS DRAFT
          </button>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Main Workspace split */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
        
        {/* Left Side: Parameters / Selection Checklist */}
        <div className="glass-panel" style={{
          flex: 1.2,
          padding: '20px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: 'rgba(255,255,255,0.01)'
        }}>
          <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '6px' }}>
            REPORT PARAMETERS
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              REPORT TITLE *
            </label>
            <input 
              type="text" 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px' }}
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                REPORT TYPE
              </label>
              <select 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '10px', background: '#000', color: '#fff' }}
                value={reportType}
                onChange={e => setReportType(e.target.value)}
              >
                <option value="research summary">Research Summary</option>
                <option value="field report">Field Report</option>
                <option value="incident log">Incident Log</option>
                <option value="supply assessment">Supply Assessment</option>
                <option value="readiness assessment">Readiness Assessment</option>
                <option value="repair log">Repair Log</option>
                <option value="emergency reference packet">Emergency Reference Packet</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: '150px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
                OPERATOR CALLSIGN
              </label>
              <input 
                type="text" 
                className="search-input glass-panel" 
                style={{ width: '100%', padding: '10px' }}
                value={author}
                onChange={e => setAuthor(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              OVERVIEW SUMMARY
            </label>
            <textarea 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px', height: '60px', resize: 'vertical' }}
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Provide a high-level summary of the session findings or observations..."
            />
          </div>

          <h3 style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '6px' }}>
            APPEND SAVED PROTOCOLS & LOGS
          </h3>

          {/* Checklist Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Answers */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                SAVED JARVIS ANSWERS ({savedAnswers.length})
              </h4>
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '6px' }}>
                {savedAnswers.length === 0 ? (
                  <div style={{ padding: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>No saved answers in this session.</div>
                ) : (
                  savedAnswers.map((ans) => {
                    const isChecked = selectedAnswers.includes(ans.id);
                    return (
                      <div 
                        key={ans.id} 
                        onClick={() => toggleAnswer(ans.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.75rem' }}
                      >
                        {isChecked ? <CheckSquare size={14} color="var(--brand-primary)" /> : <Square size={14} />}
                        <span style={{ color: isChecked ? 'var(--brand-primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ans.title || ans.relatedQuestion || 'Answer'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                SAVED FIELD NOTES ({fieldNotes.length})
              </h4>
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '6px' }}>
                {fieldNotes.length === 0 ? (
                  <div style={{ padding: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>No saved field notes.</div>
                ) : (
                  fieldNotes.map((note) => {
                    const isChecked = selectedNotes.includes(note.id);
                    return (
                      <div 
                        key={note.id} 
                        onClick={() => toggleNote(note.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.75rem' }}
                      >
                        {isChecked ? <CheckSquare size={14} color="var(--brand-primary)" /> : <Square size={14} />}
                        <span style={{ color: isChecked ? 'var(--brand-primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          [{note.noteType?.toUpperCase() || 'NOTE'}] {note.title}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Sources */}
            <div>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                SAVED SOURCE CARDS ({savedSources.length})
              </h4>
              <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '6px' }}>
                {savedSources.length === 0 ? (
                  <div style={{ padding: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>No saved library sources.</div>
                ) : (
                  savedSources.map((src) => {
                    const isChecked = selectedSources.includes(src.id);
                    return (
                      <div 
                        key={src.id} 
                        onClick={() => toggleSource(src.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.02)', fontSize: '0.75rem' }}
                      >
                        {isChecked ? <CheckSquare size={14} color="var(--brand-primary)" /> : <Square size={14} />}
                        <span style={{ color: isChecked ? 'var(--brand-primary)' : 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {src.title || src.source.split('/').pop()}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <h3 style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '6px' }}>
            MANUAL REMARKS & ACTION STEPS
          </h3>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              MANUAL NOTES & REMARKS
            </label>
            <textarea 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px', height: '70px', resize: 'vertical' }}
              value={manualNotes}
              onChange={e => setManualNotes(e.target.value)}
              placeholder="Enter custom observations, checklist responses, or field updates..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', fontFamily: 'var(--font-mono)' }}>
              NEXT ACTIONS & DIRECTIVES
            </label>
            <textarea 
              className="search-input glass-panel" 
              style={{ width: '100%', padding: '10px', height: '60px', resize: 'vertical' }}
              value={nextActions}
              onChange={e => setNextActions(e.target.value)}
              placeholder="e.g. 1. Rebuild primary pump filter\n2. Secure fuel drum gaskets"
            />
          </div>
        </div>

        {/* Right Side: Markdown Preview & Export controls */}
        <div className="glass-panel" style={{
          flex: 1,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          borderColor: 'var(--border-strong)',
          backgroundColor: '#050505'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px dashed var(--border-subtle)', paddingBottom: '6px' }}>
            <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              REPORT PREVIEW
            </h3>
            <button 
              className="btn-tactical" 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              style={{ padding: '4px 10px', fontSize: '0.7rem' }}
            >
              <Eye size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> 
              {isPreviewMode ? 'RAW MARKDOWN' : 'PREVIEW RENDERING'}
            </button>
          </div>

          {/* Live Preview Container */}
          <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            padding: '14px', 
            backgroundColor: 'rgba(0,0,0,0.5)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '4px',
            fontSize: '0.8rem',
            lineHeight: '1.5',
            fontFamily: isPreviewMode ? 'var(--font-main)' : 'var(--font-mono)',
            whiteSpace: 'pre-wrap',
            color: 'var(--text-main)'
          }}>
            {mdPreview}
          </div>

          {/* Export button group */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="btn-tactical" 
                onClick={handleExportMarkdown}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', borderColor: 'var(--brand-primary)' }}
              >
                <Download size={14} /> EXPORT MARKDOWN
              </button>
              <button 
                className="btn-tactical" 
                onClick={handleExportJSON}
                style={{ flex: 1, padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                <Download size={14} /> EXPORT JSON
              </button>
            </div>
            
            <button 
              className="btn-tactical" 
              onClick={handleCopyToClipboard}
              style={{ padding: '10px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              <Clipboard size={14} /> COPY REPORT MARKDOWN
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};

export default ReportBuilder;
