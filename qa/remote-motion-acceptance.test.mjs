import assert from 'node:assert/strict';
import {metrics} from './remote-motion-metrics-487.mjs';
import {assertMotionPair} from './remote-motion-acceptance-487.mjs';
// Supporting acceptance regression: a frozen remote must not be called smooth.
const local={frames:[],packets:[]},remote={frames:[],packets:[]};
for(let i=0;i<900;i++){const now=i*1000/60,t=10000+now,angle=now*.00205;local.frames.push({now,t,player:{x:100*Math.cos(angle),y:100*Math.sin(angle),dir:'E',moving:true,phase:i/18}});remote.frames.push({now,t,actors:[{name:'A',remote:true,x:100,y:0,dir:'E',moving:false,phase:0}]})}
const frozen=metrics(local,remote,'A');assert.equal(frozen.speed.cv,0);assert.equal(frozen.orientationErrors,0);
assert.throws(()=>assertMotionPair(frozen,{cadence:100}),/must actually traverse/);
const empty=metrics({frames:[],packets:[]},{frames:[],packets:[]},'A');assert.equal(empty.alignedErrorPx,null);assert.throws(()=>assertMotionPair(empty,{cadence:100}));
console.log('remote acceptance rejects stationary companions and empty evidence');
const partial={frames:[],packets:[]},original={frames:[],packets:[]};
for(let i=0;i<900;i++){const x=Math.min(i,85)*205/60,now=i*1000/60,t=now+10000,moving=i<85;original.frames.push({now,t,player:{x,y:0,dir:'E',moving,phase:x/18}});partial.frames.push({now,t,actors:i<100?[{name:'A',remote:true,x,y:0,dir:'E',moving,phase:x/18}]:[]})}
assert.throws(()=>assertMotionPair(metrics(original,partial,'A'),{cadence:100}),/throughout the observer/);
const rebase=structuredClone(partial);rebase.frames=rebase.frames.slice(0,100);rebase.frames[90].actors[0]={name:'A',remote:true,x:400,y:100,dir:'E',moving:false,phase:0,resetReason:'network-resume'};for(let i=91;i<100;i++)rebase.frames[i].actors[0]=structuredClone(rebase.frames[90].actors[0]);
const relocation=metrics(original,rebase,'A');assert(relocation.rebases.length>0);assert.equal(relocation.orientationErrors,0,'nonwalking authoritative relocation is reported separately');
console.log('remote acceptance rejects missing companions and distinguishes recovery from walking');
const endpointSource={frames:[],packets:[]},stuck={frames:[],packets:[]};
for(let i=0;i<900;i++){const x=Math.min(i,300)*205/60,rx=Math.min(x,300*205/60-22),now=i*1000/60,t=10000+now;endpointSource.frames.push({now,t,player:{x,y:0,dir:'E',moving:i<300,phase:x/18}});stuck.frames.push({now,t,actors:[{name:'A',remote:true,x:rx,y:0,dir:'E',moving:i<295,phase:rx/18}]})}
const terminal={name:'A',motionSession:'CURRENT',motionAt:6000,x:300*205/60,y:0,moving:false};endpointSource.packets.push({kind:'send',t:16000,data:terminal});stuck.packets.push({kind:'receive',t:16100,data:terminal});
const missedEndpoint=metrics(endpointSource,stuck,'A');assert.equal(missedEndpoint.settledStoppedPose.errorPx,22);
assert.throws(()=>assertMotionPair(missedEndpoint,{cadence:100,impaired:true}),/actual receipt and settling/);
console.log('remote acceptance rejects the stopped corner even after earlier packet impairment');

// Three independent clients revealed that a 267 ms *turn* may outlive its
// observable idle window under packet loss; the next stop must not be charged
// to the prior turn. Sustained stops retain the unchanged strict timeout.
const brief={frames:[],packets:[]},view={frames:[],packets:[]};
const isMoving=i=>i<120||i>=136&&i<200||i>=250&&i<420;
const samples=[];let x=0;
for(let i=0;i<660;i++){
 if(isMoving(i))x+=205/60;
 const now=i*1000/60;
 samples.push({t:10000+now,now,player:{x,y:0,dir:'E',moving:isMoving(i),phase:x/18}});
}
brief.frames=samples;
for(let k=0;k<276;k++){
 const now=k*40,idx=Math.max(0,Math.min(659,Math.floor((now-140)/(1000/60))));
 const src=samples[idx].player;
 // Source's 267ms turn is not guaranteed two idle remote render frames.
 const moving=idx>=120&&idx<136?true:src.moving;
 view.frames.push({now,t:10000+now,actors:[{name:'A',remote:true,x:src.x,y:0,
   dir:'E',moving,phase:src.x/18,cadence:100,transport:'rtc'}]});
}
for(let t=0;t<=11000;t+=200)view.packets.push({t:10000+t,kind:'receive',transport:'rtc',
 data:{name:'A',x:0,moving:true}});
const realStops=metrics(brief,view,'A');
assert.equal(realStops.transientStopCount,1,'one brief source turn is not a sustainable remote stop');
assert.equal(realStops.stopAnimationMs.n,2,'both sustained stops are still measured');
assert(realStops.stopAnimationMs.max<350,'sustained stop respects the original packet/frame budget');
console.log('remote-motion measurement separates a 267ms turn from sustained stops without changing acceptance thresholds');

