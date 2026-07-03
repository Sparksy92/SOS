import assert from 'node:assert';
import test from 'node:test';
import healthRouter from '../routes/health.routes.js';
import materialsRouter from '../routes/materials.routes.js';

// Simple mock request-response helper
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
    },
    writeHead(code, headers) {
      this.statusCode = code;
      this.headers = headers;
    }
  };

  return { req, res };
}

test('Routes - Health route diagnostics status', () => {
  // Extract handler directly from Express router stack
  const handler = healthRouter.stack[0].route.stack[0].handle;
  
  return new Promise((resolve, reject) => {
    const { req, res } = mockReqRes({}, (result) => {
      try {
        assert.strictEqual(result.statusCode, 200);
        assert.strictEqual(result.body.status, 'healthy');
        assert.ok('ollama' in result.body);
        assert.ok('manifestExists' in result.body);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    handler(req, res).catch(reject);
  });
});

test('Routes - Materials list from manifest', () => {
  // Extract handler directly from Express router stack
  const handler = materialsRouter.stack[0].route.stack[0].handle;

  return new Promise((resolve, reject) => {
    const { req, res } = mockReqRes({}, (result) => {
      try {
        assert.strictEqual(result.statusCode, 200);
        assert.ok(result.body.categories);
        resolve();
      } catch (err) {
        reject(err);
      }
    });

    handler(req, res);
  });
});
