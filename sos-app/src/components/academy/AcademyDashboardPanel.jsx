import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Target, Star, Award, 
  ChevronLeft, PlayCircle, Map,
  Feather, Zap, Compass, Shield,
  Edit3, BookOpenCheck, Loader2,
  FileSpreadsheet, ClipboardList,
  Sparkles, FileText, CheckCircle, RefreshCw
} from 'lucide-react';
import QuizEngine from './QuizEngine.jsx';
import FlashcardEngine from './FlashcardEngine.jsx';
import Scratchpad from './Scratchpad.jsx';
import { API_BASE } from '../../config.js';

const AGE_BRACKETS = [
  { id: 'sprouts', label: 'Sprouts (0-5)', icon: Feather, color: '#4CAF50', description: 'Early learning, shapes, numbers, and basic nature.' },
  { id: 'explorers', label: 'Explorers (6-12)', icon: Compass, color: '#2196F3', description: 'Foundations of math, science, and safe foraging.' },
  { id: 'cadets', label: 'Cadets (13-17)', icon: Zap, color: '#FF9800', description: 'Advanced sciences, logic, and tactical skills.' },
  { id: 'operators', label: 'Operators (18+)', icon: Shield, color: '#9E9E9E', description: 'Adult field manuals, medical, and engineering.' }
];

const AcademyDashboardPanel = () => {
  const [coursesByBracket, setCoursesByBracket] = useState({
    sprouts: [],
    explorers: [],
    cadets: [],
    operators: []
  });
  const [materials, setMaterials] = useState([]); // list of local library docs for AI quiz generator
  const [loading, setLoading] = useState(true);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [error, setError] = useState(null);
  
  const [activeBracket, setActiveBracket] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [showScratchpad, setShowScratchpad] = useState(false);
  const [currentTab, setCurrentTab] = useState('courses'); // 'courses' or 'report-card' or 'ai-generator'
  const [reportRecords, setReportRecords] = useState([]);
  
  // Quiz Generator States
  const [selectedFileForQuiz, setSelectedFileForQuiz] = useState('');

  // Fetch courses and library materials
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Load courses
        const res = await fetch(`${API_BASE}/api/academy/courses`);
        if (!res.ok) throw new Error("Failed to load courses");
        const data = await res.json();
        setCoursesByBracket(data);

        // Load report records from localstorage
        const savedRecords = localStorage.getItem('sos_academy_progress');
        if (savedRecords) {
          setReportRecords(JSON.parse(savedRecords));
        }

        // Load library materials to populate selector
        const materialsRes = await fetch(`${API_BASE}/api/materials`);
        if (materialsRes.ok) {
          const matData = await materialsRes.json();
          // Flatten categories into list of documents
          const docs = [];
          Object.keys(matData.categories || {}).forEach(cat => {
            matData.categories[cat].forEach(file => {
              docs.push({ path: file.path, name: file.name });
            });
          });
          setMaterials(docs);
        }
      } catch (err) {
        console.error("[ACADEMY] Error loading initial data:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleBracketSelect = (bracketId) => {
    setActiveBracket(bracketId);
    setActiveCourse(null);
    setCurrentTab('courses');
  };

  const handleCourseLaunch = (course) => {
    setActiveCourse(course);
    setShowScratchpad(true);
  };

  const handleBack = () => {
    if (activeCourse) {
      setActiveCourse(null);
      setShowScratchpad(false);
    } else {
      setActiveBracket(null);
    }
  };

  // Callback to save progress on complete
  const saveProgressRecord = (course, score, total) => {
    const records = [...reportRecords];
    const newRecord = {
      courseId: course.id,
      courseTitle: course.title,
      subject: course.subject || 'Practical Skills',
      gradeLevel: course.gradeLevel || 'Mixed Ages',
      type: course.type,
      score: score,
      total: total,
      percentage: Math.round((score / total) * 100),
      completedAt: new Date().toISOString()
    };
    records.push(newRecord);
    setReportRecords(records);
    localStorage.setItem('sos_academy_progress', JSON.stringify(records));
  };

  // Generate dynamic quiz from local PDF/TXT file
  const handleGenerateAIQuiz = async () => {
    if (!selectedFileForQuiz) return;
    try {
      setGeneratingQuiz(true);
      const res = await fetch(`${API_BASE}/api/academy/generate-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: selectedFileForQuiz })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Quiz generation failed");
      }
      const generatedQuiz = await res.json();
      
      // Launch directly!
      handleCourseLaunch({
        ...generatedQuiz,
        icon: Target,
        color: '#E91E63'
      });
    } catch (err) {
      alert(`Ollama Quiz Generator Error: ${err.message}`);
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // Export progress table as CSV
  const handleExportCSV = () => {
    if (reportRecords.length === 0) return;
    const headers = ['Subject', 'Grade Level', 'Course Title', 'Activity Type', 'Score', 'Total Questions', 'Percentage', 'Completion Date'];
    const rows = reportRecords.map(r => [
      `"${r.subject}"`,
      `"${r.gradeLevel}"`,
      `"${r.courseTitle}"`,
      `"${r.type.toUpperCase()}"`,
      r.score,
      r.total,
      `"${r.percentage}%"`,
      `"${new Date(r.completedAt).toLocaleDateString()}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(","))].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `survival_academy_report_card_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetProgress = () => {
    if (confirm("Are you sure you want to delete all student completion records? This cannot be undone.")) {
      setReportRecords([]);
      localStorage.removeItem('sos_academy_progress');
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px', color: 'var(--brand-primary)' }}>
        <Loader2 size={48} className="animate-spin" />
        <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>SCANNING LOCAL CURRICULUMS...</span>
      </div>
    );
  }

  // 1. Render Course content (Quiz or Flashcard) with Side-by-Side Scratchpad
  if (activeCourse) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={handleBack}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: '8px', borderRadius: '4px' }}
              className="hover-bg"
            >
              <ChevronLeft size={20} /> Back
            </button>
            <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <activeCourse.icon size={24} color={activeCourse.color} />
              {activeCourse.title}
            </h2>
          </div>
          
          <button
            onClick={() => setShowScratchpad(!showScratchpad)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: showScratchpad ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: '#fff',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
              transition: 'all 0.2s'
            }}
          >
            <Edit3 size={16} />
            {showScratchpad ? 'Hide Scratchpad' : 'Show Scratchpad'}
          </button>
        </div>
        
        {/* Layout */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative' }}>
            {activeCourse.type === 'quiz' && (
              <QuizEngine 
                course={activeCourse} 
                onComplete={() => { setActiveCourse(null); setShowScratchpad(false); }} 
                onSaveProgress={(score) => saveProgressRecord(activeCourse, score, activeCourse.questions.length)}
              />
            )}
            {activeCourse.type === 'flashcard' && (
              <FlashcardEngine 
                course={activeCourse} 
                onComplete={() => { setActiveCourse(null); setShowScratchpad(false); }} 
                onSaveProgress={(mastered) => saveProgressRecord(activeCourse, mastered, activeCourse.cards.length)}
              />
            )}
          </div>
          
          {showScratchpad && <Scratchpad />}
        </div>
      </div>
    );
  }

  // 2. Render Course List for selected Bracket
  if (activeBracket) {
    const bracket = AGE_BRACKETS.find(b => b.id === activeBracket);
    const courses = coursesByBracket[activeBracket] || [];

    const preparedCourses = courses.map(course => ({
      ...course,
      icon: course.type === 'quiz' ? Target : Star,
      color: bracket.color
    }));

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Navigation / Tab selectors */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={handleBack}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', color: 'var(--text-color)', cursor: 'pointer', padding: '8px', borderRadius: '4px' }}
              className="hover-bg"
            >
              <ChevronLeft size={20} /> Back to Academy
            </button>
            <h2 style={{ margin: 0, fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <bracket.icon size={24} color={bracket.color} />
              {bracket.label} Tracks
            </h2>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setCurrentTab('courses')}
              style={{
                background: currentTab === 'courses' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer'
              }}
            >
              Lessons & Courses
            </button>
            <button
              onClick={() => setCurrentTab('ai-generator')}
              style={{
                background: currentTab === 'ai-generator' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Sparkles size={14} /> AI Quiz Builder
            </button>
            <button
              onClick={() => setCurrentTab('report-card')}
              style={{
                background: currentTab === 'report-card' ? 'var(--brand-primary)' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '0.85rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <ClipboardList size={14} /> Report Card
            </button>
          </div>
        </div>
        
        {/* Dynamic Inner Tab Views */}
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
          
          {/* TAB 1: CURRICULUM COURSES */}
          {currentTab === 'courses' && (
            <>
              {preparedCourses.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                  <BookOpen size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
                  <p>No interactive courses installed for this track yet.</p>
                  <p style={{ fontSize: '0.85rem' }}>Drop new curriculum JSON files inside <code>sos-server/curriculum/{bracket.id}_*</code> directory.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                  {preparedCourses.map(course => (
                    <div 
                      key={course.id}
                      onClick={() => handleCourseLaunch(course)}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        border: `1px solid ${course.color}40`,
                        borderRadius: '12px',
                        padding: '20px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-4px)';
                        e.currentTarget.style.boxShadow = `0 8px 24px ${course.color}30`;
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                        e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ 
                          backgroundColor: `${course.color}20`, 
                          padding: '12px', 
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <course.icon size={28} color={course.color} />
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#fff' }}>{course.title}</h3>
                      </div>
                      
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.75rem' }}>
                        <span style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {course.gradeLevel || 'K-12'}
                        </span>
                        <span style={{ backgroundColor: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                          {course.subject || 'Survival'}
                        </span>
                      </div>

                      <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: '1.5' }}>
                        {course.description}
                      </p>

                      {course.standards && course.standards.length > 0 && (
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '8px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <BookOpenCheck size={12} />
                          Standards: {course.standards.join(', ')}
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', color: course.color, fontWeight: 'bold' }}>
                          {course.type}
                        </span>
                        <PlayCircle size={20} color={course.color} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 2: AI DYNAMIC QUIZ GENERATOR */}
          {currentTab === 'ai-generator' && (
            <div style={{ maxWidth: '600px', margin: '0 auto', backgroundColor: 'rgba(255,255,255,0.02)', padding: '32px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <Sparkles size={32} color="var(--brand-accent)" />
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff' }}>R.A.N.G.E.R. Quiz Builder</h3>
              </div>
              <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6', marginBottom: '24px' }}>
                Select any document from your local survival library. R.A.N.G.E.R. will review the manual and build a dynamic 3-question evaluation test to gauge the student's comprehension.
              </p>

              {materials.length === 0 ? (
                <div style={{ padding: '16px', backgroundColor: 'rgba(255,0,0,0.05)', border: '1px solid rgba(255,0,0,0.2)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--brand-danger)' }}>
                  No files have been indexed into the library database yet. Add PDFs to your directory and crawl them to build custom quizzes.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '8px', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-mono)' }}>CHOOSE SOURCE MANUAL:</label>
                    <select
                      value={selectedFileForQuiz}
                      onChange={(e) => setSelectedFileForQuiz(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        backgroundColor: '#111',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: '#fff',
                        borderRadius: '6px',
                        outline: 'none',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}
                    >
                      <option value="">-- Choose file --</option>
                      {materials.map(m => (
                        <option key={m.path} value={m.path}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleGenerateAIQuiz}
                    disabled={!selectedFileForQuiz || generatingQuiz}
                    style={{
                      backgroundColor: 'var(--brand-accent)',
                      color: '#000',
                      border: 'none',
                      padding: '14px',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      opacity: !selectedFileForQuiz || generatingQuiz ? 0.5 : 1
                    }}
                  >
                    {generatingQuiz ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        Generating Quiz (Ollama running)...
                      </>
                    ) : (
                      <>
                        <Sparkles size={20} />
                        Build & Launch Quiz
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PARENT REPORT CARD */}
          {currentTab === 'report-card' && (
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h3 style={{ margin: 0, fontSize: '1.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ClipboardList size={24} color={bracket.color} />
                  Student Performance & Transcripts
                </h3>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={handleExportCSV}
                    disabled={reportRecords.length === 0}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      opacity: reportRecords.length === 0 ? 0.5 : 1
                    }}
                  >
                    <FileSpreadsheet size={16} /> Export Transcript (CSV)
                  </button>
                  <button
                    onClick={handleResetProgress}
                    style={{
                      backgroundColor: 'rgba(244,67,54,0.1)',
                      border: '1px solid rgba(244,67,54,0.3)',
                      color: '#F44336',
                      padding: '8px 16px',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    Reset Progress
                  </button>
                </div>
              </div>

              {reportRecords.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <FileText size={48} style={{ margin: '0 auto 16px auto', opacity: 0.3 }} />
                  <p style={{ color: 'rgba(255,255,255,0.6)' }}>No courses completed yet.</p>
                  <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.4)' }}>Grades will populate automatically once quizzes or flashcards are finished.</p>
                </div>
              ) : (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                        <th style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>Subject</th>
                        <th style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>Grade</th>
                        <th style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>Course Title</th>
                        <th style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>Type</th>
                        <th style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>Score</th>
                        <th style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>Percentage</th>
                        <th style={{ padding: '12px 16px', color: 'rgba(255,255,255,0.5)' }}>Completed Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportRecords.map((record, index) => (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', backgroundColor: index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                          <td style={{ padding: '14px 16px', color: '#fff' }}>{record.subject}</td>
                          <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.6)' }}>{record.gradeLevel}</td>
                          <td style={{ padding: '14px 16px', color: '#fff', fontWeight: 'bold' }}>{record.courseTitle}</td>
                          <td style={{ padding: '14px 16px', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.5px' }}>{record.type}</td>
                          <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.7)' }}>{record.score} / {record.total}</td>
                          <td style={{ padding: '14px 16px', color: record.percentage >= 70 ? '#4CAF50' : '#F44336', fontWeight: 'bold' }}>
                            {record.percentage}%
                          </td>
                          <td style={{ padding: '14px 16px', color: 'rgba(255,255,255,0.5)' }}>{new Date(record.completedAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    );
  }

  // 3. Render Main Academy Hub
  return (
    <div style={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '20px' }}>
        <h1 style={{ fontSize: '2.5rem', margin: '0 0 16px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
          <Award size={48} color="var(--brand-accent)" />
          Survival Academy
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.7)', maxWidth: '600px', margin: '0 auto', lineHeight: '1.6' }}>
          Welcome to the interactive off-grid school. Select your age bracket to access curated math, science, literacy, and tactical training modules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', maxWidth: '1200px', margin: '0 auto' }}>
        {AGE_BRACKETS.map((bracket) => (
          <div 
            key={bracket.id}
            onClick={() => handleBracketSelect(bracket.id)}
            style={{
              backgroundColor: 'rgba(255,255,255,0.02)',
              border: `2px solid ${bracket.color}40`,
              borderRadius: '16px',
              padding: '30px 24px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px) scale(1.02)';
              e.currentTarget.style.boxShadow = `0 20px 40px ${bracket.color}30`;
              e.currentTarget.style.border = `2px solid ${bracket.color}`;
              e.currentTarget.style.backgroundColor = `${bracket.color}10`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
              e.currentTarget.style.border = `2px solid ${bracket.color}40`;
              e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.02)';
            }}
          >
            <div style={{ 
              backgroundColor: `${bracket.color}20`, 
              padding: '24px', 
              borderRadius: '50%',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <bracket.icon size={48} color={bracket.color} strokeWidth={1.5} />
            </div>
            <h3 style={{ fontSize: '1.5rem', margin: '0 0 12px 0', color: '#fff' }}>{bracket.label}</h3>
            <p style={{ margin: 0, color: 'rgba(255,255,255,0.6)', lineHeight: '1.5', fontSize: '0.95rem' }}>
              {bracket.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AcademyDashboardPanel;
