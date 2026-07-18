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
  Gamepad2,
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
  ShieldCheck,
  StickyNote,
  Network,
  CheckCircle,
  Palette
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
import MissionRangerContextPanel from './components/missions/MissionRangerContextPanel.jsx';
import IndexIntegrityPanel from './components/library/IndexIntegrityPanel.jsx';
import EbgGraphPanel from './components/toolkit/EbgGraphPanel.jsx';
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
import GuidesReaderPanel from './components/toolkit/GuidesReaderPanel.jsx';
import ContentProviderRegistryPanel from './components/toolkit/ContentProviderRegistryPanel.jsx';
import ContentGapAnalyzerPanel from './components/toolkit/ContentGapAnalyzerPanel.jsx';
import ZimCatalogPanel from './components/toolkit/ZimCatalogPanel.jsx';
import ManualImportQueuePanel from './components/toolkit/ManualImportQueuePanel.jsx';
import ImportApprovalLedgerPanel from './components/toolkit/ImportApprovalLedgerPanel.jsx';
import AcquisitionQueuePanel from './components/toolkit/AcquisitionQueuePanel.jsx';
import SourceAllowlistPanel from './components/toolkit/SourceAllowlistPanel.jsx';
import LibraryLifecyclePanel from './components/toolkit/LibraryLifecyclePanel.jsx';
import OfflineToolkitBackupPanel from './components/toolkit/OfflineToolkitBackupPanel.jsx';
import TacticalMapPanel from './components/map/TacticalMapPanel.jsx';
import OfflineAppsPanel from './components/toolkit/OfflineAppsPanel.jsx';
import SolarCalculatorPanel from './components/toolkit/SolarCalculatorPanel.jsx';
import RadioCommsPanel from './components/toolkit/RadioCommsPanel.jsx';
import WeatherLoggerPanel from './components/toolkit/WeatherLoggerPanel.jsx';
import FirstAidPanel from './components/toolkit/FirstAidPanel.jsx';
import RecipePlannerPanel from './components/toolkit/RecipePlannerPanel.jsx';
import NetworkBuilderPanel from './components/toolkit/NetworkBuilderPanel.jsx';
import LocalReleaseCandidatePanel from './components/release/LocalReleaseCandidatePanel.jsx';
import { loadSetupProgress, DEFAULT_STEPS } from './modules/toolkit/setupProgressStore.js';
import { loadLedger } from './modules/toolkit/importApprovalLedgerStore.js';
import { loadQueue, saveQueueItem } from './modules/toolkit/acquisitionQueueStore.js';
import { GAP_ANALYSIS_DATA } from './modules/toolkit/gapAnalysisData.js';
import { loadAllowlist } from './modules/toolkit/sourceAllowlistStore.js';
import { computeLifecycleRecords } from './modules/toolkit/libraryLifecycleAnalyzer.js';
import { createOfflineToolkitBackup, runOfflineToolkitIntegrityAudit } from './modules/toolkit/offlineToolkitBackupStore.js';
import { API_BASE } from './config.js';

const encodePath = (pathString) => {
  if (!pathString) return '';
  return pathString.split('/').map(segment => encodeURIComponent(segment)).join('/');
};

function App() {
  const currentAudioRef = useRef(null);
  const nextAudioRef = useRef(null);

  const tourSteps = [
    {
      title: "Welcome to SurvivalOS 🚀",
      text: "This off-grid tactical dashboard is designed to manage your homestead inventory and navigate your local manual library entirely offline. Let's do a 60-second walkthrough.",
      action: () => {},
      btnText: "Start Walkthrough"
    },
    {
      title: "1. The Tactical Dashboard 📊",
      text: "Here is your central command deck. You can track food/water status, view your mission checklists, and check your System Readiness Score.",
      action: () => setViewMode('dashboard'),
      btnText: "Next Tab"
    },
    {
      title: "2. The Library Browser 📚",
      text: "Browse your directories and read books directly inside the browser. It parses PDFs, TXT, HTML, and guides your offline knowledge retrieval.",
      action: () => setViewMode('files'),
      btnText: "Next Tab"
    },
    {
      title: "3. R.A.N.G.E.R. Local AI 🤖",
      text: "Type any question in natural language. R.A.N.G.E.R. retrieves exact passages from your indexed manuals to give safe, verified offline answers with page citations.",
      action: () => setViewMode('chat'),
      btnText: "Next Tab"
    },
    {
      title: "4. System Settings & Folder Browser ⚙️",
      text: "Customize your profile and link your library folder. You can use the 'BROWSE' button to select folders directly from Windows Explorer, no coding or terminal required!",
      action: () => setViewMode('settings'),
      btnText: "Finish Tour"
    }
  ];
  const [categories, setCategories] = useState({});
  const [metadata, setMetadata] = useState({});
  
  const updateMaterialsAndCache = async (newCategories) => {
    setCategories(newCategories);
    if ('caches' in window) {
      try {
        const cache = await caches.open('sos-materials-cache');
        const materialsUrl = `${API_BASE}/api/materials`;
        const responseData = { categories: newCategories };
        const response = new Response(JSON.stringify(responseData), {
          headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(materialsUrl, response);
      } catch (e) {
        console.error("Failed to update cache:", e);
      }
    }
  };

  const [activeCategory, setActiveCategory] = useState(null);
  const [currentPath, setCurrentPath] = useState([]);
  
  // R.A.N.G.E.R. Voice Settings State
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

  const [theme, setTheme] = useState(() => localStorage.getItem('sos_theme') || 'rugged');
  const [colorMode, setColorMode] = useState(() => localStorage.getItem('sos_color_mode') || 'dark');

  useEffect(() => {
    document.body.className = `theme-${theme} mode-${colorMode}`;
    localStorage.setItem('sos_theme', theme);
    localStorage.setItem('sos_color_mode', colorMode);
  }, [theme, colorMode]);

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
  const [messages, setMessages] = useState([{ role: 'ai', text: 'R.A.N.G.E.R. (Resource And Neural Guidance Engine Responder) Protocol Online. I have access to your survival database. What do you need to know?' }]);
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
  const [viewerText, setViewerText] = useState('');
  const [viewerLoading, setViewerLoading] = useState(false);

  // Crawler status state
  const [crawlerStatus, setCrawlerStatus] = useState(null);

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Settings modal state
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('sos-theme') || 'amber');
  const [showNotepad, setShowNotepad] = useState(false);
  const [notepadText, setNotepadText] = useState(() => localStorage.getItem('sos_quick_notes') || '');
  const [docStatus, setDocStatus] = useState(null);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [readingProgress, setReadingProgress] = useState({ currentPage: 0, totalPages: 0 });
  const [simpleMode, setSimpleMode] = useState(() => {
    const val = localStorage.getItem('sos_simple_mode');
    return val === null ? true : val === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sos_simple_mode', simpleMode);
  }, [simpleMode]);

  const [tourStep, setTourStep] = useState(null);

  useEffect(() => {
    const tourCompleted = localStorage.getItem('sos_tour_completed');
    if (!tourCompleted) {
      setTourStep(0);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('sos_quick_notes', notepadText);
  }, [notepadText]);

  useEffect(() => {
    if (selectedDocument) {
      try {
        const queue = loadQueue();
        const existing = queue.find(q => q.filePath === selectedDocument.path || q.title.toLowerCase() === selectedDocument.name.toLowerCase());
        
        if (!existing) {
          saveQueueItem({
            title: selectedDocument.name,
            filenameHint: selectedDocument.name,
            category: selectedDocument.category || 'general_survival',
            filePath: selectedDocument.path,
            acquisitionStatus: 'planned',
            sourceType: 'local_library',
            currentPage: 0,
            totalPages: 0,
            progressPercent: 0,
            lastReadAt: new Date().toISOString()
          });
          setReadingProgress({ currentPage: 0, totalPages: 0 });
        } else {
          saveQueueItem({
            ...existing,
            filePath: selectedDocument.path,
            lastReadAt: new Date().toISOString()
          });
          setReadingProgress({
            currentPage: existing.currentPage || 0,
            totalPages: existing.totalPages || 0
          });
        }
      } catch (err) {
        console.error("Failed to auto-add to reading list:", err);
      }
    }
  }, [selectedDocument]);

  useEffect(() => {
    if (!selectedDocument) {
      setViewerText('');
      setDocStatus(null);
      return;
    }

    // Fetch EBG / scanned status
    fetch(`${API_BASE}/api/index/status?path=${encodeURIComponent(selectedDocument.path)}`)
      .then(res => res.json())
      .then(data => {
        setDocStatus(data);
      })
      .catch(err => {
        console.error("Failed to fetch document status:", err);
      });
  }, [selectedDocument]);

  useEffect(() => {
    if (!selectedDocument) {
      setViewerText('');
      return;
    }
    const ext = selectedDocument.extension?.toLowerCase();
    if (['.txt', '.md'].includes(ext) || (ext === '.pdf' && docStatus?.ocrCompleted)) {
      setViewerLoading(true);
      fetch(`${API_BASE}/api/document/text?path=${encodeURIComponent(selectedDocument.path)}`)
        .then(res => {
          if (!res.ok) throw new Error("Failed to load document text.");
          return res.json();
        })
        .then(data => {
          setViewerText(data.text || '');
          setViewerLoading(false);
        })
        .catch(err => {
          setViewerText(`ERROR LOADING DOCUMENT: ${err.message}`);
          setViewerLoading(false);
        });
    }
  }, [selectedDocument, docStatus]);

  const saveProgressToStore = (doc, current, total) => {
    try {
      const queue = loadQueue();
      const existing = queue.find(q => q.filePath === doc.path || q.title.toLowerCase() === doc.name.toLowerCase());
      const percent = total > 0 ? Math.round((current / total) * 100) : 0;
      const status = (percent >= 100 || (total > 0 && current === total)) ? 'manually_acquired' : 'planned';
      
      const itemToSave = {
        title: metadata[doc.path]?.title || doc.name,
        filenameHint: doc.name,
        category: doc.category || 'general_survival',
        filePath: doc.path,
        acquisitionStatus: status,
        sourceType: 'local_library',
        currentPage: current,
        totalPages: total,
        progressPercent: percent,
        lastReadAt: new Date().toISOString()
      };
      
      if (existing) {
        saveQueueItem({
          ...existing,
          ...itemToSave,
          id: existing.id
        });
      } else {
        saveQueueItem(itemToSave);
      }
    } catch (err) {
      console.error("Error saving progress to store:", err);
    }
  };

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
      tags: ['ranger']
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
      body: `Ranger Response Excerpt:\n"${msg.text.substring(0, 300)}..."`,
      relatedSourcePaths: msg.sources?.map(s => s.source).join(', ') || '',
      relatedRangerAnswer: msg.text
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
        tags: ['ranger']
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
      body: `Ranger Response Excerpt:\n"${msg.text.substring(0, 300)}..."`,
      relatedSourcePaths: msg.sources?.map(s => s.source).join(', ') || '',
      relatedRangerAnswer: msg.text,
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
      reason: s.matchLabel || 'Related source reference from Ranger chat',
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
    setCurrentTheme(theme);
  };

  useEffect(() => {
    setActiveMission(loadActiveMission());
  }, [viewMode]);

  useEffect(() => {
    const cacheName = 'sos-materials-cache';
    const materialsUrl = `${API_BASE}/api/materials`;
    const metadataUrl = `${API_BASE}/api/metadata`;

    // 1. Try to load from Cache Storage first (instant)
    const loadFromCache = async () => {
      try {
        if ('caches' in window) {
          const cache = await caches.open(cacheName);
          const cachedMaterials = await cache.match(materialsUrl);
          const cachedMetadata = await cache.match(metadataUrl);

          if (cachedMaterials && cachedMetadata) {
            const materialsData = await cachedMaterials.json();
            const metadataData = await cachedMetadata.json();
            
            if (materialsData && materialsData.categories) {
              setCategories(materialsData.categories);
              setMetadata(metadataData || {});
              const cats = Object.keys(materialsData.categories);
              if (cats.length > 0) setActiveCategory(cats[0]);
              setLoading(false);
              return true;
            }
          }
        }
      } catch (e) {
        console.warn("Cache read failed:", e);
      }
      return false;
    };

    // 2. Fetch from network and update cache
    const fetchFromNetwork = async (hasCache) => {
      try {
        const [materialsRes, metadataRes] = await Promise.all([
          fetch(materialsUrl),
          fetch(metadataUrl)
        ]);

        if (materialsRes.ok && metadataRes.ok) {
          // Clone responses because they can only be read once
          const materialsClone = materialsRes.clone();
          const metadataClone = metadataRes.clone();

          const materialsData = await materialsRes.json();
          const metadataData = await metadataRes.json();

          setCategories(materialsData.categories);
          setMetadata(metadataData || {});
          const cats = Object.keys(materialsData.categories);
          if (cats.length > 0) setActiveCategory(cats[0]);
          setLoading(false);

          // Save to Cache Storage for next time
          if ('caches' in window) {
            const cache = await caches.open(cacheName);
            await cache.put(materialsUrl, materialsClone);
            await cache.put(metadataUrl, metadataClone);
          }
        } else if (!hasCache) {
          setError("Failed to connect to Local Data Core.");
          setLoading(false);
        }
      } catch (err) {
        console.error("Network fetch failed:", err);
        if (!hasCache) {
          setError("Failed to connect to Local Data Core.");
          setLoading(false);
        }
      }
    };

    const initialize = async () => {
      const hasCache = await loadFromCache();
      // Always run network fetch in background to revalidate/update
      await fetchFromNetwork(hasCache);
    };

    initialize();

    // Load theme
    const savedTheme = localStorage.getItem('sos-theme') || 'amber';
    changeTheme(savedTheme);

    // Setup Web Speech API for R.A.N.G.E.R. Voice and Commands
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
  }, []);

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
    alert(`Successfully indexed ${files.length} documents into R.A.N.G.E.R. Memory.`);
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
    // 1. Cancel native browser speech synthesis
    window.speechSynthesis.cancel();
    
    // 2. Stop and clear any active neural audio playback
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.onended = null;
      currentAudioRef.current.onerror = null;
      currentAudioRef.current = null;
    }

    if (!text) {
      if (onEndCallback) onEndCallback();
      return;
    }

    if (voiceSettings.engineMode === 'neural') {
      try {
        const voice = voiceSettings.neuralVoice || 'af_sarah';
        const url = `${API_BASE}/api/tts?text=${encodeURIComponent(text)}&voice=${encodeURIComponent(voice)}`;
        const audio = new Audio(url);
        currentAudioRef.current = audio;
        
        audio.onended = () => {
          if (currentAudioRef.current === audio) {
            currentAudioRef.current = null;
          }
          if (onEndCallback) onEndCallback();
        };
        
        audio.onerror = (err) => {
          console.warn("[NEURAL TTS] Playback error or connection issue:", err);
          if (currentAudioRef.current === audio) {
            currentAudioRef.current = null;
          }
          if (onEndCallback) onEndCallback();
        };

        audio.play().catch(err => {
          console.warn("[NEURAL TTS] play() was interrupted or failed:", err);
          if (onEndCallback) onEndCallback();
        });
      } catch (err) {
        console.warn("[NEURAL TTS] Setup error:", err);
        if (onEndCallback) onEndCallback();
      }
    } else {
      // Browser Speech Synthesis (default)
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
      
      utterance.rate = voiceSettings.rate || 1.0;
      utterance.pitch = voiceSettings.pitch || 1.0;
      
      if (onEndCallback) {
        utterance.onend = onEndCallback;
      }
      
      utterance.onerror = (e) => {
        console.warn("Speech synthesis error:", e);
        if (onEndCallback) onEndCallback();
      };
      
      window.speechSynthesis.speak(utterance);
    }
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

    if (voiceSettings.engineMode === 'neural') {
      // 1. Cancel browser speech synthesis
      window.speechSynthesis.cancel();
      
      // 2. Cancel and clean up current audio element
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.onended = null;
        currentAudioRef.current.onerror = null;
        currentAudioRef.current = null;
      }

      // 3. Retrieve or create the audio element for the current chunk
      let audio = null;
      if (nextAudioRef.current && nextAudioRef.current.chunkIndex === index) {
        audio = nextAudioRef.current;
        nextAudioRef.current = null;
      } else {
        const voice = voiceSettings.neuralVoice || 'af_sarah';
        const url = `${API_BASE}/api/tts?text=${encodeURIComponent(chunksList[index])}&voice=${encodeURIComponent(voice)}`;
        audio = new Audio(url);
      }

      currentAudioRef.current = audio;

      // 4. Set listeners to continue to the next chunk
      audio.onended = () => {
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
        const nextIndex = index + 1;
        if (nextIndex < chunksList.length) {
          setCurrentChunkIndex(nextIndex);
          speakCurrentChunk(chunksList, nextIndex);
        } else {
          setIsAudioPlaying(false);
        }
      };

      audio.onerror = (err) => {
        console.warn("[NEURAL TTS] Playback error on chunk index", index, err);
        if (currentAudioRef.current === audio) {
          currentAudioRef.current = null;
        }
        const nextIndex = index + 1;
        if (nextIndex < chunksList.length) {
          setCurrentChunkIndex(nextIndex);
          speakCurrentChunk(chunksList, nextIndex);
        } else {
          setIsAudioPlaying(false);
        }
      };

      // 5. Preload next chunk immediately
      const nextIndex = index + 1;
      if (nextIndex < chunksList.length) {
        const nextVoice = voiceSettings.neuralVoice || 'af_sarah';
        const nextUrl = `${API_BASE}/api/tts?text=${encodeURIComponent(chunksList[nextIndex])}&voice=${encodeURIComponent(nextVoice)}`;
        const nextAudio = new Audio(nextUrl);
        nextAudio.chunkIndex = nextIndex;
        nextAudio.preload = 'auto';
        nextAudioRef.current = nextAudio;
      }

      // 6. Start playing current chunk
      audio.play().catch(err => {
        console.warn("[NEURAL TTS] play failed:", err);
      });
    } else {
      // Browser Speech Synthesis (default)
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
    }
  };

  const toggleAudioPlay = () => {
    if (isAudioPlaying) {
      window.speechSynthesis.cancel();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
      }
      if (nextAudioRef.current) {
        nextAudioRef.current = null;
      }
      setIsAudioPlaying(false);
    } else {
      setIsAudioPlaying(true);
      speakCurrentChunk(audioChunks, currentChunkIndex);
    }
  };

  const stopAudioReader = () => {
    window.speechSynthesis.cancel();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if (nextAudioRef.current) {
      nextAudioRef.current = null;
    }
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
      speakText("R.A.N.G.E.R. Voice interface online. Standing by for instructions.", () => {
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

  const parseActionTag = (text) => {
    if (!text) return null;
    const match = text.match(/\[ACTION:\s+(\w+)\s+([^\]]+)\]/);
    if (!match) return null;
    
    const actionName = match[1];
    const paramsStr = match[2];
    const params = {};
    
    const regex = /(\w+)=(?:(?:\"([^\"]*)\")|([^\s]+))/g;
    let paramMatch;
    while ((paramMatch = regex.exec(paramsStr)) !== null) {
      const key = paramMatch[1];
      const val = paramMatch[2] !== undefined ? paramMatch[2] : paramMatch[3];
      params[key] = val;
    }
    
    return {
      raw: match[0],
      action: actionName,
      params
    };
  };

  const handleExecuteAiAction = (actionData, messageIndex) => {
    try {
      const { action, params } = actionData;
      
      if (action === 'log_water') {
        const newContainer = {
          id: Date.now(),
          name: `${params.type.toUpperCase()} - ${params.location.toUpperCase()}`,
          capacity: parseFloat(params.volume) || 0,
          currentLevel: parseFloat(params.volume) || 0,
          unit: 'Liters',
          filterType: 'None',
          filterChangeDate: '',
          lastTestDate: '',
          lastTestResult: 'Safe',
          notes: 'Automatically logged via R.A.N.G.E.R. action request.'
        };
        setWaterContainers(prev => [...prev, newContainer]);
      } 
      else if (action === 'save_note') {
        const noteData = {
          title: `R.A.N.G.E.R. Note (${params.category ? params.category.toUpperCase() : 'GENERAL'})`,
          content: params.content,
          category: params.category || 'general',
          timestamp: new Date().toISOString()
        };
        addFieldNote(noteData);
      } 
      else if (action === 'update_pantry') {
        const category = params.item;
        setProfile(prev => ({
          ...prev,
          pantry: {
            ...prev.pantry,
            [category]: parseFloat(params.quantity) || 0
          }
        }));
      }
      
      // Mark action as executed in the message history
      setMessages(prev => {
        const copy = [...prev];
        if (copy[messageIndex]) {
          copy[messageIndex].actionExecuted = true;
        }
        return copy;
      });
      
      alert(`Action executed successfully: ${action.replace('_', ' ').toUpperCase()}`);
    } catch (e) {
      console.error("Failed to execute AI tool action:", e);
      alert(`Action failed: ${e.message}`);
    }
  };

  const handleRejectAiAction = (messageIndex) => {
    setMessages(prev => {
      const copy = [...prev];
      if (copy[messageIndex]) {
        copy[messageIndex].actionRejected = true;
      }
      return copy;
    });
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
      text += `Kiwix permits reading compressed encyclopedia ZIM packages offline. You can configure and scan ZIM archive directories metadata under the **ZIM Catalog** tab in the **OFFLINE TOOLKIT** view. R.A.N.G.E.R. checks metadata only and does not index ZIM binary contents directly.`;

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
      text += `*Safety Policy:* R.A.N.G.E.R. runs local health checks only. I do not automatically fix your setup, scan your drive, upload logs, sync data to a cloud, download libraries, or index files in the background without explicit manual instruction.`;

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

  const readiness = calculateReadinessScore({
    waterContainers,
    pantryItems: profile.pantry,
    peopleCount: profile.peopleCount,
    targetWeeks: profile.targetWeeks,
    energyLevel: profile.energyLevel,
    selfRelianceLevel: profile.selfRelianceLevel
  });

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
              <span style={{color: viewMode === 'chat' ? 'var(--brand-primary)' : ''}}>R.A.N.G.E.R. (LOCAL AI)</span>
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
              className={`nav-item ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => { setViewMode('map'); setSidebarOpen(false); }}
            >
              <Compass size={18} className={viewMode === 'map' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'map' ? 'var(--brand-primary)' : ''}}>TACTICAL MAP</span>
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
              className={`nav-item ${viewMode === 'arcade' ? 'active' : ''}`}
              onClick={() => { setViewMode('arcade'); setSidebarOpen(false); }}
            >
              <Gamepad2 size={18} className={viewMode === 'arcade' ? 'text-glow' : ''}/>
              <span style={{color: viewMode === 'arcade' ? 'var(--brand-primary)' : ''}}>TACTICAL ARCADE</span>
            </div>

            {!simpleMode && (
              <>
                <div 
                  className={`nav-item ${viewMode === 'index-integrity' ? 'active' : ''}`}
                  onClick={() => { setViewMode('index-integrity'); setSidebarOpen(false); }}
                >
                  <Database size={18} className={viewMode === 'index-integrity' ? 'text-glow' : ''}/>
                  <span style={{color: viewMode === 'index-integrity' ? 'var(--brand-primary)' : ''}}>INDEX INTEGRITY</span>
                </div>

                <div 
                  className={`nav-item ${viewMode === 'ebg' ? 'active' : ''}`}
                  onClick={() => { setViewMode('ebg'); setSidebarOpen(false); }}
                >
                  <Network size={18} className={viewMode === 'ebg' ? 'text-glow' : ''}/>
                  <span style={{color: viewMode === 'ebg' ? 'var(--brand-primary)' : ''}}>COGNITIVE BELIEF GRAPH</span>
                </div>
              </>
            )}

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
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val) {
                    setViewMode('files');
                  }
                }}
              />
            </div>

            {/* Condensed Readiness Score display */}
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                padding: '6px 12px', 
                background: 'rgba(0, 242, 254, 0.03)', 
                border: '1px solid rgba(0, 242, 254, 0.15)', 
                borderRadius: '4px', 
                cursor: 'pointer', 
                fontFamily: 'var(--font-mono)', 
                fontSize: '0.8rem',
                color: '#fff',
                marginLeft: '12px',
                transition: 'all 0.2s'
              }} 
              onClick={() => setViewMode('readiness')}
              className="hover-bg-accent desktop-only-readiness-badge"
              title="Click to view detailed Readiness Score breakdown"
            >
              <ShieldAlert size={14} style={{ color: readiness.total >= 90 ? '#00ff66' : readiness.total >= 75 ? 'var(--brand-primary)' : readiness.total >= 50 ? '#00E5FF' : '#ff6600' }} />
              <span>READINESS: <strong style={{ color: readiness.total >= 90 ? '#00ff66' : readiness.total >= 75 ? 'var(--brand-primary)' : readiness.total >= 50 ? '#00E5FF' : '#ff6600' }}>{readiness.total}%</strong></span>
            </div>

            {/* Real-time Sync Progress Widget */}
            {crawlerStatus && crawlerStatus.isCrawling && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  margin: '0 24px',
                  padding: '6px 14px',
                  background: 'var(--brand-primary-dim)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--brand-primary)',
                  flex: 1,
                  maxWidth: '380px',
                  minWidth: '200px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                title={`Indexing: ${crawlerStatus.currentFile}`}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                  <span className="sync-pulse" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--brand-primary)', display: 'inline-block', boxShadow: '0 0 6px var(--brand-primary)' }}></span>
                  <span>SYNCING: {crawlerStatus.processedDocs} / {crawlerStatus.totalDocs}</span>
                </div>
                
                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${crawlerStatus.totalDocs > 0 ? ((crawlerStatus.processedDocs / crawlerStatus.totalDocs) * 100) : 0}%`, 
                      height: '100%', 
                      background: 'var(--brand-primary)', 
                      boxShadow: '0 0 4px var(--brand-primary)',
                      transition: 'width 0.3s ease' 
                    }}
                  ></div>
                </div>
                
                <span style={{ fontWeight: 'bold', flexShrink: 0 }}>
                  {crawlerStatus.totalDocs > 0 ? ((crawlerStatus.processedDocs / crawlerStatus.totalDocs) * 100).toFixed(1) : 0}%
                </span>
                
                <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }}>
                  {crawlerStatus.currentFile}
                </span>
              </div>
            )}
            
            <div className="system-status" style={{ gap: '14px' }}>
              <div className="status-indicator">
                <div className="status-dot"></div>
                <span>CORE ONLINE</span>
              </div>
              <div style={{color: 'var(--text-muted)'}}>{window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'LOCAL HOST' : window.location.hostname.toUpperCase()}</div>
              
              <Palette 
                size={18} 
                style={{cursor: 'pointer', color: theme === 'professional' ? 'var(--brand-primary)' : 'var(--text-muted)'}}
                onClick={() => setTheme(prev => prev === 'rugged' ? 'professional' : 'rugged')}
                title={`Switch to ${theme === 'rugged' ? 'Professional' : 'Tactical Rugged'} Theme`}
              />

              <StickyNote 
                size={18} 
                style={{cursor: 'pointer', color: showNotepad ? 'var(--brand-primary)' : 'var(--text-muted)'}}
                onClick={() => setShowNotepad(!showNotepad)}
                title="Toggle Operator Notebook"
              />

              <ShieldCheck 
                size={18} 
                style={{cursor: 'pointer', color: viewMode === 'release' ? 'var(--brand-primary)' : 'var(--text-muted)'}}
                onClick={() => setViewMode('release')}
                title="Open Release Diagnostics"
              />

              <Settings 
                size={18} 
                style={{cursor: 'pointer', color: viewMode === 'settings' ? 'var(--brand-primary)' : 'var(--text-muted)'}}
                onClick={() => setViewMode('settings')}
                title="Open System & Profile Settings"
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
            
            {!error && !loading && viewMode === 'files' && (activeCategory || searchQuery) && (
              <>
                <div className="category-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <h2 className="category-title" style={{ margin: 0 }}>{searchQuery ? `SEARCH: "${searchQuery.toUpperCase()}"` : (activeCategory ? activeCategory.toUpperCase() : '')}</h2>
                    <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', marginTop: '4px' }}>{getFilteredFiles().length} RECORDS FOUND</div>
                  </div>
                  <div className="category-action-buttons" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                    {/* Media Type Dropdown Filter */}
                    <select
                      value={mediaTab}
                      onChange={(e) => setMediaTab(e.target.value)}
                      className="search-input glass-panel"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.75rem', 
                        fontFamily: 'var(--font-mono)', 
                        height: '35px',
                        width: '210px',
                        margin: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.45)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                        borderRadius: '4px',
                        color: 'var(--brand-primary)',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '1px'
                      }}
                    >
                      <option value="all" style={{ background: '#0e121a', color: '#fff' }}>ALL RECORDS</option>
                      <option value="reading" style={{ background: '#0e121a', color: '#fff' }}>📖 BOOKS & MANUALS</option>
                      <option value="videos" style={{ background: '#0e121a', color: '#fff' }}>🎥 TRAINING VIDEOS</option>
                      <option value="software" style={{ background: '#0e121a', color: '#fff' }}>💿 SOFTWARE & ISOS</option>
                      <option value="diagrams" style={{ background: '#0e121a', color: '#fff' }}>🖼 DIAGRAMS & IMAGES</option>
                    </select>

                    {!searchQuery && (
                      <>
                        <button 
                          className="btn-tactical" 
                          onClick={indexCategory}
                          disabled={isIndexingBatch || isDecoding}
                          style={{ fontSize: '0.8rem', padding: '8px 16px', background: isIndexingBatch ? 'var(--brand-primary-dim)' : '', height: '35px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Cpu size={16} />
                          {isIndexingBatch ? `INDEXING... ${indexProgress}/${indexTotal}` : 'INDEX CATEGORY'}
                        </button>
                        
                        <button 
                          className="btn-tactical" 
                          onClick={decodeCategory}
                          disabled={isDecoding || isIndexingBatch}
                          style={{ fontSize: '0.8rem', padding: '8px 16px', background: isDecoding ? 'var(--brand-primary-dim)' : '', height: '35px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Fingerprint size={16} />
                          {isDecoding ? `DECODING... ${decodeProgress}/${decodeTotal}` : 'DECODE FILENAMES'}
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {searchQuery ? (
                  /* Flat search results view */
                  <div className="file-grid" style={{ marginTop: '24px' }}>
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
                  <div className="virtual-directory-explorer" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '24px' }}>
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
                    <h2 className="category-title">R.A.N.G.E.R. TERMINAL</h2>
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
                          {msg.role === 'user' ? 'USER' : 'R.A.N.G.E.R.'}
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
                          <div>
                            {(() => {
                              const actionData = parseActionTag(msg.text);
                              const cleanText = actionData ? msg.text.replace(actionData.raw, '').trim() : msg.text;
                              return (
                                <>
                                  <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{cleanText}</div>
                                  
                                  {actionData && (
                                    <div style={{
                                      marginTop: '14px',
                                      padding: '14px',
                                      backgroundColor: 'rgba(0, 242, 254, 0.05)',
                                      border: '1px dashed var(--brand-primary)',
                                      borderRadius: '6px',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      gap: '10px'
                                    }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--brand-primary)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                                        <CheckSquare size={14} /> R.A.N.G.E.R. PROPOSED ACTION
                                      </div>
                                      
                                      <div style={{ fontSize: '0.82rem', color: '#e0e0e0', lineHeight: '1.4' }}>
                                        {actionData.action === 'log_water' && (
                                          <>
                                            Log **{actionData.params.volume} Liters** of **{actionData.params.type}** water in the **{actionData.params.location}**.
                                          </>
                                        )}
                                        {actionData.action === 'save_note' && (
                                          <>
                                            Save a **{actionData.params.category}** field note:
                                            <div style={{ marginTop: '6px', fontStyle: 'italic', color: '#b0b0b0', paddingLeft: '10px', borderLeft: '2px solid rgba(255,255,255,0.2)' }}>
                                              "{actionData.params.content}"
                                            </div>
                                          </>
                                        )}
                                        {actionData.action === 'update_pantry' && (
                                          <>
                                            Update pantry stock item **"{actionData.params.item}"** to quantity **{actionData.params.quantity}**.
                                          </>
                                        )}
                                      </div>

                                      {/* Proposal State Buttons */}
                                      {msg.actionExecuted ? (
                                        <div style={{ color: '#00ff66', fontSize: '0.82rem', fontWeight: 'bold' }}>
                                          ✓ Action Approved & Executed
                                        </div>
                                      ) : msg.actionRejected ? (
                                        <div style={{ color: 'var(--brand-danger)', fontSize: '0.82rem', fontWeight: 'bold' }}>
                                          ✗ Action Declined
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                                          <button 
                                            className="btn-tactical"
                                            style={{ padding: '6px 14px', fontSize: '0.75rem', backgroundColor: 'rgba(0, 255, 102, 0.15)', borderColor: '#00ff66', color: '#00ff66' }}
                                            onClick={() => handleExecuteAiAction(actionData, i)}
                                          >
                                            APPROVE
                                          </button>
                                          <button 
                                            className="btn-tactical-outline"
                                            style={{ padding: '6px 14px', fontSize: '0.75rem', color: 'var(--brand-danger)', borderColor: 'var(--brand-danger)' }}
                                            onClick={() => handleRejectAiAction(i)}
                                          >
                                            DECLINE
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
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
                                        {s.isOcr && (
                                          <span style={{ 
                                            fontSize: '0.65rem', 
                                            backgroundColor: 'rgba(255, 165, 0, 0.1)', 
                                            border: '1px solid #ffa500', 
                                            color: '#ffa500', 
                                            padding: '2px 6px', 
                                            borderRadius: '3px', 
                                            fontWeight: 'bold', 
                                            fontFamily: 'var(--font-mono)' 
                                          }}>
                                            ⚠️ OCR TRANSCRIPTION
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
                            backgroundColor: 'var(--brand-primary-dim)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', fontWeight: 'bold', letterSpacing: '1px', fontFamily: 'var(--font-mono)' }}>
                              SYSTEM FALLBACK OPERATION REQUIRED // INSUFFICIENT LOCAL CONTEXT
                            </div>
                            
                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                              Ranger could not verify enough facts inside your local library to answer this query. Select an alternative protocol:
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
                                      ASK RANGER WITHOUT LOCAL SOURCES
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
                                    ⚠️ WARNING: Requesting an answer "Without Local Sources" will rely on Ranger's pre-trained weights. This output is not checked or cited against your local survival books.
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
                  <MissionRangerContextPanel 
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
                  setViewMode={setViewMode}
                  setChatInput={setChatInput}
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

            {!error && !loading && viewMode === 'map' && (
              <PanelErrorBoundary name="Tactical Map">
                <TacticalMapPanel />
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
                      const res = await fetch(`${API_BASE}/api/materials`);
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

            {!error && !loading && viewMode === 'ebg' && (
              <PanelErrorBoundary name="Cognitive Belief Graph">
                <EbgGraphPanel />
              </PanelErrorBoundary>
            )}

            {!error && !loading && viewMode === 'offline-toolkit' && (
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%', paddingBottom: '40px' }}>
                {/* Mobile Tab Selector */}
                <div className="mobile-only-tab-select" style={{ display: 'none', margin: '0 24px 16px', padding: '10px', background: 'rgba(10, 10, 12, 0.95)', border: '1px solid var(--border-subtle)', borderRadius: '4px' }}>
                  <label style={{ marginRight: '10px', fontSize: '0.8rem', color: 'var(--brand-primary)', fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>MODULE:</label>
                  <select 
                    value={toolkitSubTab}
                    onChange={(e) => setToolkitSubTab(e.target.value)}
                    style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', fontWeight: 'bold', outline: 'none', flex: 1, cursor: 'pointer' }}
                  >
                    <option value="wizard" style={{ background: '#111', color: '#fff' }}>Setup Wizard</option>
                    <option value="guides" style={{ background: '#111', color: '#fff' }}>System Guides</option>
                    <option value="cards" style={{ background: '#111', color: '#fff' }}>Tool Guides</option>
                    <option value="gap" style={{ background: '#111', color: '#fff' }}>Gap Analyzer</option>
                    <option value="lifecycle" style={{ background: '#111', color: '#fff' }}>Library Index</option>
                    <option value="zim" style={{ background: '#111', color: '#fff' }}>ZIM Catalog</option>
                    <option value="acq" style={{ background: '#111', color: '#fff' }}>Librarian Wishlist</option>
                    <option value="providers" style={{ background: '#111', color: '#fff' }}>Download Directories</option>
                    <option value="backup" style={{ background: '#111', color: '#fff' }}>Backup</option>
                    <option value="solar" style={{ background: '#111', color: '#fff' }}>Solar Diagnostics</option>
                    <option value="radio" style={{ background: '#111', color: '#fff' }}>Comms Directory</option>
                    <option value="weather" style={{ background: '#111', color: '#fff' }}>Weather Logger</option>
                    <option value="firstaid" style={{ background: '#111', color: '#fff' }}>First Aid</option>
                    <option value="recipes" style={{ background: '#111', color: '#fff' }}>Recipe Planner</option>
                    <option value="network" style={{ background: '#111', color: '#fff' }}>Network Builder</option>
                  </select>
                </div>

                <div className="desktop-only-tab-buttons" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', padding: '0 24px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <button 
                    onClick={() => setToolkitSubTab('wizard')}
                    className={`btn-tactical${toolkitSubTab === 'wizard' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Setup Wizard
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('guides')}
                    className={`btn-tactical${toolkitSubTab === 'guides' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    System Guides
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('cards')}
                    className={`btn-tactical${toolkitSubTab === 'cards' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Tool Guides
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('gap')}
                    className={`btn-tactical${toolkitSubTab === 'gap' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Gap Analyzer
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('lifecycle')}
                    className={`btn-tactical${toolkitSubTab === 'lifecycle' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Library Index
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('zim')}
                    className={`btn-tactical${toolkitSubTab === 'zim' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    ZIM Catalog
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('acq')}
                    className={`btn-tactical${toolkitSubTab === 'acq' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Librarian Wishlist
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('providers')}
                    className={`btn-tactical${toolkitSubTab === 'providers' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Download Directories
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('backup')}
                    className={`btn-tactical${toolkitSubTab === 'backup' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Backup
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('solar')}
                    className={`btn-tactical${toolkitSubTab === 'solar' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Solar Diagnostics
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('radio')}
                    className={`btn-tactical${toolkitSubTab === 'radio' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Comms Directory
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('weather')}
                    className={`btn-tactical${toolkitSubTab === 'weather' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Weather Logger
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('firstaid')}
                    className={`btn-tactical${toolkitSubTab === 'firstaid' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    First Aid
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('recipes')}
                    className={`btn-tactical${toolkitSubTab === 'recipes' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Recipe Planner
                  </button>
                  <button 
                    onClick={() => setToolkitSubTab('network')}
                    className={`btn-tactical${toolkitSubTab === 'network' ? '' : '-outline'}`}
                    style={{ padding: '8px 16px', borderRadius: '4px 4px 0 0', borderBottom: 'none', marginBottom: '4px' }}
                  >
                    Network Builder
                  </button>
                </div>
                {toolkitSubTab === 'wizard' && (
                  <PanelErrorBoundary name="Setup Wizard">
                    <SetupWizardPanel setViewMode={setViewMode} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'guides' && (
                  <PanelErrorBoundary name="System Guides">
                    <GuidesReaderPanel />
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
                    <ContentGapAnalyzerPanel 
                      setToolkitSubTab={setToolkitSubTab} 
                      allFiles={Object.values(categories).flat()}
                      metadata={metadata}
                    />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'zim' && (
                  <PanelErrorBoundary name="ZIM Catalog">
                    <ZimCatalogPanel />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'acq' && (
                  <PanelErrorBoundary name="Acquisition Queue">
                    <AcquisitionQueuePanel 
                      selectedDocument={selectedDocument}
                      setSelectedDocument={setSelectedDocument}
                      categories={categories}
                    />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'lifecycle' && (
                  <PanelErrorBoundary name="Library Index">
                     <LibraryLifecyclePanel categories={categories} updateCategories={updateMaterialsAndCache} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'backup' && (
                  <PanelErrorBoundary name="Offline Toolkit Backup">
                    <OfflineToolkitBackupPanel setToolkitSubTab={setToolkitSubTab} setViewMode={setViewMode} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'solar' && (
                  <PanelErrorBoundary name="Solar & Battery Calculator">
                    <SolarCalculatorPanel />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'radio' && (
                  <PanelErrorBoundary name="Radio Comms Log">
                    <RadioCommsPanel />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'weather' && (
                  <PanelErrorBoundary name="Weather Logger">
                    <WeatherLoggerPanel />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'firstaid' && (
                  <PanelErrorBoundary name="First Aid protocols">
                    <FirstAidPanel 
                      onTriggerSearch={(query) => {
                        setViewMode('chat');
                        setChatInput(query);
                        handleSendMessage(query);
                      }}
                    />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'recipes' && (
                  <PanelErrorBoundary name="Recipe Planner">
                    <RecipePlannerPanel profile={profile} />
                  </PanelErrorBoundary>
                )}
                {toolkitSubTab === 'network' && (
                  <PanelErrorBoundary name="Network Builder">
                    <NetworkBuilderPanel />
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
                    currentTheme={currentTheme}
                    changeTheme={changeTheme}
                    colorMode={colorMode}
                    setColorMode={setColorMode}
                    simpleMode={simpleMode}
                    setSimpleMode={setSimpleMode}
                    setTourStep={setTourStep}
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

            {!error && !loading && viewMode === 'arcade' && (
              <PanelErrorBoundary name="Tactical Arcade">
                <OfflineAppsPanel />
              </PanelErrorBoundary>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h2 style={{ color: 'var(--brand-primary)', margin: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: '200px' }}>
              {metadata[selectedDocument.path]?.title || selectedDocument.name}
            </h2>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ccc', fontSize: '0.85rem', fontFamily: 'var(--font-mono)', marginRight: '16px' }}>
              <span style={{ color: 'var(--brand-primary)' }}>PROGRESS:</span>
              <input 
                type="number" 
                min="0"
                placeholder="PAGE"
                value={readingProgress.currentPage || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setReadingProgress(prev => {
                    const next = { ...prev, currentPage: val };
                    saveProgressToStore(selectedDocument, next.currentPage, next.totalPages);
                    return next;
                  });
                }}
                style={{ width: '60px', padding: '6px 4px', background: '#0a0a0a', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', textAlign: 'center', outline: 'none' }}
              />
              <span>/</span>
              <input 
                type="number" 
                min="0"
                placeholder="TOTAL"
                value={readingProgress.totalPages || ''}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 0;
                  setReadingProgress(prev => {
                    const next = { ...prev, totalPages: val };
                    saveProgressToStore(selectedDocument, next.currentPage, next.totalPages);
                    return next;
                  });
                }}
                style={{ width: '60px', padding: '6px 4px', background: '#0a0a0a', border: '1px solid var(--border-subtle)', color: '#fff', borderRadius: '4px', textAlign: 'center', outline: 'none' }}
              />
              <span>PAGES</span>
            </div>

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
              <div className="glass-panel" style={{ flex: showAudioHUD ? 0.6 : 1, overflow: 'hidden', position: 'relative', borderRadius: '8px', transition: 'all 0.3s ease', display: 'flex', flexDirection: 'column' }}>
                
                {/* Transcribed PDF success banner */}
                {docStatus?.ocrCompleted && (
                  <div style={{
                    padding: '12px 20px',
                    background: 'rgba(0, 255, 102, 0.05)',
                    borderBottom: '1px solid rgba(0, 255, 102, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: '#00ff66',
                    gap: '8px',
                    flexShrink: 0
                  }}>
                    <CheckCircle size={16} />
                    <span><strong>High-Fidelity Text Transcribed:</strong> Search, text selection, and audio reader are fully enabled.</span>
                  </div>
                )}

                {/* Scanned PDF warning banner */}
                {docStatus?.isScanned && (
                  <div style={{
                    padding: '12px 20px',
                    background: 'rgba(255, 179, 0, 0.1)',
                    borderBottom: '1px solid rgba(255, 179, 0, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.8rem',
                    color: '#ffb300',
                    gap: '12px',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <AlertTriangle size={16} />
                      <span><strong>WARNING: SCANNED IMAGE PDF.</strong> This document is image-only. Text search, highlighting, and audio narration are unavailable.</span>
                    </div>
                    <button 
                      className="btn-tactical"
                      disabled={ocrRunning}
                      onClick={async () => {
                        setOcrRunning(true);
                        try {
                          const res = await fetch(`${API_BASE}/api/crawler/ocr`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ filePath: selectedDocument.path })
                          });
                          const data = await res.json();
                          if (data.success) {
                            alert("OCR complete! Transcribed text has been indexed and loaded.");
                            // Re-fetch status so the UI reloads the OCR'd text
                            const statusRes = await fetch(`${API_BASE}/api/index/status?path=${encodeURIComponent(selectedDocument.path)}`);
                            const statusData = await statusRes.json();
                            setDocStatus(statusData);
                          } else {
                            alert("OCR failed: " + (data.error || "Unknown error"));
                          }
                        } catch (e) {
                          alert("OCR request failed: " + e.message);
                        } finally {
                          setOcrRunning(false);
                        }
                      }}
                      style={{ padding: '6px 14px', fontSize: '0.75rem', borderColor: '#ffb300', color: '#ffb300', backgroundColor: 'rgba(255, 179, 0, 0.05)', whiteSpace: 'nowrap' }}
                    >
                      {ocrRunning ? 'RUNNING LOCAL OCR...' : 'RUN LOCAL OCR (LLAVA:7B)'}
                    </button>
                  </div>
                )}

                {/* OCR Success banner */}
                {docStatus?.ocrCompleted && (
                  <div style={{
                    padding: '8px 20px',
                    background: 'rgba(0, 229, 255, 0.1)',
                    borderBottom: '1px solid rgba(0, 229, 255, 0.3)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: '#00e5ff',
                    flexShrink: 0
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={14} />
                      <span><strong>OCR TRANSCRIPTION RECOVERY PROTOCOL ACTIVE.</strong> Displaying text recovered via local Vision LLM.</span>
                    </div>
                  </div>
                )}

                {['.mp4', '.webm', '.avi', '.mkv', '.wmv', '.mov'].includes(selectedDocument.extension?.toLowerCase()) ? (
                  <div style={{ position: 'relative', width: '100%', flex: 1, backgroundColor: 'black', borderRadius: '8px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {!['.mp4', '.webm'].includes(selectedDocument.extension?.toLowerCase()) && (
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
                    )}
                    <video 
                      src={`${API_BASE}/api/video/stream?path=${encodeURIComponent(selectedDocument.path)}`} 
                      controls 
                      autoPlay
                      style={{ width: '100%', height: '100%', borderRadius: '8px', flex: 1 }} 
                    />
                  </div>
                ) : selectedDocument.extension?.toLowerCase() === '.iso' ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flex: 1, padding: '40px', textAlign: 'center', backgroundColor: '#0a0a0a', color: 'var(--text-main)'
                  }}>
                    <Disc size={64} style={{ color: 'var(--brand-primary)', marginBottom: '24px' }} />
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '12px' }}>
                      DVD IMAGE MOUNT PROTOCOL
                    </h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '32px', lineHeight: '1.6' }}>
                      This is a <strong>CD3WD DVD ISO Image ({selectedDocument.name})</strong>. You can mount this file natively as a virtual drive.
                    </p>
                    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '20px', textAlign: 'left', maxWidth: '600px', marginBottom: '32px' }}>
                      <h4 style={{ margin: '0 0 10px 0', color: 'var(--brand-primary)' }}>Mounting Instructions:</h4>
                      <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.6', color: 'var(--text-muted)' }}>
                        <li><strong>Windows 10/11:</strong> Double-click the file inside File Explorer to mount it natively.</li>
                        <li><strong>Linux Mint (Cinnamon):</strong> Right-click the file inside Nemo (File Manager) and choose <strong>"Open with Disk Image Mounter"</strong>.</li>
                        <li>Copy the path below to locate it quickly on your machine.</li>
                      </ul>
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
                          const docPath = selectedDocument.path;
                          navigator.clipboard.writeText(docPath);
                          alert(`Copied path:\n${docPath}`);
                        }}
                        style={{ padding: '12px 24px', fontSize: '1rem' }}
                      >
                        COPY ABSOLUTE PATH
                      </button>
                    </div>
                  </div>
                ) : ['.epub', '.doc', '.docx', '.zip', '.zim'].includes(selectedDocument.extension?.toLowerCase()) ? (
                  <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    flex: 1, padding: '40px', textAlign: 'center', backgroundColor: '#0a0a0a', color: 'var(--text-main)'
                  }}>
                    {selectedDocument.extension?.toLowerCase() === '.epub' ? (
                      <BookOpen size={64} style={{ color: 'var(--brand-primary)', marginBottom: '24px' }} />
                    ) : selectedDocument.extension?.toLowerCase() === '.zip' ? (
                      <Archive size={64} style={{ color: 'var(--brand-primary)', marginBottom: '24px' }} />
                    ) : selectedDocument.extension?.toLowerCase() === '.zim' ? (
                      <Database size={64} style={{ color: 'var(--brand-primary)', marginBottom: '24px' }} />
                    ) : (
                      <FileText size={64} style={{ color: 'var(--brand-primary)', marginBottom: '24px' }} />
                    )}
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', marginBottom: '12px' }}>
                      {selectedDocument.extension?.toUpperCase().slice(1)} DOCUMENT
                    </h3>
                    <p style={{ color: 'var(--text-muted)', maxWidth: '600px', marginBottom: '24px', lineHeight: '1.6' }}>
                      {selectedDocument.extension?.toLowerCase() === '.epub' ? (
                        "EPUB eBooks cannot be rendered natively inside browser views. To read this manual offline, copy its local path or download it, and open it in a reader like Calibre or FBReader."
                      ) : selectedDocument.extension?.toLowerCase() === '.zip' ? (
                        "This is a compressed ZIP archive. Copy its local path to locate and extract its contents via your system's file manager."
                      ) : selectedDocument.extension?.toLowerCase() === '.zim' ? (
                        "This is a Kiwix ZIM Offline Archive containing complete wiki content. You can run and read this encyclopedia natively inside the 'Kiwix ZIM Catalog' under the OFFLINE TOOLKIT tab."
                      ) : (
                        "Word Documents (.doc/.docx) cannot be rendered natively inside the browser. Copy its local path or download it, and open it in LibreOffice Writer."
                      )}
                    </p>
                    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
                      {selectedDocument.extension?.toLowerCase() === '.zim' ? (
                        <button 
                          className="btn-tactical" 
                          onClick={() => {
                            setViewMode('offline-toolkit');
                            setSelectedDocument(null);
                          }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                        >
                          <Database size={16} /> OPEN ZIM READER
                        </button>
                      ) : (
                        <a 
                          href={`${API_BASE}${encodePath(selectedDocument.path)}`}
                          download
                          className="btn-tactical"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
                        >
                          <Download size={16} /> DOWNLOAD FILE
                        </a>
                      )}
                      <button 
                        className="btn-tactical-outline" 
                        onClick={() => {
                          navigator.clipboard.writeText(selectedDocument.path);
                          alert("Absolute path copied to clipboard!");
                        }}
                        style={{ padding: '10px 20px' }}
                      >
                        COPY LOCAL PATH
                      </button>
                    </div>
                  </div>
                ) : ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(selectedDocument.extension?.toLowerCase()) ? (
                  <div style={{ display: 'flex', center: 'center', justifyContent: 'center', alignItems: 'center', width: '100%', flex: 1, backgroundColor: '#0a0a0a', borderRadius: '8px', overflow: 'auto', padding: '16px' }}>
                    <img 
                      src={`${API_BASE}${encodePath(selectedDocument.path)}`} 
                      alt={selectedDocument.name} 
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', border: '1px solid var(--border-subtle)', boxShadow: 'var(--glow-primary)' }} 
                    />
                  </div>
                ) : (['.txt', '.md'].includes(selectedDocument.extension?.toLowerCase()) || (selectedDocument.extension?.toLowerCase() === '.pdf' && docStatus?.ocrCompleted)) ? (
                  <div style={{ padding: '24px', overflowY: 'auto', flex: 1, width: '100%', color: '#e2e8f0', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', lineHeight: '1.6', fontSize: '0.95rem', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid var(--border-subtle)', textAlign: 'left' }}>
                    {viewerLoading ? (
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'var(--brand-primary)' }}>
                        LOADING DOCUMENT TEXT...
                      </div>
                    ) : viewerText}
                  </div>
                ) : (
                  <iframe 
                    src={`${API_BASE}${encodePath(selectedDocument.path)}`}
                    title="Document Viewer"
                    sandbox={selectedDocument.extension?.toLowerCase() === '.pdf' ? undefined : "allow-same-origin allow-scripts allow-popups allow-downloads"}
                    style={{ width: '100%', flex: 1, border: 'none', backgroundColor: '#e2e8f0' }}
                  />
                )}
              </div>

              {/* R.A.N.G.E.R. Audiobook Reader HUD */}
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
                    <span style={{ letterSpacing: '2px', fontSize: '0.9rem', fontWeight: 'bold' }}>R.A.N.G.E.R. AUDIO READER</span>
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

      {/* Floating Notepad Popup */}
      {showNotepad && (
        <div style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: 'calc(100vw - 40px)',
          maxWidth: '380px',
          height: '420px',
          zIndex: 10005,
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid var(--brand-primary)',
          boxShadow: 'var(--glow-primary-strong)',
          borderRadius: '8px',
          backgroundColor: 'rgba(10, 13, 22, 0.95)',
          backdropFilter: 'blur(10px)',
          overflow: 'hidden',
          fontFamily: 'var(--font-mono)'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            background: 'rgba(0, 242, 254, 0.05)',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
              📝 OPERATOR NOTEBOOK
            </span>
            <button 
              className="btn-tactical" 
              onClick={() => setShowNotepad(false)}
              style={{ padding: '2px 8px', fontSize: '0.75rem', borderColor: 'var(--brand-danger)', color: 'var(--brand-danger)' }}
            >
              CLOSE
            </button>
          </div>
          
          {/* Text Area */}
          <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column' }}>
            <textarea
              value={notepadText}
              onChange={(e) => setNotepadText(e.target.value)}
              placeholder="Record observation notes, PDF page markers, guide details, or instructions here..."
              style={{
                flex: 1,
                width: '100%',
                background: 'rgba(0,0,0,0.5)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '4px',
                color: '#fff',
                padding: '10px',
                fontFamily: 'inherit',
                fontSize: '0.85rem',
                lineHeight: '1.4',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          {/* Footer controls */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '8px 12px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <button 
              className="btn-tactical-outline" 
              onClick={() => {
                navigator.clipboard.writeText(notepadText);
                alert("Notes copied to clipboard!");
              }}
              style={{ fontSize: '0.75rem', padding: '4px 10px' }}
            >
              Copy All
            </button>
            <button 
              className="btn-tactical-outline" 
              onClick={() => {
                if (confirm("Clear all notes? This cannot be undone.")) {
                  setNotepadText('');
                }
              }}
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: 'var(--brand-danger)', borderColor: 'var(--brand-danger)' }}
            >
              Clear
            </button>
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

      {/* Interactive Guided Tour Overlay */}
      {tourStep !== null && tourSteps[tourStep] && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          zIndex: 99999,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '20px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="glass-panel" style={{
            maxWidth: '520px',
            width: '100%',
            padding: '28px',
            borderColor: 'var(--brand-primary)',
            boxShadow: 'var(--glow-primary)',
            backgroundColor: '#0c0f16',
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            fontFamily: 'var(--font-mono)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', color: '#ffb300', fontWeight: 'bold', letterSpacing: '1px' }}>
                SYSTEM TUTORIAL ({tourStep + 1} / {tourSteps.length})
              </span>
              <button 
                onClick={() => {
                  localStorage.setItem('sos_tour_completed', 'true');
                  setTourStep(null);
                }}
                style={{ background: 'none', border: 'none', color: 'var(--brand-danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
              >
                SKIP TUTORIAL
              </button>
            </div>

            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--brand-primary)', letterSpacing: '1px' }}>
                {tourSteps[tourStep].title}
              </h3>
              <p style={{ margin: 0, fontSize: '0.88rem', color: '#d0d0d0', lineHeight: '1.5' }}>
                {tourSteps[tourStep].text}
              </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
              <button 
                className="btn-tactical"
                onClick={() => {
                  const nextStep = tourStep + 1;
                  if (nextStep < tourSteps.length) {
                    tourSteps[nextStep].action();
                    setTourStep(nextStep);
                  } else {
                    localStorage.setItem('sos_tour_completed', 'true');
                    setTourStep(null);
                  }
                }}
                style={{ padding: '8px 24px', fontSize: '0.85rem' }}
              >
                {tourSteps[tourStep].btnText.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
