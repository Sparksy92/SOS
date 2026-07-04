# Content Provider Registry Schema Design

This document details the registry structure that maps available off-grid content systems. It defines how SurvivalOS represents knowledge providers locally without automatic network interaction.

## Registry Schema
```typescript
interface ContentProvider {
  id: string; // Unique provider key (e.g. "kiwix_zim", "calibre_library")
  label: string; // Human-readable title
  type: "offline_knowledge_provider" | "local_document_store" | "external_reference_hub";
  localOnly: boolean; // Always true for offline-first safety
  requiresManualSetup: boolean; // Tells the operator if manual app config is required
  supportsAutomaticDownload: boolean; // Always false
  supportsMetadataScan: boolean; // Indicates if the backend can list directory files
  supportsContentIndexing: "never" | "future_manual_only" | "manual_only";
  riskNotes: string[]; // Safety warnings if the provider commonly holds high-risk content
  setupChecklist: string[]; // Step-by-step checklist to configure the provider
  officialLinks: string[]; // Links to download the installer/files outside SOS
}
```

## Built-in Registries

### 1. Kiwix / ZIM Library
```json
{
  "id": "kiwix_zim",
  "label": "Kiwix / ZIM Library",
  "type": "offline_knowledge_provider",
  "localOnly": true,
  "requiresManualSetup": true,
  "supportsAutomaticDownload": false,
  "supportsMetadataScan": true,
  "supportsContentIndexing": "future_manual_only",
  "riskNotes": [
    "Ensure ZIM archives are downloaded from official repositories (e.g. kiwix.org).",
    "Avoid downloading unverified third-party archives."
  ],
  "setupChecklist": [
    "Install Kiwix Reader on your device.",
    "Download desired ZIM files manually (e.g., Wikipedia Medical Encyclopedia).",
    "Configure ZIM path directory in SOS settings."
  ],
  "officialLinks": [
    "https://www.kiwix.org/en/download/",
    "https://library.kiwix.org/"
  ]
}
```

### 2. Calibre eBook Library
```json
{
  "id": "calibre_library",
  "label": "Calibre eBook Library",
  "type": "local_document_store",
  "localOnly": true,
  "requiresManualSetup": true,
  "supportsAutomaticDownload": false,
  "supportsMetadataScan": true,
  "supportsContentIndexing": "manual_only",
  "riskNotes": [
    "Verify copyright status of books imported from Calibre.",
    "Do not mass-index copyrighted materials."
  ],
  "setupChecklist": [
    "Install Calibre on your off-grid workstation.",
    "Organize your EPUB/PDF resources.",
    "Add Calibre library path to SOS configurations."
  ],
  "officialLinks": [
    "https://calibre-ebook.com/download"
  ]
}
```

## Storage & Configuration
Registered providers are saved locally in the browser's localStorage using the `sos_provider_registry` key. If an operator wants to add a custom path to a Calibre or Kiwix folder, the custom configuration path is stored locally:
```json
{
  "providerId": "kiwix_zim",
  "localDirectoryPath": "D:/SurvivalBackup/Kiwix/"
}
```
SurvivalOS uses this local directory configuration to list files and sizes on the dashboard, keeping the data locally isolated.
