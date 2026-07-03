# conversation.md — SOS Continued Project Conversation

## Purpose of this file

This is **not a handoff file**.

This file is a continued project conversation between **ChatGPT / GPT-5.5 Thinking** and the local LLM or IDE agent working inside Blair's SOS repository.

Blair wants the local LLM to read this file, understand the current project state, continue the build, and communicate back through the conversation as the project moves forward.

The local LLM should treat this as an active working conversation, not a final static instruction document.

---

## Participants

### ChatGPT / GPT-5.5 Thinking

I am ChatGPT, GPT-5.5 Thinking. I have been helping Blair plan, review, and verify the SOS project phase by phase.

My role in this continued conversation is to:

- review implementation plans
- set project boundaries
- catch unsafe or risky architecture choices
- review GitHub commits
- verify CI and files where possible
- provide detailed implementation prompts
- keep the project moving in controlled phases

### Local LLM / IDE Agent

You are the local LLM or IDE agent working directly in the SOS codebase.

Your role is to:

- read this conversation context
- inspect the repository before changing code
- implement the approved phase
- run local tests and builds
- commit and push changes
- report back with a clear implementation summary
- include the commit hash
- include any failures or issues honestly

When you respond, speak directly to ChatGPT as part of this continued project conversation. Blair may copy your response back into ChatGPT.

---

## Repository

Repository:

```text
Sparksy92/SOS
```

Branch:

```text
main
```

Current verified Phase 7 commit:

```text
38c857c32e5c3d0f78e58af1f9d2a806e1e6f9f9
```

Commit message:

```text
Implement local-first Jarvis Field Mode and Mission Mode
```

GitHub Actions:

```text
Green after Phase 7
```

---

## Project Identity

SOS is a **local-first offline survival command center app**.

Use language such as:

- SOS
- local-first command center
- offline mission dashboard
- Jarvis-powered local knowledge system
- Field Mode
- Mission Mode
- local library intelligence
- local saved data
- manual local backup
- offline material library

Do **not** use language such as:

- bootable OS
- BIOS
- UEFI
- ISO migration
- custom operating system
- Linux appliance
- cloud sync
- remote backup
- account-based storage
- hosted user data

SOS must remain an app. Do not reframe it as a bootable operating system project.

---

## Non-Negotiable Local-First Boundary

Do not implement or imply:

- cloud sync
- user accounts
- login/auth
- Supabase
- Firebase
- S3
- Google Drive
- OneDrive
- Dropbox
- GitHub as app storage
- remote backup
- cross-device sync
- background upload
- telemetry
- analytics
- remote logging
- external mission/session APIs
- emergency dispatch
- SMS sending
- email sending
- GPS/live tracking
- autonomous emergency actions

Allowed storage:

- browser `localStorage` using the existing `sos_` key pattern
- existing local backend APIs
- existing local SQLite/index systems already used by SOS
- local JSON export/import
- local Markdown/JSON report download

Manual export/import is allowed.

Automatic cloud sync is not allowed.

---

## Safety Boundary

Do not weaken safety systems.

High-risk categories include:

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

High-risk content must show warnings.

Medical content:

- reference lookup only
- not diagnosis
- not treatment
- not emergency response
- advise manual emergency/professional help when urgent

Firearms content:

- no offensive workflows
- no tactical weapon-use workflows
- no harm-oriented guidance
- existing local materials may be catalogued only as high-risk references

Emergency actions:

- SOS must not dispatch emergency services
- SOS may tell the user to manually call emergency services when appropriate

---

## Completed Phases

### Phase 1 — Homemaker Logic Integration

Imported useful local homestead/survival logic concepts from `homemaker-suite`, but did not copy its UI.

Added local modules for:

- water
- pantry
- readiness
- profile
- safety
- action guides

### Phase 2 — Dashboard Wiring

Dashboard panels were connected:

- water inventory
- pantry reserves
- readiness score
- action guides
- profile/settings
- crawler controls
- panel error boundaries

### Phase 3 — Runtime Stabilization and Material Manifest

Large-library safety was added for Blair's 500GB+ offline material collection.

Important behavior:

- no automatic full-library scan on app load
- `SOS_AUTO_CRAWL` disabled by default
- manifest cache
- manual material refresh
- video route consolidation
- health endpoint
- CI forbidden tracked file scan

### Phase 4 — Jarvis Source Trust

Jarvis answer trust was improved:

- local verified answer status
- insufficient-context fallback
- uncited fallback label
- source cards
- page/section labels
- match labels
- source excerpts
- high-risk warnings
- blocked general fallback for high-risk topics

### Phase 5 — Session Notes and Reports

Added local user-controlled record keeping:

- saved Jarvis answers
- saved source references
- field notes
- report drafts
- Markdown/JSON exports
- high-risk save acknowledgment
- no hidden AI memory

### Phase 6 — Notes/Reports UX Hardening and Local Backup

Added local backup/restore:

- local JSON backup export
- local JSON import
- validation
- dedupe/merge by ID and timestamp
- `CLEAR ALL` confirmation
- report autosave indicator
- gated high-risk Add-to-Report flow
- explicit message index handling

### Phase 7 — Field Mode / Mission Mode

Mission Mode is complete and CI is green.

Confirmed features:

- `FIELD MODE` sidebar item
- local mission storage
- active mission state
- mission templates
- mission utility functions
- Mission Mode panel
- Start Mission modal
- Active Mission view
- mission tasks/checklists
- mission timeline
- ID-based saved answer/source/note attachments
- deduped attachments
- mission Markdown/JSON export
- backup version 2 with missions and active mission
- version 1 backup import compatibility
- no cloud sync

---

# Current Conversation: Phase 8

ChatGPT to local LLM:

We are ready for **Phase 8 — Offline Library Intelligence & Mission-Aware Search**.

The goal is to make Jarvis and the local library more useful during active missions by allowing SOS to recommend relevant local sources, prioritize mission-related materials, expose indexed/unindexed status, queue sources for review, and show mission-aware context.

This must remain fully local-first.

Do not add cloud sync.

Do not add accounts.

Do not add external storage.

Do not add emergency dispatch.

---

## Phase 8 Title

```text
Offline Library Intelligence & Mission-Aware Search
```

---

## Phase 8 Goal

Make the SOS library and Jarvis chat aware of the active mission context.

The experience should feel like this:

```text
I started a Water Issue mission.
SOS knows I am working on water.
It can show local water-related manuals, source cards, saved notes, and search suggestions without uploading anything or leaving the local app.
```

Phase 8 should connect existing systems:

- Field Mode missions
- local material manifest
- Jarvis chat
- saved answers
- saved sources
- field notes
- report builder
- risk warnings
- local backup

Do not replace existing systems.

Extend them.

---

## Phase 8 Core Outcomes

Implement:

1. Mission-aware search helpers
2. Mission source recommendation engine
3. `Find Sources for Mission` action
4. Source review queue
5. Indexed/unindexed visibility
6. Mission-aware Jarvis context panel
7. Risk-aware source filters
8. Pure JavaScript tests
9. Documentation

---

## Task 0 — Inspect Before Editing

Before making changes, inspect the current repository state.

Check:

```bash
git status
git branch --show-current
git log --oneline -5
```

Confirm you are on:

```text
main
```

Confirm latest Phase 7 commit is present:

```text
38c857c32e5c3d0f78e58af1f9d2a806e1e6f9f9
```

Run existing tests/build before editing if practical:

```bash
cd sos-app
npm install
npm run build
```

```bash
cd ../sos-server
npm install
cd ..
node --test sos-server/tests/*.test.mjs
```

If CI or local tests are already failing, report that first and fix the failure before adding Phase 8.

---

## Task 1 — Add Mission Search Utility Module

Create:

```text
sos-app/src/modules/search/missionSearchUtils.js
```

This must be pure JavaScript and testable in Node.

Export:

```js
normalizeText(value)
tokenizeSearchText(value)
buildMissionSearchTerms(mission, template)
scoreMaterialForMission(material, mission, options)
rankMaterialsForMission(materials, mission, options)
filterMaterialsByRisk(materials, riskFilters)
filterMaterialsByIndexStatus(materials, indexStatus)
buildMissionSearchSummary(rankedMaterials)
```

### Expected behavior

`buildMissionSearchTerms(mission, template)` should combine:

- mission title
- mission type
- mission overview
- objectives
- checklist labels
- custom task labels
- template suggested source searches
- risk category terms if applicable

Example output for a water mission:

```js
[
  "water",
  "filtration",
  "stored water",
  "water treatment",
  "containers",
  "filter replacement",
  "sanitization",
  "boiling",
  "water safety"
]
```

`scoreMaterialForMission(material, mission, options)` should score using:

- filename matches
- path/category matches
- metadata title matches
- metadata summary matches
- risk category match
- indexed status
- useful file extension
- exact phrase match
- mission type boost

Return a transparent object:

```js
{
  material,
  score: 42,
  reasons: [
    "Matched mission term: water",
    "Risk category match: water_treatment",
    "Indexed document",
    "PDF reference"
  ],
  riskCategory: "water_treatment",
  indexed: true,
  matchLabel: "Strong Match"
}
```

Do not use fake confidence percentages.

Use match labels:

```text
Strong Match
Related
Weak Match
Needs Review
```

---

## Task 2 — Add Mission Source Recommendation Module

Create:

```text
sos-app/src/modules/search/missionSourceRecommendations.js
```

Export:

```js
getMissionSourceRecommendations({
  mission,
  materials,
  metadata,
  template,
  limit,
  riskFilters,
  indexStatus,
  fileTypes
})
```

Return:

```js
{
  missionId,
  generatedAt,
  totalScanned,
  totalRecommended,
  recommendations: [
    {
      sourcePath,
      title,
      category,
      extension,
      score,
      matchLabel,
      reasons,
      riskCategory,
      indexed,
      metadataSummary,
      suggestedActions
    }
  ]
}
```

`suggestedActions` may include:

```text
open_document
index_document
save_source
add_to_mission
queue_for_review
review_safety
```

If a recommendation has a high-risk category, include:

```text
review_safety
```

Do not store full document contents.

Do not call external APIs.

---

## Task 3 — Add Source Review Queue Store

Create:

```text
sos-app/src/modules/search/sourceReviewQueueStore.js
```

Use `localStore`.

Key:

```text
source_review_queue
```

Queue item shape:

```js
{
  id,
  createdAt,
  updatedAt,
  missionId,
  sourcePath,
  title,
  reason,
  riskCategory,
  status: "queued" | "reviewing" | "saved" | "attached" | "dismissed",
  notes: ""
}
```

Export:

```js
loadSourceReviewQueue()
saveSourceReviewQueue(items)
addSourceToReviewQueue(item)
updateSourceReviewQueueItem(id, patch)
removeSourceReviewQueueItem(id)
clearSourceReviewQueueForMission(missionId)
```

Rules:

- dedupe by `missionId + sourcePath`
- store references only
- do not store full document text
- do not index automatically
- do not upload anything

---

## Task 4 — Add Mission Source Finder Component

Create:

```text
sos-app/src/components/missions/MissionSourceFinder.jsx
```

Render it inside the active mission view.

Features:

- button: `FIND SOURCES FOR MISSION`
- source recommendation cards
- filters:
  - indexed only
  - unindexed only
  - all
  - risk category
  - file type
- match labels:
  - Strong Match
  - Related
  - Weak Match
  - Needs Review
- recommendation reasons
- buttons:
  - Open Document
  - Save Source
  - Add to Active Mission
  - Queue for Review
  - Index Document if safely available
- high-risk badges

Important:

- do not automatically index documents
- do not trigger deep index
- do not trigger crawler rebuild
- if indexing from this component is not safe yet, show “Index from Library Panel” instead

---

## Task 5 — Add Mission-Aware Jarvis Context Panel

Create:

```text
sos-app/src/components/missions/MissionJarvisContextPanel.jsx
```

Show near the chat panel when an active mission exists.

Display:

- active mission title
- mission type
- priority
- detected risk categories
- attached answers count
- attached sources count
- attached notes count

Quick actions:

- Find Sources
- Create Mission Note
- Open Field Mode
- Export Mission Report

Also show safe suggested prompts from the mission template.

Water mission examples:

```text
Search my local library for water storage and filtration references relevant to this mission.
Summarize the saved sources attached to this water mission.
Create a cautious checklist of questions I should verify from local manuals before taking action.
```

First Aid Reference Lookup examples:

```text
Search my local library for first-aid reference materials related to this mission.
Summarize only what the local sources say, and include a warning that this is not medical advice.
List what information I should verify with emergency services or a qualified medical professional if urgent.
```

Do not create prompts that ask Jarvis to diagnose, prescribe, perform dangerous actions, or bypass warnings.

---

## Task 6 — Wire Source Finder into ActiveMissionView

Modify:

```text
sos-app/src/components/missions/ActiveMissionView.jsx
```

Add:

- `MissionSourceFinder`
- risk-aware source recommendations
- source review queue summary
- queued sources list
- indexed/unindexed counts if available
- attached source count
- quick links

When a source is saved and attached:

1. Save source reference if not already saved.
2. Attach saved source ID to the mission.
3. Add timeline event.
4. Do not duplicate if already attached.

---

## Task 7 — Wire Mission Context into App Chat

Modify:

```text
sos-app/src/App.jsx
```

When an active mission exists, show:

- mission-aware context panel
- active mission indicator
- quick mission actions

Under Jarvis answers, add or preserve:

- Add Answer to Active Mission
- Add Sources to Active Mission
- Create Mission Note

On source cards, add or preserve:

- Add Source to Active Mission
- Queue Source for Mission Review

If high-risk, require the existing safety confirmation before saving or attaching.

Do not attach high-risk items silently.

---

## Task 8 — Indexed / Unindexed Visibility

Use manifest/index information already available in SOS.

Where practical, display:

- indexed
- unindexed
- unknown index status

In mission source recommendations, label cards clearly:

```text
INDEXED
UNINDEXED
UNKNOWN
```

Do not start indexing automatically.

If the component supports indexing one document, call only the existing safe single-document index endpoint.

Do not call:

- deep rebuild
- crawler start
- full-library scan
- OCR batch
- zip extraction

---

## Task 9 — Extend Mission Reports

Modify:

```text
sos-app/src/modules/reports/reportExport.js
```

If not already complete, improve:

```js
generateMissionMarkdownReport(mission, relatedData)
generateMissionJSONReport(mission, relatedData)
```

Add optional sections for Phase 8:

- recommended sources reviewed
- queued sources
- indexed/unindexed counts
- risk categories found
- source recommendation reasons

Do not include full document contents.

Only include:

- title
- path
- excerpt already saved by user
- risk category
- match label
- recommendation reason

---

## Task 10 — Local Backup Version

Do not introduce version 3 unless necessary.

Prefer keeping backup version 2 if the source review queue can be included safely without breaking version 2 shape.

If adding source review queue to backups, either:

Option A:

```text
Keep version 2 and add optional sourceReviewQueue field.
Version 2 import accepts missing sourceReviewQueue.
```

or Option B:

```text
Upgrade to version 3 only if the validation logic clearly supports v1, v2, and v3.
```

Preferred: Option A.

Add source review queue to local backup export/import if practical.

Do not break existing v1 or v2 imports.

---

## Task 11 — Tests

Add pure JavaScript tests.

Suggested file:

```text
sos-server/tests/missionSearch.test.mjs
```

Tests should not require:

- browser DOM
- React
- Vite
- Ollama
- FFmpeg
- real PDFs
- real videos
- 500GB library

Test:

- mission search term creation
- material scoring
- ranking order
- risk filtering
- indexed/unindexed filtering
- recommendation shape
- source review queue dedupe helper if pure/testable
- high-risk recommended action includes `review_safety`
- report export includes recommendation/queue sections if implemented

If browser localStorage is needed, mock it or split pure functions out.

Existing command should keep working:

```bash
node --test sos-server/tests/*.test.mjs
```

---

## Task 12 — Documentation

Create or update:

```text
docs/mission-aware-library-search.md
```

Document:

- what mission-aware search does
- that it is local-only
- that it uses local manifest/material metadata
- that it does not upload data
- how to use Find Sources for Mission
- what match labels mean
- what indexed/unindexed means
- how source review queue works
- high-risk source warning behavior
- how recommendations appear in mission reports
- backup behavior if source review queue is included

---

## Task 13 — Acceptance Criteria

Phase 8 is complete only when:

- frontend builds
- backend tests pass
- GitHub Actions passes
- no cloud sync introduced
- no account/login introduced
- no remote storage introduced
- active mission can find recommended local sources
- recommendations show match reasons
- recommendations show risk badges
- recommendations show indexed/unindexed status
- user can queue a source for review
- user can save a recommended source
- user can attach a recommended source to the active mission
- user can see mission-aware context near Jarvis
- user can use safe suggested mission prompts
- high-risk recommendations require warnings
- report export can include recommendation/review context
- documentation exists

---

## Recommended Commit Message

```text
Add mission-aware offline library search
```

---

## Response Expected from Local LLM

After reading this conversation and before coding, reply with:

1. Your understanding of Phase 8
2. Files you expect to modify or create
3. Any risks you see
4. Confirmation that you will not implement cloud sync or external persistence

After coding, reply with:

1. Summary of work completed
2. Tests run
3. Build result
4. Commit hash
5. Any issues or follow-up recommendations

Continue speaking as part of this project conversation.
