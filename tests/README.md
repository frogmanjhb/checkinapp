# Unit tests (Phase 4)

Tests use Node’s built-in test runner (`node:test`) and assert. No extra dependencies.

## Run tests

```bash
npm test
```

Runs all `tests/*.mjs` files.

## What’s covered

| File | Module | Tests |
|------|--------|--------|
| `grade.test.mjs` | `public/utils/grade.js` | `getGradeFromClass`, `isClassInGrade` (class code → grade, legacy format, edge cases) |
| `security.test.mjs` | `public/utils/security.js` | `validatePasswordStrength`, `calculateStrength`, `sanitizeInput` (length, case, numbers, strength bands, trim/angle brackets) |
| `flagging.test.mjs` | `public/utils/flagging.js` | `normalise` (lowercase, trim, apostrophes, punctuation, spaces), `computeSeverity` (red/amber/yellow/none) |

## Adding tests

- Add a new `tests/*.test.mjs` file.
- Use ESM: `import test from 'node:test'; import assert from 'node:assert';`
- Import from `../public/utils/...` or other app modules as needed.
- Run `npm test`; it picks up all `*.mjs` in `tests/`.

## Note

You may see a warning about “Module type of file … is not specified”. It’s safe to ignore, or add `"type": "module"` to `package.json` if the rest of the project is ESM (backend is CommonJS, so this is optional).
