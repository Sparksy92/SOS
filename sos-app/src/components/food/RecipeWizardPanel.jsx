import React, { useState, useMemo } from 'react';
import { Search, Flame, CheckCircle, XCircle, Info, MessageSquare, ClipboardList } from 'lucide-react';
import { scoreRecipes } from '../../modules/food/recipeScoring.js';

export default function RecipeWizardPanel({ profile, setViewMode, setChatInput }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [onHandOverrides, setOnHandOverrides] = useState({});
  const [selectedRecipeId, setSelectedRecipeId] = useState(null);

  // Compute scored recipes dynamically
  const scoredRecipes = useMemo(() => {
    return scoreRecipes(profile?.pantry || {}, onHandOverrides);
  }, [profile?.pantry, onHandOverrides]);

  // Filter recipes based on search query
  const filteredRecipes = useMemo(() => {
    if (!searchQuery) return scoredRecipes;
    const lower = searchQuery.toLowerCase();
    return scoredRecipes.filter(r => 
      r.title.toLowerCase().includes(lower) || 
      r.description.toLowerCase().includes(lower) ||
      r.ingredients.some(i => i.name.toLowerCase().includes(lower))
    );
  }, [scoredRecipes, searchQuery]);

  // Auto-select the first filtered recipe if none is selected
  const activeRecipe = useMemo(() => {
    if (selectedRecipeId) {
      const match = filteredRecipes.find(r => r.id === selectedRecipeId);
      if (match) return match;
    }
    return filteredRecipes[0] || null;
  }, [filteredRecipes, selectedRecipeId]);

  const toggleOverride = (ingredientName) => {
    setOnHandOverrides(prev => ({
      ...prev,
      [ingredientName]: !prev[ingredientName]
    }));
  };

  const handleAskJarvis = (recipe) => {
    if (!recipe) return;
    const query = `Provide detailed off-grid culinary advice and substitution tips for the recipe "${recipe.title}". Critical items: ${recipe.ingredients.filter(i=>i.critical).map(i=>i.name).join(', ')}.`;
    setChatInput(query);
    setViewMode('chat');
  };

  return (
    <div style={{ display: 'flex', gap: '24px', width: '100%', flexWrap: 'wrap' }}>
      
      {/* Left Column: Recipe list search & select */}
      <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
          <input
            type="text"
            placeholder="Search recipes or ingredients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              backgroundColor: '#12151c',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '0.88rem'
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '500px', overflowY: 'auto' }}>
          {filteredRecipes.map(recipe => {
            const isSelected = activeRecipe?.id === recipe.id;
            return (
              <button
                key={recipe.id}
                onClick={() => setSelectedRecipeId(recipe.id)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  width: '100%',
                  padding: '12px 16px',
                  backgroundColor: isSelected ? 'var(--brand-primary-dim)' : 'rgba(18, 21, 28, 0.4)',
                  border: '1px solid',
                  borderColor: isSelected ? 'var(--brand-primary)' : 'var(--border-subtle)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.2s, background-color 0.2s'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#fff' }}>
                    {recipe.title}
                  </span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: recipe.isCookable ? 'rgba(0, 255, 127, 0.1)' : 'rgba(255, 69, 0, 0.1)',
                    color: recipe.isCookable ? '#00ff7f' : '#ff4500',
                    border: `1px solid ${recipe.isCookable ? 'rgba(0, 255, 127, 0.2)' : 'rgba(255, 69, 0, 0.2)'}`
                  }}>
                    {recipe.matchPercent}% Match
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: '1.3' }}>
                  {recipe.description}
                </p>
                <div style={{ display: 'flex', gap: '10px', marginTop: '8px', fontSize: '0.7rem', color: '#888' }}>
                  <span>⏳ {recipe.prepTime}</span>
                  <span>🔥 {recipe.pantryCategoriesUsed.map(c => c.replace('_', ' ')).join(', ')}</span>
                </div>
              </button>
            );
          })}

          {filteredRecipes.length === 0 && (
            <div style={{ textAlign: 'center', padding: '30px', color: '#888', border: '1px dashed var(--border-subtle)', borderRadius: '6px' }}>
              No emergency recipes matched.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Detailed Selected Recipe View */}
      {activeRecipe ? (
        <div className="glass-panel" style={{ flex: '2 2 500px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Header */}
          <div style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                OFFGRID CULINARY WIZARD // PREP: {activeRecipe.prepTime.toUpperCase()}
              </span>
              <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 'bold',
                color: activeRecipe.isCookable ? '#00ff7f' : '#ff4500'
              }}>
                {activeRecipe.isCookable ? (
                  <><CheckCircle size={14} /> READY TO COOK</>
                ) : (
                  <><XCircle size={14} /> MISSING CRITICAL ITEMS</>
                )}
              </span>
            </div>
            <h2 style={{ margin: '8px 0 4px 0', fontSize: '1.4rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
              {activeRecipe.title.toUpperCase()}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {activeRecipe.description}
            </p>
          </div>

          {/* Ingredient Audit Checklist */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>
              INGREDIENT STOCK AUDIT
            </h3>
            <div style={{ display: 'grid', gap: '8px' }}>
              {activeRecipe.ingredients.map((ing, idx) => {
                const isOverridden = !!onHandOverrides[ing.name];
                const isStocked = profile?.pantry?.[ing.category] > 0;
                const isAvailable = isOverridden || isStocked;

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: 'rgba(0,0,0,0.15)',
                      border: '1px solid',
                      borderColor: isAvailable ? 'rgba(0, 255, 127, 0.15)' : 'rgba(255, 69, 0, 0.15)',
                      borderRadius: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isAvailable ? (
                        <CheckCircle size={16} style={{ color: '#00ff7f' }} />
                      ) : (
                        <XCircle size={16} style={{ color: '#ff4500' }} />
                      )}
                      <span style={{ fontSize: '0.85rem', color: '#fff' }}>
                        <strong>{ing.quantity}</strong> {ing.name}
                        {ing.critical && <span style={{ color: '#ff4500', fontSize: '0.72rem', marginLeft: '6px' }}>(Critical)</span>}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ fontSize: '0.75rem', color: '#888' }}>
                        Pantry: {ing.category.replace('_', ' ')}
                      </span>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '0.75rem', color: isOverridden ? 'var(--brand-primary)' : '#aaa' }}>
                        <input
                          type="checkbox"
                          checked={isOverridden}
                          onChange={() => toggleOverride(ing.name)}
                          style={{ cursor: 'pointer' }}
                        />
                        Force On-Hand
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cooking Instructions */}
          <div>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#fff', fontFamily: 'var(--font-mono)' }}>
              PREPARATION STEPS
            </h3>
            <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {activeRecipe.instructions.map((step, idx) => (
                <li key={idx} style={{ fontSize: '0.88rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Ask Jarvis button */}
          <button
            onClick={() => handleAskJarvis(activeRecipe)}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: 'rgba(0, 242, 254, 0.05)',
              border: '1px solid var(--brand-primary)',
              borderRadius: '6px',
              color: 'var(--brand-primary)',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.2s'
            }}
          >
            <MessageSquare size={16} /> DEPLOY CULINARY SUBSTITUTION BRIEFING VIA J.A.R.V.I.S.
          </button>

        </div>
      ) : (
        <div style={{ flex: 1, textAlign: 'center', padding: '60px' }}>
          Select a recipe from the list to begin.
        </div>
      )}
      
    </div>
  );
}
