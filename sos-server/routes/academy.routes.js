const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { resolveMaterialPath } = require('../services/materialRootService');

const CURRICULUM_DIR = path.join(__dirname, '..', 'curriculum');
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEFAULT_MODEL = process.env.SOS_LLM_MODEL || "llama3.1:8b";

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

// Extract plain text from supported files
const extractText = async (absolutePath) => {
  const ext = path.extname(absolutePath).toLowerCase();
  
  if (['.txt', '.md'].includes(ext)) {
    return fs.readFileSync(absolutePath, 'utf8');
  }
  
  if (ext === '.docx') {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ path: absolutePath });
    return result.value;
  }
  
  if (ext === '.pdf') {
    const { PDFLoader } = require("@langchain/community/document_loaders/fs/pdf");
    const loader = new PDFLoader(absolutePath);
    const docs = await loader.load();
    return docs.map(d => d.pageContent).join("\n\n");
  }
  
  throw new Error("Unsupported file type for quiz generation");
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

// Route: Dynamic AI Quiz Generator from Library Document
router.post('/generate-quiz', async (req, res) => {
  const { filePath } = req.body;
  if (!filePath) {
    return res.status(400).json({ error: "filePath is required in request body" });
  }

  try {
    const absolutePath = resolveMaterialPath(filePath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: "Document not found" });
    }

    // 1. Extract content and slice first 4000 characters for LLM context limits
    const fullText = await extractText(absolutePath);
    const textSample = fullText.slice(0, 4000);

    if (!textSample.trim()) {
      return res.status(400).json({ error: "Document content is empty or unparseable" });
    }

    // 2. Formulate prompt for Ollama in JSON Mode
    const prompt = `You are an expert homeschooling teacher. Based on the following source material excerpt, generate a 3-question multiple choice quiz suitable for homeschooling.
Ensure questions are clear, directly derived from the text, and test key concepts.
You MUST respond with a valid JSON object ONLY. Do not write markdown blocks or introductory/concluding remarks. The JSON must match this EXACT schema:
{
  "id": "generated_${path.basename(filePath, path.extname(filePath)).replace(/[^a-zA-Z0-9]/g, '_')}",
  "title": "Quiz: ${path.basename(filePath, path.extname(filePath))}",
  "subject": "Survival & Practical Skills",
  "gradeLevel": "Grade 6-12",
  "standards": ["Practical Field Competency"],
  "description": "Interactive homeschool evaluation generated dynamically from library document: ${path.basename(filePath)}",
  "questions": [
    {
      "question": "[Insert question 1 here]",
      "options": ["[Option A]", "[Option B]", "[Option C]", "[Option D]"],
      "correctIndex": 0
    },
    {
      "question": "[Insert question 2 here]",
      "options": ["[Option A]", "[Option B]", "[Option C]", "[Option D]"],
      "correctIndex": 1
    },
    {
      "question": "[Insert question 3 here]",
      "options": ["[Option A]", "[Option B]", "[Option C]", "[Option D]"],
      "correctIndex": 2
    }
  ]
}

SOURCE MATERIAL EXCERPT:
${textSample}`;

    // 3. Request JSON completion from local Ollama
    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: DEFAULT_MODEL,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama generation request failed with status: ${response.status}`);
    }

    const result = await response.json();
    const parsedQuiz = JSON.parse(result.response);
    res.json(parsedQuiz);

  } catch (err) {
    console.error("[ACADEMY] Quiz generation failed:", err);
    res.status(500).json({ error: "Failed to generate dynamic quiz from document. Make sure Ollama is running." });
  }
});

module.exports = router;
