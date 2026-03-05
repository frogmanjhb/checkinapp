const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'app-api.js'), 'utf8');
const lines = src.split('\n');
const header = `/** REACT Mood Check-In App - main application (uses shared utils) */
import { APIUtils, appDebugLog } from './utils/api.js';
import { SecurityUtils } from './utils/security.js';
import { getGradeFromClass, isClassInGrade } from './utils/grade.js';
import { loadJson, saveJson } from './utils/storage.js';
import { processJournalEntryFlagging } from './utils/flagging.js';

`;
const body = lines.slice(375, 8530).join('\n');
const footer = '\n\nexport { MoodCheckInApp };\n';
const outPath = path.join(__dirname, '..', 'public', 'app.js');
fs.writeFileSync(outPath, header + body + footer);
console.log('Written', outPath, 'length', (header + body + footer).length);
