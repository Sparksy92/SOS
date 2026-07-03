import { localStore } from '../../services/localStore.js';

const SAVED_ANSWERS_KEY = 'saved_answers';
const SAVED_SOURCES_KEY = 'saved_sources';
const FIELD_NOTES_KEY = 'field_notes';
const REPORT_DRAFTS_KEY = 'report_drafts';
const ACTIVE_SESSION_KEY = 'active_session';

export const loadSavedAnswers = () => localStore.get(SAVED_ANSWERS_KEY, []);
export const saveAnswers = (items) => localStore.set(SAVED_ANSWERS_KEY, items);
export const addSavedAnswer = (item) => {
  const items = loadSavedAnswers();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  saveAnswers(items);
  return newItem;
};

export const loadSavedSources = () => localStore.get(SAVED_SOURCES_KEY, []);
export const saveSources = (items) => localStore.set(SAVED_SOURCES_KEY, items);
export const addSavedSource = (item) => {
  const items = loadSavedSources();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  saveSources(items);
  return newItem;
};

export const loadFieldNotes = () => localStore.get(FIELD_NOTES_KEY, []);
export const saveFieldNotes = (items) => localStore.set(FIELD_NOTES_KEY, items);
export const addFieldNote = (item) => {
  const items = loadFieldNotes();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  saveFieldNotes(items);
  return newItem;
};

export const loadReportDrafts = () => localStore.get(REPORT_DRAFTS_KEY, []);
export const saveReportDrafts = (items) => localStore.set(REPORT_DRAFTS_KEY, items);
export const addReportDraft = (item) => {
  const items = loadReportDrafts();
  const newItem = {
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...item
  };
  items.push(newItem);
  saveReportDrafts(items);
  return newItem;
};

export const loadActiveSession = () => localStore.get(ACTIVE_SESSION_KEY, {
  id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
  title: 'Active Session',
  createdAt: new Date().toISOString(),
  notes: []
});
export const saveActiveSession = (session) => localStore.set(ACTIVE_SESSION_KEY, session);
