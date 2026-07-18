import React, { useState, useEffect } from 'react';
import { API_BASE } from '../../config.js';
import { BookOpen, ChevronRight, FileText, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';

// Custom lightweight Markdown renderer to keep client dependency-free and off-grid fast
function parseMarkdownToHtml(markdownText) {
  if (!markdownText) return '';
  
  const lines = markdownText.split('\n');
  let inList = false;
  let inAlert = false;
  let alertType = 'note'; // 'note' | 'tip' | 'important' | 'warning' | 'caution'
  let alertLines = [];
  const htmlElements = [];

  const parseInlineStyles = (text) => {
    // Bold: **text**
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Inline code: `code`
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>');
    // LaTeX Inline Math: \(E=mc^2\) or $E=mc^2$
    formatted = formatted.replace(/\\\((.*?)\\\)/g, '<span class="inline-math">$1</span>');
    formatted = formatted.replace(/\$(.*?)\$/g, '<span class="inline-math">$1</span>');
    // Links: [text](url)
    formatted = formatted.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    return formatted;
  };

  const flushList = () => {
    if (inList) {
      htmlElements.push('</ul>');
      inList = false;
    }
  };

  const flushAlert = () => {
    if (inAlert) {
      const alertContent = alertLines.join('<br />');
      htmlElements.push(
        `<div class="alert-box alert-${alertType}">` +
          `<strong class="alert-title">${alertType.toUpperCase()}</strong>` +
          `<div>${alertContent}</div>` +
        `</div>`
      );
      alertLines = [];
      inAlert = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 1. Alert Blockquote Handler: > [!NOTE]
    if (line.startsWith('>')) {
      flushList();
      const rawBlockContent = line.slice(1).trim();
      
      const alertHeaderMatch = rawBlockContent.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i);
      if (alertHeaderMatch) {
        flushAlert(); // Flush any existing alert
        inAlert = true;
        alertType = alertHeaderMatch[1].toLowerCase();
        const firstLineContent = rawBlockContent.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]/i, '').trim();
        if (firstLineContent) {
          alertLines.push(parseInlineStyles(firstLineContent));
        }
      } else if (inAlert) {
        alertLines.push(parseInlineStyles(rawBlockContent));
      } else {
        // Standard blockquote
        htmlElements.push(`<blockquote>${parseInlineStyles(rawBlockContent)}</blockquote>`);
      }
      continue;
    }

    // If not a blockquote line, flush any active alert block
    if (!line.startsWith('>')) {
      flushAlert();
    }

    // 2. Display Math Block: \[ ... \] or $$ ... $$
    if (line.startsWith('\\[') || line.startsWith('$$')) {
      flushList();
      let mathContent = '';
      if (line.startsWith('\\[') && line.endsWith('\\]')) {
        mathContent = line.slice(2, -2).trim();
      } else if (line.startsWith('$$') && line.endsWith('$$') && line.length > 2) {
        mathContent = line.slice(2, -2).trim();
      } else {
        // Multi-line math
        const startMarker = line.startsWith('\\[') ? '\\[' : '$$';
        const endMarker = startMarker === '\\[' ? '\\]' : '$$';
        mathContent = line.slice(2).trim();
        i++;
        while (i < lines.length) {
          const nextLine = lines[i].trim();
          if (nextLine.endsWith(endMarker)) {
            mathContent += ' ' + nextLine.slice(0, -nextLine.length + nextLine.indexOf(endMarker)).trim();
            break;
          }
          mathContent += ' ' + nextLine;
          i++;
        }
      }
      htmlElements.push(`<div class="display-math">${mathContent}</div>`);
      continue;
    }

    // 3. Headings
    if (line.startsWith('# ')) {
      flushList();
      htmlElements.push(`<h1 class="guide-h1">${parseInlineStyles(line.slice(2))}</h1>`);
    } else if (line.startsWith('## ')) {
      flushList();
      htmlElements.push(`<h2 class="guide-h2">${parseInlineStyles(line.slice(3))}</h2>`);
    } else if (line.startsWith('### ')) {
      flushList();
      htmlElements.push(`<h3 class="guide-h3">${parseInlineStyles(line.slice(4))}</h3>`);
    } 
    // 4. Unordered Lists
    else if (line.startsWith('* ') || line.startsWith('- ')) {
      if (!inList) {
        htmlElements.push('<ul class="guide-ul">');
        inList = true;
      }
      htmlElements.push(`<li class="guide-li">${parseInlineStyles(line.slice(2))}</li>`);
    } 
    // 5. Empty line
    else if (line === '') {
      flushList();
      htmlElements.push('<br />');
    } 
    // 6. Horizontal Rules
    else if (line === '---' || line === '***') {
      flushList();
      htmlElements.push('<hr class="guide-hr" />');
    }
    // 7. Regular paragraph
    else {
      flushList();
      htmlElements.push(`<p class="guide-p">${parseInlineStyles(line)}</p>`);
    }
  }

  // Flush remaining blocks
  flushList();
  flushAlert();

  return htmlElements.join('\n');
}

export default function GuidesReaderPanel() {
  const [guidesList, setGuidesList] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [guideContent, setGuideContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch list of guides on mount
  useEffect(() => {
    fetchGuides();
  }, []);

  const fetchGuides = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/toolkit/guides`);
      if (!res.ok) throw new Error("Failed to load guides list");
      const data = await res.json();
      
      // Expose only key offline manuals to avoid cluttering with internal files
      const keyGuideFilenames = [
        'SYSTEM_GUIDES.md',
        'operator-runbook.md',
        'local-material-library.md',
        'release-candidate-checklist.md'
      ];
      const filtered = (data.guides || []).filter(g => keyGuideFilenames.includes(g.filename));

      setGuidesList(filtered);
    } catch (err) {
      console.error(err);
      setError("Could not retrieve offline manuals from backend server.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectGuide = async (guide) => {
    setSelectedGuide(guide);
    setLoading(true);
    setGuideContent('');
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/toolkit/guides/${encodeURIComponent(guide.filename)}`);
      if (!res.ok) throw new Error("Failed to fetch guide contents");
      const data = await res.json();
      setGuideContent(data.content || '');
    } catch (err) {
      console.error(err);
      setError("Could not retrieve manual content.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoBack = () => {
    setSelectedGuide(null);
    setGuideContent('');
  };

  if (loading && !selectedGuide && guidesList.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brand-primary)' }}>
        Loading offline manuals...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', color: '#e0e0e0', maxWidth: '900px', margin: '0 auto' }}>
      
      {/* 1. Detail View Mode */}
      {selectedGuide ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
            <button 
              className="btn-tactical-outline" 
              onClick={handleGoBack}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', fontSize: '0.8rem' }}
            >
              <ArrowLeft size={14} /> Back to Manuals
            </button>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Updated: {new Date(selectedGuide.mtime).toLocaleDateString()}</span>
              <span>Size: {(selectedGuide.size / 1024).toFixed(1)} KB</span>
            </div>
          </div>

          {/* Document Content Render */}
          {error && (
            <div style={{ padding: '12px', borderLeft: '3px solid var(--brand-danger)', backgroundColor: 'rgba(255, 0, 0, 0.03)', color: 'var(--brand-danger)', display: 'flex', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--brand-primary)' }}>
              Reading guide content...
            </div>
          ) : (
            <article 
              className="markdown-body-custom"
              style={{ 
                backgroundColor: 'rgba(0,0,0,0.15)', 
                padding: '24px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-subtle)', 
                lineHeight: '1.6', 
                fontSize: '0.95rem' 
              }}
              dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(guideContent) }}
            />
          )}

        </div>
      ) : (
        
        // 2. List View Mode
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px' }}>
              SYSTEM MANUALS & OFF-GRID GUIDES
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a0a0a0' }}>
              Vetted technical operational reference manuals hosted locally on this Node. Use these guides to configure, verify, and maintain system stability under zero-network constraints.
            </p>
          </div>

          {error && (
            <div style={{ padding: '12px', borderLeft: '3px solid var(--brand-danger)', backgroundColor: 'rgba(255, 0, 0, 0.03)', color: 'var(--brand-danger)', display: 'flex', gap: '8px' }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {guidesList.map(guide => (
              <div 
                key={guide.filename}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: '#12151c',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: '6px',
                  padding: '16px',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                  cursor: 'pointer'
                }}
                className="guide-list-item-hover"
                onClick={() => handleSelectGuide(guide)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ backgroundColor: 'var(--brand-primary-dim)', color: 'var(--brand-primary)', padding: '10px', borderRadius: '4px' }}>
                    <BookOpen size={20} />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#fff', letterSpacing: '1px' }}>
                      {guide.title.toUpperCase()}
                    </h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Filename: {guide.filename} | Last Updated: {new Date(guide.mtime).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <ChevronRight size={20} style={{ color: 'var(--brand-primary)' }} />
              </div>
            ))}

            {guidesList.length === 0 && !loading && (
              <div style={{ textAlign: 'center', padding: '30px', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No reference manuals detected in docs directory.
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
