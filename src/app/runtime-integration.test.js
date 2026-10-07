import assert from 'node:assert/strict';import fs from'node:fs';
const b=fs.readFileSync('build.js','utf8');
assert.match(b,/expected stable 4\.8\.6 baseline/,'build must pin the verified golden master');
assert.doesNotMatch(b,/updateFrame\s*=|optimizedFrame|maxCatchUp:5|task13 social voice disabled/,'build must not patch runtime behavior');
assert.match(b,/task\\d\+\\\.js/,'build must preserve external task scripts');
console.log('clean build boundary OK');
