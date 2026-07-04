import { localStore } from '../../services/localStore.js';

const SETUP_PROGRESS_KEY = 'setup_progress';
const TOOLKIT_CHECKMARKS_KEY = 'toolkit_checkmarks';

export const DEFAULT_STEPS = {
  "1": { id: 1, label: "Confirm SOS local app boots", description: "Open SurvivalOS in your browser offline and verify that all dashboard elements render." },
  "2": { id: 2, label: "Confirm Jarvis/Ollama connection", description: "Verify J.A.R.V.I.S. is responsive. Check settings to ensure it communicates with Ollama locally." },
  "3": { id: 3, label: "Confirm SOS_MATERIALS_DIR", description: "Set or verify your materials directory environment path in the SOS configurations." },
  "4": { id: 4, label: "Run/request manual material manifest refresh", description: "Trigger a manual folder refresh to register available reference guides in the catalog." },
  "5": { id: 5, label: "Index one test document manually", description: "Manually trigger indexation of a single PDF or text file to confirm search capability." },
  "6": { id: 6, label: "Confirm local backup export/import", description: "Perform a local profile export and reload it to confirm your data backup works." },
  "7": { id: 7, label: "Confirm mission creation + mission brief", description: "Start a test mission (e.g. 'Water Run') and request J.A.R.V.I.S. for a status brief." },
  "8": { id: 8, label: "Confirm report export", description: "Export a PDF/Markdown survival report from your active test mission logs." },
  "9": { id: 9, label: "Confirm offline maps prepared externally", description: "Download maps for your area in OsmAnd or Organic Maps on your mobile hardware." },
  "10": { id: 10, label: "Confirm Kiwix/ZIM library availability", description: "Verify you have a Kiwix reader and the Wikipedia Medical Encyclopedia archive." },
  "11": { id: 11, label: "Confirm manual file transfer workflow", description: "Test transferring a file between your off-grid workstation and phone via LocalSend." },
  "12": { id: 12, label: "Confirm power/charging plan", description: "Verify you have backup battery packs, solar cells, or generator power to support operations." }
};

export const loadSetupProgress = () => {
  const stored = localStore.get(SETUP_PROGRESS_KEY, {});
  const progress = {};
  Object.keys(DEFAULT_STEPS).forEach(id => {
    progress[id] = stored[id] === true;
  });
  return progress;
};

export const saveSetupProgress = (progress) => {
  localStore.set(SETUP_PROGRESS_KEY, progress);
};

export const toggleStep = (stepId) => {
  const progress = loadSetupProgress();
  if (DEFAULT_STEPS[stepId]) {
    progress[stepId] = !progress[stepId];
    saveSetupProgress(progress);
  }
  return progress;
};

export const resetSetupProgress = () => {
  const progress = {};
  Object.keys(DEFAULT_STEPS).forEach(id => {
    progress[id] = false;
  });
  saveSetupProgress(progress);
  return progress;
};

export const loadToolkitCheckmarks = () => {
  return localStore.get(TOOLKIT_CHECKMARKS_KEY, []);
};

export const saveToolkitCheckmarks = (marks) => {
  localStore.set(TOOLKIT_CHECKMARKS_KEY, marks);
};

export const toggleToolkitCheckmark = (toolId) => {
  const marks = loadToolkitCheckmarks();
  const index = marks.indexOf(toolId);
  if (index === -1) {
    marks.push(toolId);
  } else {
    marks.splice(index, 1);
  }
  saveToolkitCheckmarks(marks);
  return marks;
};

export const resetToolkitCheckmarks = () => {
  saveToolkitCheckmarks([]);
  return [];
};
