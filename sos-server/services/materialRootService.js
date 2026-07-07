const path = require('path');

function getAppRoot() {
  return path.resolve(__dirname, '..', '..');
}

let materialsDirOverride = null;

function setMaterialsDirOverride(dir) {
  materialsDirOverride = dir ? path.resolve(dir) : null;
}

function getMaterialRoot() {
  if (materialsDirOverride) {
    return materialsDirOverride;
  }
  if (process.env.SOS_MATERIALS_DIR) {
    return path.resolve(process.env.SOS_MATERIALS_DIR);
  }
  return getAppRoot();
}

function getBlockedPathNames() {
  return [
    '.git',
    '.github',
    '.gemini',
    '.vscode',
    'node_modules',
    'sos-app',
    'sos-server',
    'markdown_materials',
    'survival_zip_backups',
    '.env',
    '.env.local',
    'material_manifest.json',
    'metadata.json',
    'vector_store'
  ];
}

function isBlockedMaterialPath(absolutePath) {
  const resolved = path.resolve(absolutePath);
  const materialsRoot = getMaterialRoot();
  
  // Verify it is inside the material root
  const relativeToMaterials = path.relative(materialsRoot, resolved);
  if (relativeToMaterials.startsWith('..') || path.isAbsolute(relativeToMaterials)) {
    return true;
  }
  
  // Segment-based checks (Windows/POSIX compatible, case-insensitive)
  const parts = relativeToMaterials.split(path.sep);
  const blocked = getBlockedPathNames().map(n => n.toLowerCase());
  
  for (const part of parts) {
    if (!part) continue;
    const lowerPart = part.toLowerCase();
    
    // Check direct list matches
    if (blocked.includes(lowerPart)) {
      return true;
    }
    
    // Check blocked database extensions
    if (lowerPart.endsWith('.db') || lowerPart.endsWith('.sqlite') || lowerPart.endsWith('.sqlite3')) {
      return true;
    }
  }
  return false;
}

function resolveMaterialPath(webPath) {
  if (!webPath || typeof webPath !== 'string') {
    throw new Error('filePath is required');
  }

  if (webPath.includes('\0')) {
    throw new Error('Invalid path: Null byte detected');
  }

  // Allow either absolute webPath "/materials/..." or relative "/..."
  let relPath = webPath;
  if (webPath.startsWith('/materials/')) {
    relPath = webPath.replace(/^\/materials\//, '');
  } else if (webPath.startsWith('/')) {
    relPath = webPath.substring(1);
  }

  const materialsRoot = getMaterialRoot();
  const normalizedRelPath = relPath.replace(/\\/g, path.sep).replace(/\//g, path.sep);
  const absolutePath = path.resolve(materialsRoot, normalizedRelPath);

  // Boundary check
  const root = path.resolve(materialsRoot);
  if (absolutePath !== root && !absolutePath.startsWith(root + path.sep)) {
    throw new Error('Invalid material path: Out of bounds');
  }

  // Deny-list check
  if (isBlockedMaterialPath(absolutePath)) {
    throw new Error('Access denied to blocked path');
  }

  return absolutePath;
}

function absoluteToMaterialWebPath(absolutePath) {
  const resolved = path.resolve(absolutePath);
  const root = path.resolve(getMaterialRoot());
  
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error('Path is outside materials directory');
  }
  
  if (isBlockedMaterialPath(resolved)) {
    throw new Error('Access denied to blocked path');
  }
  
  const rel = path.relative(root, resolved);
  return '/materials/' + rel.replace(/\\/g, '/');
}

module.exports = {
  getAppRoot,
  getMaterialRoot,
  setMaterialsDirOverride,
  getBlockedPathNames,
  isBlockedMaterialPath,
  resolveMaterialPath,
  absoluteToMaterialWebPath
};
