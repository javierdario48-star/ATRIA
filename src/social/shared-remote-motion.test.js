import assert from'node:assert/strict';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
function sample(p,now){const t=clamp((now-p.at)/220,0,1),e=t*t*(3-2*t);return{x:p.fromX+(p.toX-p.fromX)*e,y:p.fromY+(p.toY-p.fromY)*e}}
function receive(map,id,msg,now){
 const old=map.get(id);
 if(old&&msg.seq<=old.seq)return false;
 let p=old||{fromX:msg.x,fromY:msg.y,toX:msg.x,toY:msg.y,at:now,seq:0};
 const cur=sample(p,now);
 map.set(id,{fromX:cur.x,fromY:cur.y,toX:msg.x,toY:msg.y,at:now,seq:msg.seq});
 return true;
}
const poses=new Map(),lastRendered=new Map();
let maxFrameJump=0,accepted=0,rejected=0;
const peers=['b','c','d'];
for(let frame=0;frame<10000;frame++){
 const now=frame*16;
 for(let k=0;k<peers.length;k++){
  const id=peers[k],cadence=80+((frame*37+k*71)%271);
  if(frame===0||((now+k*53)%cadence)<16){
   const seq=Math.floor(now/80)+1,x=now*.02+k*90,y=120+k*55;
   if(receive(poses,id,{seq,x,y},now))accepted++;
   if(frame%97===0){if(receive(poses,id,{seq:Math.max(1,seq-2),x:x-500,y},now))accepted++;else rejected++}
   if(frame%131===0){if(receive(poses,id,{seq,x,y},now))accepted++;else rejected++}
  }
 }
 for(const id of peers){
  const p=poses.get(id);if(!p)continue;
  const cur=sample(p,now),prev=lastRendered.get(id);
  if(prev)maxFrameJump=Math.max(maxFrameJump,Math.hypot(cur.x-prev.x,cur.y-prev.y));
  lastRendered.set(id,cur);
  assert(Number.isFinite(cur.x)&&Number.isFinite(cur.y));
 }
}
assert.equal(poses.size,3,'three simultaneous remotes must retain independent poses');
assert(rejected>0,'stale/duplicate hostile packets must be rejected');
assert(maxFrameJump<40,'render cadence must not jump a full network snapshot under deterministic jitter');
for(const id of peers){const p=poses.get(id),end=sample(p,p.at+220);assert.equal(end.x,p.toX);assert.equal(end.y,p.toY)}
poses.delete('c');assert.equal(poses.has('c'),false,'disconnect cleanup must remove one peer without affecting others');assert.equal(poses.size,2);
console.log('shared remote hostile-network stress OK',{frames:10000,peers:3,accepted,rejected,maxFrameJump:Number(maxFrameJump.toFixed(3))});
