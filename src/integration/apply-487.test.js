import assert from'node:assert/strict';import fs from'node:fs';import{apply487}from'./apply-487.js';
const src=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'),out=apply487(src);
assert.match(out,/Sin alteraciones significativas para esta patología\./);
assert.match(out,/universalFallback:true/);
assert.equal((out.match(/\*60000/g)||[]).length>=2,true,'study turnaround must use 1 real minute per game hour');
assert.match(out,/csCoop\.dc\.bufferedAmount\|\|0\)>65536/);
assert.equal(out.includes('s.delay*1000'),false,'legacy seconds-scale study timing must be gone');
assert.equal(src.includes('universalFallback:true'),false,'golden master must remain immutable');
console.log('4.8.7 source integration OK');
