# Mission Briefing & Conversational Guided Intake

SurvivalOS now includes a local-first conversational copilot that guides you through setting up field missions, calculates a deterministic organization score, lists offline safety disclaimers, and exports briefings to Markdown or JSON.

## 1. Conversational Guided Intake (Phase 11A)

Instead of using rigid forms, J.A.R.V.I.S. intercepts natural intent phrases in chat to start a local-first planning questionnaire.

### Intent Triggers
*   **Fishing**: *"I wanna go fishing"*, *"Plan a fishing trip"*
*   **Camping**: *"I want to go camping"*, *"Let's go camping"*
*   **Hiking**: *"Going hiking with the kids"*, *"Hiking trail"*
*   **Water Run**: *"Need to do a water run"*, *"Collect water"*
*   **Generator Repair**: *"Need to fix the generator"*, *"generator repair"*
*   **Supply Run**: *"I want to plan a supply run"*, *"grocery run"*
*   **Firewood Run**: *"Firewood gathering"*, *"wood run"*
*   **General**: *"I want to start a mission"*, *"plan a new mission"*

### Intake Flow
1.  **Intake Activation**: J.A.R.V.I.S. recognizes the intent, blocks server-side LLM calls, and responds with the first question (e.g. *"Where are you fishing today?"*).
2.  **State Management**: Answers are saved in React state as you chat.
3.  **Draft Preview**: Once questions are answered, J.A.R.V.I.S. prints a summary of suggested objectives and checklist items.
4.  **Operator Approval Gate**: Storing to the active mission database requires the operator to type `YES` or `CREATE`. Typing `CANCEL` clears the session saving nothing.

---

## 2. Mission Organization Score & Briefings (Phase 11)

Calculated dynamically from a baseline of `50` points:
*   **Attachments**: `+10` points per Jarvis Answer, `+10` points per Citation source, `+5` points per field Note.
*   **Checkpoints**: `+10` points per completed objective, `+5` points per completed checklist task.
*   **Deductions**: `-5` points per unreviewed queued source, `-5` points per open high-priority task.

### Scoring Labels
*   `Field Organized` (score >= 80)
*   `Needs Review` (score >= 60)
*   `Needs Setup` (score < 60)

---

## 3. Risk-Aware Safety Checklist

High-risk categories linked to active missions trigger local warnings:
*   **Medical**: Displays disclaimers that the app does not provide diagnoses or treatment guidance, advising cross-verification with paper references.
*   **Firearms**: Highlights range safety and explicitly denies tactical or offensive training assistance.
*   **Electrical / Generator**: Warns about carbon monoxide hazards and main breaker isolation.
*   **Water Treatment**: Recommends double-purification steps.

---

## 4. Handoff Exports
From the active mission panel, you can copy the briefing text to your clipboard or download offline files:
*   **Markdown Handoff (`.md`)**: Formatted with situation overview, objectives status, checklist tasks, attached logs, and safety directives.
*   **JSON Data (`.json`)**: Raw backup-compatible structured payload.
