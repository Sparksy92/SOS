import assert from 'node:assert';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { createRequire } from 'node:module';
import express from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

const TEST_DB_PATH = path.join(__dirname, 'material_boundary_test.db');
process.env.SOS_DB_PATH = TEST_DB_PATH;

const { 
  getMaterialRoot, 
  setMaterialsDirOverride, 
  isBlockedMaterialPath, 
  resolveMaterialPath 
} = require('../services/materialRootService');

const crawler = require('../crawler');
const mediaRouter = require('../routes/media.routes');

test('SOS Material Boundary & Crawler Hardening Test Suite', async (t) => {

  const tempMaterialDir = path.join(__dirname, 'temp_materials_fixture');

  t.before(() => {
    // Create temporary folder structure
    if (!fs.existsSync(tempMaterialDir)) {
      fs.mkdirSync(tempMaterialDir, { recursive: true });
    }
    // Set materials override
    setMaterialsDirOverride(tempMaterialDir);
    
    // Add safe fixture file
    fs.writeFileSync(path.join(tempMaterialDir, 'safety_guide.txt'), 'Emergency protocol.');
    
    // Add blocked files/directories
    fs.mkdirSync(path.join(tempMaterialDir, 'node_modules'), { recursive: true });
    fs.writeFileSync(path.join(tempMaterialDir, 'node_modules', 'exploit.js'), 'malicious code');
    fs.writeFileSync(path.join(tempMaterialDir, '.env'), 'SECRET_TOKEN=123');
    fs.writeFileSync(path.join(tempMaterialDir, 'database.db'), 'sqlite content');
  });

  t.after(() => {
    // Restore override
    setMaterialsDirOverride(null);
    const { closeDb } = require('../db');
    closeDb();
    try {
      if (fs.existsSync(tempMaterialDir)) {
        fs.rmSync(tempMaterialDir, { recursive: true, force: true });
      }
    } catch (e) {}
    try {
      if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
      const walFile = TEST_DB_PATH + '-wal';
      const shmFile = TEST_DB_PATH + '-shm';
      if (fs.existsSync(walFile)) fs.unlinkSync(walFile);
      if (fs.existsSync(shmFile)) fs.unlinkSync(shmFile);
    } catch (e) {}
  });

  await t.test('1. SOS_MATERIALS_DIR and Fallback compatibility mode', () => {
    // Override materials directory works
    assert.strictEqual(getMaterialRoot(), tempMaterialDir);

    // Fallback checks
    setMaterialsDirOverride(null);
    // Should fallback to app root
    const appRoot = path.resolve(__dirname, '..', '..');
    assert.strictEqual(getMaterialRoot(), appRoot);
    
    // Re-apply override for other tests
    setMaterialsDirOverride(tempMaterialDir);
  });

  await t.test('2. Path traversal rejection and invalid webPath', () => {
    // traversal outside getMaterialRoot()
    assert.throws(() => {
      resolveMaterialPath('/materials/../../../any-secret.txt');
    }, /Out of bounds/);

    // non-/materials path or non-string checks
    assert.throws(() => {
      resolveMaterialPath(123);
    }, /filePath is required/);
  });

  await t.test('3. Blocked source directories and runtime files', () => {
    // node_modules
    assert.strictEqual(isBlockedMaterialPath(path.join(tempMaterialDir, 'node_modules', 'exploit.js')), true);
    // .env
    assert.strictEqual(isBlockedMaterialPath(path.join(tempMaterialDir, '.env')), true);
    // .db file extension
    assert.strictEqual(isBlockedMaterialPath(path.join(tempMaterialDir, 'database.db')), true);
    // safe txt file is NOT blocked
    assert.strictEqual(isBlockedMaterialPath(path.join(tempMaterialDir, 'safety_guide.txt')), false);
  });

  await t.test('4. Guarded /materials Express 5 route integration', async () => {
    const app = express();
    app.use(express.json());

    // Register our guarded Express 5 route
    app.get(/^\/materials\/(.+)$/, (req, res) => {
      try {
        const decodedPath = decodeURIComponent(req.path);
        const absolutePath = resolveMaterialPath(decodedPath);
        
        if (!fs.existsSync(absolutePath)) {
          return res.status(404).send("File not found.");
        }
        
        const stat = fs.statSync(absolutePath);
        if (stat.isDirectory()) {
          return res.status(403).send("Access denied: Directory listing not allowed.");
        }
        
        res.sendFile(absolutePath, { dotfiles: 'allow' });
      } catch (err) {
        res.status(403).send(`Access denied: ${err.message}`);
      }
    });

    const server = app.listen(0);
    if (!server.listening) {
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
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;

    try {
      // 4.1. Served allowed fixture file
      const res1 = await fetch(`${baseUrl}/materials/safety_guide.txt`);
      assert.strictEqual(res1.status, 200);
      const text1 = await res1.text();
      assert.strictEqual(text1, 'Emergency protocol.');

      // 4.2. Rejects blocked runtime/config file
      const res2 = await fetch(`${baseUrl}/materials/.env`);
      assert.strictEqual(res2.status, 403);

      // 4.3. Rejects traversal using URL-encoded segments (returns 403 or 404 depending on framework-level normalization)
      const res3 = await fetch(`${baseUrl}/materials/%2e%2e/%2e%2e/package.json`);
      assert.ok(res3.status === 403 || res3.status === 404);
    } finally {
      server.close();
    }
  });

  await t.test('5. Media and Index routes boundary checks', () => {
    const mockReqRes = (pathVal) => {
      let code = 200;
      let bodyText = "";
      const req = { query: { path: pathVal } };
      const res = {
        status(c) { code = c; return this; },
        send(txt) { bodyText = txt; return this; }
      };
      return { req, res, getResult: () => ({ code, bodyText }) };
    };

    const mediaHandler = mediaRouter.stack[0].route.stack[0].handle;

    // Stream blocked file
    const { req: req1, res: res1, getResult: getResult1 } = mockReqRes('/materials/.env');
    mediaHandler(req1, res1);
    const result1 = getResult1();
    assert.strictEqual(result1.code, 403);
    assert.ok(result1.bodyText.includes('Access denied'));
  });

  await t.test('6. Crawler Modes: inventory, index and extract-zips rules', async () => {
    const { db } = require('../db');
    db.exec("DELETE FROM document_chunks");
    db.exec("DELETE FROM indexed_docs");

    await crawler.start({ mode: 'inventory' });
    const status = crawler.getStatus();
    assert.strictEqual(status.processedDocs, 0); // No docs indexed!
    assert.strictEqual(status.processedZips, 0);

    // 6.2. Extract-zips mode requires confirmation
    await crawler.start({ mode: 'extract-zips', confirmation: 'INVALID' });
    const failStatus = crawler.getStatus();
    assert.ok(failStatus.statusText.includes('invalid confirmation phrase') || failStatus.statusText.includes('failed'));

    // 6.3. Extract-zips dry-run reports zips but does not write or extract
    const zipFile = path.join(tempMaterialDir, 'archive.zip');
    fs.writeFileSync(zipFile, 'dummy zip content');

    await crawler.start({ mode: 'extract-zips', dryRun: true });
    const dryRunStatus = crawler.getStatus();
    assert.strictEqual(dryRunStatus.dryRunZips.length, 1);
    assert.strictEqual(dryRunStatus.dryRunZips[0], 'archive.zip');
    assert.strictEqual(dryRunStatus.processedZips, 0); // No zip processed!
  });

  await t.test('7. crawler.routes.js validation checks', () => {
    const crawlerRouter = require('../routes/crawler.routes');
    const startHandler = crawlerRouter.stack.find(s => s.route && s.route.path === '/start').route.stack[0].handle;

    const mockReqRes = (bodyVal, callback) => {
      let code = 200;
      let bodyText = null;
      const req = { body: bodyVal };
      const res = {
        status(c) { code = c; return this; },
        json(obj) { bodyText = obj; callback({ code, bodyText }); }
      };
      return { req, res };
    };

    // 7.1. Invalid crawler mode is rejected
    return new Promise((resolve, reject) => {
      const { req, res } = mockReqRes({ mode: 'invalid-mode' }, (result) => {
        try {
          assert.strictEqual(result.code, 400);
          assert.ok(result.bodyText.error.includes('Invalid crawler mode'));
          
          // 7.2. Rebuild: true without confirmation is rejected
          const { req: req2, res: res2 } = mockReqRes({ mode: 'index', rebuild: true }, (result2) => {
            try {
              assert.strictEqual(result2.code, 400);
              assert.ok(result2.bodyText.error.includes('Confirmation phrase required to rebuild index'));

              // 7.3. Rebuild: true with invalid confirmation is rejected
              const { req: req3, res: res3 } = mockReqRes({ mode: 'index', rebuild: true, confirmation: 'WRONG' }, (result3) => {
                try {
                  assert.strictEqual(result3.code, 400);
                  assert.ok(result3.bodyText.error.includes('Confirmation phrase required to rebuild index'));

                  // 7.4. Rebuild: true with mode: 'inventory' is rejected
                  const { req: req4, res: res4 } = mockReqRes({ mode: 'inventory', rebuild: true, confirmation: 'REBUILD INDEX' }, (result4) => {
                    try {
                      assert.strictEqual(result4.code, 400);
                      assert.ok(result4.bodyText.error.includes('Index rebuild is only allowed in index mode'));

                      // 7.5. Rebuild: true with index mode and correct confirmation is accepted (returns 200)
                      const { req: req5, res: res5 } = mockReqRes({ mode: 'index', rebuild: true, confirmation: 'REBUILD INDEX' }, (result5) => {
                        try {
                          assert.strictEqual(result5.code, 200);
                          assert.strictEqual(result5.bodyText.mode, 'index');
                          resolve();
                        } catch (err5) { reject(err5); }
                      });
                      startHandler(req5, res5);
                    } catch (err4) { reject(err4); }
                  });
                  startHandler(req4, res4);
                } catch (err3) { reject(err3); }
              });
              startHandler(req3, res3);
            } catch (err2) { reject(err2); }
          });
          startHandler(req2, res2);
        } catch (err) { reject(err); }
      });
      startHandler(req, res);
    });
  });

});
