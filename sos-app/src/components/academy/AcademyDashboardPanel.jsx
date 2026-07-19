import React, { useState } from 'react';
import { 
  BookOpen, Target, Star, Award, 
  ChevronLeft, PlayCircle, Map,
  Feather, Zap, Compass, Shield
} from 'lucide-react';
import QuizEngine from './QuizEngine.jsx';
import FlashcardEngine from './FlashcardEngine.jsx';

const AGE_BRACKETS = [
  { id: 'sprouts', label: 'Sprouts (0-5)', icon: Feather, color: '#4CAF50', description: 'Early learning, shapes, numbers, and basic nature.' },
  { id: 'explorers', label: 'Explorers (6-12)', icon: Compass, color: '#2196F3', description: 'Foundations of math, science, and safe foraging.' },
  { id: 'cadets', label: 'Cadets (13-17)', icon: Zap, color: '#FF9800', description: 'Advanced sciences, logic, and tactical skills.' },
  { id: 'operators', label: 'Operators (18+)', icon: Shield, color: '#9E9E9E', description: 'Adult field manuals, medical, and engineering.' }
];

const MOCK_COURSES = {
  explorers: [
    { 
      id: 'math_101', 
      title: 'Campfire Math', 
      type: 'quiz',
      icon: Target,
      color: '#E91E63',
      description: 'Practice basic addition and subtraction using campfire logs.',
      questions: [
        { question: 'If you have 3 logs and find 2 more, how many logs do you have?', options: ['4', '5', '6', '3'], correctIndex: 1 },
        { question: 'You caught 5 fish, but 1 swam away. How many are left?', options: ['4', '5', '3', '2'], correctIndex: 0 },
        { question: 'We need 10 apples. We have 6. How many more do we need?', options: ['2', '3', '4', '5'], correctIndex: 2 }
      ]
    },
    { 
      id: 'foraging_101', 
      title: 'Safe Foraging (Flashcards)', 
      type: 'flashcard',
      icon: Star,
      color: '#4CAF50',
      description: 'Learn which berries and plants are safe to eat.',
      cards: [
        { front: 'Dandelion', back: 'Edible! The entire plant (leaves, flower, root) is safe to eat.' },
        { front: 'Shiny leaves with three leaflets', back: 'Poison Ivy! DO NOT TOUCH. Leaves of three, let it be.' },
        { front: 'Pine Needles', back: 'Edible! Can be steeped in hot water to make Vitamin C rich tea.' }
      ]
    }
  ]
};

const AcademyDashboardPanel = () => {
  const [activeBracket, setActiveBracket] = useState(null);
  const [activeCourse, setActiveCourse] = useState(null);

  const handleBracketSelect = (bracketId) => {
    setActiveBracket(bracketId);
    setActiveCourse(null);
  };

  const handleCourseLaunch = (course) => {
    setActiveCourse(course);
  };

  const handleBack = () => {
    if (activeCourse) {
      setActiveCourse(null);
    } else {
      setActiveBracket(null);
    }
  };

  // 1. Render Course content (Quiz or Flashcard)
  if (activeCourse) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '16px' }}>
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
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {activeCourse.type === 'quiz' && (
            <QuizEngine course={activeCourse} onComplete={() => setActiveCourse(null)} />
          )}
          {activeCourse.type === 'flashcard' && (
            <FlashcardEngine course={activeCourse} onComplete={() => setActiveCourse(null)} />
          )}
        </div>
      </div>
    );
  }

  // 2. Render Course List for selected Bracket
  if (activeBracket) {
    const bracket = AGE_BRACKETS.find(b => b.id === activeBracket);
    const courses = MOCK_COURSES[activeBracket] || [];

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
          {courses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
              <BookOpen size={48} style={{ margin: '0 auto 16px auto', opacity: 0.5 }} />
              <p>No interactive courses installed for this track yet.</p>
              <p style={{ fontSize: '0.85rem' }}>Import educational ZIM files via the Offline Toolkit to populate.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
              {courses.map(course => (
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
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)', flex: 1, lineHeight: '1.5' }}>
                    {course.description}
                  </p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
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
