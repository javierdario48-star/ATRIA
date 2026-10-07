import assert from 'node:assert/strict';
import fs from 'node:fs';
const b=fs.readFileSync('build.js','utf8');
assert.match(b,/maxCatchUp:5/);
assert.match(b,/updateSimulation\(0\);mentorTick\(\);qaBotTick\(now\)/);
assert.match(b,/sim\.gameMinute\+=step\*0\.12/);
assert.match(b,/mobile\(\)\?30:15/);
assert(!/task13 social voice disabled/.test(b),'voice isolation hack must be gone');
console.log('runtime integration contract OK');
