const express = require('express');
const router = express.Router();
const mycologyService = require('../services/mycologyService');
const ai = require('../ai');

/**
 * GET /api/mycology/entries
 * Query knowledge entries with search, filters, and pagination
 */
router.get('/entries', (req, res) => {
  try {
    const { type = 'mycology', query, edibility, habitat, season, limit, offset } = req.query;
    const results = mycologyService.searchKnowledgeEntries({
      type,
      query,
      edibility,
      habitat,
      season,
      limit: parseInt(limit, 10) || 100,
      offset: parseInt(offset, 10) || 0
    });
    res.json(results);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Search failed:", err);
    res.status(500).json({ error: "Failed to search knowledge entries." });
  }
});

/**
 * GET /api/mycology/entries/:id
 */
router.get('/entries/:id', (req, res) => {
  try {
    const entry = mycologyService.getEntryById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "Knowledge entry not found." });
    }
    res.json(entry);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Get entry failed:", err);
    res.status(500).json({ error: "Failed to fetch knowledge entry." });
  }
});

/**
 * POST /api/mycology/entries
 * Create or update knowledge entry
 */
router.post('/entries', (req, res) => {
  try {
    const entryData = req.body;
    if (!entryData.id || !entryData.title) {
      return res.status(400).json({ error: "Entry must provide id and title." });
    }
    const saved = mycologyService.upsertKnowledgeEntry(entryData);
    res.json(saved);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Upsert entry failed:", err);
    res.status(500).json({ error: "Failed to save knowledge entry." });
  }
});

/**
 * POST /api/mycology/identify
 * Evaluate selected traits against decision matrix
 */
router.post('/identify', (req, res) => {
  try {
    const { traits = {} } = req.body;
    const matches = mycologyService.evaluateTraitsAgainstCandidates(traits);
    res.json({
      traits,
      candidateCount: matches.length,
      matches
    });
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Trait evaluation failed:", err);
    res.status(500).json({ error: "Failed to evaluate identification traits." });
  }
});

/**
 * GET /api/mycology/keys
 * Get identification decision keys
 */
router.get('/keys', (req, res) => {
  try {
    const { module = 'mycology', region } = req.query;
    const keys = mycologyService.getIdentificationKeys(module, region);
    res.json(keys);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Get keys failed:", err);
    res.status(500).json({ error: "Failed to fetch identification keys." });
  }
});

/**
 * POST /api/mycology/keys
 */
router.post('/keys', (req, res) => {
  try {
    const keyData = req.body;
    if (!keyData.id || !keyData.title || !keyData.keyTree) {
      return res.status(400).json({ error: "Identification key requires id, title, and keyTree." });
    }
    const saved = mycologyService.saveIdentificationKey(keyData);
    res.json(saved);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Save key failed:", err);
    res.status(500).json({ error: "Failed to save identification key." });
  }
});

/**
 * GET /api/mycology/observations
 * List field journal observations
 */
router.get('/observations', (req, res) => {
  try {
    const { userId = 'local_ranger' } = req.query;
    const observations = mycologyService.getObservations(userId);
    res.json(observations);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Get observations failed:", err);
    res.status(500).json({ error: "Failed to fetch field journal observations." });
  }
});

/**
 * POST /api/mycology/observations
 */
router.post('/observations', (req, res) => {
  try {
    const obsData = req.body;
    const saved = mycologyService.saveObservation(obsData);
    res.json(saved);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Save observation failed:", err);
    res.status(500).json({ error: "Failed to save field observation." });
  }
});

/**
 * DELETE /api/mycology/observations/:id
 */
router.delete('/observations/:id', (req, res) => {
  try {
    const result = mycologyService.deleteObservation(req.params.id);
    res.json(result);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Delete observation failed:", err);
    res.status(500).json({ error: "Failed to delete field observation." });
  }
});

/**
 * GET /api/mycology/packs
 */
router.get('/packs', (req, res) => {
  try {
    const { module = 'mycology' } = req.query;
    const packs = mycologyService.getKnowledgePacks(module);
    res.json(packs);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Get packs failed:", err);
    res.status(500).json({ error: "Failed to fetch knowledge packs." });
  }
});

/**
 * POST /api/mycology/packs/import
 */
router.post('/packs/import', (req, res) => {
  try {
    const packData = req.body;
    const result = mycologyService.importKnowledgePack(packData);
    res.json(result);
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] Pack import failed:", err);
    res.status(400).json({ error: err.message || "Failed to import knowledge pack." });
  }
});

/**
 * POST /api/mycology/ai-analyze
 * R.A.N.G.E.R. Local AI Knowledge Router for Mycology
 */
router.post('/ai-analyze', async (req, res) => {
  try {
    const { question = '', traits = {}, targetSpeciesId = null } = req.body;

    let targetEntry = null;
    if (targetSpeciesId) {
      targetEntry = mycologyService.getEntryById(targetSpeciesId);
    }

    const contextEntries = mycologyService.searchKnowledgeEntries({ limit: 10 });
    const contextSummary = contextEntries.map(e => (
      `- ${e.title} (${e.scientificName}): Edibility: ${e.content?.edibility || 'Unknown'}, Cap: ${e.traits?.cap_shape?.map(t => t.label).join(', ') || 'N/A'}, Hymenophore: ${e.traits?.hymenophore?.map(t => t.label).join(', ') || 'N/A'}, Habitat: ${e.traits?.habitat?.map(t => t.label).join(', ') || 'N/A'}, Safety Risk: ${e.safetyRating?.risk || 'Unknown'}`
    )).join('\n');

    let prompt = `You are R.A.N.G.E.R., an expert off-grid field AI assistant specializing in mycology and survival knowledge.\n`;
    prompt += `CONTEXT FROM LOCAL MYCOLOGY KNOWLEDGE PACKS:\n${contextSummary}\n\n`;

    if (targetEntry) {
      prompt += `TARGET SPECIES BEING ANALYZED:\nTitle: ${targetEntry.title}\nScientific Name: ${targetEntry.scientificName}\nEdibility: ${targetEntry.content?.edibility || 'N/A'}\nSafety Rating: ${JSON.stringify(targetEntry.safetyRating)}\nLookalikes: ${JSON.stringify(targetEntry.relationships)}\n\n`;
    }

    if (Object.keys(traits).length > 0) {
      prompt += `USER OBSERVED TRAITS: ${JSON.stringify(traits)}\n\n`;
    }

    prompt += `USER QUESTION: ${question || 'Analyze candidate species match and explain key distinguishing traits vs dangerous lookalikes.'}\n\n`;
    prompt += `INSTRUCTIONS: Provide clear, concise field guide advice. Always explain key physical differentiators. Include a prominent safety notice warning that visual AI analysis is advisory only and field characteristics must be verified physically.`;

    let aiResponseText = '';
    try {
      if (typeof ai.chat === 'function') {
        const aiRes = await ai.chat(prompt);
        aiResponseText = typeof aiRes === 'string' ? aiRes : (aiRes?.text || aiRes?.content || '');
      }
    } catch (aiErr) {
      console.warn("[MYCOLOGY AI ROUTER] Local Ollama call fallback to structured response:", aiErr.message);
    }

    if (!aiResponseText) {
      // Deterministic fallback if Ollama is not active locally
      aiResponseText = `### R.A.N.G.E.R. Field Advisory Analysis\n\n`;
      if (targetEntry) {
        aiResponseText += `**Species Analysis**: ${targetEntry.title} (*${targetEntry.scientificName}*)\n`;
        aiResponseText += `- **Edibility Class**: ${targetEntry.content?.edibility || 'Unknown'}\n`;
        aiResponseText += `- **Identification Difficulty**: ${targetEntry.safetyRating?.difficulty || 'Intermediate'}\n`;
        aiResponseText += `- **Key Trait Focus**: Check hymenophore attachment, cap texture, and spore print.\n\n`;
      } else {
        aiResponseText += `Based on observed field traits, consult the Identification Assistant decision tree to narrow candidates.\n\n`;
      }
    }

    // Always append strict safety disclaimer
    const mandatoryDisclaimer = `\n\n> ⚠️ **SOS SAFETY DIRECTIVE**: Visual AI/text analysis is for advisory reference only. Never ingest wild fungi without physical verification of spore print, gill structure, cap morphology, and expert consultation.`;
    
    if (!aiResponseText.includes("SOS SAFETY DIRECTIVE")) {
      aiResponseText += mandatoryDisclaimer;
    }

    res.json({
      success: true,
      analysis: aiResponseText,
      disclaimer: mandatoryDisclaimer
    });
  } catch (err) {
    console.error("[MYCOLOGY ROUTES] AI analysis failed:", err);
    res.status(500).json({ error: "Failed to perform AI analysis." });
  }
});

module.exports = router;
