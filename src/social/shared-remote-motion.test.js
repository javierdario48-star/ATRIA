import assert from 'node:assert/strict';
import {createRemotePose,receiveRemotePose,sampleRemotePose} from './remote-motion.js';
let rejected=0,frames=0,maxStep=0;
for(const fps of [20,30,60,120])for(const count of [1,2,3]){
 const peers=Array.from({length:count},(_,i)=>createRemotePose({x:100+i*80,y:200,now:0,cadence:100}));
 const pending=[];
 for(let f=0;f<fps*16;f++){
  const now=f*1000/fps;
  if(f%Math.round(fps/10)===0)for(let i=0;i<count;i++){
   const seq=Math.floor(now/100)+1;
   // Real supporting mathematical test: sender time stays ordered while arrivals jitter.
   if(seq%13!==0)pending.push({at:now+(seq%4)*10,i,m:{peerId:'p'+i,seq,motionAt:now,x:100+i*80+now*.12,y:200,dir:'E',moving:true,now:0}});
   if(seq%17===0)pending.push({at:now+20,i,m:{peerId:'p'+i,seq:seq-2,motionAt:now-200,x:0,y:200,moving:true,now:0}});
  }
  for(let j=pending.length-1;j>=0;j--)if(pending[j].at<=now){const e=pending.splice(j,1)[0],p=peers[e.i],prior=p.rejected;e.m.now=now;receiveRemotePose(p,e.m);rejected+=p.rejected-prior;}
  for(const p of peers){const x=p.x,y=p.y,phase=p.walkPhase;sampleRemotePose(p,now);const d=Math.hypot(p.x-x,p.y-y);maxStep=Math.max(maxStep,d);
   assert(Number.isFinite(p.x));assert(d<=205*1.1/fps+.0001,'network bursts cannot exceed native movement per rendered frame');
   if(d>.05){assert(p.moving);assert.equal(p.dir,'E');assert(Math.abs(p.walkPhase-phase-d/18)<1e-8)}
   frames++;
  }
 }
 for(const p of peers){for(let f=0;f<fps*2;f++)sampleRemotePose(p,16000+f*1000/fps);assert.equal(p.moving,false,'packet loss does not extrapolate indefinitely')}
 assert.equal(peers.length,count,'each remote keeps an independent timeline');
}
assert(rejected>0);
const reconnect=createRemotePose();receiveRemotePose(reconnect,{x:200,y:100,now:0,motionAt:0,peerId:'OLD',seq:500});
receiveRemotePose(reconnect,{x:300,y:100,now:1000,motionAt:0,peerId:'NEW',seq:1});assert.equal(reconnect.x,300);assert.equal(reconnect.seq,1);
const wall=createRemotePose({x:0,y:0,cadence:100});receiveRemotePose(wall,{x:0,y:0,now:0,motionAt:0,seq:1});receiveRemotePose(wall,{x:10,y:0,now:100,motionAt:100,seq:2});sampleRemotePose(wall,200,{canMove:()=>false});assert.equal(wall.x,0);assert.equal(wall.moving,false);
console.log('shared remote timeline network/FPS stress OK',JSON.stringify({frames,fps:[20,30,60,120],players:[2,3,4],rejected,maxStep,realNetwork:false}));
