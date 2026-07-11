const express = require('express');
const router = express.Router();
const ebgService = require('../services/ebgService');
const { db } = require('../db');

// GET /api/ebg/nodes
router.get('/nodes', (req, res) => {
  try {
    const nodes = db.prepare("SELECT * FROM ebg_nodes").all();
    res.json(nodes);
  } catch (err) {
    console.error("Error fetching nodes:", err);
    res.status(500).json({ error: "Failed to fetch nodes." });
  }
});

// GET /api/ebg/edges
router.get('/edges', (req, res) => {
  try {
    const edges = db.prepare("SELECT * FROM ebg_edges").all();
    res.json(edges);
  } catch (err) {
    console.error("Error fetching edges:", err);
    res.status(500).json({ error: "Failed to fetch edges." });
  }
});

// GET /api/ebg/models
router.get('/models', (req, res) => {
  try {
    const models = db.prepare("SELECT * FROM mental_models").all();
    res.json(models);
  } catch (err) {
    console.error("Error fetching mental models:", err);
    res.status(500).json({ error: "Failed to fetch mental models." });
  }
});

// GET /api/ebg/predictions
router.get('/predictions', (req, res) => {
  try {
    const predictions = db.prepare("SELECT * FROM model_predictions ORDER BY id DESC").all();
    res.json(predictions);
  } catch (err) {
    console.error("Error fetching predictions:", err);
    res.status(500).json({ error: "Failed to fetch predictions." });
  }
});

// GET /api/ebg/observations
router.get('/observations', (req, res) => {
  try {
    const observations = db.prepare("SELECT * FROM raw_observations ORDER BY timestamp DESC LIMIT 50").all();
    res.json(observations);
  } catch (err) {
    console.error("Error fetching observations:", err);
    res.status(500).json({ error: "Failed to fetch observations." });
  }
});

// POST /api/ebg/observations
router.post('/observations', async (req, res) => {
  try {
    const { sensorId, value } = req.body;
    if (!sensorId || value === undefined) {
      return res.status(400).json({ error: "sensorId and value are required" });
    }
    
    await ebgService.addObservation(sensorId, value);
    
    // If the observation value triggers a DMN prediction critique, run it
    const actualTime = new Date().toISOString();
    ebgService.runDmnCritique(actualTime, sensorId, value);
    
    res.json({ success: true, message: `Observation recorded for ${sensorId}` });
  } catch (err) {
    console.error("Error recording observation:", err);
    res.status(500).json({ error: "Failed to record observation." });
  }
});

// POST /api/ebg/spreading-activation
router.post('/spreading-activation', async (req, res) => {
  try {
    const { queryText } = req.body;
    if (!queryText) {
      return res.status(400).json({ error: "queryText is required" });
    }
    
    const activeNodes = await ebgService.getSpreadingActivation(queryText);
    res.json(activeNodes);
  } catch (err) {
    console.error("Error getting spreading activation:", err);
    res.status(500).json({ error: "Spreading activation failed." });
  }
});

module.exports = router;
