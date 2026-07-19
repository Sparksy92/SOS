import React, { useState } from 'react';
import { Target, CheckCircle, XCircle, Award } from 'lucide-react';

const QuizEngine = ({ course, onComplete, onSaveProgress }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswering, setIsAnswering] = useState(false);

  const question = course.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === course.questions.length - 1;

  const handleOptionSelect = (index) => {
    if (isAnswering) return;
    
    setSelectedOption(index);
    setIsAnswering(true);
    
    const isCorrect = index === question.correctIndex;
    if (isCorrect) {
      setScore(score + 1);
    }

    setTimeout(() => {
      if (isLastQuestion) {
        setShowResult(true);
        if (onSaveProgress) {
          onSaveProgress(isCorrect ? score + 1 : score);
        }
      } else {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
        setSelectedOption(null);
        setIsAnswering(false);
      }
    }, 1500);
  };

  if (showResult) {
    const percentage = Math.round((score / course.questions.length) * 100);
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Award size={64} color={course.color} style={{ margin: '0 auto 20px auto' }} />
        <h2 style={{ fontSize: '2rem', marginBottom: '16px' }}>Quiz Complete!</h2>
        <p style={{ fontSize: '1.2rem', marginBottom: '24px' }}>
          You scored {score} out of {course.questions.length} ({percentage}%)
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
    <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
      {/* Progress Bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.7)' }}>
          Question {currentQuestionIndex + 1} of {course.questions.length}
        </span>
        <div style={{ flex: 1, height: '8px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${((currentQuestionIndex + 1) / course.questions.length) * 100}%`,
            height: '100%',
            backgroundColor: course.color,
            transition: 'width 0.3s ease'
          }}></div>
        </div>
      </div>

      <div style={{ 
        backgroundColor: 'rgba(255,255,255,0.03)', 
        border: `2px solid ${course.color}40`,
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.15)'
      }}>
        <h3 style={{ fontSize: '1.5rem', marginBottom: '32px', lineHeight: '1.4' }}>
          {question.question}
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {question.options.map((option, index) => {
            const isSelected = selectedOption === index;
            const isCorrect = index === question.correctIndex;
            let bgColor = 'rgba(255,255,255,0.05)';
            let borderColor = 'rgba(255,255,255,0.1)';
            
            if (isAnswering) {
              if (isCorrect) {
                bgColor = 'rgba(76, 175, 80, 0.2)';
                borderColor = '#4CAF50';
              } else if (isSelected && !isCorrect) {
                bgColor = 'rgba(244, 67, 54, 0.2)';
                borderColor = '#F44336';
              }
            } else if (isSelected) {
              bgColor = `${course.color}20`;
              borderColor = course.color;
            }

            return (
              <button
                key={index}
                onClick={() => handleOptionSelect(index)}
                disabled={isAnswering}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  backgroundColor: bgColor,
                  border: `2px solid ${borderColor}`,
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '1.1rem',
                  cursor: isAnswering ? 'default' : 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease',
                  opacity: isAnswering && !isCorrect && !isSelected ? 0.5 : 1
                }}
              >
                <span>{option}</span>
                {isAnswering && isCorrect && <CheckCircle size={24} color="#4CAF50" />}
                {isAnswering && isSelected && !isCorrect && <XCircle size={24} color="#F44336" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default QuizEngine;
