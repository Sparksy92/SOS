import assert from 'node:assert';
import test from 'node:test';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

test('SOS End-to-End API Integration Suite', async (t) => {
  // Use a dedicated port for testing to prevent port collisions
  const testPort = 3099;
  process.env.PORT = testPort;
  process.env.SOS_AUTO_CRAWL = 'false'; // Disable background crawler

  let server;
  
  t.before(() => {
    // Require index.js which boots the Express server on process.env.PORT
    server = require('../index.js');
  });

  t.after(() => {
    if (server && typeof server.close === 'function') {
      server.close();
    }
  });

  await t.test('1. API Health Check endpoint roundtrip', async () => {
    const res = await fetch(`http://localhost:${testPort}/api/health`);
    assert.strictEqual(res.status, 200);
    
    const body = await res.json();
    assert.strictEqual(body.status, 'healthy');
    assert.ok('ollama' in body);
    assert.ok('manifestExists' in body);
  });

  await t.test('2. Materials Index list endpoint roundtrip', async () => {
    const res = await fetch(`http://localhost:${testPort}/api/materials`);
    assert.strictEqual(res.status, 200);
    
    const body = await res.json();
    assert.ok(body.categories);
    assert.strictEqual(typeof body.categories, 'object');
    assert.strictEqual(Array.isArray(body.categories), false);
  });

  await t.test('3. Non-existent media route returns 404', async () => {
    const res = await fetch(`http://localhost:${testPort}/materials/non_existent_file_xyz.pdf`);
    assert.strictEqual(res.status, 404);
  });
});
