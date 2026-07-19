import React, { useState } from 'react';
import { RefreshCw, Check, X, Star } from 'lucide-react';

const FlashcardEngine = ({ course, onComplete, onSaveProgress }) => {
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [mastered, setMastered] = useState(0);

  const card = course.cards[currentCardIndex];
  const isLastCard = currentCardIndex === course.cards.length - 1;

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleNext = (didMaster) => {
    const finalMastered = didMaster ? mastered + 1 : mastered;
    if (didMaster) {
      setMastered(mastered + 1);
    }
    
    if (isLastCard) {
      // Done with the deck
      setCurrentCardIndex(-1); // special state for complete
      if (onSaveProgress) {
        onSaveProgress(finalMastered);
      }
    } else {
      setIsFlipped(false);
      setCurrentCardIndex(currentCardIndex + 1);
    }
  };

  if (currentCardIndex === -1) {
    const percentage = Math.round((mastered / course.cards.length) * 100);
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Star size={64} color={course.color} style={{ margin: '0 auto 20px auto' }} />
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Deck Completed!</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '24px' }}>
          You mastered {mastered} out of {course.cards.length} cards ({percentage}%)
        </p>
        <button 
          onClick={onComplete}
          style={{
            backgroundColor: course.color,
            color: '#fff',
            border: 'none',
            padding: '12px 24px',
            fontSize: '1.1rem',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
          className="hover-bg"
        >
          Return to Academy
        </button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', width: '100%' }}>
      {/* Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
          Card {currentCardIndex + 1} of {course.cards.length}
        </span>
        <div style={{ flex: 1, height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${((currentCardIndex + 1) / course.cards.length) * 100}%`,
            height: '100%',
            backgroundColor: course.color,
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      {/* Flashcard Area */}
      <div 
        style={{ 
          perspective: '1000px', 
          height: '350px',
          width: '100%',
          marginBottom: '32px'
        }}
      >
        <div 
          onClick={handleFlip}
          style={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transition: 'transform 0.6s',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            cursor: 'pointer'
          }}
        >
          {/* Front */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            backgroundColor: 'rgba(255,255,255,0.05)',
            border: `2px solid ${course.color}60`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            textAlign: 'center'
          }}>
            <h3 style={{ fontSize: '2rem', margin: 0, color: '#fff' }}>
              {card.front}
            </h3>
            <div style={{ position: 'absolute', bottom: '20px', left: 0, right: 0, textAlign: 'center', fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>
              <RefreshCw size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
              Click to flip
            </div>
          </div>

          {/* Back */}
          <div style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            backfaceVisibility: 'hidden',
            backgroundColor: `${course.color}15`,
            border: `2px solid ${course.color}`,
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '32px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            transform: 'rotateY(180deg)',
            textAlign: 'center'
          }}>
            <p style={{ fontSize: '1.5rem', margin: 0, color: '#fff', lineHeight: '1.5' }}>
              {card.back}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', opacity: isFlipped ? 1 : 0.3, pointerEvents: isFlipped ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
        <button
          onClick={() => handleNext(false)}
          style={{
            flex: 1,
            maxWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            backgroundColor: 'rgba(244, 67, 54, 0.1)',
            border: '2px solid rgba(244, 67, 54, 0.5)',
            color: '#F44336',
            borderRadius: '12px',
            fontSize: '1.1rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
          className="hover-bg"
        >
          <X size={20} /> Needs Review
        </button>
        <button
          onClick={() => handleNext(true)}
          style={{
            flex: 1,
            maxWidth: '200px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            backgroundColor: 'rgba(76, 175, 80, 0.1)',
            border: '2px solid rgba(76, 175, 80, 0.5)',
            color: '#4CAF50',
            borderRadius: '12px',
            fontSize: '1.1rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
          className="hover-bg"
        >
          <Check size={20} /> Got It!
        </button>
      </div>
    </div>
  );
};

export default FlashcardEngine;
