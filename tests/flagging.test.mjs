/**
 * Unit tests for flagging: normalise (text), computeSeverity (matches).
 */
import test from 'node:test';
import assert from 'node:assert';
import { normalise, computeSeverity } from '../public/utils/flagging.js';

test('normalise returns empty string for falsy or non-string', () => {
  assert.strictEqual(normalise(''), '');
  assert.strictEqual(normalise(null), '');
  assert.strictEqual(normalise(undefined), '');
  assert.strictEqual(normalise(123), '');
});

test('normalise lowercases and trims', () => {
  assert.strictEqual(normalise('  HELLO  '), 'hello');
});

test('normalise removes apostrophes and collapses punctuation to spaces', () => {
  assert.strictEqual(normalise("don't"), 'dont');
  assert.strictEqual(normalise("can't"), 'cant');
  assert.strictEqual(normalise('hello, world!'), 'hello world');
});

test('normalise collapses multiple spaces', () => {
  assert.strictEqual(normalise('hello   world'), 'hello world');
});

test('computeSeverity returns red when red matches exist', () => {
  assert.strictEqual(computeSeverity({ red: ['a'], amber: [], yellow: [] }), 'red');
  assert.strictEqual(computeSeverity({ red: ['x'], amber: ['y'], yellow: ['z'] }), 'red');
});

test('computeSeverity returns amber when only amber matches', () => {
  assert.strictEqual(computeSeverity({ red: [], amber: ['b'], yellow: [] }), 'amber');
  assert.strictEqual(computeSeverity({ red: [], amber: ['b'], yellow: ['c'] }), 'amber');
});

test('computeSeverity returns yellow when only yellow matches', () => {
  assert.strictEqual(computeSeverity({ red: [], amber: [], yellow: ['c'] }), 'yellow');
});

test('computeSeverity returns none when no matches', () => {
  assert.strictEqual(computeSeverity({ red: [], amber: [], yellow: [] }), 'none');
  assert.strictEqual(computeSeverity({}), 'none');
});
