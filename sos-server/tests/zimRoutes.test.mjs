import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import toolkitRouter from '../routes/toolkit.routes.js';

// Helper to mock req/res for router testing
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

test('ZIM Process & Route Sanitization Verification', async (t) => {
  
  await t.test('1. GET /zim/status returns engine presence parameters', (context, done) => {
    const { req, res } = mockReqRes({ method: 'GET', url: '/zim/status' }, (response) => {
      assert.strictEqual(response.statusCode, 200);
      assert.ok('installed' in response.body, "Should detect installed status");
      assert.ok('running' in response.body, "Should detect running status");
      assert.strictEqual(response.body.port, 3008, "Should use port 3008");
      done();
    });

    // Call the router middleware handler directly
    const handle = toolkitRouter.stack.find(s => s.route && s.route.path === '/zim/status');
    assert.ok(handle, "Router must have /zim/status route");
    handle.route.stack[0].handle(req, res);
  });

  await t.test('2. POST /zim/start rejects missing filename', (context, done) => {
    const { req, res } = mockReqRes({ method: 'POST', url: '/zim/start', body: {} }, (response) => {
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.body.error, "Filename is required.");
      done();
    });

    const handle = toolkitRouter.stack.find(s => s.route && s.route.path === '/zim/start');
    assert.ok(handle, "Router must have /zim/start route");
    handle.route.stack[0].handle(req, res);
  });

  await t.test('3. POST /zim/start rejects path traversal names', (context, done) => {
    const { req, res } = mockReqRes({ method: 'POST', url: '/zim/start', body: { filename: '../../etc/passwd' } }, (response) => {
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(response.body.error, "Invalid filename.");
      done();
    });

    const handle = toolkitRouter.stack.find(s => s.route && s.route.path === '/zim/start');
    handle.route.stack[0].handle(req, res);
  });

  await t.test('4. POST /zim/stop stops process and responds successfully', (context, done) => {
    const { req, res } = mockReqRes({ method: 'POST', url: '/zim/stop' }, (response) => {
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.success, true);
      done();
    });

    const handle = toolkitRouter.stack.find(s => s.route && s.route.path === '/zim/stop');
    assert.ok(handle, "Router must have /zim/stop route");
    handle.route.stack[0].handle(req, res);
  });

  await t.test('5. POST /zim/start accepts relative subfolder paths', (context, done) => {
    const dummyDir = path.resolve('import-staging', 'kiwix', 'subfolder');
    fs.mkdirSync(dummyDir, { recursive: true });
    const dummyFile = path.join(dummyDir, 'mock.zim');
    fs.writeFileSync(dummyFile, 'mock content');

    const { req, res } = mockReqRes({ method: 'POST', url: '/zim/start', body: { filename: 'subfolder/mock.zim' } }, (response) => {
      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual(response.body.success, true);
      try {
        fs.unlinkSync(dummyFile);
        fs.rmdirSync(dummyDir);
      } catch (e) {}
      done();
    });

    const handle = toolkitRouter.stack.find(s => s.route && s.route.path === '/zim/start');
    handle.route.stack[0].handle(req, res);
  });
});
