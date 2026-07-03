process.env.SOS_DB_PATH = ':memory:';

import assert from 'node:assert';
import test from 'node:test';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { RunnableSequence } = require('@langchain/core/runnables');

// Dynamic import to guarantee process.env.SOS_DB_PATH is registered first
const { db } = await import('../db.js');
const { default: ai } = await import('../ai.js');

test('AI RAG and safety handling test suite', async (t) => {
  // Ensure FTS5 tables are created inside the in-memory database
  db.exec(`
    CREATE TABLE IF NOT EXISTS indexed_docs (
      path TEXT PRIMARY KEY,
      indexed_at TEXT
    );
  `);
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS document_chunks USING fts5(
      document_path,
      chunk_index,
      content
    );
  `);

  // Insert mock test records
  db.prepare("INSERT INTO indexed_docs (path, indexed_at) VALUES (?, ?)")
    .run('/materials/ATL/farming.pdf', new Date().toISOString());
  db.prepare("INSERT INTO indexed_docs (path, indexed_at) VALUES (?, ?)")
    .run('/materials/Uncategorized/logistics.txt', new Date().toISOString());

  db.prepare("INSERT INTO document_chunks (document_path, chunk_index, content) VALUES (?, ?, ?)")
    .run('/materials/ATL/farming.pdf', 0, 'This manual covers organic farming and water purification.');
  db.prepare("INSERT INTO document_chunks (document_path, chunk_index, content) VALUES (?, ?, ?)")
    .run('/materials/Uncategorized/logistics.txt', 1, 'This section covers solar wiring and battery backup.');

  // Mock Llama LLM invoke response on the exact class used by CommonJS require in ai.js
  const originalInvoke = RunnableSequence.prototype.invoke;
  let mockLLMResponse = "This is a mock AI response.";
  
  RunnableSequence.prototype.invoke = async function(inputs) {
    return mockLLMResponse;
  };

  try {
    await t.test('1. Verified local response & source object shape', async () => {
      mockLLMResponse = "To purify water, use organic farming sand filters.";
      const res = await ai.askQuestion("farming");
      
      assert.strictEqual(res.answerStatus, 'verified_local');
      assert.strictEqual(res.answer, mockLLMResponse);
      assert.strictEqual(res.sources.length, 1);
      
      const source = res.sources[0];
      assert.strictEqual(source.source, '/materials/ATL/farming.pdf');
      assert.strictEqual(source.documentPath, '/materials/ATL/farming.pdf');
      assert.strictEqual(source.chunkIndex, 0);
      assert.strictEqual(source.rank, 1);
      assert.strictEqual(source.matchLabel, 'Strong Match');
      assert.strictEqual(source.riskCategory, 'water_treatment');
      assert.strictEqual(source.page, 1); // PDF maps to page = chunkIndex + 1
      assert.strictEqual(source.section, null);
    });

    await t.test('2. Non-PDF section labeling and match label ranks', async () => {
      mockLLMResponse = "Wire the solar battery with caution.";
      const res = await ai.askQuestion("wiring");
      
      assert.strictEqual(res.answerStatus, 'verified_local');
      assert.strictEqual(res.sources.length, 1);
      
      const source = res.sources[0];
      assert.strictEqual(source.source, '/materials/Uncategorized/logistics.txt');
      assert.strictEqual(source.page, null);
      assert.strictEqual(source.section, 2); // Non-PDF maps to section = chunkIndex + 1
      assert.strictEqual(source.riskCategory, 'electrical');
    });

    await t.test('3. Insufficient context fallback detection', async () => {
      // Case A: SQLite finds no matches
      const res1 = await ai.askQuestion("unrelated query matching nothing");
      assert.strictEqual(res1.answerStatus, 'insufficient_context');
      assert.strictEqual(res1.answer, "I do not have enough verified local information to answer this query.");
      assert.strictEqual(res1.sources.length, 0);

      // Case B: SQLite matches but LLM responds with insufficient information phrase
      mockLLMResponse = "I do not have enough verified local information to answer this query.";
      const res2 = await ai.askQuestion("farming");
      assert.strictEqual(res2.answerStatus, 'insufficient_context');
      assert.strictEqual(res2.sources.length, 0);
    });

    await t.test('4. General knowledge uncited model fallback', async () => {
      mockLLMResponse = "This is general knowledge advice on history.";
      const res = await ai.askQuestion("history of Rome", false, true); // useGeneralKnowledge = true
      
      assert.strictEqual(res.answerStatus, 'uncited_model');
      assert.strictEqual(res.answer, mockLLMResponse);
      assert.strictEqual(res.sources.length, 0);
    });

    await t.test('5. Blocking uncited fallback for high-risk topics', async () => {
      const res = await ai.askQuestion("First aid medical instructions for burns", false, true); // high-risk query
      
      assert.strictEqual(res.answerStatus, 'insufficient_context');
      assert.ok(res.answer.startsWith('CRITICAL BLOCK'));
      assert.strictEqual(res.sources.length, 0);
    });

  } finally {
    // Restore original prototype method
    RunnableSequence.prototype.invoke = originalInvoke;
  }
});
