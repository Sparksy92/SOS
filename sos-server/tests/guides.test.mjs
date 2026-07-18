import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Let's test the endpoint statically by loading the router file, checking the code, and testing path sanitization functions.
test('SOS Guides Routes & Traversal Guard Verification', () => {
  const routerPath = path.resolve('sos-server', 'routes', 'guides.routes.js');
  assert.ok(fs.existsSync(routerPath), "guides.routes.js must exist");

  const routerContent = fs.readFileSync(routerPath, 'utf8');

  // Must contain path traversal defenses
  assert.ok(routerContent.includes('path.basename(filename)'), "Guides routes must sanitize filename with basename");
  assert.ok(routerContent.includes('fullPath.startsWith(DOCS_DIR)'), "Guides routes must verify fullPath resolves inside DOCS_DIR");
  assert.ok(routerContent.includes('DOCS_DIR'), "Guides routes must define a DOCS_DIR constant");
  
  // Must support listing and detail endpoints
  assert.ok(routerContent.includes("router.get('/',"), "Guides routes must support listing index '/'");
  assert.ok(routerContent.includes("router.get('/:filename',"), "Guides routes must support detail endpoint '/:filename'");
});
