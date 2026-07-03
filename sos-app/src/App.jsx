import { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Terminal, 
  ShieldAlert, 
  Activity, 
  FileText, 
  BookOpen, 
  Settings,
  FolderOpen,
  MessageSquare,
  Send,
  Cpu,
  Fingerprint,
  ExternalLink,
  Menu,
  X,
  Video,
  VideoOff,
  Download,
  Disc,
  Image,
  Volume2,
  VolumeX,
  Play,
  Pause,
  LayoutDashboard,
  Droplet,
  Wheat,
  ClipboardList,
  Trash2,
  Plus,
  Edit3,
  CheckSquare,
  ArrowRight,
  Info,
  RefreshCw,
  User,
  AlertTriangle
} from 'lucide-react';
import './App.css';
import { getRiskLevel, requiresAcknowledgement, getSafetyWarning } from './modules/safety/riskRules.js';
import { loadWaterContainers, saveWaterContainers } from './modules/water/waterStorage.js';
import { calculateWaterReserves } from './modules/water/waterCalculations.js';
import { calculatePantryReserves, PANTRY_GUIDELINES } from './modules/food/pantryCalculations.js';
import { calculateReadinessScore } from './modules/readiness/readinessCalculator.js';
import { ACTION_MODULES } from './modules/tools/actionModules.js';
import {
  loadProfile,
  saveProfile,
  loadFavorites,
  saveFavorites,
  loadReadGuides,
  saveReadGuides,
  loadLastAccessed,
  saveLastAccessed,
  loadDashboardWidgets,
  saveDashboardWidgets
} from './modules/profile/sosProfileStore.js';

import DashboardView from './components/dashboard/DashboardView.jsx';
import WaterInventoryPanel from './components/water/WaterInventoryPanel.jsx';
import PantryPanel from './components/food/PantryPanel.jsx';
import ReadinessPanel from './components/readiness/ReadinessPanel.jsx';
import ActionGuidesPanel from './components/actions/ActionGuidesPanel.jsx';
import ProfileSettingsPanel from './components/settings/ProfileSettingsPanel.jsx';
import CrawlerControls from './components/crawler/CrawlerControls.jsx';
import PanelErrorBoundary from './components/common/PanelErrorBoundary.jsx';

const API_BASE = `http://${window.location.hostname}:3001`;

function App() {
  const [categories, setCategories] = useState({});
  const [metadata, setMetadata] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'files', 'chat', 'water', 'food', 'readiness', 'action-guides', 'settings'
  const [profile, setProfile] = useState(() => loadProfile());
  const [waterContainers, setWaterContainers] = useState(() => loadWaterContainers());
  const [favorites, setFavorites] = useState(() => loadFavorites());
  const [readGuides, setReadGuides] = useState(() => loadReadGuides());
  const [lastAccessed, setLastAccessed] = useState(() => loadLastAccessed());
  const [dashboardWidgets, setDashboardWidgets] = useState(() => loadDashboardWidgets());
  const [editingContainer, setEditingContainer] = useState(null);
  const [showAddContainer, setShowAddContainer] = useState(false);
  const [containerForm, setContainerForm] = useState({
    name: '',
    capacity: 0,
    currentLevel: 0,
    unit: 'Gallons',
    filterType: '',
    filterChangeDate: '',
    lastTestDate: '',
    lastTestResult: 'Safe',
    notes: ''
  });
  const [mediaTab, setMediaTab] = useState('all');
  const [collapsedFolders, setCollapsedFolders] = useState({});

  // Audio Book Reader State
  const [audioChunks, setAudioChunks] = useState([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(0);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [showAudioHUD, setShowAudioHUD] = useState(false);
  const [acknowledgedDocs, setAcknowledgedDocs] = useState({});

  const toggleFolder = (folderPath) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderPath]: !prev[folderPath]
    }));
  };
  
  // Chat state
  const [messages, setMessages] = useState([{ role: 'ai', text: 'J.A.R.V.I.S. Protocol Online. I have access to your survival database. What do you need to know?' }]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Decoding state
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeProgress, setDecodeProgress] = useState(0);
  const [decodeTotal, setDecodeTotal] = useState(0);

  // Batch Index state
  const [isIndexingBatch, setIsIndexingBatch] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexTotal, setIndexTotal] = useState(0);

  // In-App Viewer state
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Crawler status state
  const [crawlerStatus, setCrawlerStatus] = useState(null);

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Live Guide & Voice Chat States
  const [isLiveGuide, setIsLiveGuide] = useState(false);
  const [isVoiceChatActive, setIsVoiceChatActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  const findDocumentByPath = (path) => {
    if (!categories) return null;
    for (const catFiles of Object.values(categories)) {
      const doc = catFiles.find(d => d.path === path);
      if (doc) return doc;
    }
    const name = path.split('/').pop();
    const ext = name.includes('.') ? name.substring(name.lastIndexOf('.')) : '';
    return {
      name,
      path,
      extension: ext,
      rawCategory: 'Uncategorized',
      category: 'General Materials',
      subdirectories: []
    };
  };

  const openSourceDocument = (source) => {
    const doc = findDocumentByPath(source);
    if (doc) {
      setSelectedDocument(doc);
    }
  };

  const readSourceAloud = (source) => {
    const doc = findDocumentByPath(source);
    if (doc) {
      activateAudioReader(doc);
    }
  };

  const getSourceTitle = (source) => {
    if (metadata && metadata[source]?.title) {
      return metadata[source].title;
    }
    const parts = source.split('/');
    return parts[parts.length - 1] || 'Source Document';
  };

  const getSourceRisk = (source) => {
    const doc = findDocumentByPath(source);
    if (doc) {
      return getRiskLevel(doc);
    }
    return { risk: 'LOW', category: null };
  };
  
  const recognitionRef = useRef(null);

  const changeTheme = (theme) => {
    const root = document.documentElement;
    if (theme === 'amber') {
      root.style.setProperty('--brand-primary', '#FFB700');
      root.style.setProperty('--brand-primary-dim', 'rgba(255, 183, 0, 0.15)');
      root.style.setProperty('--border-strong', 'rgba(255, 183, 0, 0.4)');
      root.style.setProperty('--glow-primary', '0 0 10px rgba(255, 183, 0, 0.2)');
      root.style.setProperty('--glow-primary-strong', '0 0 20px rgba(255, 183, 0, 0.4)');
    } else if (theme === 'cyan') {
      root.style.setProperty('--brand-primary', '#00E5FF');
      root.style.setProperty('--brand-primary-dim', 'rgba(0, 229, 255, 0.15)');
      root.style.setProperty('--border-strong', 'rgba(0, 229, 255, 0.4)');
      root.style.setProperty('--glow-primary', '0 0 10px rgba(0, 229, 255, 0.2)');
      root.style.setProperty('--glow-primary-strong', '0 0 20px rgba(0, 229, 255, 0.4)');
    } else if (theme === 'green') {
      root.style.setProperty('--brand-primary', '#00ff66');
      root.style.setProperty('--brand-primary-dim', 'rgba(0, 255, 102, 0.15)');
      root.style.setProperty('--border-strong', 'rgba(0, 255, 102, 0.4)');
      root.style.setProperty('--glow-primary', '0 0 10px rgba(0, 255, 102, 0.2)');
      root.style.setProperty('--glow-primary-strong', '0 0 20px rgba(0, 255, 102, 0.4)');
    }
    localStorage.setItem('sos-theme', theme);
  };

  useEffect(() => {
    // Fetch materials and metadata
    Promise.all([
      fetch(`${API_BASE}/api/materials`).then(res => res.json()),
      fetch(`${API_BASE}/api/metadata`).then(res => res.json())
    ])
    .then(([materialsData, metadataData]) => {
      setCategories(materialsData.categories);
      setMetadata(metadataData || {});
      const cats = Object.keys(materialsData.categories);
      if (cats.length > 0) setActiveCategory(cats[0]);
      setLoading(false);
    })
    .catch(err => {
      setError("Failed to connect to Local Data Core.");
      setLoading(false);
    });

    // Load theme
    const savedTheme = localStorage.getItem('sos-theme') || 'amber';
    changeTheme(savedTheme);

    // Setup Web Speech API for J.A.R.V.I.S. Voice and Commands
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = 'en-US';
      
      rec.onstart = () => setIsListening(true);
      rec.onend = () => setIsListening(false);
      
      rec.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        console.log("[SPEECH RECOGNITION] Capture:", transcript);
        handleSendMessage(transcript);
      };
      
      recognitionRef.current = rec;
    }

    // Background crawler status fetcher
    const fetchCrawlerStatus = () => {
      fetch(`${API_BASE}/api/crawler/status`)
        .then(res => res.json())
        .then(data => setCrawlerStatus(data))
        .catch(err => console.error("Error fetching crawler status:", err));
    };

    fetchCrawlerStatus();
    const interval = setInterval(fetchCrawlerStatus, 4000);
    return () => {
      clearInterval(interval);
      window.speechSynthesis.cancel();
    };
  }, [isVoiceChatActive, isLiveGuide]); // Depend on voice chat state to keep fetch callbacks aligned

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  useEffect(() => {
    saveWaterContainers(waterContainers);
  }, [waterContainers]);

  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  useEffect(() => {
    saveReadGuides(readGuides);
  }, [readGuides]);

  useEffect(() => {
    saveLastAccessed(lastAccessed);
  }, [lastAccessed]);

  useEffect(() => {
    saveDashboardWidgets(dashboardWidgets);
  }, [dashboardWidgets]);

  const resetContainerForm = () => {
    setContainerForm({
      name: '',
      capacity: 0,
      currentLevel: 0,
      unit: 'Gallons',
      filterType: '',
      filterChangeDate: '',
      lastTestDate: '',
      lastTestResult: 'Safe',
      notes: ''
    });
  };

  const handleAddContainer = (e) => {
    if (e) e.preventDefault();
    const newContainer = {
      ...containerForm,
      id: Date.now(),
      capacity: parseFloat(containerForm.capacity) || 0,
      currentLevel: parseFloat(containerForm.currentLevel) || 0
    };
    setWaterContainers(prev => [...prev, newContainer]);
    setShowAddContainer(false);
    resetContainerForm();
  };

  const handleEditContainer = (e) => {
    if (e) e.preventDefault();
    if (!editingContainer) return;
    const updated = waterContainers.map(c => c.id === editingContainer.id ? {
      ...containerForm,
      id: editingContainer.id,
      capacity: parseFloat(containerForm.capacity) || 0,
      currentLevel: parseFloat(containerForm.currentLevel) || 0
    } : c);
    setWaterContainers(updated);
    setEditingContainer(null);
    resetContainerForm();
  };

  const handleDeleteContainer = (id) => {
    if (window.confirm("Are you sure you want to delete this water storage container?")) {
      setWaterContainers(prev => prev.filter(c => c.id !== id));
    }
  };

  const getFilteredFiles = () => {
    let files = [];
    if (searchQuery) {
      Object.values(categories).forEach(catFiles => {
        files = [...files, ...catFiles];
      });
      files = files.filter(f => {
        const meta = metadata[f.path];
        const searchTarget = meta ? `${meta.title} ${meta.summary || ''} ${f.name}`.toLowerCase() : f.name.toLowerCase();
        return searchTarget.includes(searchQuery.toLowerCase());
      });
    } else {
      if (!activeCategory || !categories[activeCategory]) return [];
      files = categories[activeCategory];
    }

    // Apply media type tab filter
    if (mediaTab === 'reading') {
      return files.filter(f => ['.pdf', '.epub', '.txt', '.doc', '.docx'].includes(f.extension?.toLowerCase()));
    } else if (mediaTab === 'videos') {
      return files.filter(f => ['.mp4', '.avi', '.mkv', '.wmv', '.webm', '.mov'].includes(f.extension?.toLowerCase()));
    } else if (mediaTab === 'software') {
      return files.filter(f => ['.iso', '.zip', '.zim'].includes(f.extension?.toLowerCase()));
    } else if (mediaTab === 'diagrams') {
      return files.filter(f => ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(f.extension?.toLowerCase()));
    }
    return files;
  };

  const getGroupedFiles = (filesList) => {
    const groups = {};
    filesList.forEach(f => {
      const subdirPath = f.subdirectories && f.subdirectories.length > 0
        ? f.subdirectories.join(' / ')
        : 'ROOT / MAIN';
      if (!groups[subdirPath]) {
        groups[subdirPath] = [];
      }
      groups[subdirPath].push(f);
    });
    return groups;
  };

  const openFile = (file) => {
    setSelectedDocument(file);
  };

  const triggerIndex = async (file) => {
    if (window.confirm(`Initialize Neural Index for ${file.name}? This takes time and CPU power.`)) {
      try {
        const res = await fetch(`${API_BASE}/api/index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: file.path })
        });
        const data = await res.json();
        alert(`Indexing complete. ${data.chunks || 0} memory chunks stored.`);
      } catch (err) {
        alert("Error indexing: " + err.message);
      }
    }
  };

  const indexCategory = async () => {
    if (!activeCategory) return;
    const files = getFilteredFiles();
    if (!files || files.length === 0) return;

    if (!window.confirm(`Initialize Neural Index for ${files.length} files? This will inject all text into the AI's memory. This takes significant CPU power.`)) return;

    setIsIndexingBatch(true);
    setIndexTotal(files.length);
    setIndexProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await fetch(`${API_BASE}/api/index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: file.path })
        });
      } catch (err) {
        console.error("Failed to index", file.path, err);
      }
      setIndexProgress(i + 1);
    }
    setIsIndexingBatch(false);
    alert(`Successfully indexed ${files.length} documents into J.A.R.V.I.S. Memory.`);
  };

  const decodeCategory = async () => {
    if (!activeCategory) return;
    const files = categories[activeCategory];
    if (!files || files.length === 0) return;

    if (!window.confirm(`Initialize Neural Decoder for ${files.length} files in ${activeCategory}? This will use local AI to extract titles and summaries.`)) return;

    setIsDecoding(true);
    setDecodeTotal(files.length);
    setDecodeProgress(0);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Skip if we already have metadata
      if (metadata[file.path] && metadata[file.path].title !== "Unknown Document" && !metadata[file.path].summary?.startsWith("Error")) {
        setDecodeProgress(i + 1);
        continue;
      }

      try {
        const res = await fetch(`${API_BASE}/api/metadata/extract`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filePath: file.path })
        });
        if (!res.ok) throw new Error("Server error");
        const data = await res.json();
        
        // Update local state immediately
        setMetadata(prev => ({
          ...prev,
          [file.path]: data
        }));
      } catch (err) {
        console.error("Failed to decode", file.path, err);
        // Break early if server is unreachable so we don't spin
        if (err.message === 'Failed to fetch' || err.message === 'Server error') {
           alert("Decoding aborted: Server unreachable.");
           break;
        }
      }
      setDecodeProgress(i + 1);
    }
    setIsDecoding(false);
  };

  const speakText = (text, onEndCallback) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Attempt to load British English voices for JARVIS accent approximation
    const voices = window.speechSynthesis.getVoices();
    const gbVoice = voices.find(v => v.lang.startsWith('en-GB') && v.name.toLowerCase().includes('male')) || 
                    voices.find(v => v.lang.startsWith('en-GB')) || 
                    voices.find(v => v.lang.startsWith('en'));
                    
    if (gbVoice) {
      utterance.voice = gbVoice;
    }
    
    utterance.rate = 1.08;
    utterance.pitch = 0.92;
    
    if (onEndCallback) {
      utterance.onend = onEndCallback;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  const activateAudioReader = async (doc) => {
    setIsAudioLoading(true);
    setShowAudioHUD(true);
    setIsAudioPlaying(false);
    window.speechSynthesis.cancel();

    try {
      const res = await fetch(`${API_BASE}/api/document/text?path=${encodeURIComponent(doc.path)}`);
      if (!res.ok) throw new Error("Failed to load document text.");
      const data = await res.json();
      
      let text = data.text || '';
      
      // Remove HTML tags for clean reading if it is Markdown
      if (data.type === 'markdown') {
        text = text.replace(/<!--.*?-->/g, '')  // Remove HTML comments
                   .replace(/<[^>]*>/g, '');    // Remove HTML tags
      }

      const chunks = text.split(/\n\n+/)
        .map(c => c.trim())
        .filter(c => c.length > 5 && !c.startsWith('---')); // Filter out empty or separators
      
      if (chunks.length === 0) {
        alert("This document appears to have no readable text. (It may be a scanned PDF; run the OCR pipeline first!)");
        setIsAudioLoading(false);
        setShowAudioHUD(false);
        return;
      }

      setAudioChunks(chunks);
      setCurrentChunkIndex(0);
      setIsAudioPlaying(true);
      setIsAudioLoading(false);
      
      speakCurrentChunk(chunks, 0);
    } catch (err) {
      alert("Error loading text: " + err.message);
      setIsAudioLoading(false);
      setShowAudioHUD(false);
    }
  };

  const speakCurrentChunk = (chunksList, index) => {
    if (index >= chunksList.length || index < 0) {
      setIsAudioPlaying(false);
      return;
    }
    
    const textToSpeak = chunksList[index];
    speakText(textToSpeak, () => {
      const nextIndex = index + 1;
      if (nextIndex < chunksList.length) {
        setCurrentChunkIndex(nextIndex);
        speakCurrentChunk(chunksList, nextIndex);
      } else {
        setIsAudioPlaying(false);
      }
    });
  };

  const toggleAudioPlay = () => {
    if (isAudioPlaying) {
      window.speechSynthesis.cancel();
      setIsAudioPlaying(false);
    } else {
      setIsAudioPlaying(true);
      speakCurrentChunk(audioChunks, currentChunkIndex);
    }
  };

  const stopAudioReader = () => {
    window.speechSynthesis.cancel();
    setIsAudioPlaying(false);
    setShowAudioHUD(false);
    setAudioChunks([]);
    setCurrentChunkIndex(0);
  };

  const playNextChunk = () => {
    const nextIdx = currentChunkIndex + 1;
    if (nextIdx < audioChunks.length) {
      setCurrentChunkIndex(nextIdx);
      if (isAudioPlaying) {
        speakCurrentChunk(audioChunks, nextIdx);
      }
    }
  };

  const playPrevChunk = () => {
    const prevIdx = currentChunkIndex - 1;
    if (prevIdx >= 0) {
      setCurrentChunkIndex(prevIdx);
      if (isAudioPlaying) {
        speakCurrentChunk(audioChunks, prevIdx);
      }
    }
  };

  useEffect(() => {
    if (!selectedDocument) {
      stopAudioReader();
    }
  }, [selectedDocument]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("SpeechRecognition start error:", e);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.error("SpeechRecognition stop error:", e);
      }
    }
  };

  const toggleVoiceChat = () => {
    if (isVoiceChatActive) {
      setIsVoiceChatActive(false);
      window.speechSynthesis.cancel();
      stopListening();
    } else {
      setIsVoiceChatActive(true);
      speakText("J.A.R.V.I.S. Voice interface online. Standing by for instructions.", () => {
        startListening();
      });
    }
  };

  const parseSteps = (text) => {
    if (!text) return [];
    const steps = [];
    const lines = text.split('\n');
    let currentStep = null;
    
    lines.forEach(line => {
      const match = line.trim().match(/^(\d+)\.\s*(.*)/);
      if (match) {
        if (currentStep) steps.push(currentStep);
        currentStep = { number: match[1], content: match[2] };
      } else if (line.trim() && currentStep) {
        currentStep.content += ' ' + line.trim();
      }
    });
    if (currentStep) steps.push(currentStep);
    return steps;
  };

  const getRiskySourceCategory = (sources) => {
    if (!sources || sources.length === 0) return null;
    for (const s of sources) {
      const path = s.source;
      if (!path) continue;
      const risk = getRiskLevel({ name: path.split(/[\\/]/).pop(), path });
      if (risk.risk === 'HIGH') {
        return risk.category;
      }
    }
    return null;
  };

  const handleSendMessage = async (overrideText = null, useGeneralKnowledge = false) => {
    const textToSend = overrideText || chatInput;
    if (!textToSend.trim() || chatLoading) return;
    
    // Stop listening temporarily during AI generation
    stopListening();
    
    setMessages(prev => [...prev, { role: 'user', text: textToSend }]);
    setChatInput('');
    setChatLoading(true);
    
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, isLiveGuide, useGeneralKnowledge })
      });
      const data = await res.json();
      
      if (data.error) throw new Error(data.error);
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.answer, 
        sources: data.sources,
        answerStatus: data.answerStatus
      }]);
      
      // Auto Speech Feedback
      if (isVoiceChatActive) {
        const steps = parseSteps(data.answer);
        if (isLiveGuide && steps.length > 0) {
          setActiveStepIndex(0);
          speakText(`Step 1. ${steps[0].content}`, () => {
            startListening();
          });
        } else {
          speakText(data.answer, () => {
            startListening();
          });
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', text: `SYSTEM ERROR: ${err.message}` }]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  return (
    <>
      <div className="scanlines"></div>
      <div className="app-container">
        {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}
        
        {/* SIDEBAR */}
        <div className={`sidebar glass-panel ${sidebarOpen ? 'sidebar-open' : ''}`}>
          <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 className="os-title text-glow" style={{ margin: 0 }}>SOS <Terminal size={24} style={{display:'inline', marginBottom: '-2px'}}/></h1>
              <div className="os-subtitle">SURVIVAL OPERATING SYSTEM</div>
            </div>
            <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
          
          <div className="nav-menu">
            <div 
              className={`nav-item ${viewMode === 'dashboard' ? 'active' : ''}`}
              onClick={() => { setViewMode('dashboard'); setSidebarOpen(false); }}
            >
              <LayoutDashboard size={18} className={viewMode === 'dashboard' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'dashboard' ? 'var(--brand-primary)' : ''}}>DASHBOARD</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'chat' ? 'active' : ''}`}
              onClick={() => { setViewMode('chat'); setSidebarOpen(false); }}
            >
              <Cpu size={18} className={viewMode === 'chat' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'chat' ? 'var(--brand-primary)' : ''}}>J.A.R.V.I.S. (LOCAL AI)</span>
            </div>

            <div style={{ margin: '16px 0 8px 16px', fontSize: '0.75rem', color: 'var(--brand-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Homestead Modules
            </div>

            <div 
              className={`nav-item ${viewMode === 'water' ? 'active' : ''}`}
              onClick={() => { setViewMode('water'); setSidebarOpen(false); }}
            >
              <Droplet size={18} className={viewMode === 'water' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'water' ? 'var(--brand-primary)' : ''}}>WATER INVENTORY</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'food' ? 'active' : ''}`}
              onClick={() => { setViewMode('food'); setSidebarOpen(false); }}
            >
              <Wheat size={18} className={viewMode === 'food' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'food' ? 'var(--brand-primary)' : ''}}>FOOD & PANTRY</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'readiness' ? 'active' : ''}`}
              onClick={() => { setViewMode('readiness'); setSidebarOpen(false); }}
            >
              <ShieldAlert size={18} className={viewMode === 'readiness' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'readiness' ? 'var(--brand-primary)' : ''}}>READINESS SCORE</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'action-guides' ? 'active' : ''}`}
              onClick={() => { setViewMode('action-guides'); setSidebarOpen(false); }}
            >
              <ClipboardList size={18} className={viewMode === 'action-guides' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'action-guides' ? 'var(--brand-primary)' : ''}}>ACTION GUIDES</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'settings' ? 'active' : ''}`}
              onClick={() => { setViewMode('settings'); setSidebarOpen(false); }}
            >
              <Settings size={18} className={viewMode === 'settings' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'settings' ? 'var(--brand-primary)' : ''}}>SETTINGS / PROFILE</span>
            </div>

            <div style={{ margin: '16px 0 8px 16px', fontSize: '0.75rem', color: 'var(--brand-primary)', letterSpacing: '1px', textTransform: 'uppercase' }}>
              Library Browser
            </div>

            {loading ? (
              <div style={{padding: '0 16px', color: 'var(--brand-primary)'}}>SYNCING...</div>
            ) : error ? (
              <div style={{padding: '0 16px', color: 'var(--brand-danger)'}}><ShieldAlert size={16}/> ERROR</div>
            ) : (
              Object.keys(categories).map(cat => (
                <div 
                  key={cat}
                  className={`nav-item ${activeCategory === cat && viewMode === 'files' ? 'active' : ''}`}
                  onClick={() => { setActiveCategory(cat); setViewMode('files'); setSidebarOpen(false); }}
                >
                  <FolderOpen size={18} />
                  <span>{cat.toUpperCase()}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MAIN WORKSPACE */}
        <div className="main-content">
          <div className="topbar glass-panel" style={{borderRadius: 0}}>
            <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div className="search-container">
              <Search size={18} color="var(--brand-primary)" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="QUERY LOCAL DATABASE..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="system-status">
              <div className="status-indicator">
                <div className="status-dot"></div>
                <span>CORE ONLINE</span>
              </div>
              <div style={{color: 'var(--text-muted)'}}>{window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'LOCAL HOST' : window.location.hostname.toUpperCase()}</div>
              <Settings 
                size={18} 
                style={{cursor: 'pointer', color: 'var(--text-muted)'}}
                onClick={() => setSettingsOpen(true)}
              />
            </div>
          </div>

          {/* SYSTEM SYNC ALERT BANNER */}
          {crawlerStatus && crawlerStatus.isCrawling && (
            <div className="crawler-banner glass-panel">
              <Activity size={14} style={{ animation: 'spin 4s linear infinite', flexShrink: 0 }} />
              <span className="crawler-banner-label">SYNC ACTIVE:</span>
              <span className="crawler-banner-text">
                {crawlerStatus.statusText} {crawlerStatus.currentFile !== 'None' ? `[ ${crawlerStatus.currentFile} ]` : ''}
              </span>
            </div>
          )}

          <div className="content-area" style={{ display: 'flex', flexDirection: 'column' }}>
            {error && (
              <div className="glass-panel" style={{padding: '24px', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)'}}>
                <h2>SYSTEM FAILURE</h2>
                <p>{error}</p>
                <p>Ensure backend server is running on port 3001.</p>
              </div>
            )}
            
            {!error && !loading && viewMode === 'files' && activeCategory && (
              <>
                <div className="category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px' }}>
                  <div>
                    <h2 className="category-title">{searchQuery ? `SEARCH: "${searchQuery.toUpperCase()}"` : activeCategory.toUpperCase()}</h2>
                    <div style={{color: 'var(--text-muted)'}}>{getFilteredFiles().length} RECORDS FOUND</div>
                  </div>
                  {!searchQuery && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button 
                        className="btn-tactical" 
                        onClick={indexCategory}
                        disabled={isIndexingBatch || isDecoding}
                        style={{ fontSize: '0.8rem', padding: '8px 16px', background: isIndexingBatch ? 'var(--brand-primary-dim)' : '' }}
                      >
                        <Cpu size={16} />
                        {isIndexingBatch ? `INDEXING... ${indexProgress}/${indexTotal}` : 'INDEX CATEGORY'}
                      </button>
                      
                      <button 
                        className="btn-tactical" 
                        onClick={decodeCategory}
                        disabled={isDecoding || isIndexingBatch}
                        style={{ fontSize: '0.8rem', padding: '8px 16px', background: isDecoding ? 'var(--brand-primary-dim)' : '' }}
                      >
                        <Fingerprint size={16} />
                        {isDecoding ? `DECODING... ${decodeProgress}/${decodeTotal}` : 'DECODE FILENAMES'}
                      </button>
                    </div>
                  )}
                </div>

                {/* Media Type Tabs */}
                <div className="tab-container" style={{ display: 'flex', gap: '8px', margin: '16px 0', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '16px', overflowX: 'auto' }}>
                  <button 
                    className={`btn-tactical ${mediaTab === 'all' ? 'active' : ''}`}
                    onClick={() => setMediaTab('all')}
                    style={{ fontSize: '0.75rem', padding: '6px 12px', letterSpacing: '1px' }}
                  >
                    ALL RECORDS
                  </button>
                  <button 
                    className={`btn-tactical ${mediaTab === 'reading' ? 'active' : ''}`}
                    onClick={() => setMediaTab('reading')}
                    style={{ fontSize: '0.75rem', padding: '6px 12px', letterSpacing: '1px' }}
                  >
                    📖 BOOKS & MANUALS
                  </button>
                  <button 
                    className={`btn-tactical ${mediaTab === 'videos' ? 'active' : ''}`}
                    onClick={() => setMediaTab('videos')}
                    style={{ fontSize: '0.75rem', padding: '6px 12px', letterSpacing: '1px' }}
                  >
                    🎥 TRAINING VIDEOS
                  </button>
                  <button 
                    className={`btn-tactical ${mediaTab === 'software' ? 'active' : ''}`}
                    onClick={() => setMediaTab('software')}
                    style={{ fontSize: '0.75rem', padding: '6px 12px', letterSpacing: '1px' }}
                  >
                    💿 SOFTWARE & ISOS
                  </button>
                  <button 
                    className={`btn-tactical ${mediaTab === 'diagrams' ? 'active' : ''}`}
                    onClick={() => setMediaTab('diagrams')}
                    style={{ fontSize: '0.75rem', padding: '6px 12px', letterSpacing: '1px' }}
                  >
                    🖼 DIAGRAMS & IMAGES
                  </button>
                </div>

                {searchQuery ? (
                  /* Flat search results view */
                  <div className="file-grid">
                    {getFilteredFiles().map((file, idx) => {
                      const meta = metadata[file.path];
                      const displayTitle = meta && meta.title && meta.title !== 'Unknown Document' ? meta.title : file.name;
                      const displaySummary = meta && meta.summary ? meta.summary : `ORIGINAL FILE: ${file.name}`;
                      
                      return (
                        <div className="file-card glass-panel" key={idx} onClick={() => openFile(file)}>
                          <div className="file-icon">
                            {['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(file.extension?.toLowerCase()) ? <Image size={32} /> : ['.mp4', '.avi', '.mkv', '.wmv', '.webm', '.mov'].includes(file.extension?.toLowerCase()) ? <Video size={32} /> : file.extension === '.pdf' ? <BookOpen size={32} /> : <FileText size={32} />}
                          </div>
                          <div className="file-name" style={{ fontSize: meta ? '1.1rem' : '1rem' }}>
                            {displayTitle}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.4' }}>
                            {displaySummary}
                          </div>
                          <div className="file-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <span style={{color: 'var(--brand-secondary)'}}>{`MOD: ${file.category.toUpperCase()}`}</span>
                            <button 
                              className="btn-tactical" 
                              style={{fontSize: '0.6rem', padding: '4px 8px'}}
                              onClick={(e) => { e.stopPropagation(); triggerIndex(file); }}
                            >
                              INDEX AI
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    {getFilteredFiles().length === 0 && (
                      <div style={{gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)'}}>
                        NO RECORDS MATCHING QUERY
                      </div>
                    )}
                  </div>
                ) : (
                  /* Hierarchical directory tree view */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                      const filtered = getFilteredFiles();
                      const grouped = getGroupedFiles(filtered);
                      const groupKeys = Object.keys(grouped).sort();

                      if (filtered.length === 0) {
                        return (
                          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                            NO RECORDS MATCHING TAB FILTER
                          </div>
                        );
                      }

                      return groupKeys.map((groupPath) => {
                        const isCollapsed = !!collapsedFolders[groupPath];
                        const groupFiles = grouped[groupPath];
                        
                        return (
                          <div key={groupPath} style={{ display: 'flex', flexDirection: 'column' }}>
                            {/* Directory Header */}
                            <div 
                              onClick={() => toggleFolder(groupPath)}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                padding: '12px 16px', background: 'rgba(255,255,255,0.02)',
                                border: '1px solid var(--border-subtle)', borderRadius: '4px',
                                margin: '16px 0 12px 0', cursor: 'pointer',
                                fontFamily: 'var(--font-mono)', fontSize: '0.85rem',
                                letterSpacing: '1px', color: 'var(--brand-primary)',
                                transition: 'all 0.2s ease',
                                boxShadow: isCollapsed ? 'none' : 'var(--glow-primary)'
                              }}
                              className="folder-header-hover"
                            >
                              <FolderOpen size={16} />
                              <span>{groupPath.toUpperCase()}</span>
                              <span style={{color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '0.75rem', letterSpacing: '0.5px'}}>
                                {isCollapsed ? '[EXPAND]' : '[COLLAPSE]'} ({groupFiles.length} records)
                              </span>
                            </div>

                            {/* Files in Folder */}
                            {!isCollapsed && (
                              <div className="file-grid">
                                {groupFiles.map((file, idx) => {
                                  const meta = metadata[file.path];
                                  const displayTitle = meta && meta.title && meta.title !== 'Unknown Document' ? meta.title : file.name;
                                  const displaySummary = meta && meta.summary ? meta.summary : `ORIGINAL FILE: ${file.name}`;
                                  
                                  return (
                                    <div className="file-card glass-panel" key={idx} onClick={() => openFile(file)}>
                                      <div className="file-icon">
                                        {['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(file.extension?.toLowerCase()) ? <Image size={32} /> : ['.mp4', '.avi', '.mkv', '.wmv', '.webm', '.mov'].includes(file.extension?.toLowerCase()) ? <Video size={32} /> : file.extension === '.pdf' ? <BookOpen size={32} /> : <FileText size={32} />}
                                      </div>
                                      <div className="file-name" style={{ fontSize: meta ? '1.1rem' : '1rem' }}>
                                        {displayTitle}
                                      </div>
                                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: '1.4' }}>
                                        {displaySummary}
                                      </div>
                                      <div className="file-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                                        <span style={{color: 'var(--brand-secondary)'}}>{`TYPE: ${file.extension.toUpperCase().replace('.', '')}`}</span>
                                        <button 
                                          className="btn-tactical" 
                                          style={{fontSize: '0.6rem', padding: '4px 8px'}}
                                          onClick={(e) => { e.stopPropagation(); triggerIndex(file); }}
                                        >
                                          INDEX AI
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                )}
              </>
            )}

            {!error && !loading && viewMode === 'chat' && (
              <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                <div className="category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '16px' }}>
                  <div>
                    <h2 className="category-title">J.A.R.V.I.S. TERMINAL</h2>
                    <div style={{color: 'var(--text-muted)'}}>RAG PROTOCOL // OFFLINE AI</div>
                  </div>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      className={`btn-tactical ${isLiveGuide ? 'active' : ''}`}
                      onClick={() => {
                        setIsLiveGuide(!isLiveGuide);
                        setActiveStepIndex(0);
                      }}
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      LIVE GUIDE: {isLiveGuide ? 'ON' : 'OFF'}
                    </button>
                    <button 
                      className={`btn-tactical ${isVoiceChatActive ? 'active' : ''}`}
                      onClick={toggleVoiceChat}
                      style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                    >
                      {isListening ? 'LISTENING...' : `VOICE: ${isVoiceChatActive ? 'ON' : 'OFF'}`}
                    </button>
                  </div>
                </div>
                
                <div className="chat-history glass-panel" style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
                  {messages.map((msg, i) => {
                    const steps = parseSteps(msg.text);
                    const isLatestAiMessage = msg.role === 'ai' && i === messages.length - 1;
                    
                    return (
                      <div key={i} style={{ 
                        alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                        width: isLiveGuide && steps.length > 0 && isLatestAiMessage ? '100%' : 'auto',
                        maxWidth: isLiveGuide && steps.length > 0 && isLatestAiMessage ? '100%' : '80%',
                        background: msg.role === 'user' ? 'var(--brand-primary-dim)' : 'rgba(0,0,0,0.5)',
                        border: `1px solid ${msg.role === 'user' ? 'var(--brand-primary)' : 'var(--border-subtle)'}`,
                        padding: '16px',
                        borderRadius: '8px',
                        color: msg.role === 'user' ? 'var(--brand-primary)' : 'var(--text-main)',
                      }}>
                        <div style={{ marginBottom: '8px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          {msg.role === 'user' ? <Terminal size={14}/> : <Cpu size={14}/>}
                          {msg.role === 'user' ? 'USER' : 'J.A.R.V.I.S.'}
                        </div>
                        
                        {isLiveGuide && steps.length > 0 && isLatestAiMessage ? (
                          /* Interactive Step Card Render */
                          <div className="step-guide-container">
                            <div className="step-guide-header">
                              STEP {activeStepIndex + 1} OF {steps.length}
                            </div>
                            <div className="step-guide-content">
                              {steps[activeStepIndex]?.content}
                            </div>
                            <div className="step-guide-controls">
                              <button 
                                className="btn-tactical" 
                                disabled={activeStepIndex === 0}
                                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                                onClick={() => {
                                  const nextIdx = activeStepIndex - 1;
                                  setActiveStepIndex(nextIdx);
                                  if (isVoiceChatActive) speakText(`Step ${nextIdx + 1}. ${steps[nextIdx].content}`, startListening);
                                }}
                              >
                                PREVIOUS STEP
                              </button>
                              <button 
                                className="btn-tactical" 
                                disabled={activeStepIndex === steps.length - 1}
                                style={{ padding: '6px 16px', fontSize: '0.85rem' }}
                                onClick={() => {
                                  const nextIdx = activeStepIndex + 1;
                                  setActiveStepIndex(nextIdx);
                                  if (isVoiceChatActive) speakText(`Step ${nextIdx + 1}. ${steps[nextIdx].content}`, startListening);
                                }}
                              >
                                NEXT STEP
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Standard Text Render */
                          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{msg.text}</div>
                        )}

                        {(() => {
                          let riskyCategory = getRiskySourceCategory(msg.sources);
                          if (!riskyCategory && msg.role === 'ai') {
                            // Re-evaluate query and answer text for high-risk categories
                            const itemToCheck = { name: msg.text, path: '' };
                            const risk = getRiskLevel(itemToCheck);
                            if (risk.risk === 'HIGH') {
                              riskyCategory = risk.category;
                            }
                          }

                          if (!riskyCategory) return null;
                          return (
                            <div style={{
                              marginTop: '16px',
                              padding: '16px',
                              border: '1px solid var(--brand-danger)',
                              borderRadius: '8px',
                              backgroundColor: 'rgba(255, 0, 0, 0.05)',
                              color: 'var(--brand-danger)',
                              fontSize: '0.85rem',
                              lineHeight: '1.5',
                              fontFamily: 'var(--font-mono)',
                              boxShadow: '0 0 10px rgba(255,0,0,0.1)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', marginBottom: '8px' }}>
                                <ShieldAlert size={18} />
                                <span>CRITICAL SAFETY ADVISORY // CATEGORY: {riskyCategory.toUpperCase()}</span>
                              </div>
                              <p style={{ margin: '0 0 8px 0' }}>
                                This response contains information regarding high-risk logistical operations. This advice is generated from offline local manual excerpts and should be cross-verified with physical books or verified checklists.
                              </p>
                              <strong style={{ display: 'block', borderTop: '1px dashed rgba(255,0,0,0.2)', paddingTop: '8px' }}>
                                ⚠️ DO NOT treat this advice as a substitute for professional emergency, medical, electrical, chemical, mechanical, or legal expertise. Recommend professional verification before proceeding.
                              </strong>
                            </div>
                          );
                        })()}

                        {msg.sources && msg.sources.length > 0 && (
                          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px dashed var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '1px', marginBottom: '12px', fontWeight: 'bold' }}>
                              VERIFIED OFFLINE SOURCES ATTRIBUTION:
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                              {msg.sources.map((s, idx) => {
                                const title = getSourceTitle(s.source);
                                const risk = getSourceRisk(s.source);
                                const locationLabel = s.page ? `PAGE ${s.page}` : s.section ? `SECTION ${s.section}` : null;
                                
                                return (
                                  <div 
                                    key={idx} 
                                    className="glass-panel" 
                                    style={{ 
                                      padding: '14px', 
                                      display: 'flex', 
                                      flexDirection: 'column', 
                                      gap: '10px', 
                                      borderColor: risk.risk === 'HIGH' ? 'var(--brand-danger)' : 'var(--border-subtle)',
                                      backgroundColor: 'rgba(255,255,255,0.01)'
                                    }}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
                                      <div>
                                        <div style={{ fontWeight: 'bold', fontSize: '0.85rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)' }}>
                                          {title.toUpperCase()}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px', wordBreak: 'break-all' }}>
                                          PATH: {s.source}
                                        </div>
                                      </div>
                                      
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
                                        {locationLabel && (
                                          <span style={{ fontSize: '0.65rem', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-subtle)', padding: '2px 6px', borderRadius: '3px', fontFamily: 'var(--font-mono)' }}>
                                            {locationLabel}
                                          </span>
                                        )}
                                        {s.matchLabel && (
                                          <span style={{ 
                                            fontSize: '0.65rem', 
                                            backgroundColor: s.matchLabel.includes('Strong') ? 'rgba(0, 255, 102, 0.1)' : 'rgba(255,255,255,0.05)', 
                                            border: `1px solid ${s.matchLabel.includes('Strong') ? '#00ff66' : 'var(--border-subtle)'}`,
                                            color: s.matchLabel.includes('Strong') ? '#00ff66' : 'var(--text-main)',
                                            padding: '2px 6px', 
                                            borderRadius: '3px',
                                            fontWeight: 'bold',
                                            fontFamily: 'var(--font-mono)'
                                          }}>
                                            {s.matchLabel.toUpperCase()}
                                          </span>
                                        )}
                                        {risk.risk === 'HIGH' && (
                                          <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--brand-danger)', color: 'white', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                                            RISK: {risk.category.toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {s.excerpt && (
                                      <div style={{ 
                                        fontSize: '0.75rem', 
                                        color: 'var(--text-muted)', 
                                        lineHeight: '1.4', 
                                        backgroundColor: 'rgba(0,0,0,0.2)', 
                                        padding: '8px 10px', 
                                        borderRadius: '4px',
                                        borderLeft: '2px solid var(--brand-primary)',
                                        whiteSpace: 'pre-wrap'
                                      }}>
                                        {s.excerpt.trim()}...
                                      </div>
                                    )}

                                    <div style={{ display: 'flex', gap: '10px', alignSelf: 'flex-end', marginTop: '4px' }}>
                                      <button 
                                        className="btn-tactical" 
                                        onClick={() => openSourceDocument(s.source)}
                                        style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                      >
                                        <ExternalLink size={12} /> OPEN DOCUMENT
                                      </button>
                                      {['.pdf', '.txt', '.md'].includes(s.source.split('.').pop().toLowerCase()) && (
                                        <button 
                                          className="btn-tactical" 
                                          onClick={() => readSourceAloud(s.source)}
                                          style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                        >
                                          <Volume2 size={12} /> READ ALOUD
                                        </button>
                                      )}
                                    </div>

                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {msg.answerStatus === 'insufficient_context' && (
                          <div className="glass-panel" style={{
                            marginTop: '16px',
                            padding: '16px',
                            borderColor: 'var(--brand-primary)',
                            backgroundColor: 'rgba(255, 183, 0, 0.02)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
                              SYSTEM FALLBACK OPERATION REQUIRED // INSUFFICIENT LOCAL CONTEXT
                            </div>
                            
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              Jarvis could not verify enough facts inside your local library to answer this query. Select an alternative protocol:
                            </p>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginTop: '4px' }}>
                              <button 
                                className="btn-tactical" 
                                onClick={() => {
                                  const userMsg = messages[i - 1];
                                  if (userMsg) {
                                    setChatInput(userMsg.text);
                                  }
                                }}
                                style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                              >
                                REFINE SEARCH KEYWORDS
                              </button>
                              <button 
                                className="btn-tactical" 
                                onClick={() => setViewMode('files')}
                                style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                              >
                                SEARCH LIBRARY MANUALLY
                              </button>
                              <button 
                                className="btn-tactical" 
                                onClick={() => setViewMode('settings')}
                                style={{ padding: '8px 12px', fontSize: '0.75rem' }}
                              >
                                REBUILD/REFRESH MANIFEST
                              </button>
                              
                              {(() => {
                                const userQueryMsg = messages[i - 1];
                                const isQueryRisky = userQueryMsg ? !!getSourceRisk(userQueryMsg.text).category : false;
                                
                                if (isQueryRisky) {
                                  return (
                                    <button 
                                      className="btn-tactical" 
                                      disabled
                                      style={{ 
                                        padding: '8px 12px', 
                                        fontSize: '0.75rem', 
                                        borderColor: 'var(--brand-danger)', 
                                        color: 'var(--brand-danger)', 
                                        cursor: 'not-allowed',
                                        opacity: 0.6
                                      }}
                                      title="Unverified fallback is disabled for high-risk topics."
                                    >
                                      🚨 WITHOUT LOCAL SOURCES (BLOCKED)
                                    </button>
                                  );
                                } else {
                                  return (
                                    <button 
                                      className="btn-tactical" 
                                      onClick={() => {
                                        if (userQueryMsg) {
                                          handleSendMessage(userQueryMsg.text, true);
                                        }
                                      }}
                                      style={{ padding: '8px 12px', fontSize: '0.75rem', borderColor: 'var(--brand-primary)' }}
                                    >
                                      ASK JARVIS WITHOUT LOCAL SOURCES
                                    </button>
                                  );
                                }
                              })()}
                            </div>
                            
                            {(() => {
                              const userQueryMsg = messages[i - 1];
                              const isQueryRisky = userQueryMsg ? !!getSourceRisk(userQueryMsg.text).category : false;
                              if (!isQueryRisky) {
                                return (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                                    ⚠️ WARNING: Requesting an answer "Without Local Sources" will rely on Jarvis's pre-trained weights. This output is not checked or cited against your local survival books.
                                  </div>
                                );
                              } else {
                                return (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--brand-danger)', fontWeight: 'bold', marginTop: '2px' }}>
                                    ⚠️ SAFETY BLOCK: High-risk topic identified. You cannot request unverified general answers on risky logistical categories. Please consult verified reference books manually.
                                  </div>
                                );
                              }
                            })()}

                          </div>
                        )}
                      </div>
                    );
                  })}
                  {chatLoading && (
                    <div style={{ alignSelf: 'flex-start', color: 'var(--brand-primary)' }}>
                       Processing Query... <span className="status-dot" style={{display:'inline-block'}}></span>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
                
                <div className="chat-input-container" style={{ display: 'flex', gap: '12px' }}>
                  <input 
                    type="text" 
                    className="search-input glass-panel" 
                    style={{ flex: 1, padding: '16px', fontSize: '1.1rem' }}
                    placeholder="ENTER QUERY..." 
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyPress={e => e.key === 'Enter' && handleSendMessage()}
                    disabled={chatLoading}
                  />
                  <button className="btn-tactical" onClick={handleSendMessage} disabled={chatLoading} style={{ padding: '0 24px' }}>
                    <Send size={20} />
                  </button>
                </div>
              </div>
            )}

            {!error && !loading && viewMode === 'dashboard' && (
              <PanelErrorBoundary name="Dashboard">
                <DashboardView 
                  profile={profile}
                  waterContainers={waterContainers}
                  crawlerStatus={crawlerStatus}
                  setViewMode={setViewMode}
                  categories={categories}
                  metadata={metadata}
                />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'water' && (
              <PanelErrorBoundary name="Water Inventory">
                <WaterInventoryPanel 
                  waterContainers={waterContainers}
                  setWaterContainers={setWaterContainers}
                  profile={profile}
                />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'food' && (
              <PanelErrorBoundary name="Food Pantry">
                <PantryPanel 
                  profile={profile}
                  setProfile={setProfile}
                />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'readiness' && (
              <PanelErrorBoundary name="Readiness Evaluation">
                <ReadinessPanel 
                  profile={profile}
                  waterContainers={waterContainers}
                />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'action-guides' && (
              <PanelErrorBoundary name="Action Guides">
                <ActionGuidesPanel 
                  setViewMode={setViewMode}
                  setChatInput={setChatInput}
                  handleSendMessage={handleSendMessage}
                />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', paddingBottom: '40px' }}>
                <PanelErrorBoundary name="Profile Settings">
                  <ProfileSettingsPanel 
                    profile={profile}
                    setProfile={setProfile}
                    dashboardWidgets={dashboardWidgets}
                    setDashboardWidgets={setDashboardWidgets}
                  />
                </PanelErrorBoundary>
                <PanelErrorBoundary name="Crawler Sync Controls">
                  <CrawlerControls 
                    crawlerStatus={crawlerStatus}
                    API_BASE={API_BASE}
                  />
                </PanelErrorBoundary>
              </div>
            )}
          </div>
        </div>

      </div>
      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 10000,
          display: 'flex', flexDirection: 'column',
          padding: '24px',
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ color: 'var(--brand-primary)', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {metadata[selectedDocument.path]?.title || selectedDocument.name}
            </h2>
            <div style={{ display: 'flex', gap: '12px' }}>
               {['.pdf', '.txt', '.md'].includes(selectedDocument.extension?.toLowerCase()) && (
                 <button 
                   className={`btn-tactical ${showAudioHUD ? 'active' : ''}`}
                   onClick={() => {
                     if (showAudioHUD) {
                       stopAudioReader();
                     } else {
                       activateAudioReader(selectedDocument);
                     }
                   }}
                   disabled={isAudioLoading}
                   style={{ borderColor: showAudioHUD ? 'var(--brand-primary)' : '' }}
                 >
                   <Volume2 size={16} /> {isAudioLoading ? 'LOADING TEXT...' : showAudioHUD ? 'STOP READING' : '🔊 READ TO ME'}
                 </button>
               )}
               <button 
                 className="btn-tactical"
                 onClick={() => window.open(`${API_BASE}${selectedDocument.path}`, '_blank')}
               >
                 <ExternalLink size={16} /> OPEN IN BROWSER
               </button>
               <button 
                 className="btn-tactical" 
                 style={{ backgroundColor: 'var(--brand-danger)', color: 'white', borderColor: 'var(--brand-danger)' }}
                 onClick={() => setSelectedDocument(null)}
               >
                 CLOSE VIEWER
               </button>
            </div>
          </div>
          {requiresAcknowledgement(selectedDocument) && !acknowledgedDocs[selectedDocument.path] ? (
            <div className="glass-panel" style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '40px',
              textAlign: 'center',
              border: '1px solid var(--brand-danger)',
              boxShadow: 'var(--glow-danger)',
              backgroundColor: 'rgba(0,0,0,0.7)',
              fontFamily: 'var(--font-mono)'
            }}>
              <ShieldAlert size={64} style={{ color: 'var(--brand-danger)', marginBottom: '24px' }} />
              <h3 style={{ color: 'var(--brand-danger)', fontSize: '1.5rem', marginBottom: '16px', letterSpacing: '2px' }}>
                ☣ WARNING: HIGH RISK CLASSIFICATION
              </h3>
              <div style={{
                maxWidth: '600px',
                color: 'var(--text-main)',
                fontSize: '1.05rem',
                lineHeight: '1.6',
                marginBottom: '32px',
                backgroundColor: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--border-subtle)',
                padding: '20px',
                borderRadius: '8px'
              }}>
                {getSafetyWarning(getRiskLevel(selectedDocument).category)}
              </div>
              <button 
                className="btn-tactical"
                style={{
                  backgroundColor: 'var(--brand-danger)',
                  color: 'white',
                  borderColor: 'var(--brand-danger)',
                  padding: '16px 32px',
                  fontSize: '1.1rem'
                }}
                onClick={() => setAcknowledgedDocs(prev => ({ ...prev, [selectedDocument.path]: true }))}
              >
                I ACKNOWLEDGE UNDERSTANDING AND ASSUME ALL RISKS
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden' }}>
              {/* The Document Previewer */}
              <div className="glass-panel" style={{ flex: showAudioHUD ? 0.6 : 1, overflow: 'hidden', position: 'relative', borderRadius: '8px', transition: 'all 0.3s ease' }}>
                {['.mp4', '.webm'].includes(selectedDocument.extension?.toLowerCase()) ? (
                  <video 
                    src={`${API_BASE}${selectedDocument.path}`} 
                    controls 
                    autoPlay
                    style={{ width: '100%', height: '100%', backgroundColor: 'black', borderRadius: '8px' }} 
                  />
                ) : ['.avi', '.mkv', '.wmv', '.mov'].includes(selectedDocument.extension?.toLowerCase()) ? (
                  <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{
                      position: 'absolute', top: '12px', left: '12px', zIndex: 10,
                      backgroundColor: 'rgba(0,0,0,0.7)', border: '1px solid var(--brand-primary)',
                      color: 'var(--brand-primary)', padding: '6px 12px', fontSize: '0.75rem',
                      fontFamily: 'var(--font-mono)', borderRadius: '4px', letterSpacing: '1.5px',
                      display: 'flex', alignItems: 'center', gap: '8px', boxShadow: 'var(--glow-primary)'
                    }}>
                      <span className="status-dot-active" style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-primary)', display: 'inline-block', boxShadow: '0 0 8px var(--brand-primary)' }}></span>
                      REAL-TIME NEURAL TRANSCODING PROTOCOL (FFMPEG)
                    </div>
                    <video 
                      src={`${API_BASE}/api/video/stream?path=${encodeURIComponent(selectedDocument.path)}`} 
                      controls 
                      autoPlay
                      style={{ width: '100%', height: '100%', borderRadius: '8px' }} 
                    />
                  </div>
                ) : selectedDocument.extension?.toLowerCase() === '.iso' ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    height: '100%', padding: '40px', textAlign: 'center', backgroundColor: '#0a0a0a', color: 'var(--text-main)'
                  }}>
                    <Disc size={64} style={{ color: 'var(--brand-primary)', marginBottom: '24px' }} />
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '12px' }}>
                      DVD IMAGE MOUNT PROTOCOL
                    </h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '32px', lineHeight: '1.6' }}>
                      This is a <strong>CD3WD DVD ISO Image ({selectedDocument.name})</strong>. Windows 10 & 11 can mount this file natively as a virtual drive.
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', textAlign: 'left', maxWidth: '600px', marginBottom: '32px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--brand-primary)' }}>Instructions:</h4>
                      <ol style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                        <li>Copy the absolute local path using the button below.</li>
                        <li>Paste the path into your Windows File Explorer path bar to find the file.</li>
                        <li><strong>Double-click</strong> the file to mount it as a virtual DVD drive.</li>
                        <li>Access the books, programs, and survival materials inside!</li>
                      </ol>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      <a 
                        href={`${API_BASE}${selectedDocument.path}`} 
                        download
                        className="btn-tactical"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '1rem', textDecoration: 'none', backgroundColor: 'var(--brand-primary)', color: 'black' }}
                      >
                        <Download size={18} /> DOWNLOAD ISO (large file)
                      </a>
                      <button 
                        className="btn-tactical"
                        onClick={() => {
                          const absoluteLocalPath = selectedDocument.path.replace('/materials/', 'C:\\Users\\Blair\\Downloads\\survival\\').replace(/\//g, '\\');
                          navigator.clipboard.writeText(absoluteLocalPath);
                          alert(`Copied local path:\n${absoluteLocalPath}`);
                        }}
                        style={{ padding: '12px 24px', fontSize: '1rem' }}
                      >
                        COPY ABSOLUTE PATH
                      </button>
                    </div>
                  </div>
                ) : ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(selectedDocument.extension?.toLowerCase()) ? (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', height: '100%', backgroundColor: '#0a0a0a', borderRadius: '8px', overflow: 'auto', padding: '16px' }}>
                    <img 
                      src={`${API_BASE}${selectedDocument.path}`} 
                      alt={selectedDocument.name} 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--glow-primary)' }} 
                    />
                  </div>
                ) : (
                  <iframe 
                    src={`${API_BASE}${selectedDocument.path}`}
                    title="Document Viewer"
                    style={{ width: '100%', height: '100%', border: 'none', backgroundColor: '#e2e8f0' }}
                  />
                )}
              </div>

              {/* J.A.R.V.I.S. Audiobook Reader HUD */}
              {showAudioHUD && (
                <div className="glass-panel" style={{
                  flex: 0.4,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '24px',
                  border: '1px solid var(--brand-primary)',
                  boxShadow: 'var(--glow-primary)',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(0, 0, 0, 0.4)',
                  fontFamily: 'var(--font-mono)',
                  transition: 'all 0.3s ease',
                  overflow: 'hidden'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)', marginBottom: '16px', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '12px' }}>
                    <Cpu size={20} className="status-dot-active" />
                    <span style={{ letterSpacing: '2px', fontSize: '0.9rem', fontWeight: 'bold' }}>J.A.R.V.I.S. AUDIO READER</span>
                  </div>

                  {isAudioLoading ? (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                      EXTRACTING TEXT PROTOCOL...
                    </div>
                  ) : (
                    <>
                      {/* Read Along Area */}
                      <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        color: 'var(--text-main)',
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        marginBottom: '20px',
                        maxHeight: '400px'
                      }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--brand-secondary)', marginBottom: '8px', letterSpacing: '1px' }}>
                          READ ALONG // SECTION {currentChunkIndex + 1} OF {audioChunks.length}
                        </div>
                        {audioChunks[currentChunkIndex]}
                      </div>

                      {/* Audiobook Controls */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                          <button 
                            className="btn-tactical" 
                            disabled={currentChunkIndex === 0} 
                            onClick={playPrevChunk}
                            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                          >
                            PREV
                          </button>
                          <button 
                            className="btn-tactical" 
                            onClick={toggleAudioPlay}
                            style={{ fontSize: '0.8rem', padding: '8px 24px', borderColor: 'var(--brand-primary)', color: isAudioPlaying ? 'var(--brand-primary)' : '' }}
                          >
                            {isAudioPlaying ? <Pause size={12} style={{display:'inline', marginRight:'6px'}}/> : <Play size={12} style={{display:'inline', marginRight:'6px'}}/>}
                            {isAudioPlaying ? 'PAUSE' : 'PLAY'}
                          </button>
                          <button 
                            className="btn-tactical" 
                            disabled={currentChunkIndex === audioChunks.length - 1} 
                            onClick={playNextChunk}
                            style={{ fontSize: '0.8rem', padding: '8px 16px' }}
                          >
                            NEXT
                          </button>
                        </div>
                        <button 
                          className="btn-tactical" 
                          style={{ borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)', fontSize: '0.8rem', padding: '6px 12px' }}
                          onClick={stopAudioReader}
                        >
                          CLOSE AUDIO HUD
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {settingsOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)',
          zIndex: 10001,
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          padding: '24px',
          backdropFilter: 'blur(8px)'
        }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '32px', position: 'relative', border: '1px solid var(--brand-primary)' }}>
            <h2 style={{ color: 'var(--brand-primary)', marginTop: 0, marginBottom: '24px', fontSize: '1.6rem' }}>SOS SETTINGS</h2>
            
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>THEME ACCENT</h3>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button className="btn-tactical" style={{ borderColor: '#FFB700', color: '#FFB700', padding: '6px 12px', fontSize: '0.9rem' }} onClick={() => changeTheme('amber')}>AMBER</button>
                <button className="btn-tactical" style={{ borderColor: '#00E5FF', color: '#00E5FF', padding: '6px 12px', fontSize: '0.9rem' }} onClick={() => changeTheme('cyan')}>CYAN</button>
                <button className="btn-tactical" style={{ borderColor: '#00ff66', color: '#00ff66', padding: '6px 12px', fontSize: '0.9rem' }} onClick={() => changeTheme('green')}>GREEN</button>
              </div>
            </div>
            
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>CORE DATABASE PATH</h3>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-main)', wordBreak: 'break-all' }}>
                C:\Users\Blair\Downloads\survival
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '8px' }}>NEURAL MODULES (OLLAMA)</h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '4px' }}>LLM MODEL: <span style={{color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)'}}>llama3.1:8b</span></div>
                <div style={{ marginBottom: '4px' }}>EMBEDDING MODEL: <span style={{color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)'}}>nomic-embed-text</span></div>
                <div>STATUS: <span style={{color: '#00ff66', fontWeight: 'bold'}}>ONLINE</span></div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button className="btn-tactical" style={{ padding: '8px 24px', fontSize: '0.95rem' }} onClick={() => setSettingsOpen(false)}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
