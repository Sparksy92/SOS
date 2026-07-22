import { useState } from 'react';
import MycologyDashboard from './screens/MycologyDashboard.jsx';
import SpeciesLibrary from './screens/SpeciesLibrary.jsx';
import SpeciesDetail from './screens/SpeciesDetail.jsx';
import IdentificationAssistant from './screens/IdentificationAssistant.jsx';
import FieldJournalScreen from './screens/FieldJournalScreen.jsx';
import SpeciesComparisonScreen from './screens/SpeciesComparisonScreen.jsx';
import KnowledgePackManager from './components/KnowledgePackManager.jsx';
import { LayoutDashboard, BookOpen, Compass, Plus, Layers, SlidersHorizontal, Package } from 'lucide-react';

export default function MycologyModule() {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'library' | 'detail' | 'assistant' | 'journal' | 'comparison' | 'packs'
  const [selectedSpecies, setSelectedSpecies] = useState(null);
  const [comparisonTargetA, setComparisonTargetA] = useState(null);
  const [comparisonTargetB, setComparisonTargetB] = useState(null);
  const [libraryQuery, setLibraryQuery] = useState('');

  const handleNavigate = (tab, params = {}) => {
    if (params.query) setLibraryQuery(params.query);
    setActiveTab(tab);
  };

  const handleSelectSpecies = (species) => {
    setSelectedSpecies(species);
    setActiveTab('detail');
  };

  const handleTriggerCompare = (species) => {
    setComparisonTargetA(species);
    setActiveTab('comparison');
  };

  return (
    <div className="mycology-module-container">
      {/* Top Module Sub-Navigation Bar */}
      <div className="mycology-nav-bar">
        <div className="mycology-nav-brand">
          <span className="mycology-emoji">🍄</span>
          <span className="mycology-brand-title">Mycology Knowledge Engine</span>
        </div>

        <div className="mycology-nav-tabs">
          <button 
            className={`mycology-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={16} />
            <span>Dashboard</span>
          </button>

          <button 
            className={`mycology-tab-btn ${activeTab === 'library' || activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('library')}
          >
            <BookOpen size={16} />
            <span>Species Library</span>
          </button>

          <button 
            className={`mycology-tab-btn ${activeTab === 'assistant' ? 'active' : ''}`}
            onClick={() => setActiveTab('assistant')}
          >
            <Compass size={16} />
            <span>Identification Assistant</span>
          </button>

          <button 
            className={`mycology-tab-btn ${activeTab === 'journal' ? 'active' : ''}`}
            onClick={() => setActiveTab('journal')}
          >
            <Plus size={16} />
            <span>Field Journal</span>
          </button>

          <button 
            className={`mycology-tab-btn ${activeTab === 'comparison' ? 'active' : ''}`}
            onClick={() => setActiveTab('comparison')}
          >
            <SlidersHorizontal size={16} />
            <span>Comparison Tool</span>
          </button>

          <button 
            className={`mycology-tab-btn ${activeTab === 'packs' ? 'active' : ''}`}
            onClick={() => setActiveTab('packs')}
          >
            <Package size={16} />
            <span>Packs</span>
          </button>
        </div>
      </div>

      {/* Main Screen Content View */}
      <div className="mycology-content-area">
        {activeTab === 'dashboard' && (
          <MycologyDashboard 
            onNavigate={handleNavigate}
            onSelectSpecies={handleSelectSpecies}
            onCompare={handleTriggerCompare}
          />
        )}

        {activeTab === 'library' && (
          <SpeciesLibrary 
            initialQuery={libraryQuery}
            onSelectSpecies={handleSelectSpecies}
            onCompare={handleTriggerCompare}
          />
        )}

        {activeTab === 'detail' && (
          <SpeciesDetail 
            entry={selectedSpecies}
            onBack={() => setActiveTab('library')}
            onCompare={handleTriggerCompare}
          />
        )}

        {activeTab === 'assistant' && (
          <IdentificationAssistant 
            onSelectSpecies={handleSelectSpecies}
            onCompare={handleTriggerCompare}
          />
        )}

        {activeTab === 'journal' && (
          <FieldJournalScreen 
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'comparison' && (
          <SpeciesComparisonScreen 
            initialSpeciesA={comparisonTargetA}
            initialSpeciesB={comparisonTargetB}
          />
        )}

        {activeTab === 'packs' && (
          <KnowledgePackManager 
            onPackImported={() => handleNavigate('library')}
          />
        )}
      </div>
    </div>
  );
}
