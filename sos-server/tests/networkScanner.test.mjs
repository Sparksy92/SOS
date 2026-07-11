import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import networkRouter from '../routes/network.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Offline Network Scanner & Nginx Generator Route Suite', async (t) => {
  const app = express();
  app.use(express.json());
  app.use('/api/network', networkRouter);

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  // Helper clean up function
  const cleanUpFile = (filePath) => {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {
      // Ignore
    }
  };

  await t.test('1. GET /api/network/interfaces returns list of adapters', async () => {
    const res = await fetch(`${baseUrl}/api/network/interfaces`);
    assert.strictEqual(res.status, 200);
    const data = await res.json();
    
    assert.ok(Array.isArray(data));
    if (data.length > 0) {
      const iface = data[0];
      assert.ok(iface.name);
      assert.ok(iface.ip);
      assert.ok(iface.netmask);
      assert.ok(iface.type);
    }
  });

  await t.test('2. POST /api/network/generate-nginx creates config file', async () => {
    const testIp = '10.0.0.99';
    const res = await fetch(`${baseUrl}/api/network/generate-nginx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ localIp: testIp })
    });

    assert.strictEqual(res.status, 200);
    const data = await res.json();
    
    assert.strictEqual(data.success, true);
    assert.ok(data.filePath);
    assert.ok(data.configText);
    assert.ok(data.configText.includes(testIp));

    // Confirm file exists on disk
    assert.strictEqual(fs.existsSync(data.filePath), true);

    // Clean up
    cleanUpFile(data.filePath);
  });

  await t.test('3. POST /api/network/generate-nginx rejects missing body parameters', async () => {
    const res = await fetch(`${baseUrl}/api/network/generate-nginx`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });

    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.ok(data.error);
  });

  // Close server at the end of the suite
  server.close();
});
