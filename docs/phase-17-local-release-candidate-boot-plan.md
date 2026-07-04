# Implementation Plan — Phase 17: Local Release Candidate Boot & Operator Runbook

> [!NOTE]
> This phase turns SurvivalOS from a feature-rich development project into a reliable local release-candidate build that an operator can start, verify, use, troubleshoot, and recover without guessing. It is a read-only local health check and environment verification layer and does not introduce major new features or data modifications.

## Proposed Components

### 1. Local Release Readiness Analyzer (`localReleaseReadiness.js`)
*   Provides deterministic local checks and status summaries.
*   Aggregates status metrics from backend endpoints, local registries, and localStorage audits.
*   Computes an overall readiness score and flags warning/blocker arrays.

### 2. Local Release Candidate Panel (`LocalReleaseCandidatePanel.jsx`)
*   Added as a main sidebar view: **RELEASE CHECK**.
*   Displays readiness scores, blockers, warning logs, next steps, and navigation shortcuts.
*   Supports local-only JSON and Markdown exports of readiness reports.
*   Explains boundaries clearly: read-only visibility, no downloading/indexing side-effects.

### 3. Manifest Checked Fallback Fix
*   Update `libraryLifecycleAnalyzer.js` and `LibraryLifecyclePanel.jsx` to respect a `manifestChecked` flag.
*   If `/api/materials` fails, `manifestStatus` resolves to `'unknown'` rather than `'not_found_in_manifest'`.

### 4. Backend Health Endpoint Hardening (`health.routes.js`)
*   Refines `/api/health` to return app metadata, configuration flags (`materialRootConfigured`), and environment data while avoiding absolute filesystem paths or secret values.

### 5. Operator Runbook & Checklist Documentation
*   `docs/operator-runbook.md`: Guides operators through starting, configuring, auditing, troubleshooting, and understanding the platform boundaries.
*   `docs/release-candidate-checklist.md`: Structured manual audit sheet.
*   Update `README.md` with explicit off-grid quick start steps.

---

## Verification Plan

### Automated Tests
Run Node unit tests to check:
*   Readiness analyzer output layouts (and path sanitization).
*   UI buttons and navigation lists.
*   Harden `/api/health` values.
*   `manifestChecked` flag fallbacks.
