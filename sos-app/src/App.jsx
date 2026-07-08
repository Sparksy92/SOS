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
  Database,
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
  AlertTriangle,
  FileSpreadsheet,
  Square,
  Compass,
  ShieldCheck
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

import {
  addSavedAnswer,
  addSavedSource,
  addFieldNote,
  loadSavedAnswers,
  loadSavedSources,
  loadFieldNotes
} from './modules/session/sessionStore.js';
import NotesReportsPanel from './components/reports/NotesReportsPanel.jsx';
import RiskSaveConfirmation from './components/common/RiskSaveConfirmation.jsx';
import FieldNoteEditor from './components/notes/FieldNoteEditor.jsx';
import MissionModePanel from './components/missions/MissionModePanel.jsx';
import MissionJarvisContextPanel from './components/missions/MissionJarvisContextPanel.jsx';
import IndexIntegrityPanel from './components/library/IndexIntegrityPanel.jsx';
import { 
  loadActiveMission, saveActiveMission, updateMission, addMissionTimelineEvent,
  attachSavedAnswerToMission, attachSavedSourceToMission, attachFieldNoteToMission
} from './modules/missions/missionStore.js';
import { addSourceToReviewQueue, loadSourceReviewQueue } from './modules/search/sourceReviewQueueStore.js';
import { 
  detectMissionIntakeIntent, 
  startMissionIntake, 
  getMissionIntakeQuestions, 
  updateMissionIntakeDraft, 
  buildMissionDraftFromIntake, 
  validateMissionDraft, 
  convertMissionDraftToMission 
} from './modules/missions/missionIntake.js';
import { buildMissionBrief } from './modules/missions/missionBriefing.js';


import DashboardView from './components/dashboard/DashboardView.jsx';
import WaterInventoryPanel from './components/water/WaterInventoryPanel.jsx';
import PantryPanel from './components/food/PantryPanel.jsx';
import ReadinessPanel from './components/readiness/ReadinessPanel.jsx';
import ActionGuidesPanel from './components/actions/ActionGuidesPanel.jsx';
import ProfileSettingsPanel from './components/settings/ProfileSettingsPanel.jsx';
import CrawlerControls from './components/crawler/CrawlerControls.jsx';
import PanelErrorBoundary from './components/common/PanelErrorBoundary.jsx';
import SetupWizardPanel from './components/toolkit/SetupWizardPanel.jsx';
import OfflineToolkitPanel from './components/toolkit/OfflineToolkitPanel.jsx';
import ContentProviderRegistryPanel from './components/toolkit/ContentProviderRegistryPanel.jsx';
import ContentGapAnalyzerPanel from './components/toolkit/ContentGapAnalyzerPanel.jsx';
import ZimCatalogPanel from './components/toolkit/ZimCatalogPanel.jsx';
import ManualImportQueuePanel from './components/toolkit/ManualImportQueuePanel.jsx';
import ImportApprovalLedgerPanel from './components/toolkit/ImportApprovalLedgerPanel.jsx';
import AcquisitionQueuePanel from './components/toolkit/AcquisitionQueuePanel.jsx';
import SourceAllowlistPanel from './components/toolkit/SourceAllowlistPanel.jsx';
import LibraryLifecyclePanel from './components/toolkit/LibraryLifecyclePanel.jsx';
import OfflineToolkitBackupPanel from './components/toolkit/OfflineToolkitBackupPanel.jsx';
import LocalReleaseCandidatePanel from './components/release/LocalReleaseCandidatePanel.jsx';
import { loadSetupProgress, DEFAULT_STEPS } from './modules/toolkit/setupProgressStore.js';
import { loadLedger } from './modules/toolkit/importApprovalLedgerStore.js';
import { loadQueue } from './modules/toolkit/acquisitionQueueStore.js';
import { loadAllowlist } from './modules/toolkit/sourceAllowlistStore.js';
import { computeLifecycleRecords } from './modules/toolkit/libraryLifecycleAnalyzer.js';
import { createOfflineToolkitBackup, runOfflineToolkitIntegrityAudit } from './modules/toolkit/offlineToolkitBackupStore.js';

const API_BASE = window.location.port === '3001' ? '' : `http://${window.location.hostname}:3001`;

const encodePath = (pathString) => {
  if (!pathString) return '';
  return pathString.split('/').map(segment => encodeURIComponent(segment)).join('/');
};

function App() {
  const [categories, setCategories] = useState({});
  const [metadata, setMetadata] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  
  // J.A.R.V.I.S. Voice Settings State
  const [voiceSettings, setVoiceSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('sos-voice-settings');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      voiceURI: '',
      rate: 1.05,
      pitch: 0.95
    };
  });

  useEffect(() => {
    localStorage.setItem('sos-voice-settings', JSON.stringify(voiceSettings));
  }, [voiceSettings]);

  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('dashboard'); // 'dashboard', 'files', 'chat', 'water', 'food', 'readiness', 'action-guides', 'settings'
  const [activeMission, setActiveMission] = useState(() => loadActiveMission());
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

  // Mission Intake State
  const [intakeState, setIntakeState] = useState({
    active: false,
    intentType: null,
    startedAt: null,
    currentQuestionIndex: 0,
    answers: {},
    draftMission: null
  });

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
  const speechQueue = useRef([]);
  const isSpeaking = useRef(false);

  // Decoding state
  const [isDecoding, setIsDecoding] = useState(false);
  const [decodeProgress, setDecodeProgress] = useState(0);
  const [decodeTotal, setDecodeTotal] = useState(0);

  // Batch Index state
  const [isIndexingBatch, setIsIndexingBatch] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexTotal, setIndexTotal] = useState(0);

  // Toolkit Sub-tab State
  const [toolkitSubTab, setToolkitSubTab] = useState('wizard');

  // In-App Viewer state
  const [selectedDocument, setSelectedDocument] = useState(null);

  // Crawler status state
  const [crawlerStatus, setCrawlerStatus] = useState(null);

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Phase 5 Notes & Reports States
  const [pendingSaveAction, setPendingSaveAction] = useState(null);
  const [pendingSaveRiskCategory, setPendingSaveRiskCategory] = useState(null);
  const [noteEditorPrefill, setNoteEditorPrefill] = useState(null);
  const [noteEditorOpen, setNoteEditorOpen] = useState(false);
  const [reportBuilderOpenDirect, setReportBuilderOpenDirect] = useState(false);

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

  const executeSaveAnswer = (msg, index) => {
    const userQuery = index > 0 ? messages[index - 1]?.text : 'User Query';
    addSavedAnswer({
      title: msg.text.substring(0, 40) + '...',
      relatedQuestion: userQuery || 'User Query',
      relatedAnswerStatus: msg.answerStatus || 'verified_local',
      riskCategory: getRiskySourceCategory(msg.sources) || getRiskLevel({ name: msg.text, path: '' }).category,
      body: msg.text,
      content: msg.text,
      tags: ['jarvis']
    });
    alert("Answer saved successfully!");
  };

  const handleSaveAnswer = (msg, index, navigateToReportsAfter = false) => {
    const riskCat = getRiskySourceCategory(msg.sources) || getRiskLevel({ name: msg.text, path: '' }).category;
    const actionObj = {
      actionType: navigateToReportsAfter ? 'save_answer_add_to_report' : 'save_answer',
      riskCategory: riskCat,
      execute: () => {
        executeSaveAnswer(msg, index);
        if (navigateToReportsAfter) {
          setViewMode('reports-panel');
        }
      }
    };

    if (riskCat) {
      setPendingSaveRiskCategory(riskCat);
      setPendingSaveAction(actionObj);
    } else {
      actionObj.execute();
    }
  };

  const executeSaveSources = (sourcesList) => {
    sourcesList.forEach(s => {
      addSavedSource({
        source: s.source || s.documentPath,
        title: getSourceTitle(s.source || s.documentPath),
        page: s.page || null,
        section: s.section || null,
        matchLabel: s.matchLabel || 'Related',
        riskCategory: s.riskCategory || null,
        excerpt: s.excerpt || ''
      });
    });
    alert(`Saved ${sourcesList.length} source references!`);
  };

  const handleSaveSources = (sourcesList, navigateToReportsAfter = false) => {
    let riskCat = null;
    for (const s of sourcesList) {
      if (s.riskCategory) {
        riskCat = s.riskCategory;
        break;
      }
    }

    const actionObj = {
      actionType: navigateToReportsAfter ? 'save_sources_add_to_report' : 'save_sources',
      riskCategory: riskCat,
      execute: () => {
        executeSaveSources(sourcesList);
        if (navigateToReportsAfter) {
          setViewMode('reports-panel');
        }
      }
    };

    if (riskCat) {
      setPendingSaveRiskCategory(riskCat);
      setPendingSaveAction(actionObj);
    } else {
      actionObj.execute();
    }
  };

  const handleCreateFieldNoteFromMsg = (msg, index) => {
    const userQuery = index > 0 ? messages[index - 1]?.text : '';
    const riskCat = getRiskySourceCategory(msg.sources) || getRiskLevel({ name: msg.text, path: '' }).category;
    
    const prefill = {
      title: `Observation on ${userQuery.substring(0, 30)}`,
      noteType: 'research note',
      riskCategory: riskCat || '',
      body: `Jarvis Response Excerpt:\n"${msg.text.substring(0, 300)}..."`,
      relatedSourcePaths: msg.sources?.map(s => s.source).join(', ') || '',
      relatedJarvisAnswer: msg.text
    };

    setNoteEditorPrefill(prefill);
    setNoteEditorOpen(true);
  };

  const handleAttachAnswerToMission = (msg, index) => {
    if (!activeMission) return;
    const riskCat = getRiskySourceCategory(msg.sources) || getRiskLevel({ name: msg.text, path: '' }).category;
    
    const attachAction = () => {
      const userQuery = index > 0 ? messages[index - 1]?.text : 'User Query';
      const newItem = addSavedAnswer({
        title: msg.text.substring(0, 40) + '...',
        relatedQuestion: userQuery || 'User Query',
        relatedAnswerStatus: msg.answerStatus || 'verified_local',
        riskCategory: riskCat,
        body: msg.text,
        content: msg.text,
        tags: ['jarvis']
      });
      attachSavedAnswerToMission(activeMission.id, newItem.id);
      setActiveMission(loadActiveMission());
      alert("Answer saved and attached to active mission!");
    };

    if (riskCat) {
      setPendingSaveRiskCategory(riskCat);
      setPendingSaveAction({
        actionType: 'attach_answer_to_mission',
        riskCategory: riskCat,
        execute: attachAction
      });
    } else {
      attachAction();
    }
  };

  const handleAttachSourcesToMission = (sourcesList) => {
    if (!activeMission) return;

    let riskCat = null;
    for (const s of sourcesList) {
      if (s.riskCategory) {
        riskCat = s.riskCategory;
        break;
      }
    }

    const attachAction = () => {
      sourcesList.forEach(s => {
        const newItem = addSavedSource({
          source: s.source || s.documentPath,
          title: getSourceTitle(s.source || s.documentPath),
          page: s.page || null,
          section: s.section || null,
          matchLabel: s.matchLabel || 'Related',
          riskCategory: s.riskCategory || null,
          excerpt: s.excerpt || ''
        });
        attachSavedSourceToMission(activeMission.id, newItem.id);
      });
      setActiveMission(loadActiveMission());
      alert(`Saved and attached ${sourcesList.length} sources to active mission!`);
    };

    if (riskCat) {
      setPendingSaveRiskCategory(riskCat);
      setPendingSaveAction({
        actionType: 'attach_sources_to_mission',
        riskCategory: riskCat,
        execute: attachAction
      });
    } else {
      attachAction();
    }
  };

  const handleCreateMissionFieldNote = (msg, index) => {
    if (!activeMission) return;
    const userQuery = index > 0 ? messages[index - 1]?.text : '';
    const riskCat = getRiskySourceCategory(msg.sources) || getRiskLevel({ name: msg.text, path: '' }).category;
    
    const prefill = {
      title: `Observation on ${userQuery.substring(0, 30)}`,
      noteType: 'research note',
      riskCategory: riskCat || '',
      body: `Jarvis Response Excerpt:\n"${msg.text.substring(0, 300)}..."`,
      relatedSourcePaths: msg.sources?.map(s => s.source).join(', ') || '',
      relatedJarvisAnswer: msg.text,
      missionId: activeMission.id
    };

    setNoteEditorPrefill(prefill);
    setNoteEditorOpen(true);
  };

  const handleQueueSourceFromCard = (s) => {
    if (!activeMission) return;
    const queuedItem = addSourceToReviewQueue({
      missionId: activeMission.id,
      sourcePath: s.source || s.documentPath,
      title: getSourceTitle(s.source || s.documentPath),
      reason: s.matchLabel || 'Related source reference from Jarvis chat',
      riskCategory: s.riskCategory || null,
      status: 'queued'
    });
    if (queuedItem) {
      addMissionTimelineEvent(activeMission.id, {
        type: 'source_queued',
        label: `Source queued for review from chat: "${getSourceTitle(s.source || s.documentPath)}"`,
        details: { sourcePath: s.source || s.documentPath }
      });
      setActiveMission(loadActiveMission());
      alert(`Source queued for review!`);
    } else {
      alert("This source is already in the review queue for this mission.");
    }
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
    setActiveMission(loadActiveMission());
  }, [viewMode]);

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

    // Pre-warm SpeechSynthesis voice cache on boot
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
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

  const getCurrentDirectoryFilesAndFolders = (filesList) => {
    const foldersSet = new Set();
    const immediateFiles = [];

    filesList.forEach(f => {
      const subdirs = f.subdirectories || [];
      
      let prefixMatch = true;
      for (let i = 0; i < currentPath.length; i++) {
        if (subdirs[i] !== currentPath[i]) {
          prefixMatch = false;
          break;
        }
      }

      if (prefixMatch) {
        if (subdirs.length === currentPath.length) {
          immediateFiles.push(f);
        } else if (subdirs.length > currentPath.length) {
          foldersSet.add(subdirs[currentPath.length]);
        }
      }
    });

    const immediateFolders = Array.from(foldersSet).sort();
    return { folders: immediateFolders, files: immediateFiles };
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
      if (
        metadata[file.path] && 
        metadata[file.path].title !== "Unknown Document" && 
        metadata[file.path].title !== "Error decoding" && 
        !metadata[file.path].summary?.startsWith("Error") &&
        !metadata[file.path].summary?.startsWith("No text")
      ) {
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
    if (!text) {
      if (onEndCallback) onEndCallback();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    let selectedVoice = null;
    if (voiceSettings.voiceURI) {
      selectedVoice = voices.find(v => v.voiceURI === voiceSettings.voiceURI);
    }
    
    if (!selectedVoice) {
      selectedVoice = voices.find(v => v.lang.replace('_', '-').startsWith('en-GB') && (
                        v.name.toLowerCase().includes('male') || 
                        v.name.toLowerCase().includes('george') || 
                        v.name.toLowerCase().includes('oliver') ||
                        v.name.toLowerCase().includes('harry')
                      )) || 
                      voices.find(v => v.lang.replace('_', '-').startsWith('en-GB') && 
                        !v.name.toLowerCase().includes('female') && 
                        !v.name.toLowerCase().includes('hazel') && 
                        !v.name.toLowerCase().includes('susan')
                      ) || 
                      voices.find(v => v.lang.replace('_', '-').startsWith('en-GB')) || 
                      voices.find(v => v.lang.startsWith('en'));
    }
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;
    
    if (onEndCallback) {
      utterance.onend = onEndCallback;
    }
    
    utterance.onerror = (e) => {
      console.warn("Speech synthesis error:", e);
      if (onEndCallback) onEndCallback();
    };
    
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

    const lowercaseMsg = textToSend.toLowerCase().trim();

    // 1. Intercept Cancel command at any point during intake
    if (intakeState.active && (lowercaseMsg === 'cancel' || lowercaseMsg === 'abort')) {
      setIntakeState({
        active: false,
        intentType: null,
        startedAt: null,
        currentQuestionIndex: 0,
        answers: {},
        draftMission: null
      });
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Mission planning intake has been cancelled and reset.'
      }]);
      setChatLoading(false);
      return;
    }

    // 2. Intercept Intake Active State responses
    if (intakeState.active) {
      // If we are at the approval stage (draft is ready)
      if (intakeState.draftMission) {
        if (lowercaseMsg === 'yes' || lowercaseMsg === 'create' || lowercaseMsg === 'approve') {
          // Convert draft and save mission
          const finalMission = convertMissionDraftToMission(intakeState.draftMission);
          
          // Save active mission locally
          setActiveMission(finalMission);
          saveActiveMission(finalMission);

          // Trigger a local storage custom event so other views update
          window.dispatchEvent(new Event('storage'));

          setIntakeState({
            active: false,
            intentType: null,
            startedAt: null,
            currentQuestionIndex: 0,
            answers: {},
            draftMission: null
          });

          setMessages(prev => [...prev, {
            role: 'ai',
            text: `Mission "${finalMission.title}" created successfully! I have initialized the checkpoints and safety directives. You can manage it now in the Field Mode tab.`
          }]);
          setChatLoading(false);
          return;
        } else if (lowercaseMsg === 'no' || lowercaseMsg === 'deny') {
          setIntakeState({
            active: false,
            intentType: null,
            startedAt: null,
            currentQuestionIndex: 0,
            answers: {},
            draftMission: null
          });
          setMessages(prev => [...prev, {
            role: 'ai',
            text: 'Mission creation aborted. Stored nothing.'
          }]);
          setChatLoading(false);
          return;
        } else {
          setMessages(prev => [...prev, {
            role: 'ai',
            text: 'I did not catch that. Do you want me to create this mission? (Type YES to approve, or CANCEL to abort)'
          }]);
          setChatLoading(false);
          return;
        }
      }

      // We are answering a question
      const updatedState = { ...intakeState };
      updateMissionIntakeDraft(updatedState, textToSend);

      if (updatedState.draftMission) {
        // Draft is ready! Present it for approval.
        const draft = updatedState.draftMission;
        let draftText = `Based on your responses, I have prepared a draft mission profile:\n\n`;
        draftText += `**Draft Mission:** ${draft.title}\n`;
        draftText += `**Type:** ${draft.missionType?.toUpperCase()}\n`;
        draftText += `**Overview:** ${draft.overview}\n\n`;
        
        draftText += `**Suggested Objectives:**\n`;
        draft.objectives.forEach(obj => {
          draftText += `- ${obj.label}\n`;
        });
        
        draftText += `\n**Suggested Logistics Checklist:**\n`;
        draft.checklist.forEach(t => {
          draftText += `- [ ] ${t.label}\n`;
        });

        draftText += `\nDo you want me to create this mission? (Type YES to approve, or CANCEL to abort)`;

        setIntakeState(updatedState);
        setMessages(prev => [...prev, {
          role: 'ai',
          text: draftText
        }]);
        setChatLoading(false);
        return;
      } else {
        // Ask the next question
        const questions = getMissionIntakeQuestions(updatedState.intentType);
        const nextQ = questions[updatedState.currentQuestionIndex];
        
        setIntakeState(updatedState);
        setMessages(prev => [...prev, {
          role: 'ai',
          text: nextQ.text
        }]);
        setChatLoading(false);
        return;
      }
    }

    // 2B. Intercept Offline Readiness Queries
    if (
      lowercaseMsg === 'offline readiness checklist' || 
      lowercaseMsg === 'help me get ready for offline use' || 
      lowercaseMsg === 'what offline tools should i set up?' ||
      lowercaseMsg === 'show my offline toolkit status'
    ) {
      const progress = loadSetupProgress();
      const stepsKeys = Object.keys(DEFAULT_STEPS);
      const totalSteps = stepsKeys.length;
      const completedCount = Object.values(progress).filter(Boolean).length;
      const pct = Math.round((completedCount / totalSteps) * 100);

      let text = `### **OFFLINE READINESS CHECKLIST**\n`;
      text += `Current status: **${pct}% Prepared** (${completedCount} of ${totalSteps} verified)\n\n`;

      stepsKeys.forEach(key => {
        const step = DEFAULT_STEPS[key];
        const isDone = progress[step.id] === true;
        text += `${isDone ? '✓' : '✗'} **Step ${step.id}:** ${step.label}\n`;
      });

      text += `\n*Note:* You can view comprehensive manual setup guides, platform notes, and verify these steps in the **OFFLINE TOOLKIT** panel in the sidebar. Let me know if you would like guidance on a specific tool!`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what content am i missing?') {
      let text = `### **Offline Content Gaps**\n`;
      text += `Based on the latest reference catalog audit, your local library is missing manual content across all 7 survival categories:\n\n`;
      text += `1. **Homesteading** (0 of 2 candidates found)\n`;
      text += `2. **Farming** (0 of 1 candidates found)\n`;
      text += `3. **General Survival** (0 of 2 candidates found)\n`;
      text += `4. **Water** (0 of 1 candidates found)\n`;
      text += `5. **Bushcraft** (0 of 1 candidates found)\n`;
      text += `6. **Shelter** (0 of 1 candidates found)\n`;
      text += `7. **Medical Reference** (0 of 3 candidates found)\n\n`;
      text += `*Recommendation:* Open the **Gap Analyzer** tab under the **OFFLINE TOOLKIT** to view approved public domain download sources (e.g. *US Army Survival Manual FM 21-76*) and restricted reviews. Always review licenses manually; the audit itself does not guarantee copyright clearance.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'do i have offline maps ready?') {
      const progress = loadSetupProgress();
      const isMapVerified = progress["9"] === true;
      let text = `### **Offline Maps Status**\n`;
      text += `Step 9 of the Setup Wizard: *'Confirm offline maps prepared externally'* is currently **${isMapVerified ? 'VERIFIED ✓' : 'NOT YET VERIFIED ✗'}**.\n\n`;
      text += `For offline navigation and manual position awareness, we recommend downloading OsmAnd or Organic Maps on your mobile device. Open the **Tool Guides** tab inside the **OFFLINE TOOLKIT** for step-by-step preparation checklists and official links.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'do i have kiwix set up?') {
      const progress = loadSetupProgress();
      const isKiwixVerified = progress["10"] === true;
      let text = `### **Kiwix / ZIM Setup Status**\n`;
      text += `Step 10 of the Setup Wizard: *'Confirm Kiwix/ZIM library availability'* is currently **${isKiwixVerified ? 'VERIFIED ✓' : 'NOT YET VERIFIED ✗'}**.\n\n`;
      text += `Kiwix permits reading compressed encyclopedia ZIM packages offline. You can configure and scan ZIM archive directories metadata under the **ZIM Catalog** tab in the **OFFLINE TOOLKIT** view. J.A.R.V.I.S. checks metadata only and does not index ZIM binary contents directly.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'how do i import new files safely?') {
      let text = `### **Safe Manual Import Guidelines**\n`;
      text += `To import documents without compromising SurvivalOS boundaries, follow this local-first workflow:\n\n`;
      text += `1. Place raw files manually in the gitignored \`import-staging/offline-library/\` directory.\n`;
      text += `2. Go to the **Manual Import** tab in the **OFFLINE TOOLKIT** to inspect staging file metadata, license clearances, and safety risk warnings.\n`;
      text += `3. Copy the vetted files manually from the staging area into your configured materials directory.\n`;
      text += `4. Rebuild your manifest by visiting the **Index Integrity** view to scan and index the new files.\n\n`;
      text += `*Note:* Dismissing files in the Manual Import UI only clears them from the staging list view; it never deletes files from disk.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (
      lowercaseMsg === 'is survivalos ready?' ||
      lowercaseMsg === 'run release check' ||
      lowercaseMsg === 'show release readiness' ||
      lowercaseMsg === 'how do i start survivalos?' ||
      lowercaseMsg === 'what should i do first?' ||
      lowercaseMsg === 'how do i troubleshoot survivalos?' ||
      lowercaseMsg === 'is my local setup healthy?'
    ) {
      let text = `### **SurvivalOS Release Candidate Readiness**\n\n`;
      text += `Open RELEASE CHECK to verify backend, materials, index, toolkit state, and backup status.\n`;
      text += `Start the backend and frontend using the commands in the README.\n`;
      text += `Create a local JSON backup before major changes.\n\n`;
      text += `*Safety Policy:* J.A.R.V.I.S. runs local health checks only. I do not automatically fix your setup, scan your drive, upload logs, sync data to a cloud, download libraries, or index files in the background without explicit manual instruction.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what imports need review?') {
      const ledger = loadLedger();
      const pending = ledger.filter(r => r.operatorDecision === 'pending');
      let text = `### **Imports Pending Operator Review**\n`;
      text += `You have **${pending.length}** pending review records in your local ledger.\n\n`;
      if (pending.length > 0) {
        pending.forEach((r, i) => {
          text += `${i + 1}. **${r.filename}** (Staged: ${r.detectedCategory.replace(/_/g, ' ')})\n`;
        });
        text += `\n*Action:* Open the **Approval Ledger** tab inside the **OFFLINE TOOLKIT** to review manually.`;
      } else {
        text += `All currently registered ledger entries have been reviewed. Use the **Manual Import** tab to log reviews for new files.`;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'show my approval ledger') {
      const ledger = loadLedger();
      const count = { pending: 0, approved: 0, rejected: 0, needs_more_evidence: 0 };
      ledger.forEach(r => {
        if (count[r.operatorDecision] !== undefined) count[r.operatorDecision]++;
      });
      let text = `### **Operator Approval Ledger Summary**\n`;
      text += `Current local governance status:\n\n`;
      text += `*   **Approved:** ${count.approved} records\n`;
      text += `*   **Pending Review:** ${count.pending} records\n`;
      text += `*   **Rejected:** ${count.rejected} records\n`;
      text += `*   **Needs Evidence:** ${count.needs_more_evidence} records\n\n`;
      text += `*Note:* Ledger records represent operator review decisions only; it does not claim legal copyright clearance. Open the **Approval Ledger** tab to inspect, export, or import backups.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what references are approved?') {
      const ledger = loadLedger();
      const approved = ledger.filter(r => r.operatorDecision === 'approved');
      let text = `### **Operator-Approved References**\n`;
      if (approved.length > 0) {
        text += `The following references have an operator-approved ledger record exists:\n\n`;
        approved.forEach((r, i) => {
          text += `${i + 1}. **${r.filename}** (${r.detectedCategory.replace(/_/g, ' ')})\n`;
        });
        text += `\n*Note:* This indicates subjective operator evaluation decisions only; it does not claim legal copyright clearance.`;
      } else {
        text += `No files are marked as approved in your local ledger.`;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what references are rejected?') {
      const ledger = loadLedger();
      const rejected = ledger.filter(r => r.operatorDecision === 'rejected');
      let text = `### **Operator-Rejected References**\n`;
      if (rejected.length > 0) {
        text += `The following references are rejected by the operator:\n\n`;
        rejected.forEach((r, i) => {
          text += `${i + 1}. **${r.filename}** (Reason/Evidence: *${r.licenseEvidence || 'None'}*)\n`;
        });
      } else {
        text += `No files are marked as rejected in your local ledger.`;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what needs license evidence?') {
      const ledger = loadLedger();
      const needs = ledger.filter(r => r.operatorDecision === 'needs_more_evidence' || !r.licenseEvidence);
      let text = `### **References Requiring License Evidence**\n`;
      if (needs.length > 0) {
        text += `The following records still need license evidence or official source verification:\n\n`;
        needs.forEach((r, i) => {
          text += `${i + 1}. **${r.filename}** (Decision: *${r.operatorDecision.replace(/_/g, ' ').toUpperCase()}*)\n`;
        });
        text += `\n*Action:* Open the **Approval Ledger** tab to specify official source URLs and authority evidence notes.`;
      } else {
        text += `All recorded ledger entries have license evidence logged.`;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'can i import this file?') {
      let text = `### **Evaluating Import Feasibility**\n`;
      text += `To verify if a new file conforms to SurvivalOS library governance standards, follow these guidelines:\n\n`;
      text += `1. Place the file manually inside \`import-staging/offline-library/\`.\n`;
      text += `2. Open the **Manual Import** tab to inspect file properties and metadata classifications.\n`;
      text += `3. Click **Create Review Record** to copy metadata into your local governance ledger.\n`;
      text += `4. Audit the file source URL and license status manually, then update the record in the **Approval Ledger** tab.\n`;
      text += `5. If approved, copy the file to your materials library and rebuild the manifest.\n\n`;
      text += `*Boundary Check:* SurvivalOS never automates downloads, moves files, indexes content automatically, or clears legal copyrights.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what is in my acquisition queue?') {
      const queue = loadQueue();
      const planned = queue.filter(q => q.acquisitionStatus === 'planned');
      let text = `### **Acquisition Queue Status**\n`;
      text += `You have **${planned.length}** planned acquisition records.\n\n`;
      if (planned.length > 0) {
        planned.forEach((q, i) => {
          text += `${i + 1}. **${q.title}** (File Hint: \`${q.filenameHint || 'N/A'}\`)\n`;
        });
      }
      text += `\nOpen the **Acquisition Queue** tab to update status.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what sources are allowlisted?' || lowercaseMsg === 'show my source allowlist') {
      const list = loadAllowlist();
      let text = `### **Source Allowlist Registry**\n`;
      text += `You have **${list.length}** sources allowlisted.\n\n`;
      if (list.length > 0) {
        list.forEach((l, i) => {
          const trusted = l.operatorTrusted ? 'Trusted' : 'Not Trusted';
          text += `${i + 1}. **${l.label}** (${l.sourceType.toUpperCase()} — *${trusted}*)\n`;
        });
      }
      text += `\nOpen the **Source Allowlist** tab to inspect, add, or trust sources manually.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what should i acquire next?') {
      const queue = loadQueue();
      const planned = queue.filter(q => q.acquisitionStatus === 'planned');
      let text = `### **Next Planned Acquisition Candidates**\n`;
      if (planned.length > 0) {
        text += `The following items are planned next in your queue:\n\n`;
        planned.forEach((q, i) => {
          text += `${i + 1}. **${q.title}** (File Hint: \`${q.filenameHint || 'N/A'}\`)\n`;
        });
        text += `\nOpen the **Acquisition Queue** tab to copy official source URLs or edit statuses.`;
      } else {
        text += `No items are currently marked as planned in your queue. Go to the **Gap Analyzer** tab to find candidates and add them to your queue.`;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what items are manually acquired?') {
      const queue = loadQueue();
      const acquired = queue.filter(q => q.acquisitionStatus === 'manually_acquired');
      let text = `### **Manually Acquired Reference Items**\n`;
      text += `You have **${acquired.length}** items marked manually acquired.\n\n`;
      if (acquired.length > 0) {
        acquired.forEach((q, i) => {
          text += `${i + 1}. **${q.title}**\n`;
        });
      }
      text += `\nOpen the **Acquisition Queue** tab to update status.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what items are manually staged?') {
      const queue = loadQueue();
      const staged = queue.filter(q => q.acquisitionStatus === 'manually_staged');
      let text = `### **Manually Staged Candidates**\n`;
      text += `You have **${staged.length}** items marked manually staged.\n\n`;
      if (staged.length > 0) {
        staged.forEach((q, i) => {
          text += `${i + 1}. **${q.title}**\n`;
        });
      }
      text += `\nOpen the **Acquisition Queue** tab to update status.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (lowercaseMsg === 'what acquisition items are blocked?') {
      const queue = loadQueue();
      const blocked = queue.filter(q => q.acquisitionStatus === 'blocked');
      let text = `### **Blocked Acquisition Items**\n`;
      text += `You have **${blocked.length}** items marked blocked.\n\n`;
      if (blocked.length > 0) {
        blocked.forEach((q, i) => {
          text += `${i + 1}. **${q.title}**\n`;
        });
      }
      text += `\nOpen the **Acquisition Queue** tab to update status.`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (
      lowercaseMsg === 'show my library lifecycle' ||
      lowercaseMsg === 'what references are stuck?' ||
      lowercaseMsg === 'what references need evidence?' ||
      lowercaseMsg === 'what references are ready to index?' ||
      lowercaseMsg === 'what references are staged but not indexed?' ||
      lowercaseMsg === 'what references are blocked or rejected?' ||
      lowercaseMsg === 'what should i do next for my library?'
    ) {
      const ledger = loadLedger();
      const queue = loadQueue();
      const allowlist = loadAllowlist();
      const lifeRecords = computeLifecycleRecords(GAP_ANALYSIS_DATA, ledger, queue, allowlist, [], {});
      
      let text = '';
      if (lowercaseMsg === 'show my library lifecycle') {
        text = `### **Library Lifecycle Reconciliation Summary**\n`;
        text += `Total dynamic lifecycle records tracked: **${lifeRecords.length}**\n\n`;
        text += `- **Pending approval review**: ${lifeRecords.filter(r => r.ledgerStatus === 'pending').length}\n`;
        text += `- **Planned acquisition**: ${lifeRecords.filter(r => r.queueStatus === 'planned').length}\n`;
        text += `- **Manually acquired/staged**: ${lifeRecords.filter(r => r.queueStatus === 'manually_acquired' || r.queueStatus === 'manually_staged' || r.stagingStatus === 'staged_metadata_only').length}\n`;
        text += `- **Blocked or Rejected**: ${lifeRecords.filter(r => r.lifecycleStage === 'blocked' || r.lifecycleStage === 'rejected').length}\n\n`;
        text += `Open the **Lifecycle** tab to review details and export reports.`;
      } else if (lowercaseMsg === 'what references are stuck?') {
        const stuck = lifeRecords.filter(r => r.lifecycleStage === 'blocked' || r.lifecycleStage === 'rejected' || r.evidenceStatus === 'missing');
        text = `### **Stuck or Blocked References**\n`;
        if (stuck.length > 0) {
          text += `The following references are blocked, rejected, or missing critical evidence:\n\n`;
          stuck.forEach((r, i) => {
            text += `${i + 1}. **${r.title}** (Stage: *${r.lifecycleStage.toUpperCase()}*, Evidence: *${r.evidenceStatus.toUpperCase()}*)\n`;
          });
        } else {
          text += `No references are currently blocked, rejected, or missing evidence.`;
        }
        text += `\nOpen the **Lifecycle** tab to review next steps.`;
      } else if (lowercaseMsg === 'what references need evidence?') {
        const needs = lifeRecords.filter(r => r.evidenceStatus === 'missing');
        text = `### **References Requiring Source/License Evidence**\n`;
        if (needs.length > 0) {
          text += `The following references need official source URLs or license authority evidence:\n\n`;
          needs.forEach((r, i) => {
            text += `${i + 1}. **${r.title}** (Status: *${r.ledgerStatus.toUpperCase()}*)\n`;
          });
        } else {
          text += `All analyzed library entries have some source or license evidence logged.`;
        }
        text += `\nOpen the **Lifecycle** tab to review next steps.`;
      } else if (lowercaseMsg === 'what references are ready to index?') {
        const ready = lifeRecords.filter(r => r.lifecycleStage === 'in_materials' && r.indexStatus !== 'indexed');
        text = `### **References Ready for Manual Indexing**\n`;
        if (ready.length > 0) {
          text += `The following references are present in materials but not yet indexed:\n\n`;
          ready.forEach((r, i) => {
            text += `${i + 1}. **${r.title}** (Filename: \`${r.filenameHint}\`)\n`;
          });
          text += `\n*Action:* Open the **Index Integrity** dashboard to run manual document indexing.`;
        } else {
          text += `No references are currently waiting for indexing.`;
        }
      } else if (lowercaseMsg === 'what references are staged but not indexed?') {
        const stagedNotIndexed = lifeRecords.filter(r => r.lifecycleStage === 'staged' && r.indexStatus !== 'indexed');
        text = `### **Staged but Not Indexed References**\n`;
        if (stagedNotIndexed.length > 0) {
          text += `The following references are manually staged but not yet indexed/in materials:\n\n`;
          stagedNotIndexed.forEach((r, i) => {
            text += `${i + 1}. **${r.title}** (File: \`${r.filenameHint}\`)\n`;
          });
        } else {
          text += `No references are currently staged but not indexed.`;
        }
        text += `\nOpen the **Lifecycle** tab to review next steps.`;
      } else if (lowercaseMsg === 'what references are blocked or rejected?') {
        const blockedRecs = lifeRecords.filter(r => r.lifecycleStage === 'blocked' || r.lifecycleStage === 'rejected');
        text = `### **Blocked or Rejected Library Entries**\n`;
        if (blockedRecs.length > 0) {
          text += `The following entries have been blocked or rejected by operator decision:\n\n`;
          blockedRecs.forEach((r, i) => {
            text += `${i + 1}. **${r.title}** (Status: *${r.lifecycleStage.toUpperCase()}*)\n`;
          });
        } else {
          text += `No entries are currently blocked or rejected.`;
        }
        text += `\nOpen the **Lifecycle** tab to review next steps.`;
      } else if (lowercaseMsg === 'what should i do next for my library?') {
        text = `### **Recommended Next Steps for Library Growth**\n`;
        const pending = lifeRecords.filter(r => r.ledgerStatus === 'pending');
        const plannedRecs = lifeRecords.filter(r => r.queueStatus === 'planned');
        const stagedRecs = lifeRecords.filter(r => r.lifecycleStage === 'staged');
        
        if (pending.length > 0) {
          text += `- You have **${pending.length}** records pending approval review. Complete operator reviews in the **Approval Ledger**.\n`;
        }
        if (plannedRecs.length > 0) {
          text += `- You have **${plannedRecs.length}** planned acquisition records. Manually acquire them from official sources outside SOS.\n`;
        }
        if (stagedRecs.length > 0) {
          text += `- You have **${stagedRecs.length}** manually staged candidates. Verify metadata and manually copy them to materials if appropriate.\n`;
        }
        if (pending.length === 0 && plannedRecs.length === 0 && stagedRecs.length === 0) {
          text += `Your library lifecycle states are reconciled and up to date!`;
        }
        text += `\nOpen the **Lifecycle** tab to review all recommended actions.`;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    if (
      lowercaseMsg === 'backup my offline toolkit' ||
      lowercaseMsg === 'show backup status' ||
      lowercaseMsg === 'run toolkit integrity audit' ||
      lowercaseMsg === 'is my toolkit data safe?' ||
      lowercaseMsg === 'what would be included in a backup?' ||
      lowercaseMsg === 'how do i restore a toolkit backup?'
    ) {
      let text = '';
      if (lowercaseMsg === 'backup my offline toolkit') {
        text = `### **Offline Toolkit Backup Guide**\n`;
        text += `To safeguard your configurations, reviews, and mission state, you can generate a local JSON backup.\n\n`;
        text += `*Action:* Open the **Backup** tab to create a local JSON backup.`;
      } else if (lowercaseMsg === 'show backup status') {
        const backup = createOfflineToolkitBackup();
        text = `### **Local Backup Status**\n`;
        text += `Your local backup would include:\n`;
        text += `- **${backup.counts.ledgerRecords}** approval ledger records\n`;
        text += `- **${backup.counts.queueRecords}** acquisition queue items\n`;
        text += `- **${backup.counts.allowlistRecords}** allowed sources\n`;
        text += `- **${backup.counts.missions}** missions records\n\n`;
        text += `Open the **Backup** tab to create a local JSON backup.`;
      } else if (lowercaseMsg === 'run toolkit integrity audit' || lowercaseMsg === 'is my toolkit data safe?') {
        const audit = runOfflineToolkitIntegrityAudit();
        text = `### **Offline Toolkit Integrity Audit**\n`;
        text += `Current Audit Status: **${audit.status.toUpperCase()}**\n`;
        text += `Checked At: *${audit.checkedAt}*\n\n`;
        if (audit.findings.length > 0) {
          text += `**Findings:**\n`;
          audit.findings.forEach(f => {
            text += `- [${f.severity.toUpperCase()}] ${f.message}\n`;
          });
        } else {
          text += `All localStorage records are healthy.\n`;
        }
        text += `\n**Recommended Action:** ${audit.recommendedActions.join(' ')}\n`;
        text += `Open the **Backup** tab to run a full integrity audit or restore data.`;
      } else if (lowercaseMsg === 'what would be included in a backup?') {
        text = `### **Scope of Local Backups**\n`;
        text += `A local backup includes:\n`;
        text += `- Setup Wizard progress checkmarks\n`;
        text += `- Offline Toolkit checklists\n`;
        text += `- Manual Import dismissed queues\n`;
        text += `- Approval Ledger audit records\n`;
        text += `- Acquisition Queue planning items\n`;
        text += `- Source Allowlist trusted notes\n`;
        text += `- Mission Mode records, active mission status, field notes, and reports\n\n`;
        text += `*Boundary Check:* Backups never include actual material files (PDF/ZIM/EPUB), S3 cloud tokens, or filesystem directory structures.`;
      } else if (lowercaseMsg === 'how do i restore a toolkit backup?') {
        text = `### **Restoring a Toolkit Backup**\n`;
        text += `To restore local configuration data:\n\n`;
        text += `1. Open the **Backup** tab.\n`;
        text += `2. Paste your JSON backup payload into the text area.\n`;
        text += `3. Click **Preview Backup Import** to check for recognized records, missing keys, or blocked values.\n`;
        text += `4. Select **Merge records** or **Replace known keys (Overwrite)**.\n`;
        text += `5. Note that *Replace* requires typing the confirmation phrase: \`RESTORE TOOLKIT BACKUP\`.\n\n`;
        text += `*Restriction:* Restore requires operator confirmation.`;
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: text,
        answerStatus: 'offline_readiness_checklist'
      }]);
      setChatLoading(false);
      return;
    }

    // 3. Intercept Briefing request
    if (lowercaseMsg === 'mission brief' || lowercaseMsg === 'brief this mission' || lowercaseMsg === 'give me a mission brief' || lowercaseMsg === 'what is the mission status' || lowercaseMsg === 'what still needs review') {
      if (!activeMission) {
        setMessages(prev => [...prev, {
          role: 'ai',
          text: 'There is no active mission currently. Use a command like "I want to start a mission" or "I wanna go fishing" to plan one!'
        }]);
        setChatLoading(false);
        return;
      }

      // Generate brief
      const answersList = loadSavedAnswers();
      const sourcesList = loadSavedSources();
      const notesList = loadFieldNotes();
      const reviewQueue = loadSourceReviewQueue();

      const brief = buildMissionBrief(activeMission, answersList, sourcesList, notesList, reviewQueue);

      let briefText = `Based on your saved local mission data, here is the current mission brief:\n\n`;
      briefText += `### **${brief.title.toUpperCase()}**\n`;
      briefText += `* **Status:** ${brief.status.toUpperCase()}\n`;
      briefText += `* **Mission Organization Score:** ${brief.readiness.score}% (${brief.readiness.label})\n`;
      if (brief.overview) {
        briefText += `* **Overview:** ${brief.overview}\n`;
      }
      briefText += `\n`;

      if (brief.openObjectives.length > 0) {
        briefText += `**Open Objectives:**\n`;
        brief.openObjectives.forEach(o => {
          briefText += `- [ ] ${o.label}\n`;
        });
        briefText += `\n`;
      }

      if (brief.openTasks.length > 0) {
        briefText += `**Open Tasks:**\n`;
        brief.openTasks.forEach(t => {
          briefText += `- [ ] ${t.label} (${t.priority})\n`;
        });
        briefText += `\n`;
      }

      if (brief.safetyChecklist.length > 0) {
        briefText += `⚠️ **Safety Warnings & Directives:**\n`;
        brief.safetyChecklist.forEach(c => {
          briefText += `* **[${c.category.toUpperCase()}]** *Disclaimer:* ${c.warning}\n`;
          c.directives.forEach(d => {
            briefText += `  - ${d}\n`;
          });
        });
      }

      setMessages(prev => [...prev, {
        role: 'ai',
        text: briefText,
        answerStatus: 'local_mission_brief'
      }]);
      setChatLoading(false);
      return;
    }

    // 4. Intercept Intake Start
    const detectedType = detectMissionIntakeIntent(textToSend);
    if (detectedType) {
      const initialState = startMissionIntake(detectedType);
      const questions = getMissionIntakeQuestions(detectedType);
      const firstQ = questions[0];

      setIntakeState(initialState);
      
      let welcomeText = `I can help set that up as a mission. A few details first:\n\n`;
      welcomeText += `1. ${firstQ.text}`;

      setMessages(prev => [...prev, {
        role: 'ai',
        text: welcomeText
      }]);
      setChatLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: textToSend, isLiveGuide, useGeneralKnowledge })
      });

      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      
      // Initialize empty AI message in state
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: '', 
        sources: [],
        answerStatus: 'verified_local'
      }]);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      
      let fullAnswer = "";
      let answerSources = [];
      let answerStatus = "verified_local";

      // Reset speech queue variables
      speechQueue.current = [];
      isSpeaking.current = false;
      window.speechSynthesis.cancel();

      let unprocessedSpeechText = "";

      const speakNextInQueue = () => {
        if (speechQueue.current.length === 0) {
          isSpeaking.current = false;
          if (isVoiceChatActive) {
            startListening();
          }
          return;
        }
        
        isSpeaking.current = true;
        const textToSpeak = speechQueue.current.shift();
        speakText(textToSpeak, () => {
          speakNextInQueue();
        });
      };

      const processSpeechText = (textChunk, isFinal = false) => {
        if (!isVoiceChatActive) return;
        
        unprocessedSpeechText += textChunk;
        
        // Find sentence boundaries: period, question mark, exclamation, or newline
        const sentenceBoundaryRegex = /([^.!?\n]+[.!?\n]+)/g;
        let match;
        let lastIndex = 0;
        
        while ((match = sentenceBoundaryRegex.exec(unprocessedSpeechText)) !== null) {
          const sentence = match[1].trim();
          if (sentence) {
            speechQueue.current.push(sentence);
          }
          lastIndex = sentenceBoundaryRegex.lastIndex;
        }
        
        unprocessedSpeechText = unprocessedSpeechText.substring(lastIndex);
        
        if (isFinal && unprocessedSpeechText.trim()) {
          speechQueue.current.push(unprocessedSpeechText.trim());
          unprocessedSpeechText = "";
        }
        
        if (!isSpeaking.current && speechQueue.current.length > 0) {
          speakNextInQueue();
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunkText = decoder.decode(value, { stream: true });
        const lines = chunkText.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.type === 'metadata') {
                answerSources = parsed.sources;
                answerStatus = parsed.answerStatus;
              } else if (parsed.type === 'token') {
                fullAnswer += parsed.text;
                
                setMessages(prev => {
                  const copy = [...prev];
                  const last = copy[copy.length - 1];
                  last.text = fullAnswer;
                  last.sources = answerSources;
                  last.answerStatus = answerStatus;
                  return copy;
                });

                processSpeechText(parsed.text, false);
              }
            } catch (e) {
              // Ignore partial JSON chunk parse issues
            }
          }
        }
      }

      // Finalize speech queue with remaining text
      processSpeechText("", true);

      // Post-stream step initialization for Live Guide
      if (isLiveGuide) {
        const steps = parseSteps(fullAnswer);
        if (steps.length > 0) {
          setActiveStepIndex(0);
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
              className={`nav-item ${viewMode === 'field-mode' ? 'active' : ''}`}
              onClick={() => { setViewMode('field-mode'); setSidebarOpen(false); }}
            >
              <Compass size={18} className={viewMode === 'field-mode' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'field-mode' ? 'var(--brand-primary)' : ''}}>FIELD MODE</span>
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
              className={`nav-item ${viewMode === 'reports-panel' ? 'active' : ''}`}
              onClick={() => { setViewMode('reports-panel'); setSidebarOpen(false); }}
            >
              <FileSpreadsheet size={18} className={viewMode === 'reports-panel' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'reports-panel' ? 'var(--brand-primary)' : ''}}>NOTES / REPORTS</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'offline-toolkit' ? 'active' : ''}`}
              onClick={() => { setViewMode('offline-toolkit'); setSidebarOpen(false); }}
            >
              <CheckSquare size={18} className={viewMode === 'offline-toolkit' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'offline-toolkit' ? 'var(--brand-primary)' : ''}}>OFFLINE TOOLKIT</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'settings' ? 'active' : ''}`}
              onClick={() => { setViewMode('settings'); setSidebarOpen(false); }}
            >
              <Settings size={18} className={viewMode === 'settings' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'settings' ? 'var(--brand-primary)' : ''}}>SETTINGS / PROFILE</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'index-integrity' ? 'active' : ''}`}
              onClick={() => { setViewMode('index-integrity'); setSidebarOpen(false); }}
            >
              <Database size={18} className={viewMode === 'index-integrity' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'index-integrity' ? 'var(--brand-primary)' : ''}}>INDEX INTEGRITY</span>
            </div>

            <div 
              className={`nav-item ${viewMode === 'release' ? 'active' : ''}`}
              onClick={() => { setViewMode('release'); setSidebarOpen(false); }}
            >
              <ShieldCheck size={18} className={viewMode === 'release' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'release' ? 'var(--brand-primary)' : ''}}>RELEASE CHECK</span>
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
                  onClick={() => { 
                    setActiveCategory(cat); 
                    setCurrentPath([]);
                    setSearchQuery('');
                    setViewMode('files'); 
                    setSidebarOpen(false); 
                  }}
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
            {error && viewMode !== 'release' && (
              <div className="glass-panel" style={{padding: '24px', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)'}}>
                <h2>SYSTEM OFFLINE</h2>
                <p style={{ fontWeight: 'bold' }}>Backend offline or unreachable.</p>
                <p>Start SurvivalOS using launcher.bat or start the backend manually.</p>
                <p>Open README or Operator Runbook for startup commands.</p>
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
                      const displayTitle = meta && meta.title && meta.title !== 'Unknown Document' && meta.title !== 'Error decoding' ? meta.title : file.name;
                      const displaySummary = meta && meta.summary && meta.title !== 'Error decoding' ? meta.summary : `ORIGINAL FILE: ${file.name}`;
                      
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
                  /* Hierarchical virtual directory explorer view */
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(() => {
                      const filtered = getFilteredFiles();
                      const { folders, files } = getCurrentDirectoryFilesAndFolders(filtered);

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Breadcrumbs Bar */}
                          <div className="breadcrumb-bar glass-panel" style={{
                            display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px',
                            padding: '8px 16px',
                            fontFamily: 'var(--font-mono)', fontSize: '0.8rem',
                            backgroundColor: 'rgba(255, 255, 255, 0.01)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: '8px'
                          }}>
                            <span 
                              style={{ cursor: 'pointer', color: currentPath.length === 0 ? 'var(--text-muted)' : 'var(--brand-primary)', fontWeight: 'bold' }}
                              onClick={() => setCurrentPath([])}
                            >
                              ROOT
                            </span>
                            {currentPath.map((folder, idx) => (
                              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ color: 'var(--text-muted)' }}>/</span>
                                <span 
                                  style={{ 
                                    cursor: idx === currentPath.length - 1 ? 'default' : 'pointer', 
                                    color: idx === currentPath.length - 1 ? 'var(--brand-secondary)' : 'var(--brand-primary)',
                                    fontWeight: idx === currentPath.length - 1 ? 'bold' : 'normal'
                                  }}
                                  onClick={() => {
                                    if (idx < currentPath.length - 1) {
                                      setCurrentPath(currentPath.slice(0, idx + 1));
                                    }
                                  }}
                                >
                                  {folder.toUpperCase()}
                                </span>
                              </span>
                            ))}
                          </div>

                          {/* Folders List */}
                          {folders.length > 0 && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
                                Subdirectories ({folders.length})
                              </div>
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
                                {folders.map((folderName, idx) => (
                                  <div 
                                    key={idx} 
                                    className="file-card glass-panel folder-card-hover" 
                                    onClick={() => setCurrentPath([...currentPath, folderName])}
                                    style={{ 
                                      display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px', 
                                      padding: '16px', cursor: 'pointer', transition: 'all 0.2s ease',
                                      border: '1px solid var(--border-subtle)', borderRadius: '8px'
                                    }}
                                  >
                                    <div style={{ color: 'var(--brand-primary)', display: 'flex', alignItems: 'center' }}>
                                      <FolderOpen size={24} />
                                    </div>
                                    <div style={{ fontWeight: 'bold', fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)' }}>
                                      {folderName.toUpperCase()}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Files List */}
                          <div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '12px', fontFamily: 'var(--font-mono)' }}>
                              Documents ({files.length})
                            </div>
                            {files.length > 0 ? (
                              <div className="file-grid">
                                {files.map((file, idx) => {
                                  const meta = metadata[file.path];
                                  const displayTitle = meta && meta.title && meta.title !== 'Unknown Document' && meta.title !== 'Error decoding' ? meta.title : file.name;
                                  const displaySummary = meta && meta.summary && meta.title !== 'Error decoding' ? meta.summary : `ORIGINAL FILE: ${file.name}`;
                                  
                                  // Risk indicator badge
                                  const riskBadge = file.riskCategory ? (
                                    <span style={{ 
                                      fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px',
                                      background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                                      border: '1px solid rgba(239, 68, 68, 0.2)', marginRight: '6px'
                                    }}>
                                      RISK: {file.riskCategory.toUpperCase()}
                                    </span>
                                  ) : null;
                                  
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
                                        <div style={{ display: 'flex', alignItems: 'center' }}>
                                          {riskBadge}
                                          <span style={{color: 'var(--brand-secondary)', fontSize: '0.75rem'}}>
                                            {file.extension.toUpperCase().replace('.', '')}
                                          </span>
                                        </div>
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
                            ) : (
                              folders.length === 0 && (
                                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', border: '1px dashed var(--border-subtle)', borderRadius: '8px' }}>
                                  NO RECORDS IN THIS DIRECTORY
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </>
            )}

            {!error && !loading && viewMode === 'chat' && (
              <div style={{ display: 'flex', gap: '20px', height: '100%', width: '100%', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', flex: 1, minWidth: 0 }}>
                {activeMission && (
                  <div className="glass-panel text-glow" style={{
                    padding: '8px 16px',
                    borderColor: 'var(--brand-primary)',
                    backgroundColor: 'rgba(0, 229, 255, 0.05)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '16px',
                    fontSize: '0.8rem',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    <div>
                      ⚡ <span style={{ color: 'var(--brand-primary)', fontWeight: 'bold' }}>ACTIVE FIELD MODE:</span> {activeMission.title.toUpperCase()}
                      <span style={{ marginLeft: '10px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        ({activeMission.status.toUpperCase()})
                      </span>
                    </div>
                    <button 
                      className="btn-tactical" 
                      onClick={() => setViewMode('field-mode')}
                      style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                    >
                      OPEN SESSION
                    </button>
                  </div>
                )}
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

                        {msg.role === 'ai' && (
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: '10px' }}>
                            <button 
                              className="btn-tactical" 
                              onClick={() => handleSaveAnswer(msg, i)}
                              style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                            >
                              SAVE ANSWER
                            </button>
                            {msg.sources && msg.sources.length > 0 && (
                              <button 
                                className="btn-tactical" 
                                onClick={() => handleSaveSources(msg.sources, false)}
                                style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                              >
                                SAVE SOURCES
                              </button>
                            )}
                            <button 
                              className="btn-tactical" 
                              onClick={() => handleCreateFieldNoteFromMsg(msg, i)}
                              style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                            >
                              CREATE FIELD NOTE
                            </button>
                            <button 
                              className="btn-tactical" 
                              onClick={() => handleSaveAnswer(msg, i, true)}
                              style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                            >
                              ADD TO REPORT
                            </button>

                            {/* Active Mission Integrations */}
                            {activeMission && (
                              <>
                                <button 
                                  className="btn-tactical" 
                                  onClick={() => handleAttachAnswerToMission(msg, i)}
                                  style={{ padding: '4px 10px', fontSize: '0.7rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                                >
                                  ADD ANSWER TO MISSION
                                </button>
                                {msg.sources && msg.sources.length > 0 && (
                                  <button 
                                    className="btn-tactical" 
                                    onClick={() => handleAttachSourcesToMission(msg.sources)}
                                    style={{ padding: '4px 10px', fontSize: '0.7rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                                  >
                                    ADD SOURCES TO MISSION
                                  </button>
                                )}
                                <button 
                                  className="btn-tactical" 
                                  onClick={() => handleCreateMissionFieldNote(msg, i)}
                                  style={{ padding: '4px 10px', fontSize: '0.7rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                                >
                                  CREATE MISSION NOTE
                                </button>
                              </>
                            )}
                          </div>
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
                                const riskCategory = s.riskCategory || getSourceRisk(s.source)?.category;
                                const isHighRisk = !!riskCategory;
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
                                      borderColor: isHighRisk ? 'var(--brand-danger)' : 'var(--border-subtle)',
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
                                        {isHighRisk && (
                                          <span style={{ fontSize: '0.65rem', backgroundColor: 'var(--brand-danger)', color: 'white', padding: '2px 6px', borderRadius: '3px', fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
                                            RISK: {riskCategory.toUpperCase()}
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

                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignSelf: 'flex-end', marginTop: '4px' }}>
                                       <button 
                                         className="btn-tactical" 
                                         onClick={() => openSourceDocument(s.source)}
                                         style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                       >
                                         <ExternalLink size={12} /> OPEN DOCUMENT
                                       </button>
                                       <button 
                                         className="btn-tactical" 
                                         onClick={() => handleSaveSources([s])}
                                         style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                       >
                                         SAVE SOURCE
                                       </button>
                                       <button 
                                         className="btn-tactical" 
                              onClick={() => {
                                           handleSaveSources([s]);
                                           setViewMode('reports-panel');
                                         }}
                                         style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                                       >
                                         ADD TO REPORT
                                       </button>
                                       {activeMission && (
                                         <>
                                           <button 
                                             className="btn-tactical" 
                                             onClick={() => handleAttachSourcesToMission([s])}
                                             style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: 'var(--brand-primary)', color: 'var(--brand-primary)' }}
                                           >
                                             ADD TO MISSION
                                           </button>
                                           <button 
                                             className="btn-tactical" 
                                             onClick={() => handleQueueSourceFromCard(s)}
                                             style={{ padding: '6px 12px', fontSize: '0.75rem', borderColor: '#00e5ff', color: '#00e5ff' }}
                                           >
                                             QUEUE FOR REVIEW
                                           </button>
                                         </>
                                       )}
                                       {['pdf', 'txt', 'md'].includes(s.source.split('.').pop().toLowerCase()) && (
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

                {activeMission && (
                  <MissionJarvisContextPanel 
                    mission={activeMission}
                    onSendPrompt={(pText) => {
                      setChatInput(pText);
                      handleSendMessage(pText);
                    }}
                    onOpenFieldMode={() => setViewMode('field-mode')}
                    onCreateMissionNote={() => {
                      setNoteEditorPrefill({
                        title: `Note on ${activeMission.title}`,
                        noteType: 'research note',
                        riskCategory: activeMission.riskCategory || '',
                        body: '',
                        missionId: activeMission.id
                      });
                      setNoteEditorOpen(true);
                    }}
                  />
                )}
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

            {!error && !loading && viewMode === 'field-mode' && (
              <PanelErrorBoundary name="Field Mode / Mission Control">
                <MissionModePanel 
                  callSign={profile.name || 'Operator'}
                  onSendSuggestedPrompt={(promptText) => {
                    setChatInput(promptText);
                    setViewMode('chat');
                  }}
                />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'reports-panel' && (
              <PanelErrorBoundary name="Notes and Reports">
                <NotesReportsPanel 
                  callSign={profile.name || 'Operator'}
                />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'index-integrity' && (
              <PanelErrorBoundary name="Index Integrity Auditor">
                <IndexIntegrityPanel 
                  onRefreshManifest={async () => {
                    try {
                      const res = await fetch(`http://${window.location.hostname}:3001/api/materials`);
                      const data = await res.json();
                      if (data.categories) {
                        setCategories(data.categories);
                      }
                    } catch (e) {
                      console.error("Failed refreshing manifest categories:", e);
                    }
                  }}
                />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'offline-toolkit' && (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', paddingBottom: '40px' }}>
                <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '0 24px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setToolkitSubTab('wizard')}
                    className={`btn-tactical${toolkitSubTab === 'wizard' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Setup Wizard
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('cards')}
                    className={`btn-tactical${toolkitSubTab === 'cards' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Tool Guides
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('providers')}
                    className={`btn-tactical${toolkitSubTab === 'providers' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Content Providers
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('gap')}
                    className={`btn-tactical${toolkitSubTab === 'gap' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Gap Analyzer
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('zim')}
                    className={`btn-tactical${toolkitSubTab === 'zim' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    ZIM Catalog
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('import')}
                    className={`btn-tactical${toolkitSubTab === 'import' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Manual Import
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('ledger')}
                    className={`btn-tactical${toolkitSubTab === 'ledger' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Approval Ledger
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('acq')}
                    className={`btn-tactical${toolkitSubTab === 'acq' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Acquisition Queue
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('allowlist')}
                    className={`btn-tactical${toolkitSubTab === 'allowlist' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Source Allowlist
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('lifecycle')}
                    className={`btn-tactical${toolkitSubTab === 'lifecycle' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Lifecycle
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('backup')}
                    className={`btn-tactical${toolkitSubTab === 'backup' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Backup
                  </button>
                </div>
                {toolkitSubTab === 'wizard' && (
                  <PanelErrorBoundary name="Setup Wizard">
                    <SetupWizardPanel setViewMode={setViewMode} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'cards' && (
                  <PanelErrorBoundary name="Offline Toolkit Cards">
                    <OfflineToolkitPanel />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'providers' && (
                  <PanelErrorBoundary name="Content Providers">
                    <ContentProviderRegistryPanel />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'gap' && (
                  <PanelErrorBoundary name="Gap Analyzer">
                    <ContentGapAnalyzerPanel setToolkitSubTab={setToolkitSubTab} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'zim' && (
                  <PanelErrorBoundary name="ZIM Catalog">
                    <ZimCatalogPanel />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'import' && (
                  <PanelErrorBoundary name="Manual Import">
                    <ManualImportQueuePanel setViewMode={setViewMode} setToolkitSubTab={setToolkitSubTab} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'ledger' && (
                  <PanelErrorBoundary name="Approval Ledger">
                    <ImportApprovalLedgerPanel setToolkitSubTab={setToolkitSubTab} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'acq' && (
                  <PanelErrorBoundary name="Acquisition Queue">
                    <AcquisitionQueuePanel setToolkitSubTab={setToolkitSubTab} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'allowlist' && (
                  <PanelErrorBoundary name="Source Allowlist">
                    <SourceAllowlistPanel />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'lifecycle' && (
                  <PanelErrorBoundary name="Library Lifecycle">
                    <LibraryLifecyclePanel setToolkitSubTab={setToolkitSubTab} setViewMode={setViewMode} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'backup' && (
                  <PanelErrorBoundary name="Offline Toolkit Backup">
                    <OfflineToolkitBackupPanel setToolkitSubTab={setToolkitSubTab} setViewMode={setViewMode} />
                  </PanelErrorBoundary>
                )}
              </div>
            )}

            {!error && !loading && viewMode === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', width: '100%', paddingBottom: '40px' }}>
                <PanelErrorBoundary name="Profile Settings">
                  <ProfileSettingsPanel 
                    profile={profile}
                    setProfile={setProfile}
                    dashboardWidgets={dashboardWidgets}
                    setDashboardWidgets={setDashboardWidgets}
                    voiceSettings={voiceSettings}
                    setVoiceSettings={setVoiceSettings}
                    speakText={speakText}
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

            {viewMode === 'release' && (
              <PanelErrorBoundary name="Release Diagnostics">
                <LocalReleaseCandidatePanel 
                  setViewMode={setViewMode} 
                  setToolkitSubTab={setToolkitSubTab} 
                  API_BASE={API_BASE} 
                />
              </PanelErrorBoundary>
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
                 onClick={() => window.open(`${API_BASE}${encodePath(selectedDocument.path)}`, '_blank')}
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
                    src={`${API_BASE}${encodePath(selectedDocument.path)}`} 
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
                        href={`${API_BASE}${encodePath(selectedDocument.path)}`} 
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
                      src={`${API_BASE}${encodePath(selectedDocument.path)}`} 
                      alt={selectedDocument.name} 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--glow-primary)' }} 
                    />
                  </div>
                ) : (
                  <iframe 
                    src={`${API_BASE}${encodePath(selectedDocument.path)}`}
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

      {/* Risk Save Confirmation Modal */}
      {pendingSaveAction && pendingSaveRiskCategory && (
        <RiskSaveConfirmation 
          riskCategory={pendingSaveRiskCategory}
          onCancel={() => {
            setPendingSaveAction(null);
            setPendingSaveRiskCategory(null);
          }}
          onConfirm={() => {
            if (pendingSaveAction && pendingSaveAction.execute) {
              pendingSaveAction.execute();
            } else if (typeof pendingSaveAction === 'function') {
              pendingSaveAction();
            }
            setPendingSaveAction(null);
            setPendingSaveRiskCategory(null);
          }}
        />
      )}

      {/* Field Note Editor Modal */}
      {noteEditorOpen && (
        <FieldNoteEditor 
          initialData={noteEditorPrefill}
          onCancel={() => {
            setNoteEditorOpen(false);
            setNoteEditorPrefill(null);
          }}
          onSave={(noteData) => {
            const newItem = addFieldNote(noteData);
            if (noteData.missionId) {
              attachFieldNoteToMission(noteData.missionId, newItem.id);
              setActiveMission(loadActiveMission());
            }
            alert("Field note saved successfully!");
            setNoteEditorOpen(false);
            setNoteEditorPrefill(null);
          }}
          onSaveAndAddToReport={(noteData) => {
            const newItem = addFieldNote(noteData);
            if (noteData.missionId) {
              attachFieldNoteToMission(noteData.missionId, newItem.id);
              setActiveMission(loadActiveMission());
            }
            setNoteEditorOpen(false);
            setNoteEditorPrefill(null);
            setViewMode('reports-panel');
          }}
        />
      )}
    </>
  );
}

export default App;
