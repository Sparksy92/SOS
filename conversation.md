# conversation.md — SOS Continued Project Conversation

## Purpose of this file

This is **not a handoff file**.

This file is the active continued project conversation between **ChatGPT / GPT-5.5 Thinking** and the local LLM or IDE agent working inside Blair's SOS repository.

Blair wants the local LLM to read this file, understand the current project state, continue the build, and communicate back through this project conversation as the project moves forward.

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
- implement only the approved phase
- run local tests and builds
- commit and push changes
- report back with a clear implementation summary
- include the commit hash
- include test/build results
- include any failures or issues honestly

When you respond, speak directly to ChatGPT as part of this continued project conversation. Blair may copy your response back into ChatGPT, or commit your response into this file.

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

Current verified latest Phase 8 patch commit:

```text
7fc780395730ea93b8ed5a712adfe75732bb4a4f
```

Commit message:

```text
Patch Phase 8 mission source review runtime issues
```

GitHub Actions:

```text
Green after Phase 8 patch
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

# Completed Phase Summary

## Phase 1 — Homemaker Logic Integration

Imported useful local homestead/survival logic concepts from `homemaker-suite`, but did not copy its UI.

Added local modules for:

- water
- pantry
- readiness
- profile
- safety
- action guides

## Phase 2 — Dashboard Wiring

Dashboard panels were connected:

- water inventory
- pantry reserves
- readiness score
- action guides
- profile/settings
- crawler controls
- panel error boundaries

## Phase 3 — Runtime Stabilization and Material Manifest

Large-library safety was added for Blair's 500GB+ offline material collection.

Important behavior:

- no automatic full-library scan on app load
- `SOS_AUTO_CRAWL` disabled by default
- manifest cache
- manual material refresh
- video route consolidation
- health endpoint
- CI forbidden tracked file scan

## Phase 4 — Jarvis Source Trust

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

## Phase 5 — Session Notes and Reports

Added local user-controlled record keeping:

- saved Jarvis answers
- saved source references
- field notes
- report drafts
- Markdown/JSON exports
- high-risk save acknowledgment
- no hidden AI memory

## Phase 6 — Notes/Reports UX Hardening and Local Backup

Added local backup/restore:

- local JSON backup export
- local JSON import
- validation
- dedupe/merge by ID and timestamp
- `CLEAR ALL` confirmation
- report autosave indicator
- gated high-risk Add-to-Report flow
- explicit message index handling

## Phase 7 — Field Mode / Mission Mode

Mission Mode is complete and CI is green.

Verified Phase 7 commit:

```text
38c857c32e5c3d0f78e58af1f9d2a806e1e6f9f9
```

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

## Phase 8 — Offline Library Intelligence & Mission-Aware Search

Phase 8 is complete and CI is green.

Implementation commit:

```text
92d06e77353c6ec6ac975545c092bf88d4acd00d
```

Implementation message:

```text
Add mission-aware offline library search
```

Runtime patch commit:

```text
7fc780395730ea93b8ed5a712adfe75732bb4a4f
```

Runtime patch message:

```text
Patch Phase 8 mission source review runtime issues
```

GitHub Actions:

```text
Green after Phase 8 patch
```

Confirmed Phase 8 features:

- mission-aware search utility module
- mission source recommendation module
- local source review queue store
- Mission Source Finder UI
- Mission Jarvis Context Panel
- source recommendation cards with match reasons
- indexed/unindexed visibility
- risk badges
- source queue for review
- safe save/attach actions
- high-risk confirmation before saving or attaching recommended sources
- deduped source attachment flow
- source review queue included in backup version 2 as optional data
- report export sections for queued/recommended sources
- documentation under `docs/mission-aware-library-search.md`
- pure JavaScript tests for search/recommendation behavior
- no cloud sync
- no accounts
- no remote storage
- no telemetry
- no automatic indexing
- no crawler starts from mission UI

Phase 8 issues found and patched:

1. `App.jsx` needed `updateMission`/timeline helper imports for queue actions.
2. `ActiveMissionView.jsx` initially pointed Open Document at a non-existent `/api/materials/view` route; this was changed to use the static `/materials/...` path format.
3. High-risk save/attach actions now use `RiskSaveConfirmation`.
4. Attach source now checks existing saved source records before creating a duplicate.
5. Timeline events were refactored toward `addMissionTimelineEvent`.

---

# Current Conversation: Phase 9 Proposal

ChatGPT to local LLM:

Phase 8 is complete. The next recommended phase is:

```text
Phase 9 — Local Index Integrity & Jarvis Retrieval Reliability
```

## Phase 9 Purpose

Make sure every document shown as `INDEXED` is actually searchable by Jarvis, and fix the split between the manual index flow and the SQLite retrieval flow.

Current concern:

- Manual `/api/index` appears to use the older vector-store/HNSW indexing path in `ai.js`.
- Jarvis chat retrieval reads from SQLite `document_chunks`.
- This means a document can appear indexed or be manually indexed but still not be reliably queryable by Jarvis.

Phase 9 should improve reliability before adding more features.

---

## Phase 9 Goals

Implement a local-only indexing integrity layer that:

1. Clearly defines what `indexed` means.
2. Ensures manual single-document indexing writes into the same retrieval store Jarvis uses.
3. Audits indexed/unindexed status against the actual SQLite `document_chunks` table.
4. Fixes any path mismatch between manifest paths, crawler paths, OCR markdown paths, and Jarvis source paths.
5. Adds repair/check tools without triggering full-library scans automatically.
6. Keeps all indexing local.
7. Adds tests proving indexing status and retrieval paths stay consistent.

---

## Critical Constraint

Do not trigger:

- full-library scan on startup
- automatic crawler start
- deep rebuild
- OCR batch
- ZIP extraction
- cloud sync
- remote indexing
- external APIs

Only use explicit user actions.

---

## Phase 9 Scope to Inspect

Before coding, inspect:

```text
sos-server/index.js
sos-server/ai.js
sos-server/crawler.js
sos-server/db.js
sos-server/services/manifestService.js
sos-server/routes/materials.routes.js
sos-app/src/App.jsx
sos-app/src/components/missions/MissionSourceFinder.jsx
```

Pay special attention to:

- `/api/index`
- `indexFile(...)` in `ai.js`
- SQLite `document_chunks`
- `checkIndexed(...)` in manifest service
- crawler `indexToSqlite(...)`
- document path formats such as `/materials/...` vs relative filesystem paths
- OCR markdown lookup paths
- source cards' `documentPath` / `source` values

---

## Expected Phase 9 Deliverables

Recommended files to create or modify:

```text
sos-server/services/indexIntegrityService.js
sos-server/routes/index.routes.js
sos-server/tests/indexIntegrity.test.mjs
sos-server/index.js
sos-server/ai.js
sos-server/crawler.js
sos-server/services/manifestService.js
sos-app/src/components/library/IndexIntegrityPanel.jsx
sos-app/src/App.jsx
docs/index-integrity-and-retrieval.md
```

Adjust file names if the existing project structure suggests a cleaner fit.

---

## Required Backend Behavior

Add or refactor backend behavior so there is one clear source of truth for Jarvis-searchable indexing.

Suggested local endpoints:

```text
GET /api/index/status?path=/materials/...
POST /api/index/document
POST /api/index/audit
POST /api/index/repair-status
```

Rules:

- `GET /api/index/status` checks whether a document has chunks in SQLite.
- `POST /api/index/document` indexes one explicit document into SQLite `document_chunks`.
- `POST /api/index/audit` audits manifest indexed flags against SQLite counts, but does not scan the filesystem.
- `POST /api/index/repair-status` updates cached manifest/index flags based on SQLite, but does not parse documents.

Do not remove old routes unless compatibility is preserved.

Existing `/api/index` may remain as an alias, but it should use the unified SQLite indexing path.

---

## Required Frontend Behavior

Add an index integrity panel or compact library status tool that can:

- show whether selected document is indexed in the Jarvis retrieval store
- allow explicit single-document indexing
- show indexed/unindexed/unknown status
- run an explicit local index audit
- never run deep scans automatically
- never trigger OCR automatically
- never trigger ZIP extraction

Mission Source Finder should use the corrected indexing status once available.

---

## Required Tests

Add pure/local tests for:

- path normalization from `/materials/...` to backend relative path
- SQLite indexed-status check
- no false positive indexed status when chunks are absent
- no automatic crawler start
- single-document indexing route uses SQLite retrieval store
- old `/api/index` compatibility if retained
- manifest repair updates flags without scanning/parsing files

Tests must not require:

- 500GB material library
- real PDFs if avoidable
- Ollama
- FFmpeg
- browser DOM
- cloud/network

Use temporary test database paths when possible.

---

## Phase 9 Acceptance Criteria

Phase 9 is complete only when:

- frontend builds
- backend tests pass
- GitHub Actions passes
- manual single-document index writes to Jarvis retrieval store
- `indexed` means SQLite chunks exist for that document
- mission source finder status aligns with actual Jarvis-searchable status
- no full-library scans occur automatically
- no crawler starts automatically
- no OCR batch starts automatically
- no ZIP extraction starts automatically
- no cloud/external persistence is added
- documentation exists

---

## Recommended Response From Local LLM Before Coding

Before implementing Phase 9, respond with:

1. Your understanding of the indexing mismatch risk.
2. What files you will inspect.
3. What backend route/API shape you propose.
4. How you will preserve local-only behavior.
5. What tests you will add.
6. Any risks or uncertainties you see.

Do not start coding Phase 9 until the plan is approved.

---

## Recommended Commit Message for Phase 9 Planning Response

```text
Acknowledge Phase 9 index integrity plan
```
