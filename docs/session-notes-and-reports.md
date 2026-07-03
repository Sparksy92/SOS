# User Guide: J.A.R.V.I.S. Saved Logs, Field Notes, and Reports

This guide documents the local user-controlled logging, field notes, and session report generation features in SurvivalOS.

## Local-First Philosophy

*   **100% Offline & Local**: All saved answers, library source card references, custom field notes, and report drafts are stored directly in your browser's local storage (`localStorage`) prefixed with `sos_`.
*   **Zero Cloud Synchronization**: No data is uploaded, transmitted, or shared with external servers.
*   **No Silent AI Memory**: Jarvis does not record or remember your conversation history automatically behind the scenes. Only items you explicitly click to save are persisted.
*   **No Hidden Logs**: Everything that is saved is visible under the **NOTES / REPORTS** panel in the sidebar.

---

## 1. Saving Chat Answers & Sources

Under each Jarvis AI response, you will find a button bar:
*   **Save Answer**: Saves the query text, answer text, matching risk category, and source references.
*   **Save Sources**: Saves the metadata (title, path, page/section number, match label, excerpt) of the source cards used to answer the query. It does not store full manual content.
*   **Create Field Note**: Opens the note editor pre-filled with the Jarvis query, response context, and source references.
*   **Add to Report**: Saves the answer and opens the consolidated Report Builder with it selected.

---

## 2. Field Notes

Field notes are manual observation records you write yourself. Under **NOTES / REPORTS**, click **NEW FIELD NOTE** or choose **CREATE FIELD NOTE** under a Jarvis answer.
*   **Note Types**: Classify notes as *General, Observation, Task, Supply Note, Repair Note, Field Incident*, or *Research Note*.
*   **Tags**: Add comma-separated tags to quickly filter notes later.
*   **Risk Category**: Specify if the note touches high-risk topics. High-risk notes display visual caution banners.

---

## 3. High-Risk Save Acknowledgments

If you attempt to save an answer, source, or field note that contains high-risk operational advice (such as *medical first aid, electrical wiring, chemical handling, or water purification*):
*   A critical safety dialog will appear.
*   The save action will be blocked until you check the box acknowledging that **"I understand this saved item may involve high-risk material and should be verified before use."**

---

## 4. Notes & Reports Dashboard

Accessible via the **NOTES / REPORTS** sidebar option:
*   **Tabbed Browser**: View lists of Saved Answers, Saved Sources, Field Notes, and Reports.
*   **Search & Filter**: Search all contents by keywords or filter by risk category and note type.
*   **View & Edit**: Open details to read the full saved text or edit field notes.
*   **Delete**: Permanently delete any record.

---

## 5. Session Report Builder & Exports

Click **BUILD SESSION REPORT** inside the Notes & Reports panel to bundle notes and research citations into a consolidated report packet.

### Report Fields
*   **Title & Type**: Set report context (e.g. *Incident Log, Readiness Assessment*).
*   **Callsign**: Set the reporting operator callsign (defaults to your profile homestead name).
*   **Overview**: Write a situation overview.
*   **Checklist Items**: Check/uncheck which saved answers, field notes, and library sources to append.

### Exporting Options
*   **Export Markdown**: Downloads a formatted `.md` file containing Situation Overviews, Jarvis logs, Field Notes, Source lists, safety warnings, and directives. Useful for printing or viewing in local markdown readers.
*   **Export JSON**: Downloads a structured `.json` data file to backup/transfer raw report data.
*   **Copy Report Markdown**: Copies the formatted Markdown directly to your system clipboard.

---

## 6. How to Clear Local Data

If you want to clear your local session logs and notes:
*   Open the browser Developer Console (`F12`), go to the **Application** tab, select **Local Storage**, and clear keys beginning with `sos_`.
*   Alternatively, clearing your browser cookies and site data for the SurvivalOS port will reset all logs.
