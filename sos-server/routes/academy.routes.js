const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const CURRICULUM_DIR = path.join(__dirname, '..', 'curriculum');

// Helper to recursively parse JSON files in subdirectories
const scanCurriculumDir = () => {
  const data = {
    sprouts: [],
    explorers: [],
    cadets: [],
    operators: []
  };

  const brackets = [
    { dir: 'sprouts_0_5', key: 'sprouts' },
    { dir: 'explorers_6_12', key: 'explorers' },
    { dir: 'cadets_13_17', key: 'cadets' },
    { dir: 'operators_18', key: 'operators' }
  ];

  brackets.forEach(bracket => {
    const dirPath = path.join(CURRICULUM_DIR, bracket.dir);
    if (!fs.existsSync(dirPath)) return;

    try {
      const files = fs.readdirSync(dirPath);
      files.forEach(file => {
        if (!file.endsWith('.json')) return;

        const filePath = path.join(dirPath, file);
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          const parsed = JSON.parse(content);

          // Simple schema validation
          if (parsed.id && parsed.title && parsed.type) {
            data[bracket.key].push(parsed);
          } else {
            console.warn(`[ACADEMY] Invalid schema in file: ${file}`);
          }
        } catch (parseErr) {
          console.error(`[ACADEMY] Error reading/parsing file ${file}:`, parseErr);
        }
      });
    } catch (readErr) {
      console.error(`[ACADEMY] Error scanning bracket dir ${bracket.dir}:`, readErr);
    }
  });

  return data;
};

// Route: Get all courses grouped by age brackets
router.get('/courses', (req, res) => {
  try {
    const courses = scanCurriculumDir();
    res.json(courses);
  } catch (err) {
    console.error("[ACADEMY] Get courses failed:", err);
    res.status(500).json({ error: "Failed to load curriculum courses." });
  }
});

module.exports = router;
