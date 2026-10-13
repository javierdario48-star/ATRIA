import assert from 'node:assert/strict';
import {createRemotePose,receiveRemotePose,sampleRemotePose} from './remote-motion.js';
let p=createRemotePose({x:0,y:0,now:0,cadence:100});
receiveRemotePose(p,{x:0,y:0,now:0,motionAt:0,seq:1,moving:true});
receiveRemotePose(p,{x:20,y:10,now:100,motionAt:100,seq:2,moving:false});
let m=sampleRemotePose(p,160);assert(m.x>0&&m.x<20);assert(m.y>0&&m.y<10);
m=sampleRemotePose(p,300);assert.equal(m.x,20);assert.equal(m.y,10);
const phase=m.walkPhase;sampleRemotePose(p,400);assert.equal(m.walkPhase,phase);assert.equal(m.moving,false);
console.log('time-based remote interpolation and idle OK');
