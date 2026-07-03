# SurvivalOS: Mission-Aware Library Search & Source Review Queue

This guide documents the mission-aware offline search recommendation engine and operator review queue system in SurvivalOS.

## Overview & Design Directives

To optimize offline homestead research, SurvivalOS allows the local J.A.R.V.I.S. assistant and the active operational context (Missions) to suggest relevant books, manuals, and guides from the operator's offline reference library manifest. 

### Core Features:
1.  **Context-Driven Recommendations**: Scores and ranks offline documents automatically using tokenized matching against mission parameters (objectives, situation summary, checklists).
2.  **Indexed/Unindexed Expose**: Identifies which documents are already indexed in the local SQLite RAG database (ready for Jarvis prompt queries) or unindexed (requires library panel indexing).
3.  **Source Review Queue**: Stages recommended manuals in a workspace review queue for manual checking, ensuring operators do not lose reference paths during intense field tasks.
4.  **100% Offline Integrity**: Recommends local files purely based on cached manifest data loaded inside the browser. No folder crawls, deep scanning, external lookups, or telemetry are used.

---

## Matches & Scoring Thresholds

Documents are evaluated transparently without artificial percentages. Recommendations are categorized into four match labels:

*   **Strong Match**: Overlapping risk categories, exact phrase matches for mission titles, and multiple key terms. Highly recommended reference guides.
*   **Related**: Partial term overlaps or matching categories. Secondary reference manuals.
*   **Weak Match**: Single term overlaps. Might contain general context.
*   **Needs Review**: Evaluated but failed to match target keywords.

---

## Operator Workflows

### 1. Finding Recommended Sources
1.  Navigate to **FIELD MODE** and select your active mission log.
2.  Scroll to the **Local Material Recommendation System** section.
3.  Click **FIND SOURCES FOR MISSION** to run an offline match scan.
4.  Use toolbar selectors to filter results by file extension (PDF, TXT, MD), indexing status (Indexed, Unindexed), and risk category.

### 2. Utilizing the Source Review Queue
*   On any recommended source card, click **QUEUE FOR REVIEW** to append it to the mission's staging queue.
*   In the J.A.R.V.I.S. chat view, individual source cards include a **QUEUE FOR REVIEW** button, enabling quick tagging from conversation outputs.
*   Queued sources display inside the Active Mission View in a dedicated **Source Review Queue** widget for fast open/dismiss control.

### 3. Safety Warning Gating
If a recommended manual falls under a high-risk category (electrical, mechanical, medical, water treatment, chemical, etc.):
*   A red risk warning badge is displayed.
*   Saving or attaching the manual to a report/mission logs triggers the safety acknowledgment prompt requiring the operator's deliberate confirmation.

---

## Local Backups & Reports

### Backups (Version 2)
The source review queue is saved inside local backup JSON files under the optional `sourceReviewQueue` array:

```json
{
  "backupType": "sos_session_backup",
  "version": 2,
  "data": {
    "savedAnswers": [],
    "savedSources": [],
    "fieldNotes": [],
    "reportDrafts": [],
    "activeSession": null,
    "missions": [],
    "activeMission": null,
    "sourceReviewQueue": [
      {
        "id": "item-uuid",
        "createdAt": "2026-07-03T16:30:00Z",
        "missionId": "mission-uuid",
        "sourcePath": "books/water/treatment.pdf",
        "title": "Water Treatment Manual.pdf",
        "status": "queued",
        "riskCategory": "water_treatment"
      }
    ]
  }
}
```

Imports remain backward-compatible: older version 1 and version 2 backups missing the queue array will import successfully without errors.

### Markdown Reports
When exporting a Field Mission report, the generated Markdown file compiles the active review queue list and recommended reference metadata into dedicated sections:
*   `## SECTION 9: QUEUED SOURCES FOR REVIEW`
*   `## SECTION 10: RECOMMENDED SOURCES FROM MANIFEST`
*   `## SECTION 11: RISK DIRECTIVES & WARNINGS`
