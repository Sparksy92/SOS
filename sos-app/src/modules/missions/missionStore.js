import { localStore } from '../../services/localStore.js';
import { addTimelineEvent } from './missionUtils.js';

const MISSIONS_KEY = 'missions';
const ACTIVE_MISSION_KEY = 'active_mission';

export const loadMissions = () => localStore.get(MISSIONS_KEY, []);
export const saveMissions = (items) => localStore.set(MISSIONS_KEY, items);

export const addMission = (mission) => {
  const list = loadMissions();
  list.push(mission);
  saveMissions(list);
  return mission;
};

export const updateMission = (id, patch) => {
  const list = loadMissions();
  const idx = list.findIndex(m => m.id === id);
  if (idx !== -1) {
    const updated = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
    list[idx] = updated;
    saveMissions(list);
    
    // Check active mission synchronization
    const active = loadActiveMission();
    if (active && active.id === id) {
      saveActiveMission(updated);
    }
    return updated;
  }
  return null;
};

export const deleteMission = (id) => {
  const list = loadMissions();
  const filtered = list.filter(m => m.id !== id);
  saveMissions(filtered);

  const active = loadActiveMission();
  if (active && active.id === id) {
    clearActiveMission();
  }
};

export const loadActiveMission = () => localStore.get(ACTIVE_MISSION_KEY, null);
export const saveActiveMission = (mission) => localStore.set(ACTIVE_MISSION_KEY, mission);
export const clearActiveMission = () => localStore.remove(ACTIVE_MISSION_KEY);

export const addMissionTimelineEvent = (missionId, event) => {
  const list = loadMissions();
  const idx = list.findIndex(m => m.id === missionId);
  if (idx !== -1) {
    const updated = addTimelineEvent(list[idx], event.type, event.label, event.details || {});
    list[idx] = updated;
    saveMissions(list);

    const active = loadActiveMission();
    if (active && active.id === missionId) {
      saveActiveMission(updated);
    }
    return updated;
  }
  return null;
};

export const addMissionTask = (missionId, taskObj) => {
  const list = loadMissions();
  const idx = list.findIndex(m => m.id === missionId);
  if (idx !== -1) {
    const mission = list[idx];
    const updatedTasks = [...(mission.tasks || []), taskObj];
    const updatedMission = addTimelineEvent(
      { ...mission, tasks: updatedTasks, updatedAt: new Date().toISOString() },
      'task_updated',
      `Custom task added: "${taskObj.label}"`,
      { taskId: taskObj.id }
    );
    list[idx] = updatedMission;
    saveMissions(list);

    const active = loadActiveMission();
    if (active && active.id === missionId) {
      saveActiveMission(updatedMission);
    }
    return updatedMission;
  }
  return null;
};

export const updateMissionTask = (missionId, taskId, patch) => {
  const list = loadMissions();
  const idx = list.findIndex(m => m.id === missionId);
  if (idx !== -1) {
    const mission = list[idx];
    
    // Check checklist tasks first, then custom tasks
    let updatedChecklist = [...(mission.checklist || [])];
    let updatedTasks = [...(mission.tasks || [])];
    let taskLabel = '';
    let isCompletedTransition = false;

    const cIdx = updatedChecklist.findIndex(t => t.id === taskId);
    if (cIdx !== -1) {
      const originalStatus = updatedChecklist[cIdx].status;
      updatedChecklist[cIdx] = { ...updatedChecklist[cIdx], ...patch, updatedAt: new Date().toISOString() };
      taskLabel = updatedChecklist[cIdx].label;
      if (patch.status === 'done' && originalStatus !== 'done') {
        updatedChecklist[cIdx].completedAt = new Date().toISOString();
        isCompletedTransition = true;
      }
    } else {
      const tIdx = updatedTasks.findIndex(t => t.id === taskId);
      if (tIdx !== -1) {
        const originalStatus = updatedTasks[tIdx].status;
        updatedTasks[tIdx] = { ...updatedTasks[tIdx], ...patch, updatedAt: new Date().toISOString() };
        taskLabel = updatedTasks[tIdx].label;
        if (patch.status === 'done' && originalStatus !== 'done') {
          updatedTasks[tIdx].completedAt = new Date().toISOString();
          isCompletedTransition = true;
        }
      }
    }

    let updatedMission = {
      ...mission,
      checklist: updatedChecklist,
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    };

    if (isCompletedTransition) {
      updatedMission = addTimelineEvent(
        updatedMission,
        'task_updated',
        `Task completed: "${taskLabel}"`,
        { taskId, status: 'done' }
      );
    } else if (patch.status) {
      updatedMission = addTimelineEvent(
        updatedMission,
        'task_updated',
        `Task "${taskLabel}" updated to ${patch.status.toUpperCase()}`,
        { taskId, status: patch.status }
      );
    }

    list[idx] = updatedMission;
    saveMissions(list);

    const active = loadActiveMission();
    if (active && active.id === missionId) {
      saveActiveMission(updatedMission);
    }
    return updatedMission;
  }
  return null;
};

export const attachSavedAnswerToMission = (missionId, answerId) => {
  const list = loadMissions();
  const idx = list.findIndex(m => m.id === missionId);
  if (idx !== -1) {
    const mission = list[idx];
    const savedAnswerIds = [...(mission.savedAnswerIds || [])];
    if (!savedAnswerIds.includes(answerId)) {
      savedAnswerIds.push(answerId);
      const updatedMission = addTimelineEvent(
        { ...mission, savedAnswerIds, updatedAt: new Date().toISOString() },
        'answer_added',
        'Ranger chat answer attached to session log.',
        { answerId }
      );
      list[idx] = updatedMission;
      saveMissions(list);

      const active = loadActiveMission();
      if (active && active.id === missionId) {
        saveActiveMission(updatedMission);
      }
      return updatedMission;
    }
  }
  return null;
};

export const attachSavedSourceToMission = (missionId, sourceId) => {
  const list = loadMissions();
  const idx = list.findIndex(m => m.id === missionId);
  if (idx !== -1) {
    const mission = list[idx];
    const savedSourceIds = [...(mission.savedSourceIds || [])];
    if (!savedSourceIds.includes(sourceId)) {
      savedSourceIds.push(sourceId);
      const updatedMission = addTimelineEvent(
        { ...mission, savedSourceIds, updatedAt: new Date().toISOString() },
        'source_added',
        'Manual library citation reference attached to session log.',
        { sourceId }
      );
      list[idx] = updatedMission;
      saveMissions(list);

      const active = loadActiveMission();
      if (active && active.id === missionId) {
        saveActiveMission(updatedMission);
      }
      return updatedMission;
    }
  }
  return null;
};

export const attachFieldNoteToMission = (missionId, noteId) => {
  const list = loadMissions();
  const idx = list.findIndex(m => m.id === missionId);
  if (idx !== -1) {
    const mission = list[idx];
    const fieldNoteIds = [...(mission.fieldNoteIds || [])];
    if (!fieldNoteIds.includes(noteId)) {
      fieldNoteIds.push(noteId);
      const updatedMission = addTimelineEvent(
        { ...mission, fieldNoteIds, updatedAt: new Date().toISOString() },
        'note_added',
        'Field note entry attached to session log.',
        { noteId }
      );
      list[idx] = updatedMission;
      saveMissions(list);

      const active = loadActiveMission();
      if (active && active.id === missionId) {
        saveActiveMission(updatedMission);
      }
      return updatedMission;
    }
  }
  return null;
};
