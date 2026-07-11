const { OllamaEmbeddings } = require("@langchain/ollama");
const { db } = require('../db');

// Configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.SOS_EMBEDDING_MODEL || "nomic-embed-text";

// Initialize local embeddings
const embeddings = new OllamaEmbeddings({
  model: EMBEDDING_MODEL,
  baseUrl: OLLAMA_BASE_URL,
});

/**
 * Helper to serialize Float32Array to Buffer
 */
async function getEmbeddingBuffer(text) {
  try {
    const vec = await embeddings.embedQuery(text);
    const floatArray = new Float32Array(vec);
    return Buffer.from(floatArray.buffer);
  } catch (err) {
    console.error("[EBG SERVICE] Failed to generate embedding for:", text, err);
    return null;
  }
}

/**
 * Calculates cosine similarity between two Float32Arrays
 */
function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Initializes baseline policies, goals, and mental models in the EBG
 */
async function initializeEbgBaseline() {
  try {
    const checkStmt = db.prepare("SELECT count(*) as count FROM ebg_nodes WHERE layer = 'policy'");
    const policyCount = checkStmt.get().count;
    if (policyCount > 0) return; // Already initialized

    console.log("[EBG SERVICE] Initializing baseline ontology...");
    const embedBlob = await getEmbeddingBuffer("Never run high-power irrigation when battery is predicted to be critically low");
    const goalEmbedBlob = await getEmbeddingBuffer("Maintain crop hydration without risking power outage");

    // Insert Policy Node with JSON payload rule
    const policyRule = JSON.stringify({
      action_keyword: "water",
      condition_metric: "battery_sensor",
      condition_operator: "<=",
      condition_value: 20.0
    });
    
    db.prepare(`
      INSERT INTO ebg_nodes (layer, content, execution_payload, embedding, importance)
      VALUES ('policy', 'Never run high-power irrigation when battery is predicted to be critically low', ?, ?, 1.0)
    `).run(policyRule, embedBlob);

    // Insert Goal Node
    db.prepare(`
      INSERT INTO ebg_nodes (layer, content, embedding, importance)
      VALUES ('goal', 'Maintain crop hydration without risking power outage', ?, 0.8)
    `).run(goalEmbedBlob);

    // Insert Mental Model
    db.prepare(`
      INSERT INTO mental_models (name, description, execution_type, execution_payload, trust_score)
      VALUES ('Battery Depletion Model', 'Predicts battery levels based on current loads', 'deterministic_script', 'battery_decay.py', 0.9)
    `).run();

    console.log("[EBG SERVICE] Baseline ontology successfully established.");
  } catch (err) {
    console.error("[EBG SERVICE] Failed to initialize baseline ontology:", err);
  }
}

/**
 * Adds an interpreted semantic node to the EBG
 */
async function addEbgNode(layer, content, executionPayload = null, importance = 0.5) {
  try {
    const embedBlob = await getEmbeddingBuffer(content);
    db.prepare(`
      INSERT OR IGNORE INTO ebg_nodes (layer, content, execution_payload, embedding, importance)
      VALUES (?, ?, ?, ?, ?)
    `).run(layer, content, executionPayload, embedBlob, importance);
    
    const row = db.prepare("SELECT id FROM ebg_nodes WHERE content = ?").get(content);
    return row ? row.id : null;
  } catch (err) {
    console.error("[EBG SERVICE] Error adding node:", content, err);
    return null;
  }
}

/**
 * Adds a raw sensor/telemetry observation and evaluates reflexes
 */
async function addObservation(sensorId, value) {
  try {
    db.prepare("INSERT INTO raw_observations (sensor_id, value) VALUES (?, ?)").run(sensorId, Number(value));
    
    // System 1 fast reflex rules
    if (sensorId === 'moisture_sensor_b' && Number(value) < 25.0) {
      console.log(`[EBG SERVICE] Reflex: Moisture B is critically dry (${value}%). Elevating to EBG interpretation.`);
      
      const interpId = await addEbgNode('interpretation', 'Garden soil is critically dry', null, 0.75);
      const obsId = await addEbgNode('observation', `Raw moisture telemetry: ${value}%`, null, 0.5);
      
      if (interpId && obsId) {
        db.prepare(`
          INSERT OR IGNORE INTO ebg_edges (source_id, target_id, predicate, weight, confidence, status)
          VALUES (?, ?, 'contains', 0.9, 0.95, 'confirmed')
        `).run(interpId, obsId);
      }
    }
  } catch (err) {
    console.error("[EBG SERVICE] Error recording observation:", sensorId, err);
  }
}

/**
 * Runs Spreading Activation based on Query Vector Cosine Similarity
 */
async function getSpreadingActivation(queryText, threshold = 0.70, recallThreshold = 0.35) {
  try {
    const queryVec = await embeddings.embedQuery(queryText);
    const nodes = db.prepare("SELECT id, layer, content, embedding, importance FROM ebg_nodes WHERE embedding IS NOT NULL").all();
    
    const activeNodes = {}; // node_id -> activation level
    
    // Phase 1: Neural Cosine Similarity match (Seed Activation)
    for (const node of nodes) {
      if (!node.embedding) continue;
      const nodeVec = new Float32Array(node.embedding.buffer, node.embedding.byteOffset, node.embedding.byteLength / 4);
      const sim = cosineSimilarity(queryVec, nodeVec);
      
      if (sim >= threshold) {
        activeNodes[node.id] = {
          id: node.id,
          layer: node.layer,
          content: node.content,
          activation: sim,
          importance: node.importance
        };
      }
    }
    
    // Phase 2: Spreading Activation along Edges
    const activeIds = Object.keys(activeNodes);
    for (const sourceId of activeIds) {
      const parentActivation = activeNodes[sourceId].activation;
      
      const edges = db.prepare(`
        SELECT target_id, weight, confidence, predicate, n.layer, n.content 
        FROM ebg_edges e
        JOIN ebg_nodes n ON e.target_id = n.id
        WHERE e.source_id = ? AND e.status != 'superseded'
      `).all(sourceId);
      
      for (const edge of edges) {
        // Activation transmission scales by weight and confidence
        const excitation = parentActivation * edge.weight * edge.confidence * 0.75;
        
        if (!activeNodes[edge.target_id]) {
          activeNodes[edge.target_id] = {
            id: edge.target_id,
            layer: edge.layer,
            content: edge.content,
            activation: 0.0,
            importance: 0.5
          };
        }
        
        activeNodes[edge.target_id].activation = Math.min(activeNodes[edge.target_id].activation + excitation, 1.0);
      }
    }
    
    // Filter by recall threshold
    return Object.values(activeNodes).filter(n => n.activation >= recallThreshold);
  } catch (err) {
    console.error("[EBG SERVICE] Spreading activation failed:", err);
    return [];
  }
}

/**
 * Compiles active EBG layers into a structured prompt injection
 */
async function compileEbgContext(queryText) {
  try {
    await initializeEbgBaseline();
    
    // Fetch active policies & goals
    const policies = db.prepare("SELECT content FROM ebg_nodes WHERE layer = 'policy'").all();
    const goals = db.prepare("SELECT content, importance FROM ebg_nodes WHERE layer = 'goal'").all();
    
    // Run spreading activation for relevant interpretations and beliefs
    const recalledNodes = await getSpreadingActivation(queryText);
    
    let context = "\n[COGNITIVE DATA LAYER (CDL) STATE]\n";
    
    if (policies.length > 0) {
      context += "\n[ACTIVE SYSTEM POLICIES (DO NOT VIOLATE)]\n";
      policies.forEach(p => {
        context += `- ${p.content}\n`;
      });
    }
    
    if (goals.length > 0) {
      context += "\n[ACTIVE GOALS]\n";
      goals.forEach(g => {
        context += `- ${g.content} (Importance: ${g.importance})\n`;
      });
    }
    
    if (recalledNodes.length > 0) {
      context += "\n[RECALLED SEMANTIC MEMORY & STATE]\n";
      recalledNodes.forEach(n => {
        context += `- (${n.layer}) ${n.content} [Activation: ${n.activation.toFixed(2)}]\n`;
      });
    }
    
    // Fetch pending predictions
    const predictions = db.prepare(`
      SELECT target_metric, condition_operator, condition_value, target_timestamp, confidence 
      FROM model_predictions 
      WHERE status = 'pending'
    `).all();
    
    if (predictions.length > 0) {
      context += "\n[ACTIVE PREDICTIONS / EXPECTED FUTURE STATES]\n";
      predictions.forEach(p => {
        context += `- WARNING: Predicted ${p.target_metric} ${p.condition_operator} ${p.condition_value} targeting ${p.target_timestamp} (Confidence: ${p.confidence})\n`;
      });
    }
    
    return context;
  } catch (err) {
    console.error("[EBG SERVICE] Context compile failed:", err);
    return "";
  }
}

/**
 * Deterministically checks proposed actions against Policy Node rules
 */
function authorizeDecision(proposedAction) {
  try {
    const policies = db.prepare("SELECT content, execution_payload FROM ebg_nodes WHERE layer = 'policy' AND execution_payload IS NOT NULL").all();
    
    for (const policy of policies) {
      try {
        const rule = JSON.parse(policy.execution_payload);
        const keyword = rule.action_keyword;
        const metric = rule.condition_metric;
        const op = rule.condition_operator;
        const val = rule.condition_value;
        
        // If decision matches the policy action keyword
        if (keyword && proposedAction.toLowerCase().includes(keyword.toLowerCase())) {
          // Check if there is a pending prediction violating the condition
          const row = db.prepare(`
            SELECT count(*) as count FROM model_predictions 
            WHERE target_metric = ? 
              AND condition_operator = ? 
              AND condition_value >= ? 
              AND status = 'pending'
          `).get(metric, op, val);
          
          if (row && row.count > 0) {
            return {
              authorized: false,
              reason: `Proposed action matches policy keyword '${keyword}' and violates policy constraint: '${policy.content}'`
            };
          }
        }
      } catch (e) {
        console.error("[EBG SERVICE] Error parsing policy rule:", e);
      }
    }
    
    return { authorized: true, reason: null };
  } catch (err) {
    console.error("[EBG SERVICE] Error authorizing decision:", err);
    return { authorized: true, reason: null };
  }
}

/**
 * Runs DMN evaluation of predictions against actual time-series observations
 */
function runDmnCritique(actualTime, observedMetric, observedValue) {
  try {
    const predictions = db.prepare(`
      SELECT p.id, p.model_id, m.name, p.condition_operator, p.condition_value, m.trust_score 
      FROM model_predictions p
      JOIN mental_models m ON p.model_id = m.id
      WHERE p.target_metric = ? AND p.status = 'pending'
    `).all(observedMetric);
    
    for (const pred of predictions) {
      let correct = false;
      if (pred.condition_operator === '<=') {
        correct = (Number(observedValue) <= pred.condition_value);
      } else if (pred.condition_operator === '>=') {
        correct = (Number(observedValue) >= pred.condition_value);
      } else if (pred.condition_operator === '==') {
        correct = (Number(observedValue) === pred.condition_value);
      }
      
      const newStatus = correct ? 'correct' : 'incorrect';
      
      let newTrust = pred.trust_score;
      if (correct) {
        newTrust = Math.min(pred.trust_score + 0.05, 1.0);
        console.log(`[DMN CRITIQUE] Correct prediction by model '${pred.name}'. Trust increased: ${pred.trust_score.toFixed(2)} -> ${newTrust.toFixed(2)}`);
      } else {
        newTrust = Math.max(pred.trust_score * 0.85, 0.0);
        console.log(`[DMN CRITIQUE] Incorrect prediction by model '${pred.name}'. Trust slashed: ${pred.trust_score.toFixed(2)} -> ${newTrust.toFixed(2)}`);
      }
      
      db.prepare("UPDATE model_predictions SET status = ? WHERE id = ?").run(newStatus, pred.id);
      db.prepare("UPDATE mental_models SET trust_score = ?, last_evaluated = ? WHERE id = ?").run(newTrust, actualTime, pred.model_id);
    }
  } catch (err) {
    console.error("[EBG SERVICE] DMN critique failed:", err);
  }
}

module.exports = {
  initializeEbgBaseline,
  addEbgNode,
  addObservation,
  getSpreadingActivation,
  compileEbgContext,
  authorizeDecision,
  runDmnCritique
};
