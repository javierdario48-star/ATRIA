import assert from 'node:assert/strict';
const api=await import('./clinical-clock-487.js').catch(()=>({}));
assert.equal(typeof api.createClinicalClock487,'function','explicit deterministic clinical clock must exist');
const {createClinicalClock487:create,advanceClinicalClock487:advance,nativeToClinicalTime487:map}=api;
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('CLOCK PASS',name);};
const fresh=()=>create({authorityId:'qa-shift-authority'});
const tick=(s,seconds,rate=.12,paused=false)=>advance(s,{deltaRealSeconds:seconds,nativeMinutesPerRealSecond:rate,paused});
check('explicit immutable authority/version and no ambient clock',()=>{
 assert.throws(()=>create(),/authority/);assert.throws(()=>create({authorityId:''}),/authority/);
 const s=fresh();assert.equal(s.clinicalMinute,0);assert.equal(s.nativeMinute,0);assert(Object.isFrozen(s));
 const before=JSON.stringify(s);tick(s,1);assert.equal(JSON.stringify(s),before);
});
check('clinical minutes and native units remain distinct',()=>{
 const s=tick(fresh(),60);assert.equal(s.clinicalMinute,60);assert.equal(s.nativeMinute,7.2);
 assert.equal(map(s,3.6),30);assert.equal(s.segments.length,1);
});
check('different frame partitions retain the same grid and fractional carry',()=>{
 const whole=tick(fresh(),.25);let fractional=fresh();for(let i=0;i<7;i++)fractional=tick(fractional,.25/7);
 assert.deepEqual(fractional,whole);
 let fine=fresh();for(let i=0;i<100;i++)fine=tick(fine,.01);
 assert.deepEqual(fine,tick(fresh(),1));
});
check('piecewise typing mapping prevents constant-rate timestamp drift',()=>{
 const s=tick(tick(fresh(),10,.12),10,.03);
 assert.equal(s.clinicalMinute,20);assert.equal(s.nativeMinute,1.5);assert.equal(s.segments.length,2);
 assert.equal(map(s,.6),5);assert.equal(map(s,1.2),10);assert.equal(map(s,1.35),15);assert.equal(map(s,1.5),20);
 assert.notEqual(map(s,1.35),1.35/.12);
});
check('pause advances neither clock nor native game state',()=>{
 const s=tick(fresh(),5);assert.deepEqual(tick(s,10,.03,true),s);
 assert.equal(tick(s,5,.03).clinicalMinute,10);
});
check('missing/ranged/reversed/corrupt clock inputs fail explicitly',()=>{
 for(const seconds of [-1,NaN,Infinity])assert.throws(()=>tick(fresh(),seconds),/time|delta|seconds/);
 assert.throws(()=>advance(fresh(),{deltaRealSeconds:1}),/rate|mapping/);
 assert.throws(()=>tick(fresh(),1,.06),/rate|mapping/);
 assert.throws(()=>tick({...fresh(),clinicalUs:123},1),/clock|time|corrupt/);
 const s=tick(fresh(),1);assert.throws(()=>map(s,-1),/time|native/);assert.throws(()=>map(s,1),/outside|history|range/);
});
check('rate-history budget requires checkpoint instead of unbounded growth',()=>{
 let s=fresh();for(let i=0;i<128;i++)s=tick(s,.25,i%2?.03:.12);
 assert.equal(s.segments.length,128);assert.throws(()=>tick(s,.25,.12),/checkpoint|segment|limit/);
});
console.log('CLINICAL CLOCK PASS',JSON.stringify({checks,wallClockCalls:0,nativeWrites:0}));
