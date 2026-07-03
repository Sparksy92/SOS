# ChatGPT Response — Phase 8 Implementation Review

## Context

This is ChatGPT / GPT-5.5 Thinking responding to the Phase 8 implementation commit.

Commit reviewed:

```text
92d06e77353c6ec6ac975545c092bf88d4acd00d
```

Commit message:

```text
Add mission-aware offline library search
```

Phase 8 is broadly aligned with the plan, and the implementation successfully adds the major pieces:

- mission search utilities
- mission source recommendations
- source review queue
- mission source finder UI
- mission-aware Jarvis context panel
- backup v2 optional source review queue support
- documentation
- pure tests

However, do **not** consider Phase 8 fully complete until the following runtime issues are patched and verified.

---

## Required Patch 1 — Import `updateMission` in `App.jsx`

`App.jsx` now uses `updateMission(...)` inside `handleQueueSourceFromCard`, but the import currently only brings in:

```js
loadActiveMission,
saveActiveMission,
attachSavedAnswerToMission,
attachSavedSourceToMission,
attachFieldNoteToMission
```

Patch this import:

```js
import { 
  loadActiveMission,
  saveActiveMission,
  updateMission,
  attachSavedAnswerToMission,
  attachSavedSourceToMission,
  attachFieldNoteToMission
} from './modules/missions/missionStore.js';
```

Why this matters:

- Vite may still build successfully because this is a runtime free-variable issue.
- Clicking `QUEUE FOR REVIEW` from a Jarvis source card can throw `ReferenceError: updateMission is not defined`.

---

## Required Patch 2 — Fix source opening route in `ActiveMissionView.jsx`

`ActiveMissionView.jsx` uses:

```js
const url = `http://${window.location.hostname}:3001/api/materials/view?path=${encodeURIComponent(path)}`;
```

But the backend `materials.routes.js` currently exposes:

```text
GET /api/materials
POST /api/materials/refresh
```

There is no confirmed `GET /api/materials/view` route.

Patch one of these ways:

### Preferred simple option

Mirror the existing document selection/opening pattern used elsewhere in the app if available.

### If opening in a new tab is needed

Use an existing static `/materials/...` path if the server serves the local material root that way. Confirm the path format first.

### If a new route is required

Add a safe backend route with path traversal protection, but do not trigger scans, OCR, crawler runs, indexing, or parsing.

The route must:

- resolve under the allowed materials root only
- reject traversal attempts
- stream or send the file only
- not scan the library
- not index the file
- not parse/OCR the file

Do not leave the frontend pointing to a non-existent route.

---

## Required Patch 3 — Add high-risk confirmation before saving or attaching recommended sources

`MissionSourceFinder.jsx` displays risk badges, but the buttons directly call:

```js
onSaveSource(rec)
onAttachSource(rec)
onQueueSource(rec)
```

For high-risk sources, saving or attaching should use the existing `RiskSaveConfirmation` pattern before writing to saved sources or mission attachments.

Minimum required behavior:

- High-risk `SAVE SOURCE` requires acknowledgement.
- High-risk `ADD TO MISSION` requires acknowledgement.
- Queueing may remain allowed if it only stores a reference, but it must clearly retain the risk badge.

High-risk categories:

```text
medical
chemical
mushrooms
wild_plants
electrical
fuel_generator
firearms
mechanical
food_preservation
water_treatment
```

Do not silently save or attach high-risk material.

---

## Required Patch 4 — Avoid duplicate saved source records when attaching recommended sources

`ActiveMissionView.jsx` currently creates a new saved source every time `handleAttachSource(rec)` runs.

Patch the flow:

1. Check existing saved sources for the same `source` / `sourcePath`.
2. Reuse the existing saved source ID if found.
3. Only create a new saved source if no existing record exists.
4. Attach the saved source ID to the mission.
5. Let `attachSavedSourceToMission` dedupe the mission-side ID attachment.

This prevents localStorage from accumulating duplicate saved sources when the same recommended material is attached repeatedly.

---

## Required Patch 5 — Use mission-store timeline helper where practical

Several places manually append timeline event objects to `mission.timeline`.

This is acceptable short-term, but where cleanly possible, prefer existing mission-store helpers such as:

```js
addMissionTimelineEvent(...)
```

or centralize timeline event creation so event shapes remain consistent.

This is not a blocker, but it is recommended cleanup.

---

## Verification Required After Patch

Run:

```bash
cd sos-app
npm run build
```

Then:

```bash
cd ../sos-server
node --test tests/*.test.mjs
```

Manual verification:

1. Start or resume a mission.
2. Open Jarvis chat while mission is active.
3. Use a source card and click `QUEUE FOR REVIEW`.
4. Confirm there is no `updateMission is not defined` runtime error.
5. Open Field Mode.
6. Click `FIND SOURCES FOR MISSION`.
7. Save a non-risk source.
8. Attach a non-risk source.
9. Try saving/attaching a high-risk source and confirm the safety acknowledgement appears before saving/attaching.
10. Click Open Document from a recommendation and confirm it opens using a real route.
11. Export a mission report and confirm queued/recommended source sections appear.
12. Export a local backup and confirm `sourceReviewQueue` is present in backup version 2.
13. Re-import the backup and confirm v1/v2 compatibility still works.

---

## Local-First Boundary Remains Correct

Do not add:

- cloud sync
- accounts
- login
- remote storage
- telemetry
- analytics
- emergency dispatch
- automatic indexing
- crawler starts from the mission UI
- recursive scans from the mission UI

Keep Phase 8 fully local-first.

---

## Suggested Patch Commit Message

```text
Patch Phase 8 mission source review runtime issues
```

After patching, respond with:

1. Files changed
2. What was fixed
3. Test output
4. Build output
5. Commit hash
6. GitHub Actions status if available
