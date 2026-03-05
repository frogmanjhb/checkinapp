/**
 * Unit tests for grade utils: getGradeFromClass, isClassInGrade.
 */
import test from 'node:test';
import assert from 'node:assert';
import { getGradeFromClass, isClassInGrade } from '../public/utils/grade.js';

test('getGradeFromClass returns null for empty/falsy', () => {
  assert.strictEqual(getGradeFromClass(''), null);
  assert.strictEqual(getGradeFromClass(null), null);
  assert.strictEqual(getGradeFromClass(undefined), null);
});

test('getGradeFromClass returns as-is for legacy "Grade X" format', () => {
  assert.strictEqual(getGradeFromClass('Grade 5'), 'Grade 5');
  assert.strictEqual(getGradeFromClass('Grade 6'), 'Grade 6');
  assert.strictEqual(getGradeFromClass('Grade 7'), 'Grade 7');
});

test('getGradeFromClass derives grade from class code', () => {
  assert.strictEqual(getGradeFromClass('5EF'), 'Grade 5');
  assert.strictEqual(getGradeFromClass('6A'), 'Grade 6');
  assert.strictEqual(getGradeFromClass('7B'), 'Grade 7');
  assert.strictEqual(getGradeFromClass('5AM'), 'Grade 5');
  assert.strictEqual(getGradeFromClass('6C'), 'Grade 6');
});

test('getGradeFromClass returns null when no leading digit', () => {
  assert.strictEqual(getGradeFromClass('EF'), null);
  assert.strictEqual(getGradeFromClass('A'), null);
});

test('isClassInGrade returns true when class matches grade', () => {
  assert.strictEqual(isClassInGrade('5EF', 'Grade 5'), true);
  assert.strictEqual(isClassInGrade('Grade 5', 'Grade 5'), true);
  assert.strictEqual(isClassInGrade('6A', 'Grade 6'), true);
});

test('isClassInGrade returns false when class does not match grade', () => {
  assert.strictEqual(isClassInGrade('5EF', 'Grade 6'), false);
  assert.strictEqual(isClassInGrade('6A', 'Grade 5'), false);
  assert.strictEqual(isClassInGrade('', 'Grade 5'), false);
  assert.strictEqual(isClassInGrade('5EF', null), false);
});
