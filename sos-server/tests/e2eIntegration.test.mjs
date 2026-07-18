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
  const originalFetch = global.fetch;
  
  t.before(async () => {
    // Mock the external TTS service call
    global.fetch = async (url, options) => {
      const urlStr = typeof url === 'string' ? url : url.toString();
      if (urlStr.includes(':3002/api/tts')) {
        return {
          ok: true,
          status: 200,
          headers: new Headers({ 'content-type': 'audio/wav' }),
          text: async () => 'mock wav data',
          arrayBuffer: async () => new Uint8Array(2000).buffer
        };
      }
      const modifiedOptions = { ...options };
      modifiedOptions.headers = {
        ...modifiedOptions.headers,
        'Connection': 'close'
      };
      return originalFetch(url, modifiedOptions);
    };

    // Require index.js which boots the Express server on process.env.PORT
    server = require('../index.js');

    // Wait for the server to be listening to avoid connection race conditions
    if (server && !server.listening) {
      await new Promise((resolve, reject) => {
        const onListening = () => {
          server.off('error', onError);
          resolve();
        };
        const onError = (err) => {
          server.off('listening', onListening);
          reject(err);
        };
        server.once('listening', onListening);
        server.once('error', onError);
      });
    }
  });

  t.after(() => {
    global.fetch = originalFetch;
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

  await t.test('4. TTS proxy endpoint returning WAV audio', async () => {
    const res = await fetch(`http://localhost:${testPort}/api/tts?text=Express+test+string&voice=af_sarah`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers.get('content-type'), 'audio/wav');
    
    const buffer = await res.arrayBuffer();
    assert.ok(buffer.byteLength > 1000); // Verify we got actual binary data back
  });

  await t.test('5. Settings API library-path roundtrip', async () => {
    // 1. Set library path
    const postRes = await fetch(`http://localhost:${testPort}/api/settings/library-path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: '/media/storage/SurvivalOS_Library' })
    });
    assert.strictEqual(postRes.status, 200);
    const postBody = await postRes.json();
    assert.strictEqual(postBody.success, true);
    assert.strictEqual(postBody.path, '/media/storage/SurvivalOS_Library');

    // 2. Retrieve library path
    const getRes = await fetch(`http://localhost:${testPort}/api/settings/library-path`);
    assert.strictEqual(getRes.status, 200);
    const getBody = await getRes.json();
    assert.strictEqual(getBody.path, '/media/storage/SurvivalOS_Library');
  });
});
