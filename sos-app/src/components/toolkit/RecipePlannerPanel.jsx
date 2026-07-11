import React, { useState } from 'react';
import { Utensils, Check, AlertTriangle, BookOpen, Clock } from 'lucide-react';
import { scoreRecipes } from '../../modules/food/recipeScoring.js';

export default function RecipePlannerPanel({ profile }) {
  const [overrides, setOverrides] = useState({
    "Salt": true,
    "Baking Powder (optional)": true,
    "Salt / Seasoning": true
  });

  const handleToggleOverride = (ingName) => {
    setOverrides(prev => ({
      ...prev,
      [ingName]: !prev[ingName]
    }));
  };

  const scoredRecipes = scoreRecipes(profile.pantry || {}, overrides);

  // Collect all unique ingredients from all recipes to allow manual overrides
  const allManualIngredients = [
    "Salt", "Baking Powder (optional)", "Salt / Seasoning", "Dried Spices", "Water"
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', color: '#e0e0e0', maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(0, 242, 254, 0.2)', paddingBottom: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.4rem', color: 'var(--brand-primary)', textTransform: 'uppercase', letterSpacing: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Utensils size={20} /> PANTRY RECIPE PLANNER
        </h3>
        <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#a0a0a0' }}>
          Matches your active food pantry reserves with emergency recipes. Cross-reference available items and review preparation guides.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
        
        {/* Left Side: Overrides */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>MANUAL ON-HAND ITEMS</span>
          <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <p style={{ margin: '0 0 6px 0', fontSize: '0.75rem', color: '#a0a0a0', lineHeight: '1.4' }}>
              Check items you currently have on-hand (e.g. spices, water, salt) that aren't tracked as bulk pantry weight.
            </p>
            {allManualIngredients.map(ing => (
              <label key={ing} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', color: '#fff' }}>
                <input 
                  type="checkbox" 
                  checked={!!overrides[ing]} 
                  onChange={() => handleToggleOverride(ing)}
                  style={{ accentColor: 'var(--brand-primary)' }}
                />
                {ing}
              </label>
            ))}
          </div>
        </div>

        {/* Right Side: Scored Recipes List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#888', letterSpacing: '1px' }}>MATCHED RECIPES</span>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
            {scoredRecipes.map(recipe => (
              <div 
                key={recipe.id}
                style={{ 
                  backgroundColor: 'rgba(255,255,255,0.02)', 
                  border: `1px solid ${recipe.isCookable ? 'rgba(0, 255, 102, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                  padding: '16px', 
                  borderRadius: '6px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                {/* Recipe Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff' }}>{recipe.title}</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#a0a0a0' }}>{recipe.description}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 'bold', 
                      padding: '2px 8px', 
                      borderRadius: '4px',
                      backgroundColor: recipe.isCookable ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255, 69, 0, 0.1)',
                      color: recipe.isCookable ? '#00ff66' : '#ff4500'
                    }}>
                      {recipe.isCookable ? 'COOKABLE' : 'MISSING INGREDIENTS'}
                    </span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                      {recipe.matchPercent}% Match
                    </div>
                  </div>
                </div>

                {/* Ingredients list */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#888', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>INGREDIENTS</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {recipe.ingredients.map((ing, idx) => {
                      const isAvailable = recipe.availableIngredients.includes(ing.name);
                      return (
                        <span 
                          key={idx} 
                          style={{ 
                            fontSize: '0.72rem', 
                            padding: '2px 6px', 
                            borderRadius: '3px',
                            backgroundColor: isAvailable ? 'rgba(0, 255, 102, 0.05)' : 'rgba(255, 69, 0, 0.05)',
                            border: `1px solid ${isAvailable ? 'rgba(0, 255, 102, 0.15)' : 'rgba(255, 69, 0, 0.15)'}`,
                            color: isAvailable ? '#00ff66' : '#ff5533'
                          }}
                        >
                          {ing.quantity} {ing.name} {ing.critical && '*'}
                        </span>
                      );
                    })}
                  </div>
                </div>

                {/* Steps Accordion */}
                <details style={{ cursor: 'pointer' }}>
                  <summary style={{ fontSize: '0.75rem', color: 'var(--brand-primary)', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <BookOpen size={12} /> View Preparation Steps ({recipe.prepTime})
                  </summary>
                  <ol style={{ paddingLeft: '16px', margin: '8px 0 0 0', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {recipe.instructions.map((step, idx) => (
                      <li key={idx} style={{ fontSize: '0.78rem', color: '#d0d0d0', lineHeight: '1.4', cursor: 'default' }}>
                        {step}
                      </li>
                    ))}
                  </ol>
                </details>

              </div>
            ))}
          </div>

        </div>

      </div>

    </div>
  );
}
