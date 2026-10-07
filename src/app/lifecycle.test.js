import assert from'node:assert/strict';import{Lifecycle}from'./lifecycle.js';
const l=new Lifecycle();let n=0;const target={addEventListener(){n++},removeEventListener(){n--}};
const a=l.enter('lobby');a.listen(target,'x',()=>{});a.add(()=>n-=10);assert.equal(n,1);
const b=l.enter('guard');assert.equal(a.active,false);assert.equal(n,-10);assert.equal(b.active,true);l.leave();assert.equal(b.active,false);l.leave();
console.log('lifecycle disposal OK');
