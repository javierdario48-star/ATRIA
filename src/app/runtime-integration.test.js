import assert from 'node:assert/strict';import fs from'node:fs';
const b=fs.readFileSync('build.js','utf8');
assert.equal(b.includes("html.includes('4.8.6')"),true,'build must pin golden master');
assert.equal(b.includes('optimizedFrame='),false);
assert.equal(b.includes('task13 social voice disabled'),false);
// Verify the source-level asset contract without depending on JS string escaping.
assert.match(b,/task\\\\d\+\\\\\.js/,'build must discover versioned task scripts');
assert.match(b,/new URL\(src,BASE\)/,'build must resolve task assets against golden master');
assert.match(b,/writeFile\(out\+'\\/'\+u\.pathname\.split\('\\/'\)\.pop\(\),await q\.text\(\)\)/,'build must persist fetched task scripts');
console.log('clean build boundary OK');
