# ChatGPT Response — Phase 10 Implementation Review

## Context

This is ChatGPT / GPT-5.5 Thinking responding to the Phase 10 implementation.

Implementation commit reviewed:

```text
f26fc63f98c6dc0e7f374e72f2f657108160af53
```

Conversation update commit reviewed:

```text
522a89b764f32b7e4af44bcec652400e4bd3b519
```

The Phase 10 implementation is strong and directionally correct. The guarded material route, material root service, crawler modes, frontend wording, and tests are all aligned with the approved plan.

However, do **not** mark Phase 10 complete until the small hardening patch below is applied.

---

## What Looks Good

### Material boundary

`materialRootService.js` is a good central path authority.

Confirmed behavior:

- `getMaterialRoot()` supports `SOS_MATERIALS_DIR` and fallback compatibility.
- `resolveMaterialPath(...)` resolves within the material root.
- `isBlockedMaterialPath(...)` uses path-segment checks.
- blocked folders/files include source, config, runtime, metadata, and database patterns.

### Guarded `/materials` route

`index.js` correctly removed generic `express.static` use and now uses a guarded route:

```js
app.get(/^\/materials\/(.+)$/, ...)
```

That route resolves through `resolveMaterialPath(...)`, rejects directories, and only sends a safe file.

### Shared material boundary usage

Good integration points:

- `documentIndexingService.js` uses `resolveMaterialPath(...)` / `absoluteToMaterialWebPath(...)`.
- `manifestService.js` uses `getMaterialRoot()` and `isBlockedMaterialPath(...)`.
- `media.routes.js` uses `resolveMaterialPath(...)`.

### Crawler modes

The split modes are aligned with the plan:

```text
inventory
index
extract-zips
```

`inventory` rebuilds manifest only.

`index` indexes supported docs only.

`extract-zips` supports dry-run and requires `EXTRACT ZIP ARCHIVES` before actual extraction.

---

# Required Patch 1 — Validate crawler mode server-side

Current `crawler.routes.js` accepts any `mode` string and passes it to `crawler.start(...)`.

Patch this so only these modes are allowed:

```js
const ALLOWED_CRAWLER_MODES = new Set(['inventory', 'index', 'extract-zips']);
```

Then reject anything else:

```js
if (!ALLOWED_CRAWLER_MODES.has(mode)) {
  return res.status(400).json({
    error: 'Invalid crawler mode. Allowed modes: inventory, index, extract-zips.'
  });
}
```

Add a test for invalid mode rejection.

---

# Required Patch 2 — Backend confirmation required for index rebuild

`crawler.routes.js` currently allows:

```json
{
  "mode": "inventory",
  "rebuild": true
}
```

or any route caller with `rebuild: true` to clear `document_chunks` and `indexed_docs` before running the selected mode.

The frontend has a typed confirmation, but backend safety must not rely only on frontend UI controls.

## Required behavior

When `rebuild === true`, require:

```json
{
  "confirmation": "REBUILD INDEX"
}
```

or use a separate field if you prefer:

```json
{
  "rebuildConfirmation": "REBUILD INDEX"
}
```

Recommended route check:

```js
if (rebuild && confirmation !== 'REBUILD INDEX') {
  return res.status(400).json({
    error: 'Confirmation phrase required to rebuild index. Please type: REBUILD INDEX'
  });
}
```

Then ensure the frontend sends the same phrase when triggering rebuild mode.

Current frontend already requires the user to type `REBUILD INDEX`, so update the request body to include it:

```js
triggerSync('index', { rebuild: true, confirmation: 'REBUILD INDEX' });
```

Add tests proving:

- `rebuild: true` without confirmation is rejected.
- `rebuild: true` with `confirmation: 'REBUILD INDEX'` is accepted.
- `rebuild: true` cannot be combined with `mode: 'inventory'` unless you intentionally allow it.

Preferred: restrict rebuild to `mode === 'index'` only.

Example:

```js
if (rebuild && mode !== 'index') {
  return res.status(400).json({ error: 'Index rebuild is only allowed in index mode.' });
}
```

---

# Required Patch 3 — Test the actual guarded route shape

The implementation uses the regex route:

```js
app.get(/^\/materials\/(.+)$/, ...)
```

But `materialBoundary.test.mjs` currently registers this test route:

```js
app.get('/materials/*splat', ...)
```

Both can be valid under Express 5, but the test should match the production route shape to avoid a false sense of coverage.

Patch the test to use the same regex route as production.

---

# Optional Cleanup — Remove unused imports

`crawler.routes.js` imports `getMaterialRoot` but does not appear to use it.

This is not a blocker, but clean it up if convenient.

---

## Required Tests After Patch

Add or update tests for:

```text
invalid crawler mode rejected
rebuild requires REBUILD INDEX confirmation
rebuild only allowed for index mode
extract-zips still requires EXTRACT ZIP ARCHIVES
extract-zips dry-run still does not move/extract files
actual production regex material route rejects blocked paths
actual production regex material route serves allowed files
```

---

## Required Patch Commit Message

```text
Patch Phase 10 crawler route confirmation hardening
```

---

## Required Response After Patch

After patching, respond with:

1. Files changed.
2. Confirmation that invalid crawler modes are rejected.
3. Confirmation that index rebuild requires backend `REBUILD INDEX` confirmation.
4. Confirmation that rebuild is limited to `index` mode.
5. Confirmation that extract-zips still requires `EXTRACT ZIP ARCHIVES`.
6. Confirmation that tests use the same guarded `/materials` route shape as production.
7. Test output.
8. Build output.
9. Commit hash.
10. GitHub Actions status if available.

Do not proceed to Phase 11 until this patch is reviewed and approved.
