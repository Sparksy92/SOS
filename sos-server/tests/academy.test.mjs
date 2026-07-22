import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CURRICULUM_DIR = path.resolve(__dirname, '..', 'curriculum');

test('E2E Educational Commission Audit - Curriculum Directory Structure', (t) => {
  const brackets = ['sprouts_0_5', 'explorers_6_12', 'cadets_13_17', 'operators_18'];
  
  brackets.forEach(bracket => {
    const dirPath = path.join(CURRICULUM_DIR, bracket);
    assert.equal(fs.existsSync(dirPath), true, `Directory for ${bracket} must exist`);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    assert.ok(files.length > 0, `Bracket ${bracket} must contain at least 1 course file`);
  });
});

test('E2E Educational Commission Audit - Course Schema & Standards Mapping', (t) => {
  const brackets = ['sprouts_0_5', 'explorers_6_12', 'cadets_13_17', 'operators_18'];
  let totalCourses = 0;
  let totalStandardsMapped = 0;

  brackets.forEach(bracket => {
    const dirPath = path.join(CURRICULUM_DIR, bracket);
    const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.json'));
    
    files.forEach(file => {
      totalCourses++;
      const filePath = path.join(dirPath, file);
      const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));

      // 1. Required core metadata
      assert.ok(content.id, `Course ${file} missing id`);
      assert.ok(content.title, `Course ${file} missing title`);
      assert.ok(content.subject, `Course ${file} missing subject`);
      assert.ok(content.gradeLevel, `Course ${file} missing gradeLevel`);

      // 2. Standards compliance array
      assert.ok(Array.isArray(content.standards), `Course ${file} standards must be an array`);
      assert.ok(content.standards.length > 0, `Course ${file} must map to at least 1 standard`);
      totalStandardsMapped += content.standards.length;

      // 3. Educational components
      assert.ok(Array.isArray(content.lessons) && content.lessons.length > 0, `Course ${file} missing lessons`);
      assert.ok(Array.isArray(content.flashcards) && content.flashcards.length > 0, `Course ${file} missing flashcards`);
      assert.ok(Array.isArray(content.questions) && content.questions.length > 0, `Course ${file} missing quiz questions`);
      assert.ok(content.practicalChallenge, `Course ${file} missing practicalChallenge`);

      // 4. Validate quiz question schema
      content.questions.forEach((q, idx) => {
        assert.ok(q.question, `Q${idx} in ${file} missing question string`);
        assert.ok(Array.isArray(q.options) && q.options.length >= 2, `Q${idx} in ${file} must have at least 2 options`);
        assert.ok(typeof q.correctIndex === 'number' && q.correctIndex < q.options.length, `Q${idx} in ${file} has invalid correctIndex`);
      });
    });
  });

  t.diagnostic(`Total Courses Audited: ${totalCourses}`);
  t.diagnostic(`Total Educational Standards Mapped: ${totalStandardsMapped}`);
  assert.ok(totalCourses >= 10, 'Curriculum suite must contain at least 10 courses');
});
