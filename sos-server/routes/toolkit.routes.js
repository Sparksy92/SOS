const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

let activeKiwixProcess = null;

function stopKiwixProcess() {
  if (activeKiwixProcess) {
    try {
      activeKiwixProcess.kill();
      console.log("[KIWIX] Terminated active kiwix-serve process.");
    } catch (e) {
      console.error("[KIWIX] Failed to kill active process:", e);
    }
    activeKiwixProcess = null;
  }
}

// Ensure cleanup on server shut down
process.on('exit', stopKiwixProcess);
process.on('SIGINT', () => {
  stopKiwixProcess();
  process.exit();
});
process.on('SIGTERM', () => {
  stopKiwixProcess();
  process.exit();
});

// Ensure import staging directory exists
const STAGING_DIR = path.resolve(__dirname, '..', '..', 'import-staging', 'offline-library');
if (!fs.existsSync(STAGING_DIR)) {
  fs.mkdirSync(STAGING_DIR, { recursive: true });
}

// Filename heuristics database for metadata mapping
const HEURISTICS = [
  { keywords: ['fm_21-76', 'fm21-76', 'army_survival', 'survival_manual'], category: 'general_survival', risk: null, license: 'official_free', verified: 'verified' },
  { keywords: ['no_doctor', 'no-doctor', 'no doctor'], category: 'medical_reference', risk: 'medical', license: 'official_free', verified: 'verified' },
  { keywords: ['no_dentist', 'no-dentist', 'no dentist'], category: 'medical_reference', risk: 'medical', license: 'official_free', verified: 'verified' },
  { keywords: ['emergency_sanitation', 'sanitation_water', 'unhcr'], category: 'water', risk: 'water_treatment', license: 'official_free', verified: 'verified' },
  { keywords: ['homestead_builder'], category: 'homesteading', risk: null, license: 'public_domain', verified: 'verified' },
  { keywords: ['shelters_shacks', 'shacks_shanties'], category: 'shelter', risk: null, license: 'public_domain', verified: 'verified' },
  { keywords: ['country_skills', 'storey'], category: 'homesteading', risk: null, license: 'restricted', verified: 'verified' },
  { keywords: ['sas_survival', 'lofty'], category: 'general_survival', risk: null, license: 'restricted', verified: 'verified' },
  { keywords: ['bushcraft_outdoor', 'kochanski'], category: 'bushcraft', risk: null, license: 'restricted', verified: 'verified' },
  { keywords: ['survival_medicine', 'doom_and_bloom'], category: 'medical_reference', risk: 'medical', license: 'restricted', verified: 'verified' },
  { keywords: ['farming_self_sufficiency', 'self-sufficiency'], category: 'farming', risk: null, license: 'unknown', verified: 'unverified' }
];

function detectMetadata(filename) {
  const lowerName = filename.toLowerCase();
  for (const item of HEURISTICS) {
    if (item.keywords.some(kw => lowerName.includes(kw))) {
      return {
        detectedCategory: item.category,
        riskCategory: item.risk,
        licenseStatus: "unknown",
        suggestedLicenseStatus: item.license,
        verificationStatus: "requires_operator_review",
        matchConfidence: "filename_match_only"
      };
    }
  }
  // Default fallback if no heuristics match
  return {
    detectedCategory: "general_survival",
    riskCategory: null,
    licenseStatus: "unknown",
    suggestedLicenseStatus: "unknown",
    verificationStatus: "requires_operator_review",
    matchConfidence: "none"
  };
}

// 1. GET /api/toolkit/staging
router.get('/staging', (req, res) => {
  try {
    if (!fs.existsSync(STAGING_DIR)) {
      return res.json({ stagedFiles: [] });
    }

    const files = fs.readdirSync(STAGING_DIR);
    const stagedFiles = [];

    for (const file of files) {
      const fullPath = path.join(STAGING_DIR, file);
      const stat = fs.statSync(fullPath);

      if (stat.isFile()) {
        const ext = path.extname(file).toLowerCase();
        
        // Strict boundary: block executable or system files from listing as valid candidates
        const blockedExts = ['.exe', '.msi', '.dmg', '.pkg', '.sys', '.dll'];
        if (blockedExts.includes(ext)) {
          continue;
        }

        const heuristics = detectMetadata(file);

        stagedFiles.push({
          filename: file,
          extension: ext,
          size: stat.size,
          mtime: stat.mtimeMs,
          sanitizedPath: `[IMPORT_STAGING]/${file}`,
          ...heuristics
        });
      }
    }

    res.json({ stagedFiles });
  } catch (err) {
    console.error("[TOOLKIT ROUTE] Staging read failed:", err);
    res.status(500).json({ error: "Internal server error during staging folder read." });
  }
});

// Helper to recursively walk a directory looking for ZIM files
function scanZimFiles(dir, relativeRoot, maxDepth = 3, currentDepth = 0) {
  const results = [];
  if (currentDepth > maxDepth) return results;

  // Let root directory throw if it fails, so that controller catch block gets triggered,
  // but catch silently for any subdirectories so the walk is resilient.
  if (currentDepth === 0) {
    if (!fs.existsSync(dir)) return results;
    const baseName = path.basename(dir).toLowerCase();
    const blockedNames = ['.git', '.github', '.gemini', '.vscode', 'node_modules', 'sos-app', 'sos-server', 'mental_models', 'vector_store'];
    if (blockedNames.includes(baseName)) {
      return results;
    }
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (stat.isDirectory()) {
        results.push(...scanZimFiles(fullPath, relativeRoot, maxDepth, currentDepth + 1));
      } else if (stat.isFile() && item.toLowerCase().endsWith('.zim')) {
        const relPath = path.relative(relativeRoot, fullPath).replace(/\\/g, '/');
        results.push({
          filename: relPath,
          size: stat.size,
          basename: item
        });
      }
    }
  } else {
    try {
      if (!fs.existsSync(dir)) return results;
      const baseName = path.basename(dir).toLowerCase();
      const blockedNames = ['.git', '.github', '.gemini', '.vscode', 'node_modules', 'sos-app', 'sos-server', 'mental_models', 'vector_store'];
      if (blockedNames.includes(baseName)) {
        return results;
      }
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        let stat;
        try {
          stat = fs.statSync(fullPath);
        } catch (e) {
          continue;
        }
        if (stat.isDirectory()) {
          results.push(...scanZimFiles(fullPath, relativeRoot, maxDepth, currentDepth + 1));
        } else if (stat.isFile() && item.toLowerCase().endsWith('.zim')) {
          const relPath = path.relative(relativeRoot, fullPath).replace(/\\/g, '/');
          results.push({
            filename: relPath,
            size: stat.size,
            basename: item
          });
        }
      }
    } catch (err) {
      // Fail silently for subdirectories
    }
  }
  return results;
}

// 2. GET /api/toolkit/zim
router.get('/zim', (req, res) => {
  try {
    let targetFolder = req.query.folder;

    if (targetFolder) {
      const normalized = targetFolder.toLowerCase();
      const isTraversal = normalized.includes('..') || 
                          normalized.includes('\\windows\\') || 
                          normalized.includes('/etc/') || 
                          normalized.includes('node_modules') || 
                          normalized.includes('.git') ||
                          normalized.includes('users');
      if (isTraversal || !fs.existsSync(targetFolder)) {
        targetFolder = null;
      }
    }

    let isEnvConfigured = false;
    if (!targetFolder) {
      targetFolder = process.env.SOS_ZIM_DIR;
      if (targetFolder) {
        isEnvConfigured = true;
      }
    }

    if (isEnvConfigured && !fs.existsSync(targetFolder)) {
      return res.status(404).json({ error: "Configured ZIM folder does not exist." });
    }

    let searchRoots = [];
    if (targetFolder) {
      searchRoots.push(path.resolve(targetFolder));
    } else {
      // Check staging
      const kiwixStaging = path.resolve(__dirname, '..', '..', 'import-staging', 'kiwix');
      if (fs.existsSync(kiwixStaging)) {
        searchRoots.push(kiwixStaging);
      }
      // Check material library root
      try {
        const { getMaterialRoot } = require('../services/materialRootService');
        const matRoot = getMaterialRoot();
        if (fs.existsSync(matRoot)) {
          searchRoots.push(path.resolve(matRoot));
        }
      } catch (e) {
        console.warn("Failed to get material root during ZIM lookup:", e.message);
      }
    }

    const archives = [];
    const maxFiles = 20;

    for (const root of searchRoots) {
      const found = scanZimFiles(root, root);
      for (const f of found) {
        if (archives.length >= maxFiles) break;
        if (archives.some(a => a.filename === f.filename)) continue;

        // Estimated title from basename
        let title = f.basename
          .replace(/_/g, ' ')
          .replace(/\.zim$/i, '')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        // Inferred language
        let language = 'en';
        if (f.basename.includes('_zh_')) language = 'zh';
        else if (f.basename.includes('_es_')) language = 'es';
        else if (f.basename.includes('_fr_')) language = 'fr';
        else if (f.basename.includes('_de_')) language = 'de';

        archives.push({
          filename: f.filename,
          size: f.size,
          title: title,
          language: language,
          path: `[ZIM_FOLDER]/${f.filename}`
        });
      }
    }

    res.json({
      zimFolder: "[ZIM_FOLDER]",
      archives
    });
  } catch (err) {
    console.error("[TOOLKIT ROUTE] ZIM read failed:", err);
    res.status(500).json({ error: "Internal server error during ZIM catalog scan." });
  }
});

// Helper to resolve ZIM folder path safely
function getZimFolder(req) {
  let targetFolder = req.query.folder || (req.body && req.body.folder);

  if (targetFolder) {
    const normalized = targetFolder.toLowerCase();
    const isTraversal = normalized.includes('..') || 
                        normalized.includes('\\windows\\') || 
                        normalized.includes('/etc/') || 
                        normalized.includes('node_modules') || 
                        normalized.includes('.git') ||
                        normalized.includes('users');
    if (isTraversal || !fs.existsSync(targetFolder)) {
      targetFolder = null;
    }
  }

  if (!targetFolder) {
    targetFolder = process.env.SOS_ZIM_DIR;
  }

  // If a filename is passed, resolve which search root contains it
  const filename = req.body && req.body.filename;
  if (!targetFolder && filename) {
    const kiwixStaging = path.resolve(__dirname, '..', '..', 'import-staging', 'kiwix');
    if (fs.existsSync(path.resolve(kiwixStaging, filename))) {
      return kiwixStaging;
    }
    try {
      const { getMaterialRoot } = require('../services/materialRootService');
      const matRoot = getMaterialRoot();
      if (fs.existsSync(path.resolve(matRoot, filename))) {
        return path.resolve(matRoot);
      }
    } catch (e) {}
  }

  if (!targetFolder) {
    targetFolder = path.resolve(__dirname, '..', '..', 'import-staging', 'kiwix');
  } else {
    targetFolder = path.resolve(targetFolder);
  }

  return targetFolder;
}

// 2a. GET /api/toolkit/zim/status
router.get('/zim/status', (req, res) => {
  const isWin = process.platform === 'win32';
  const checkCmd = isWin ? 'where kiwix-serve' : 'which kiwix-serve';
  exec(checkCmd, (err, stdout, stderr) => {
    const installed = !err && stdout.trim().length > 0;
    res.json({
      installed,
      running: activeKiwixProcess !== null,
      port: 3008
    });
  });
});

// 2b. POST /api/toolkit/zim/start
router.post('/zim/start', (req, res) => {
  const { filename } = req.body;
  if (!filename) {
    return res.status(400).json({ error: "Filename is required." });
  }

  // Validate filename has no traversal elements and is a .zim file
  const normalized = filename.toLowerCase();
  const isTraversal = normalized.includes('..') || 
                      normalized.includes('\\windows\\') || 
                      normalized.includes('/etc/') || 
                      normalized.includes('node_modules') || 
                      normalized.includes('.git') ||
                      normalized.includes('users');
  if (isTraversal || !normalized.endsWith('.zim')) {
    return res.status(400).json({ error: "Invalid filename." });
  }

  try {
    const targetFolder = getZimFolder(req);
    const fullPath = path.resolve(targetFolder, filename);

    // Secure boundary check: Ensure the resolved absolute path is strictly inside targetFolder
    const root = path.resolve(targetFolder);
    if (fullPath !== root && !fullPath.startsWith(root + path.sep)) {
      return res.status(400).json({ error: "Invalid filename path boundary." });
    }

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: "ZIM file not found." });
    }

    // Terminate existing
    stopKiwixProcess();

    // Start new kiwix-serve process on port 3008
    const port = 3008;
    console.log(`[KIWIX] Spawning kiwix-serve for ${filename} on port ${port}...`);
    
    activeKiwixProcess = spawn('kiwix-serve', ['--port', port.toString(), fullPath]);

    activeKiwixProcess.stdout.on('data', (data) => {
      console.log(`[KIWIX STDOUT] ${data}`);
    });

    activeKiwixProcess.stderr.on('data', (data) => {
      console.error(`[KIWIX STDERR] ${data}`);
    });

    activeKiwixProcess.on('error', (err) => {
      console.error("[KIWIX ERROR]", err);
      activeKiwixProcess = null;
    });

    activeKiwixProcess.on('close', (code) => {
      console.log(`[KIWIX] Child process exited with code ${code}`);
      activeKiwixProcess = null;
    });

    // Give it a tiny moment to bind to the port
    setTimeout(() => {
      res.json({
        success: true,
        url: `http://localhost:${port}`
      });
    }, 1500);

  } catch (err) {
    console.error("[KIWIX START] Failed:", err);
    res.status(500).json({ error: "Failed to start ZIM reader server." });
  }
});

// 2c. POST /api/toolkit/zim/stop
router.post('/zim/stop', (req, res) => {
  stopKiwixProcess();
  res.json({ success: true, message: "ZIM reader server stopped." });
});

module.exports = router;
