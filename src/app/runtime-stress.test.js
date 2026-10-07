import assert from'node:assert/strict';import{FrameScheduler}from'./frame-scheduler.js';import{Lifecycle}from'./lifecycle.js';
const s=new FrameScheduler({maxCatchUpSteps:5,mobileRenderHz:30});s.reset(0);let sim=0,maint=0,render=0;
for(let i=1;i<=5000;i++){const now=i*16+(i%500===0?600:0);const before=sim;s.tick(now,{simulate:()=>sim++,maintain:()=>maint++,render:()=>render++,isMobile:i%2===0});assert(sim-before<=5,'unbounded catch-up')}
assert.equal(maint,5000);assert(render>0);
const l=new Lifecycle();let live=0;for(let i=0;i<1000;i++){const x=l.enter(i%3===0?'lobby':i%3===1?'vega':'solo');x.add(()=>live--);live++;assert.equal(live,1)}l.leave();assert.equal(live,0,'mode cleanup leaked');
console.log('runtime stress OK',{frames:5000,sim,maint,render,transitions:1000});