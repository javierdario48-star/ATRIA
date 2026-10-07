import assert from 'node:assert/strict';import fs from'node:fs';
const b=fs.readFileSync('build.js','utf8');
assert.equal(b.includes("vendor/atria-4.8.6"),true,'build must use repository golden master');
assert.equal(b.includes("night-shift-clinical.vercel.app"),false,'normal build must not depend on Vercel baseline');
assert.equal(b.includes("fetch("),false,'normal build must be offline-reproducible');
assert.equal(b.includes("fs.copyFile"),true,'build must copy immutable golden-master assets');
assert.equal(b.includes("optimizedFrame="),false);
assert.equal(b.includes("task13 social voice disabled"),false);
console.log('clean local build boundary OK');
