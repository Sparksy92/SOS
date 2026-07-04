const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

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

// 2. GET /api/toolkit/zim
router.get('/zim', (req, res) => {
  try {
    // Ignore req.query.folder completely. Only use process.env.SOS_ZIM_DIR if configured.
    let targetFolder = process.env.SOS_ZIM_DIR;
    let isFallback = false;

    if (!targetFolder) {
      targetFolder = path.resolve(__dirname, '..', '..', 'import-staging', 'kiwix');
      isFallback = true;
    } else {
      targetFolder = path.resolve(targetFolder);
    }

    // Ensure directory exists if fallback
    if (isFallback && !fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    if (!fs.existsSync(targetFolder)) {
      // Never return raw configured folder paths in errors to prevent home path leaks
      return res.status(404).json({ error: "Configured ZIM folder does not exist." });
    }

    const files = fs.readdirSync(targetFolder);
    const archives = [];
    const maxFiles = 20;

    for (const file of files) {
      if (archives.length >= maxFiles) break;

      const fullPath = path.join(targetFolder, file);
      const stat = fs.statSync(fullPath);

      if (stat.isFile() && file.toLowerCase().endsWith('.zim')) {
        // Estimated title from filename
        let title = file
          .replace(/_/g, ' ')
          .replace(/\.zim$/i, '')
          .split(' ')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        // Inferred language
        let language = 'en';
        if (file.includes('_zh_')) language = 'zh';
        else if (file.includes('_es_')) language = 'es';
        else if (file.includes('_fr_')) language = 'fr';
        else if (file.includes('_de_')) language = 'de';

        archives.push({
          filename: file,
          size: stat.size,
          title: title,
          language: language,
          path: `[ZIM_FOLDER]/${file}` // Sanitized path returning placeholders, no user home paths
        });
      }
    }

    // Output payload replaces configured path with placeholder
    res.json({
      zimFolder: "[ZIM_FOLDER]",
      archives
    });
  } catch (err) {
    console.error("[TOOLKIT ROUTE] ZIM read failed:", err);
    res.status(500).json({ error: "Internal server error during ZIM catalog scan." });
  }
});

module.exports = router;
