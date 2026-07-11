const fs = require('fs');
const path = require('path');
const { db } = require('../db');
const { 
  getMaterialRoot, 
  setMaterialsDirOverride, 
  isBlockedMaterialPath, 
  absoluteToMaterialWebPath 
} = require('./materialRootService');

function setMaterialsDir(dir) {
  setMaterialsDirOverride(dir);
}

const isTestEnv = () => {
  if (process.env.NODE_ENV === 'test') return true;
  // Inspect process argv for test runners
  return process.argv.some(arg => arg.includes('test') || arg.includes('mocha') || arg.includes('jest'));
};

const getManifestFilePath = () => {
  if (process.env.SOS_MANIFEST_PATH) return process.env.SOS_MANIFEST_PATH;
  if (isTestEnv()) {
    return path.join(__dirname, '..', 'material_manifest_test.json');
  }
  return path.join(__dirname, '..', 'material_manifest.json');
};

const getMetadataFilePath = () => {
  if (process.env.SOS_METADATA_PATH) return process.env.SOS_METADATA_PATH;
  if (isTestEnv()) {
    return path.join(__dirname, '..', 'metadata_test.json');
  }
  return path.join(__dirname, '..', 'metadata.json');
};

const CATEGORY_MAP = {
  'ATL': 'Applied Technology & Agriculture',
  'ENCYCLOPEDIAS AND KNOWLEDGE PART I': 'Encyclopedias & Reference',
  'ENCYCLOPEDIAS AND KNOWLEDGE PART II': 'Encyclopedias & Reference',
  'Great Science Textbooks DVD Library (Entire Collection 88.9 GB)': 'Academic & Science',
  'The Ark': 'Survival, Firearm Tactics & Software',
  '2012_cdw3d_dvd_set': 'Infrastructure & CD3WD',
  'CD3WD Extracted Manuals': 'CD3WD Technical Library',
  'Uncategorized': 'General Materials'
};

const RISKY_PATTERNS = {
  'medical': /medical|first aid|triage|burn|wound|poison|injury/i,
  'water_treatment': /water treatment|purification|filter|sanitize|chlorine/i,
  'wild_plants': /wild plant|foraging|edible weed|herbal/i,
  'mushrooms': /mushroom|fungi|amanita|mycology/i,
  'food_preservation': /canning|fermentation|preservation|botulism|curing/i,
  'electrical': /electrical|wiring|generator|inverter|solar battery|breaker/i,
  'fuel_generator': /fuel|generator|propane|butane|gasoline|kerosene/i,
  'firearms': /firearms|ammo|ballistics|reloading|shooting|gunsmith/i,
  'mechanical': /mechanical|engine|pump|transmission|weld|turbine/i,
  'chemical': /chemical|bleach|acid|lye|pesticide|herbicide/i
};

function getRiskCategory(fileName, relativePath) {
  const text = `${fileName} ${relativePath}`.toLowerCase();
  for (const [category, pattern] of Object.entries(RISKY_PATTERNS)) {
    if (pattern.test(text)) {
      return category;
    }
  }
  return null;
}

let isIndexedStmt;
try {
  isIndexedStmt = db.prepare("SELECT 1 FROM indexed_docs WHERE path = ?");
} catch (e) {
  console.warn("[MANIFEST] indexed_docs statement prep failed:", e.message);
}

function checkIndexed(relativePath) {
  if (!isIndexedStmt) return false;
  try {
    const res = isIndexedStmt.get(relativePath);
    return !!res;
  } catch (e) {
    return false;
  }
}

// Load metadata cache keys
function loadMetadataKeys() {
  if (fs.existsSync(getMetadataFilePath())) {
    try {
      const data = JSON.parse(fs.readFileSync(getMetadataFilePath(), 'utf8'));
      return new Set(Object.keys(data));
    } catch (e) {
      console.error("[MANIFEST] Error reading metadata cache:", e);
    }
  }
  return new Set();
}

// Recursive directory scan
function scanDirectory(dirPath, metadataKeys, arrayOfFiles = []) {
  try {
    const resolvedDirPath = path.resolve(dirPath);
    if (isBlockedMaterialPath(resolvedDirPath)) return;

    const files = fs.readdirSync(resolvedDirPath);
    const materialsRoot = getMaterialRoot();

    files.forEach(file => {
      const fullPath = path.join(resolvedDirPath, file);
      if (isBlockedMaterialPath(fullPath)) return;

      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath, metadataKeys, arrayOfFiles);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.pdf', '.epub', '.zim', '.doc', '.docx', '.txt', '.zip', '.mp4', '.avi', '.mkv', '.wmv', '.webm', '.mov', '.iso', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.md'].includes(ext)) {
          const relativePath = path.relative(materialsRoot, fullPath);
          const parts = path.dirname(relativePath).split(path.sep);
          const rawCategory = parts[0] || 'Uncategorized';
          const subdirs = parts.slice(1).filter(p => p && p !== '.');
          const webPath = absoluteToMaterialWebPath(fullPath);

          arrayOfFiles.push({
            name: file,
            path: webPath,
            extension: ext,
            rawCategory: rawCategory,
            subdirectories: subdirs,
            size: stat.size,
            mtime: stat.mtimeMs,
            riskCategory: getRiskCategory(file, relativePath),
            indexed: checkIndexed(webPath),
            metadata: metadataKeys.has(webPath)
          });
        }
      }
    });
  } catch (err) {
    console.error("[MANIFEST] Error scanning directory:", err);
  }
  return arrayOfFiles;
}

// Load manifest from cache or return a placeholder fallback (auto-rebuilds if root mismatches or file is missing)
function loadManifest() {
  const manifestPath = getManifestFilePath();
  const currentRoot = getMaterialRoot();

  if (fs.existsSync(manifestPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      if (isTestEnv() || data.root === currentRoot) {
        return {
          ...data,
          manifestReady: true
        };
      }
      console.warn(`[MANIFEST] Manifest root mismatch. Expected: ${currentRoot}, Found: ${data.root}. Rebuilding...`);
    } catch (e) {
      console.error("[MANIFEST] Manifest read error:", e);
    }
  } else {
    if (isTestEnv()) {
      return {
        version: 1,
        generatedAt: new Date().toISOString(),
        root: currentRoot,
        fileCount: 0,
        categories: {},
        manifestReady: false,
        needsRefresh: true,
        message: "No material manifest found. Run a material refresh."
      };
    }
    console.log(`[MANIFEST] Manifest file does not exist at ${manifestPath}. Rebuilding...`);
  }

  // Self-heal: auto-rebuild manifest to avoid forcing manual refreshes (skipped in tests)
  try {
    const freshManifest = rebuildManifest();
    return {
      ...freshManifest,
      manifestReady: true
    };
  } catch (err) {
    console.error("[MANIFEST] Auto-rebuild failed:", err);
  }

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    root: currentRoot,
    fileCount: 0,
    categories: {},
    manifestReady: false,
    needsRefresh: true,
    message: "No material manifest found. Run a material refresh."
  };
}

// Full rebuild of the material manifest (inventory scan only, lightweight)
function rebuildManifest() {
  console.log("[MANIFEST] Rebuilding material manifest (directory scan)...");
  const metadataKeys = loadMetadataKeys();
  const materialsRoot = getMaterialRoot();
  const files = scanDirectory(materialsRoot, metadataKeys);

  // Group by mapped category for UI client compatibility
  const categorized = files.reduce((acc, file) => {
    const mappedCategory = CATEGORY_MAP[file.rawCategory] || file.rawCategory;
    if (!acc[mappedCategory]) {
      acc[mappedCategory] = [];
    }
    file.category = mappedCategory;
    acc[mappedCategory].push(file);
    return acc;
  }, {});

  const manifestData = {
    version: 1,
    generatedAt: new Date().toISOString(),
    root: materialsRoot,
    fileCount: files.length,
    categories: categorized,
    totalFiles: files.length,
    timestamp: Date.now()
  };

  try {
    fs.writeFileSync(getManifestFilePath(), JSON.stringify(manifestData, null, 2));
    console.log(`[MANIFEST] Rebuilt successfully. Saved ${files.length} records.`);
  } catch (err) {
    console.error("[MANIFEST] Error writing manifest file:", err);
  }

  return manifestData;
}

module.exports = {
  loadManifest,
  rebuildManifest,
  setMaterialsDir,
  get MANIFEST_FILE() { return getManifestFilePath(); },
  get METADATA_FILE() { return getMetadataFilePath(); }
};
