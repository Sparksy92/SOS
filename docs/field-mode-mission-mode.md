# SurvivalOS: Jarvis Field Mode & Mission Mode (Local-First Offline)

This guide documents the local active operational field sessions (Missions) framework integrated into the SurvivalOS terminal dashboard and J.A.R.V.I.S. (Local AI).

## Overview & Design Directive

Field Mode allows operators to:
1.  Initialize guided checklists and mission objectives for specific situational contexts.
2.  Maintain a live chronological event timeline log locally.
3.  Directly query J.A.R.V.I.S. and attach verified source citations, AI logs, and notes to the active mission dossier.
4.  Export structured Markdown and JSON reports completely offline for physical storage.

> [!IMPORTANT]
> **Strict Local-First Architecture**: All Mission Mode data, active operational states, and backups stay stored in the browser's local sandbox (`localStorage`) with the standard `sos_` prefix keys.
> *   No cloud synchronization, accounts, logins, external databases, or network telemetry are present.
> *   All transfers, reports, and data restores are done manually by exporting or importing JSON backups.

---

## Operational Templates

SurvivalOS includes 6 preloaded situational configuration templates:

1.  **Blackout / Power Outage**
    *   *Directives*: Auxiliary reserve auditing, emergency lighting checklists, cold-chain safety planning, and local VHF/UHF radio protocols.
    *   *Risk Category*: Electrical.
2.  **Water Issue / Filtration Review**
    *   *Directives*: Primary and backup supply verification, volume metrics auditing, and filter age checks.
    *   *Risk Category*: Water Treatment.
3.  **Storm Preparation**
    *   *Directives*: Homestead securing, device charge consolidation, shelter audits, and evacuation mapping.
    *   *Risk Category*: None.
4.  **Vehicle Repair / Breakdown Planning**
    *   *Directives*: Mechanical diagnostic symptoms cataloging, offline manual chapter matching, and tool planning.
    *   *Risk Category*: Mechanical.
5.  **Homestead Readiness Check**
    *   *Directives*: Comprehensive auditing of water logs, pantry stock, auxiliary batteries, and readiness calculation metrics.
    *   *Risk Category*: None.
6.  **First Aid Reference Lookup**
    *   *Directives*: Reference manual retrieval logs, medical trauma kit inventory audits, and offline procedural lookup trackers.
    *   *Risk Category*: Medical.

---

## Operator Workflows

### Starting a Mission Session
1.  Click the **FIELD MODE** navigation item in the sidebar.
2.  Click **START NEW MISSION**.
3.  Select a Situational Template or enter custom parameters.
4.  Click **START MISSION PROTOCOL**. The session is now mounted to the active operational HUD.

### Attaching Resources from J.A.R.V.I.S. Chat
When an active mission is running, a banner is displayed at the top of the chat panel indicating: `⚡ ACTIVE FIELD MODE: [Title]`.
Under any AI answer bubble:
*   Click **ADD ANSWER TO MISSION** to copy and link the AI log to the active session.
*   Click **ADD SOURCES TO MISSION** to link all RAG book citations.
*   Click **CREATE MISSION NOTE** to compose a new note prefitted with the Jarvis query contents.
On individual source citation cards:
*   Click **ADD TO MISSION** to link that specific snippet excerpt.

### Generating Mission Reports
From the Active Mission View:
*   Click **EXPORT MD REPORT** to compile situation overviews, checklist objectives, timeline events, and attached references into a clean, physical-print-ready Markdown document.
*   Click **EXPORT JSON DATA** to save the raw state payload.

---

## Data Schema & Backups

Backup version `2` incorporates the missions database and active operational states. 

### Version 2 JSON Format:
```json
{
  "backupType": "sos_session_backup",
  "version": 2,
  "exportedAt": "2026-07-03T16:30:00.000Z",
  "data": {
    "savedAnswers": [],
    "savedSources": [],
    "fieldNotes": [],
    "reportDrafts": [],
    "activeSession": null,
    "missions": [],
    "activeMission": null
  }
}
```

Importing validation deduplicates mission lists by comparing timestamps (`updatedAt` / `createdAt`), ensuring repeated backup restores do not duplicate existing records.
