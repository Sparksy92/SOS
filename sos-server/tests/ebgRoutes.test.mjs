process.env.SOS_DB_PATH = ':memory:';

import assert from 'node:assert';
import test from 'node:test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { OllamaEmbeddings } = require('@langchain/ollama');

// Initialize memory DB first
const { db } = await import('../db.js');

// Mock OllamaEmbeddings before importing ebgService
OllamaEmbeddings.prototype.embedQuery = async function(text) {
  // Return dummy 768-dim float vector
  return Array(768).fill(0.1);
};
OllamaEmbeddings.prototype.embedDocuments = async function(documents) {
  // Return dummy 768-dim vectors
  return documents.map(() => Array(768).fill(0.1));
};

const ebgService = require('../services/ebgService');
const ebgRouter = require('../routes/ebg.routes');

// Helper to mock req/res
function mockReqRes(reqOpts, callback) {
  const req = {
    query: {},
    body: {},
    ...reqOpts
  };

  const res = {
    statusCode: 200,
    headers: {},
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      callback(this);
    },
    send(data) {
      this.body = data;
      callback(this);
    }
  };

  return { req, res };
}

test('EBG Service & Route Endpoints Test Suite', async (t) => {
  // 1. Initialize EBG schema and baseline data
  await ebgService.initializeEbgBaseline();

  await t.test('1. Database contains baseline policy and goal nodes', () => {
    const nodes = db.prepare("SELECT * FROM ebg_nodes").all();
    assert.ok(nodes.length > 0, "Should have baseline nodes");
    
    const policies = nodes.filter(n => n.layer === 'policy');
    const goals = nodes.filter(n => n.layer === 'goal');
    assert.ok(policies.length > 0, "Should have policy nodes");
    assert.ok(goals.length > 0, "Should have goal nodes");
  });

  await t.test('2. GET /api/ebg/nodes returns registered nodes', () => {
    const handler = ebgRouter.stack.find(s => s.route?.path === '/nodes').route.stack[0].handle;
    
    return new Promise((resolve, reject) => {
      const { req, res } = mockReqRes({}, (result) => {
        try {
          assert.strictEqual(result.statusCode, 200);
          assert.ok(Array.isArray(result.body));
          assert.ok(result.body.length > 0);
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      handler(req, res);
    });
  });

  await t.test('3. GET /api/ebg/edges returns relational edges', () => {
    const handler = ebgRouter.stack.find(s => s.route?.path === '/edges').route.stack[0].handle;
    
    return new Promise((resolve, reject) => {
      const { req, res } = mockReqRes({}, (result) => {
        try {
          assert.strictEqual(result.statusCode, 200);
          assert.ok(Array.isArray(result.body));
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      handler(req, res);
    });
  });

  await t.test('4. POST /api/ebg/observations records new telemetry data', () => {
    const handler = ebgRouter.stack.find(s => s.route?.path === '/observations' && s.route.methods.post).route.stack[0].handle;
    
    return new Promise((resolve, reject) => {
      const { req, res } = mockReqRes({
        body: { sensorId: 'moisture_sensor_b', value: 15 }
      }, (result) => {
        try {
          assert.strictEqual(result.statusCode, 200);
          assert.strictEqual(result.body.success, true);
          
          // Verify it was inserted in raw_observations
          const obs = db.prepare("SELECT * FROM raw_observations WHERE sensor_id = 'moisture_sensor_b'").get();
          assert.ok(obs, "Should find the observation in raw_observations table");
          assert.strictEqual(obs.value, 15);
          
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      handler(req, res).catch(reject);
    });
  });

  await t.test('5. POST /api/ebg/spreading-activation returns semantic similarity matches', () => {
    const handler = ebgRouter.stack.find(s => s.route?.path === '/spreading-activation').route.stack[0].handle;
    
    return new Promise((resolve, reject) => {
      const { req, res } = mockReqRes({
        body: { queryText: 'battery status warning' }
      }, (result) => {
        try {
          assert.strictEqual(result.statusCode, 200);
          assert.ok(Array.isArray(result.body));
          resolve();
        } catch (err) {
          reject(err);
        }
      });
      handler(req, res).catch(reject);
    });
  });
});
