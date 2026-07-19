import React, { useState, useEffect } from 'react';
import { 
  BookOpen, Target, Star, Award, 
  ChevronLeft, PlayCircle, Map,
  Feather, Zap, Compass, Shield,
  Edit3, BookOpenCheck, Loader2
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [activeBracket, setActiveBracket] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);
  const [showScratchpad, setShowScratchpad] = useState(false);

  // Fetch dynamic courses from backend
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_BASE}/api/academy/courses`);
        if (!res.ok) throw new Error("Failed to load courses");
        const data = await res.json();
        setCoursesByBracket(data);
      } catch (err) {
        console.error("[ACADEMY] Error loading courses:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const handleBracketSelect = (bracketId) => {
    setActiveBracket(bracketId);
    setActiveCourse(null);
  };

  const handleCourseLaunch = (course) => {
    setActiveCourse(course);
    setShowScratchpad(true); // default open scratchpad for lessons to assist student
  };

  const handleBack = () => {
    if (activeCourse) {
      setActiveCourse(null);
      setShowScratchpad(false);
    } else {
      setActiveBracket(null);
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

  // 1. Render Course content (Quiz or Flashcard) with Side-by-Side Scratchpad option
  if (activeCourse) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Navigation / Header */}
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
        
        {/* Content Area with Side-by-Side Flex */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Main Course Module */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px', position: 'relative' }}>
            {activeCourse.type === 'quiz' && (
              <QuizEngine course={activeCourse} onComplete={() => { setActiveCourse(null); setShowScratchpad(false); }} />
            )}
            {activeCourse.type === 'flashcard' && (
              <FlashcardEngine course={activeCourse} onComplete={() => { setActiveCourse(null); setShowScratchpad(false); }} />
            )}
          </div>
          
          {/* Floating Student Scratchpad */}
          {showScratchpad && (
            <Scratchpad />
          )}
        </div>
      </div>
    );
  }

  // 2. Render Course List for selected Bracket
  if (activeBracket) {
    const bracket = AGE_BRACKETS.find(b => b.id === activeBracket);
    const courses = coursesByBracket[activeBracket] || [];

    // Assign generic icons for render if missing
    const preparedCourses = courses.map(course => ({
      ...course,
      icon: course.type === 'quiz' ? Target : Star,
      color: bracket.color
    }));

    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
        
        <div style={{ padding: '24px', flex: 1, overflowY: 'auto' }}>
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
                  
                  {/* Standards & Grade Info */}
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
