import assert from 'node:assert/strict';import fs from'node:fs';
const b=fs.readFileSync('build.js','utf8');
assert.equal(b.includes("html.includes('4.8.6')"),true,'build must pin golden master');
assert.equal(b.includes('optimizedFrame='),false);
assert.equal(b.includes('task13 social voice disabled'),false);
assert.equal(b.includes('task\\\\d+'),true,'build must preserve task scripts');
console.log('clean build boundary OK');
