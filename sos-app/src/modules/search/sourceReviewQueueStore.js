import { localStore } from '../../services/localStore.js';

const SOURCE_REVIEW_QUEUE_KEY = 'source_review_queue';

export const loadSourceReviewQueue = () => localStore.get(SOURCE_REVIEW_QUEUE_KEY, []);
export const saveSourceReviewQueue = (items) => localStore.set(SOURCE_REVIEW_QUEUE_KEY, items);

export const addSourceToReviewQueue = (item) => {
  const queue = loadSourceReviewQueue();
  const missionId = item.missionId || '';
  const sourcePath = item.sourcePath || '';

  // Deduplicate by missionId + sourcePath
  const exists = queue.some(x => x.missionId === missionId && x.sourcePath === sourcePath);
  if (exists) {
    return null; // Already queued for this mission
  }

  const now = new Date().toISOString();
  const newItem = {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
    createdAt: now,
    updatedAt: now,
    status: 'queued',
    notes: '',
    ...item
  };

  queue.push(newItem);
  saveSourceReviewQueue(queue);
  return newItem;
};

export const updateSourceReviewQueueItem = (id, patch) => {
  const queue = loadSourceReviewQueue();
  const idx = queue.findIndex(x => x.id === id);
  if (idx !== -1) {
    const updated = {
      ...queue[idx],
      ...patch,
      updatedAt: new Date().toISOString()
    };
    queue[idx] = updated;
    saveSourceReviewQueue(queue);
    return updated;
  }
  return null;
};

export const removeSourceReviewQueueItem = (id) => {
  const queue = loadSourceReviewQueue();
  const filtered = queue.filter(x => x.id !== id);
  saveSourceReviewQueue(filtered);
};

export const clearSourceReviewQueueForMission = (missionId) => {
  const queue = loadSourceReviewQueue();
  const filtered = queue.filter(x => x.missionId !== missionId);
  saveSourceReviewQueue(filtered);
};
