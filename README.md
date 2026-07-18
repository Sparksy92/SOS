# SurvivalOS (Survival Operations System)

<p align="center">
  <img src="./logo.jpg" width="250" alt="SurvivalOS Logo">
</p>

**SurvivalOS isn’t just software—it’s your digital lifeline when the grid goes down.** 

Imagine a world where the internet is gone, the power grid has failed, and you need immediate answers to keep your family safe. How do you treat a thermal burn? How do you harvest rainwater safely? How do you repair an offline radio?

**SurvivalOS is the ultimate off-grid command center.** Built to run locally on minimal hardware in zero-connectivity environments, it transforms your laptop, tablet, or Raspberry Pi into an impenetrable fortress of knowledge, operations, and tactical readiness. 

This is not a toy. It's a structured operations center combining military-grade mission tracking, offline encyclopedias, semantic AI search, and vital resource management—all without leaking a single byte of data to external servers. **When everything else stops working, SurvivalOS boots up.**

---

## 🌟 Why You Need SurvivalOS

### 🧠 Your Personal Offline AI (R.A.N.G.E.R.)
Forget relying on the cloud. SurvivalOS features **R.A.N.G.E.R.**—a fully integrated conversational assistant powered by a local LLM (Ollama). Ask a question like *"How do I treat severe bleeding?"* and R.A.N.G.E.R. instantly scours your personal offline library of manuals, returning precise, life-saving answers. All processing happens right on your machine. Complete privacy, total independence.

### 🗺️ Tactical Command & Operations
Turn chaos into structured action.
* **Active Mission Control**: Launch pre-built emergency templates (*Structural Fire Response*, *Communications Outage*) or create custom missions. Track real-time objectives on a live timeline.
* **Tactical Map Panel**: Pinpoint survival coordinates using entirely local, offline topographic maps. Never rely on GPS satellites again.
* **EBG Semantic Telemetry**: A spreading activation simulator that monitors your local environment (battery levels, weather, soil) and alerts you the moment survival thresholds are threatened.

### 📚 The Ultimate Library Engine
Your survival is only as good as the knowledge you preserve.
* **Content Gap Analyzer**: Are you prepared? The system scans your entire library and instantly tells you what's missing—whether it's First Aid, Water Harvesting, or Animal Husbandry.
* **Integrated ZIM Reader**: Host massive offline encyclopedias (like Wikipedia or specialized medical wikis) seamlessly. 
* **OCR Scanning Tool**: Automatically digitize image-based PDFs into searchable, interactive text.

### 🥫 Inventory & Resource Tracking
Don't guess how long your supplies will last—know exactly.
* **Water Reserve Calculator**: Audit your water containers and project exactly how many days of hydration you have left based on daily consumption.
* **Pantry Tracker & Recipe Wizard**: Log your food stockpile, calculate caloric reserves, and generate cookable recipes using *only* what you currently have in your pantry.

---

## 🔒 Impregnable Local-First Boundaries

1. **Zero Connectivity Required**: 100% offline. No telemetry, no cloud sync, no tracking, no external API endpoints. Even the fonts and map markers are bundled locally.
2. **Absolute Privacy**: Your survival data is your business. The app operates inside a hermetically sealed environment.
3. **Safety Audits**: The system runs constant rules-based boundary checks, preventing data leaks or malicious file traversals. 

---

## ⚙️ Seamless Installation & Setup

Getting your command center operational is effortless. 

### Prerequisites
* **Node.js**: `v22.5.0` or higher
* **Ollama**: Installed and running locally
* **Python**: `v3.10` or higher (for TTS and OCR)

### 🚀 1-Click Setup
We've automated the heavy lifting. Just run the setup script for your OS:

**On Linux/macOS:**
```bash
chmod +x setup.sh
./setup.sh
```

**On Windows:**
Double-click `setup.bat` (or run `.\setup.ps1` in PowerShell).

The script automatically provisions your local environment, installs all dependencies, and creates isolated Python virtual environments.

### 🔌 Easy Configuration
Copy the default environment files:
```bash
cp .env.example .env
```
Point `SOS_MATERIALS_DIR` in `sos-server/.env` to the folder holding your offline survival manuals. That's it!

---

## 💻 Execution Guide

### Launch Your Command Center
* **Windows:** Double-click `launcher.bat`.
* **Linux/macOS:**
  ```bash
  chmod +x launcher.sh
  ./launcher.sh
  ```

Alternatively, start the modules manually:
```bash
# Start backend API
cd sos-server
npm start

# Start frontend UI
cd sos-app
npm run dev
```

---

## 📚 Off-Grid Library Reference Sources

Need content to fuel your R.A.N.G.E.R. engine? SurvivalOS acts as your librarian, but you need to stock the shelves. Here are highly recommended open-source survival repositories to download into your library:

*   **[pieroboseta/APOCALYPSE](https://github.com/pieroboseta/APOCALYPSE):** Medical, plumbing, structural building, and off-grid survival.
*   **[PR0M3TH3AN/Survival-Data](https://github.com/PR0M3TH3AN/Survival-Data):** Emergency checklists, HAM radio guides, first-aid runbooks.
*   **[alx-xlx/awesome-survival](https://github.com/alx-xlx/awesome-survival):** Bushcraft, foraging, and wilderness guidance.

---

<p align="center">
  <b>Don't wait until the grid goes down. Build your SurvivalOS command center today.</b>
</p>
