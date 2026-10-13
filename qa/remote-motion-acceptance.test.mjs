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
