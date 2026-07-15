/**
 * SOS Content Provider Registry
 * Catalog of local/offline knowledge repositories.
 * 
 * STRICT BOUNDARY: supportsAutomaticDownload must always be false. No Swiss Bay urls or direct executable downloads.
 */
export const CONTENT_PROVIDERS = [
  {
    id: "local_pdf_library",
    label: "Local PDF Library",
    type: "offline_knowledge_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: true,
    supportsContentIndexing: "manual_only",
    riskNotes: ["Ensure scanned documents do not contain malware before indexing."],
    setupChecklist: [
      "Set your SOS_MATERIALS_DIR environment variable to target your PDF directory.",
      "Trigger a manual materials manifest scan in the Index Integrity module."
    ],
    officialLinks: ["https://github.com/Sparksy92/SOS"]
  },
  {
    id: "kiwix_zim",
    label: "Kiwix / ZIM Library",
    type: "offline_knowledge_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: true,
    supportsContentIndexing: "future_manual_only",
    riskNotes: ["ZIM files must be scanned via Kiwix Reader. SOS only scans filename metadata to advise the user."],
    setupChecklist: [
      "Download Kiwix Desktop or Mobile app.",
      "Obtain official ZIM files (e.g. Wikipedia Medicine) from Kiwix Library Catalog.",
      "Specify your ZIM directory path in settings to let R.A.N.G.E.R. know what references you have."
    ],
    officialLinks: ["https://www.kiwix.org"]
  },
  {
    id: "calibre_library",
    label: "Calibre Library",
    type: "offline_knowledge_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: true,
    supportsContentIndexing: "future_manual_only",
    riskNotes: ["Only import ebooks that you have legal access rights to index."],
    setupChecklist: [
      "Download and install Calibre.",
      "Set up your Calibre library folder on disk.",
      "Reference files can be manually copied from your Calibre library into your materials folder."
    ],
    officialLinks: ["https://calibre-ebook.com"]
  },
  {
    id: "archivebox_archive",
    label: "ArchiveBox Web Archive",
    type: "offline_knowledge_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: true,
    supportsContentIndexing: "future_manual_only",
    riskNotes: ["High disk usage footprints. Ensure websites are archived before going off-grid."],
    setupChecklist: [
      "Install ArchiveBox via Docker or package manager.",
      "Export web archives manually and store the static HTML directories in a safe location."
    ],
    officialLinks: ["https://archivebox.io"]
  },
  {
    id: "obsidian_vault",
    label: "Obsidian Vault",
    type: "offline_knowledge_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: true,
    supportsContentIndexing: "manual_only",
    riskNotes: ["Avoid enabling untrusted community plugins inside your vault."],
    setupChecklist: [
      "Install Obsidian locally.",
      "Create a local notes vault folder.",
      "Vault markdown folders can be added directly inside SOS materials directory."
    ],
    officialLinks: ["https://obsidian.md"]
  },
  {
    id: "internet_in_a_box_reference",
    label: "Internet-in-a-Box Reference",
    type: "offline_infrastructure_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: false,
    supportsContentIndexing: "never",
    riskNotes: ["Infrastructure server setup. Do not expose public ports or unauthenticated LAN hot-spots."],
    setupChecklist: [
      "Configure your Raspberry Pi or server hardware with IIAB image.",
      "Prepare ZIM files and content channels offline."
    ],
    officialLinks: ["https://internet-in-a-box.org/"]
  },
  {
    id: "wrolpi_reference",
    label: "WROLPi Reference",
    type: "offline_infrastructure_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: false,
    supportsContentIndexing: "never",
    riskNotes: ["Manual deployment only. Verify network firewall rules."],
    setupChecklist: [
      "Clone the WROLPi repository manually.",
      "Build local static pages and configure your offline router."
    ],
    officialLinks: ["https://github.com/lrnselfreliance/wrolpi"]
  },
  {
    id: "project_nomad_reference",
    label: "Project N.O.M.A.D. Reference",
    type: "offline_infrastructure_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: false,
    supportsContentIndexing: "never",
    riskNotes: ["Mainly used as architectural inspiration. Avoid automated WAN connectivity scripts."],
    setupChecklist: [
      "Review Crosstalk Solutions guides for off-grid setup configurations.",
      "Verify mesh network and gateway rules manually."
    ],
    officialLinks: ["https://github.com/Crosstalk-Solutions/project-nomad"]
  },
  {
    id: "manual_import_staging",
    label: "Manual Import Staging Area",
    type: "offline_knowledge_provider",
    localOnly: true,
    requiresManualSetup: true,
    supportsAutomaticDownload: false,
    supportsMetadataScan: true,
    supportsContentIndexing: "future_manual_only",
    riskNotes: ["Staged files must be manually reviewed for license clearance before moving to materials folder."],
    setupChecklist: [
      "Place files to import inside the gitignored 'import-staging/offline-library/' folder.",
      "Check the Manual Import panel in SOS to review detected file metadata."
    ],
    officialLinks: ["https://github.com/Sparksy92/SOS"]
  }
];
