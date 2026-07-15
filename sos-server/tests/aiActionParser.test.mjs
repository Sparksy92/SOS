import { test } from 'node:test';
import assert from 'node:assert';

// Mirroring the frontend's parseActionTag regex parsing function
function parseActionTag(text) {
  if (!text) return null;
  const match = text.match(/\[ACTION:\s+(\w+)\s+([^\]]+)\]/);
  if (!match) return null;
  
  const actionName = match[1];
  const paramsStr = match[2];
  const params = {};
  
  const regex = /(\w+)=(?:(?:\"([^\"]*)\")|([^\s]+))/g;
  let paramMatch;
  while ((paramMatch = regex.exec(paramsStr)) !== null) {
    const key = paramMatch[1];
    const val = paramMatch[2] !== undefined ? paramMatch[2] : paramMatch[3];
    params[key] = val;
  }
  
  return {
    raw: match[0],
    action: actionName,
    params
  };
}

test('R.A.N.G.E.R. AI Action Parser Suite', async (t) => {
  await t.test('1. Parsers a valid log_water tag correctly', () => {
    const text = 'Here is the command: [ACTION: log_water volume=20 type=drinking location=kitchen]';
    const result = parseActionTag(text);
    
    assert.ok(result);
    assert.strictEqual(result.action, 'log_water');
    assert.strictEqual(result.params.volume, '20');
    assert.strictEqual(result.params.type, 'drinking');
    assert.strictEqual(result.params.location, 'kitchen');
  });

  await t.test('2. Parses save_note with double-quoted content correctly', () => {
    const text = 'I will log this: [ACTION: save_note content="Water is safety verified." category=water]';
    const result = parseActionTag(text);
    
    assert.ok(result);
    assert.strictEqual(result.action, 'save_note');
    assert.strictEqual(result.params.content, 'Water is safety verified.');
    assert.strictEqual(result.params.category, 'water');
  });

  await t.test('3. Parses update_pantry tag successfully', () => {
    const text = '[ACTION: update_pantry item="grains_starch" quantity=150]';
    const result = parseActionTag(text);
    
    assert.ok(result);
    assert.strictEqual(result.action, 'update_pantry');
    assert.strictEqual(result.params.item, 'grains_starch');
    assert.strictEqual(result.params.quantity, '150');
  });

  await t.test('4. Handles string without tags gracefully returning null', () => {
    const text = 'No action tags in this message, simple conversational advice.';
    const result = parseActionTag(text);
    assert.strictEqual(result, null);
  });
});
