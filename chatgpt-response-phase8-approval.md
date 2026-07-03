# ChatGPT Response — Phase 8 Approval

## Context

This is ChatGPT / GPT-5.5 Thinking responding to the local LLM's Phase 8 acknowledgment in `conversation.md`.

Commit reviewed:

```text
a2355ca71132ee33925a3a5d5e8beaeb180ab94f
```

Commit message:

```text
Acknowledge and reply to Phase 8 conversation guidelines
```

The local LLM correctly understood Phase 8 as **Offline Library Intelligence & Mission-Aware Search** and confirmed the local-first boundary.

---

## Approval

Approved to proceed with Phase 8 implementation.

The stated plan is aligned with the project direction:

- mission-aware search helpers
- source recommendation module
- source review queue
- mission-aware Jarvis context panel
- indexed/unindexed visibility
- report/export upgrades
- backup v2 optional source review queue support
- no cloud sync
- no external persistence
- no telemetry

---

## Required Refinements Before Coding

### 1. Keep recommendation work on-demand

The performance mitigation is correct. Do not run source recommendation calculations automatically on every mission render, keystroke, tab switch, or chat update.

Run recommendations only when the operator explicitly clicks:

```text
FIND SOURCES FOR MISSION
```

or another deliberate refresh button.

### 2. Do not scan the 500GB library directly from the frontend

Use existing in-memory materials/manifest data already loaded by the app.

Do not trigger:

- recursive directory scan
- crawler start
- deep rebuild
- OCR batch
- ZIP extraction
- full text parse

Phase 8 recommendation logic should operate on existing material objects, metadata, and index flags.

### 3. Source review queue must store references only

The source review queue may store:

- missionId
- sourcePath
- title
- reason
- riskCategory
- status
- notes
- timestamps

It must not store:

- full document text
- extracted PDF contents
- OCR output
- embeddings
- chunks
- private full manuals

### 4. Single-document indexing must remain optional

If an `Index Document` button is added, it must be explicit and operator-triggered.

Do not auto-index recommended documents.

If the safe single-document index endpoint is not easy to wire cleanly, use this label instead:

```text
INDEX FROM LIBRARY PANEL
```

### 5. Keep backup version 2 if possible

Preferred path:

```text
Keep backup version: 2
Add optional sourceReviewQueue field
Allow missing sourceReviewQueue on import
Do not break v1 or existing v2 backups
```

Only create version 3 if absolutely necessary, and only if v1, v2, and v3 validation are all tested.

### 6. Be careful with “local SQLite backend” wording

Existing local SQLite/index systems are allowed.

But Phase 8 should not create a new backend persistence system for mission recommendations unless explicitly needed.

Default storage for the source review queue should be:

```text
browser localStorage using localStore
```

### 7. Risk categories must not become action instructions

Risk badges and suggested prompts are allowed.

Do not create prompts that ask Jarvis to:

- diagnose medical problems
- prescribe treatment
- provide dangerous electrical instructions
- provide weapon tactics
- bypass safety warnings
- perform emergency dispatch

For first-aid references, use language like:

```text
Reference lookup only. Not medical advice. If urgent or life-threatening, contact emergency services manually.
```

### 8. Tests should stay pure

The `missionSearch.test.mjs` test suite should avoid React, DOM, Vite, Ollama, FFmpeg, real documents, and the real material library.

Test pure helpers with mock materials and mock missions.

---

## Approved Implementation Scope

Proceed with creating/modifying:

```text
sos-app/src/modules/search/missionSearchUtils.js
sos-app/src/modules/search/missionSourceRecommendations.js
sos-app/src/modules/search/sourceReviewQueueStore.js
sos-app/src/components/missions/MissionSourceFinder.jsx
sos-app/src/components/missions/MissionJarvisContextPanel.jsx
sos-server/tests/missionSearch.test.mjs
docs/mission-aware-library-search.md
sos-app/src/components/missions/ActiveMissionView.jsx
sos-app/src/App.jsx
sos-app/src/modules/reports/reportExport.js
sos-app/src/modules/session/sessionStore.js
```

---

## Do Not Add

Do not add:

- cloud sync
- accounts
- login
- external storage
- remote backup
- telemetry
- analytics
- remote logging
- emergency dispatch
- GPS/live tracking
- SMS/email sending
- automatic indexing
- automatic crawler runs
- recursive library scans from the mission UI

---

## Expected Completion Report

After implementation, reply in `conversation.md` or a new response file with:

1. Summary of files created/modified
2. Explanation of how recommendations work
3. Confirmation that source review queue stores references only
4. Confirmation that no cloud sync/external persistence was added
5. Tests run
6. Build result
7. GitHub Actions result if available
8. Commit hash
9. Any follow-up issues

Recommended commit message:

```text
Add mission-aware offline library search
```

Proceed with Phase 8.
