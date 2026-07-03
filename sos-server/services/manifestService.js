const fs = require('fs');
const path = require('path');
const { db } = require('../db');

let MATERIALS_DIR = path.join(__dirname, '..', '..'); // Root survival directory

function setMaterialsDir(dir) {
  MATERIALS_DIR = dir;
}
const MANIFEST_FILE = path.join(__dirname, '..', 'material_manifest.json');
const METADATA_FILE = path.join(__dirname, '..', 'metadata.json');

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
  if (fs.existsSync(METADATA_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(METADATA_FILE, 'utf8'));
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
    const files = fs.readdirSync(dirPath);

    files.forEach(file => {
      // Security: Ignore app source code, config, databases, and markdown materials directories
      if (['sos-app', 'sos-server', '.git', '.gemini', 'node_modules', '.vscode', 'markdown_materials'].includes(file)) return;

      const fullPath = path.join(dirPath, file);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        scanDirectory(fullPath, metadataKeys, arrayOfFiles);
      } else {
        const ext = path.extname(file).toLowerCase();
        if (['.pdf', '.epub', '.zim', '.doc', '.docx', '.txt', '.zip', '.mp4', '.avi', '.mkv', '.wmv', '.webm', '.mov', '.iso', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'].includes(ext)) {
          const relativePath = path.relative(MATERIALS_DIR, fullPath);
          const parts = path.dirname(relativePath).split(path.sep);
          const rawCategory = parts[0] || 'Uncategorized';
          const subdirs = parts.slice(1).filter(p => p && p !== '.');
          const webPath = `/materials/${relativePath.replace(/\\/g, '/')}`;

          arrayOfFiles.push({
            name: file,
            path: webPath,
            extension: ext,
            rawCategory: rawCategory,
            subdirectories: subdirs,
            size: stat.size,
            mtime: stat.mtimeMs,
            riskCategory: getRiskCategory(file, relativePath),
            indexed: checkIndexed(webPath), // maps webPath '/materials/...' as used by crawler
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

// Load manifest from cache or return a placeholder fallback (never scan automatically)
function loadManifest() {
  if (fs.existsSync(MANIFEST_FILE)) {
    try {
      const data = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf8'));
      return {
        ...data,
        manifestReady: true
      };
    } catch (e) {
      console.error("[MANIFEST] Manifest read error:", e);
    }
  }
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    root: MATERIALS_DIR,
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
  const files = scanDirectory(MATERIALS_DIR, metadataKeys);

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
    root: MATERIALS_DIR,
    fileCount: files.length,
    categories: categorized,
    totalFiles: files.length,
    timestamp: Date.now()
  };

  try {
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifestData, null, 2));
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
  MANIFEST_FILE,
  METADATA_FILE
};
