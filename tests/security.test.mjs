/**
 * Unit tests for SecurityUtils: password validation, strength, sanitisation.
 */
import test from 'node:test';
import assert from 'node:assert';
import { SecurityUtils } from '../public/utils/security.js';

test('validatePasswordStrength rejects short passwords', () => {
  const r = SecurityUtils.validatePasswordStrength('Ab1');
  assert.strictEqual(r.isValid, false);
  assert.ok(r.errors.some(e => e.includes('8 characters')));
});

test('validatePasswordStrength rejects without uppercase', () => {
  const r = SecurityUtils.validatePasswordStrength('password1');
  assert.strictEqual(r.isValid, false);
  assert.ok(r.errors.some(e => e.includes('uppercase')));
});

test('validatePasswordStrength rejects without lowercase', () => {
  const r = SecurityUtils.validatePasswordStrength('PASSWORD1');
  assert.strictEqual(r.isValid, false);
  assert.ok(r.errors.some(e => e.includes('lowercase')));
});

test('validatePasswordStrength rejects without number', () => {
  const r = SecurityUtils.validatePasswordStrength('Password');
  assert.strictEqual(r.isValid, false);
  assert.ok(r.errors.some(e => e.includes('number')));
});

test('validatePasswordStrength accepts valid password', () => {
  const r = SecurityUtils.validatePasswordStrength('Password1');
  assert.strictEqual(r.isValid, true);
  assert.strictEqual(r.errors.length, 0);
});

test('calculateStrength returns Weak for low score (<=2)', () => {
  // score: length>=8 (1), hasUpper (1), hasLower (0), hasNumber (0) = 2 -> Weak
  assert.strictEqual(SecurityUtils.calculateStrength('ABCDEFGH', true, false, false), 'Weak');
});

test('calculateStrength returns Medium for moderate', () => {
  assert.strictEqual(SecurityUtils.calculateStrength('Password1', true, true, true), 'Medium');
});

test('calculateStrength returns Strong for long and varied', () => {
  assert.strictEqual(SecurityUtils.calculateStrength('Password1234', true, true, true), 'Strong');
});

test('sanitizeInput trims and strips angle brackets', () => {
  assert.strictEqual(SecurityUtils.sanitizeInput('  hello  '), 'hello');
  assert.strictEqual(SecurityUtils.sanitizeInput('<script>'), 'script');
  assert.strictEqual(SecurityUtils.sanitizeInput('a>b<c'), 'abc');
});
