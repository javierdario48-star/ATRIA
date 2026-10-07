import assert from 'node:assert/strict';import fs from'node:fs';
const p=fs.readFileSync('docs/REGRESSION_CONTRACT.md','utf8');
for(const s of ['No map-only state','Every study is orderable for every patient','1 real minute = 1 in-game hour','People cannot freeze the app','2–4+ players','Production 4.8.6 is untouched'])assert(p.includes(s),s);
console.log('product regression contract OK');
