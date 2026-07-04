/**
 * SOS Offline Toolkit Catalog
 * Contains official references, safety advice, difficulty levels,
 * and verification checklists for essential off-grid tools.
 * 
 * STRICT BOUNDARY: Contains official source links only. No Swiss Bay mirror links or auto-downloads.
 */
export const OFFLINE_TOOLKIT_CATALOG = [
  {
    id: "ollama",
    title: "Ollama",
    description: "Run large language models locally on your workstation.",
    offlineImportance: "Powers J.A.R.V.I.S. conversational assistance, document summarization, and query processing completely offline.",
    difficulty: "Medium",
    platformNotes: "Available for Windows, macOS, and Linux. Requires a modern GPU/CPU with sufficient VRAM.",
    storagePowerNotes: "Models range from 2GB to 40GB+ of storage. Increases CPU/GPU power consumption during generation.",
    manualChecklist: [
      "Download and install the Ollama client.",
      "Pull a supported model (e.g., llama3, mistral) via terminal.",
      "Verify the Ollama local API server is active on port 11434."
    ],
    riskNotes: [
      "Running heavy models can drain mobile power sources quickly.",
      "Ensure adequate hardware ventilation during active inference sessions."
    ],
    officialUrls: ["https://ollama.com"]
  },
  {
    id: "kiwix",
    title: "Kiwix",
    description: "Offline reader for entire websites like Wikipedia, StackExchange, and medical archives.",
    offlineImportance: "Allows browsing rich encyclopedias, training books, and offline reference libraries without internet.",
    difficulty: "Easy",
    platformNotes: "Multi-platform: Windows, macOS, Linux, Android, iOS.",
    storagePowerNotes: "ZIM file sizes range from 100MB to 150GB+. Low processing overhead/power footprint.",
    manualChecklist: [
      "Download the Kiwix reader application.",
      "Manually download a target ZIM archive (e.g. Wikipedia Medicine).",
      "Open the ZIM archive in Kiwix and search for a term."
    ],
    riskNotes: [
      "Ensure archives are obtained directly from official Kiwix library catalogs to avoid modified content."
    ],
    officialUrls: ["https://www.kiwix.org"]
  },
  {
    id: "localsend",
    title: "LocalSend",
    description: "An open-source alternative to AirDrop. Transfer files over local Wi-Fi or LAN.",
    offlineImportance: "Allows sharing survival reports, maps, and guides between mobile devices and workstations off-grid.",
    difficulty: "Easy",
    platformNotes: "Multi-platform: Windows, macOS, Linux, Android, iOS.",
    storagePowerNotes: "Lightweight tool. Negligible storage and power footprint.",
    manualChecklist: [
      "Install LocalSend on at least two devices.",
      "Connect both devices to the same local off-grid Wi-Fi router.",
      "Successfully transfer a test text file between devices."
    ],
    riskNotes: [
      "Does not require internet. Files travel directly over local network. Verify recipients before sending."
    ],
    officialUrls: ["https://localsend.org"]
  },
  {
    id: "osmand",
    title: "OsmAnd / Organic Maps",
    description: "Offline mobile maps and navigation powered by OpenStreetMap data.",
    offlineImportance: "Critical for off-grid navigation, route planning, search-and-rescue, and location tracking.",
    difficulty: "Easy",
    platformNotes: "Android and iOS mobile devices. Gps works without cellular networks.",
    storagePowerNotes: "Map files vary by region (typically 100MB to 5GB). Medium battery drain during navigation.",
    manualChecklist: [
      "Download OsmAnd or Organic Maps on your mobile device.",
      "Pre-download the offline map files for your state or region.",
      "Verify GPS positioning and search a local landmark offline."
    ],
    riskNotes: [
      "Ensure mobile devices are kept in rugged protective cases to maintain navigation capability in rough weather."
    ],
    officialUrls: ["https://osmand.net", "https://organicmaps.app"]
  },
  {
    id: "keepassxc",
    title: "KeePassXC",
    description: "A local, offline password manager using encrypted database files.",
    offlineImportance: "Ensures secure access to offline credentials and configuration keys without relying on cloud vaults.",
    difficulty: "Easy",
    platformNotes: "Windows, macOS, Linux. Android/iOS compatible via KeePassDX/Strongbox.",
    storagePowerNotes: "Negligible storage (database is typically under 1MB). Extremely low power footprint.",
    manualChecklist: [
      "Install KeePassXC on your workstation.",
      "Create a new database (.kdbx) protected by a strong master password.",
      "Verify you can add and retrieve an entry."
    ],
    riskNotes: [
      "If you lose your master password, there is no recovery mechanism. Keep a physical backup of the master key."
    ],
    officialUrls: ["https://keepassxc.org"]
  },
  {
    id: "veracrypt",
    title: "VeraCrypt",
    description: "Open-source disk encryption software for securing folders or entire drives.",
    offlineImportance: "Protects sensitive mission logs, maps, and personal documents if devices are lost or confiscated.",
    difficulty: "Hard",
    platformNotes: "Windows, macOS, Linux.",
    storagePowerNotes: "No extra storage needed beyond files. Negligible power footprint.",
    manualChecklist: [
      "Install VeraCrypt on your system.",
      "Create an encrypted file container of test size (e.g. 50MB).",
      "Mount the container, copy a file into it, and dismount it successfully."
    ],
    riskNotes: [
      "Forgetting passwords or corrupting headers will result in permanent data loss. Keep backup headers."
    ],
    officialUrls: ["https://www.veracrypt.fr"]
  },
  {
    id: "obsidian",
    title: "Obsidian",
    description: "A local-first, markdown-based note-taking application.",
    offlineImportance: "Perfect for maintaining local logs, survival field manuals, checklists, and medical procedures.",
    difficulty: "Easy",
    platformNotes: "Windows, macOS, Linux, iOS, Android.",
    storagePowerNotes: "Uses raw markdown text files. Very low storage and battery footprint.",
    manualChecklist: [
      "Install Obsidian on your device.",
      "Create a local vault folder on your storage drive.",
      "Create a markdown note and verify it can be read by other basic text editors."
    ],
    riskNotes: [
      "Avoid remote sync plugins to guarantee vault isolation."
    ],
    officialUrls: ["https://obsidian.md"]
  },
  {
    id: "calibre",
    title: "Calibre",
    description: "Comprehensive ebook manager and viewer.",
    offlineImportance: "Manages off-grid collections of PDFs, EPUBs, and manuals.",
    difficulty: "Easy",
    platformNotes: "Windows, macOS, Linux.",
    storagePowerNotes: "Metadata overhead is small. Footprint depends on library size (typically 1GB - 50GB).",
    manualChecklist: [
      "Install Calibre on your workstation.",
      "Import a reference manual (EPUB or PDF).",
      "Open the ebook viewer and confirm text readability."
    ],
    riskNotes: [
      "Verify the copyright status of imported materials."
    ],
    officialUrls: ["https://calibre-ebook.com"]
  },
  {
    id: "archivebox",
    title: "ArchiveBox",
    description: "Self-hosted, offline internet archiving solution.",
    offlineImportance: "Saves critical websites, wiki pages, and online guides as offline HTML snapshots.",
    difficulty: "Hard",
    platformNotes: "Linux, macOS, Docker-first environments.",
    storagePowerNotes: "High storage footprint depending on pages archived (typically 5GB to 500GB+).",
    manualChecklist: [
      "Install ArchiveBox (via Docker or local script).",
      "Add a test URL to the archive queue.",
      "Browse the offline snapshot locally in a web browser."
    ],
    riskNotes: [
      "Archive links prior to going off-grid. Dynamic javascript websites may load poorly when completely offline."
    ],
    officialUrls: ["https://archivebox.io"]
  },
  {
    id: "cyberchef",
    title: "CyberChef",
    description: "The Cyber Swiss Army Knife. Web application for data analysis, parsing, and decoding.",
    offlineImportance: "Decodes, formats, encrypts, and parses data completely in the local browser without network requests.",
    difficulty: "Medium",
    platformNotes: "Runs locally in any web browser. Completely self-contained HTML page.",
    storagePowerNotes: "Around 30MB of storage. Processing takes place in browser memory.",
    manualChecklist: [
      "Download the offline build of CyberChef (ZIP containing index.html).",
      "Open index.html locally in a web browser with network connections disabled.",
      "Verify you can run a basic recipe (e.g. Base64 Decode)."
    ],
    riskNotes: [
      "Ensure you download the official packaged ZIP from their repository to guarantee file safety."
    ],
    officialUrls: ["https://github.com/gchq/CyberChef"]
  },
  {
    id: "kolibri",
    title: "Kolibri",
    description: "Offline education platform and library server.",
    offlineImportance: "Provides training books, math lessons, science documents, and videos for off-grid schools.",
    difficulty: "Medium",
    platformNotes: "Windows, Linux, macOS, Raspberry Pi.",
    storagePowerNotes: "Heavy storage depending on selected content channels (typically 10GB to 200GB+).",
    manualChecklist: [
      "Install Kolibri on your workstation.",
      "Import a content channel (e.g. Khan Academy Lite) while online.",
      "Verify educational modules load correctly offline."
    ],
    riskNotes: [
      "Only register trusted official educational channels."
    ],
    officialUrls: ["https://learningequality.org/kolibri/"]
  },
  {
    id: "meshtastic",
    title: "Meshtastic",
    description: "Off-grid, encrypted mesh communication system using inexpensive LoRa radios.",
    offlineImportance: "Allows sending text messages and GPS coordinates between teammates when cell service is down.",
    difficulty: "Medium",
    platformNotes: "Companion app for Android/iOS. Radios communicate directly via RF.",
    storagePowerNotes: "Radios run on low-power battery cells. Mobile app footprint is small.",
    manualChecklist: [
      "Purchase and configure at least two Meshtastic LoRa radios.",
      "Pair radios to companion apps via Bluetooth.",
      "Verify successful text transmission between radios over a distance."
    ],
    riskNotes: [
      "Does not encrypt mesh metadata (like nodes list). Configure private primary channels for critical logs."
    ],
    officialUrls: ["https://meshtastic.org"]
  },
  {
    id: "briar",
    title: "Briar",
    description: "Peer-to-peer encrypted messaging app designed for activists and off-grid teams.",
    offlineImportance: "Syncs messages over local Wi-Fi, Bluetooth, or mesh networks to maintain communications during blackouts.",
    difficulty: "Easy",
    platformNotes: "Android, Linux, Windows, macOS.",
    storagePowerNotes: "Lightweight database storage. Medium power footprint.",
    manualChecklist: [
      "Install Briar on two devices.",
      "Pair devices face-to-face via QR code.",
      "Transmit messages over Bluetooth or local Wi-Fi successfully."
    ],
    riskNotes: [
      "Requires face-to-face pairing for maximum security. Avoid pairing with unverified nodes."
    ],
    officialUrls: ["https://briarproject.org"]
  },
  {
    id: "jellyfin",
    title: "Jellyfin",
    description: "Free and open-source local media streaming server.",
    offlineImportance: "Serves reference training videos, educational documentaries, and entertainment to off-grid groups.",
    difficulty: "Medium",
    platformNotes: "Windows, macOS, Linux, Raspberry Pi, Android, iOS.",
    storagePowerNotes: "Storage footprint depends on video files (typically 50GB to 5TB+). Medium power utilization.",
    manualChecklist: [
      "Install Jellyfin server on your local workstation.",
      "Configure a library pointing to local video files.",
      "Stream a video locally to a browser or mobile device on the LAN."
    ],
    riskNotes: [
      "Streaming high-bitrate video consumes significant workstation power. Optimize transcode settings."
    ],
    officialUrls: ["https://jellyfin.org"]
  }
];
