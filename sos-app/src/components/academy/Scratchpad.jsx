import React, { useState, useEffect, useRef } from 'react';
import { Edit3, Palette, Trash2, Download, Eye, EyeOff } from 'lucide-react';

const Scratchpad = () => {
  const [activeTab, setActiveTab] = useState('canvas'); // 'canvas' or 'text'
  const [noteText, setNoteText] = useState(() => localStorage.getItem('sos_student_note') || '');
  const [brushColor, setBrushColor] = useState('#4CAF50'); // standard green theme
  const [brushSize, setBrushSize] = useState(4);
  const canvasRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Load note text state
  useEffect(() => {
    localStorage.setItem('sos_student_note', noteText);
  }, [noteText]);

  // Whiteboard drawing event handlers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set transparent canvas background or dark background to match the dashboard
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    // Load saved canvas drawing if it exists
    const savedDrawing = localStorage.getItem('sos_student_drawing');
    if (savedDrawing) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      img.src = savedDrawing;
    }

    const getMousePos = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height)
      };
    };

    const startDrawing = (e) => {
      isDrawingRef.current = true;
      lastPosRef.current = getMousePos(e);
    };

    const draw = (e) => {
      if (!isDrawingRef.current) return;
      e.preventDefault(); // stop touch scrolling
      
      const currentPos = getMousePos(e);
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.strokeStyle = brushColor;
      ctx.lineWidth = brushSize;
      ctx.stroke();
      
      lastPosRef.current = currentPos;
    };

    const stopDrawing = () => {
      if (isDrawingRef.current) {
        isDrawingRef.current = false;
        // Save current canvas state to localStorage
        localStorage.setItem('sos_student_drawing', canvas.toDataURL());
      }
    };

    // Event listeners
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);

    canvas.addEventListener('touchstart', startDrawing);
    canvas.addEventListener('touchmove', draw);
    canvas.addEventListener('touchend', stopDrawing);

    return () => {
      canvas.removeEventListener('mousedown', startDrawing);
      canvas.removeEventListener('mousemove', draw);
      canvas.removeEventListener('mouseup', stopDrawing);
      canvas.removeEventListener('mouseleave', stopDrawing);

      canvas.removeEventListener('touchstart', startDrawing);
      canvas.removeEventListener('touchmove', draw);
      canvas.removeEventListener('touchend', stopDrawing);
    };
  }, [brushColor, brushSize, activeTab]);

  // Clear whiteboard canvas
  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    localStorage.removeItem('sos_student_drawing');
  };

  // Export drawing as PNG
  const handleExportCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Create a temporary link
    const link = document.createElement('a');
    link.download = `academy_drawing_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  // Export notes as MD file
  const handleExportNotes = () => {
    const blob = new Blob([noteText], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `academy_notes_${Date.now()}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      width: '320px',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      backgroundColor: 'rgba(10, 10, 12, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      boxShadow: '-4px 0 24px rgba(0,0,0,0.3)'
    }}>
      {/* Scratchpad Header Tabs */}
      <div style={{ 
        display: 'flex', 
        borderBottom: '1px solid rgba(255,255,255,0.08)', 
        backgroundColor: 'rgba(255,255,255,0.02)' 
      }}>
        <button
          onClick={() => setActiveTab('canvas')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'canvas' ? 'rgba(255,255,255,0.04)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'canvas' ? '2px solid var(--brand-primary)' : 'none',
            color: activeTab === 'canvas' ? '#fff' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Palette size={14} /> Whiteboard
        </button>
        <button
          onClick={() => setActiveTab('text')}
          style={{
            flex: 1,
            padding: '12px',
            background: activeTab === 'text' ? 'rgba(255,255,255,0.04)' : 'transparent',
            border: 'none',
            borderBottom: activeTab === 'text' ? '2px solid var(--brand-primary)' : 'none',
            color: activeTab === 'text' ? '#fff' : 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Edit3 size={14} /> Text Notes
        </button>
      </div>

      {/* Main Panel Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        
        {/* CANVAS WHITEBOARD TAB */}
        {activeTab === 'canvas' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Draw Controls */}
            <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {/* Palette */}
              <div style={{ display: 'flex', gap: '8px' }}>
                {['#4CAF50', '#2196F3', '#FF9800', '#F44336', '#FFFFFF'].map(color => (
                  <button
                    key={color}
                    onClick={() => setBrushColor(color)}
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: color,
                      border: brushColor === color ? '2px solid #fff' : '1px solid rgba(0,0,0,0.5)',
                      cursor: 'pointer',
                      padding: 0,
                      boxShadow: brushColor === color ? '0 0 6px rgba(255,255,255,0.8)' : 'none'
                    }}
                  />
                ))}
              </div>

              {/* Brush size and actions */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#fff',
                    borderRadius: '4px',
                    padding: '2px 4px',
                    fontSize: '0.75rem',
                    cursor: 'pointer'
                  }}
                >
                  <option value={2}>Fine</option>
                  <option value={4}>Medium</option>
                  <option value={8}>Bold</option>
                </select>

                <button
                  onClick={handleClearCanvas}
                  title="Clear Whiteboard"
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
                  className="hover-bg"
                >
                  <Trash2 size={16} />
                </button>
                <button
                  onClick={handleExportCanvas}
                  title="Export Whiteboard drawing as PNG"
                  style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px' }}
                  className="hover-bg"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            {/* Whiteboard Canvas */}
            <div style={{ flex: 1, backgroundColor: '#0c0c0e', position: 'relative' }}>
              <canvas
                ref={canvasRef}
                width={320}
                height={500}
                style={{
                  display: 'block',
                  width: '100%',
                  height: '100%',
                  cursor: 'crosshair',
                  touchAction: 'none' // prevents scrolling while drawing
                }}
              />
              <div style={{ position: 'absolute', bottom: '12px', right: '12px', pointerEvents: 'none', fontSize: '0.75rem', color: 'rgba(255,255,255,0.2)', fontFamily: 'var(--font-mono)' }}>
                WHITEBOARD CANVAS
              </div>
            </div>
          </div>
        )}

        {/* TEXT NOTES TAB */}
        {activeTab === 'text' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.2)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <button
                onClick={handleExportNotes}
                title="Export Notes as Markdown"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  color: '#fff', 
                  borderRadius: '4px', 
                  padding: '4px 8px', 
                  fontSize: '0.75rem', 
                  cursor: 'pointer' 
                }}
                className="hover-bg"
              >
                <Download size={14} /> Export MD
              </button>
            </div>
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Type your notes, ideas, or math formulas here..."
              style={{
                flex: 1,
                width: '100%',
                height: '100%',
                padding: '16px',
                backgroundColor: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none'
              }}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default Scratchpad;
