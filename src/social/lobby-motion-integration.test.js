import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const runtime=html.match(/<script id="atria-remote-motion-487">([\s\S]*?)<\/script>/)[1];
const start=html.indexOf('function ensureMapEntry(p)'),end=html.indexOf('  function mergeRoster(list)',start);
const pulseStart=html.indexOf('window.nsLobbyRtcHasFresh=function(id)'),pulseEnd=html.indexOf('\n',html.indexOf('window.nsLobbyRtcPulse=function(ts)',pulseStart));
let scenarios=0;
for(let test=0;test<120;test++){
 let now=0,sends=0;
 const id='remote_'+test,peer={peerId:'OTHER',open:true,dc:{readyState:'open'}};
 const net={lastRtcSend:0,lastDiscovery:0,remotes:new Map(),peers:new Map([[id,peer]]),roster:new Map()};
 const lobby={active:true,players:new Map()};
 const ctx={window:{nsLobby:lobby},net,performance:{now:()=>now},Map,Number,Date,Math,
  myId:()=> 'SELF',localState:()=>({x:0,y:0}),sendRtc:()=>{sends++},discovery(){}};
 vm.createContext(ctx);vm.runInContext(runtime+html.slice(start,end)+html.slice(pulseStart,pulseEnd),ctx);
 const speed=75+test%75,cadence=80+test%80;let seq=0,last=-1000,maxLag=0;
 for(let frame=1;frame<240;frame++){
  now=frame*16;
  if(now-last>=cadence){last=now;ctx.mergeRemote({userId:id,peerId:'OTHER',motionSession:'OTHER',seq:++seq,motionAt:now,motionCadence:cadence,x:10+speed*now/1000,y:30,moving:true,dir:'E'},'rtc');}
  ctx.window.nsLobbyRtcPulse(now);
  const q=lobby.players.get(id);ctx.window.csLobbyMotionSample487(q,now);
  maxLag=Math.max(maxLag,10+speed*now/1000-q.x);
  if(frame>20)assert.equal(q.dir,'E');
 }
 assert(maxLag<speed*(cadence/1000+.1),'lag is bounded by measured cadence and one frame of receive quantization');
 assert(sends>20&&sends<70);
 const q=lobby.players.get(id),x=q.x;
 ctx.mergeRemote({userId:id,peerId:'OTHER',motionSession:'OTHER',seq:seq-1,motionAt:now-100,x:0,y:30,moving:true},'server');
 assert.equal(q._motion.seq,seq,'stale server packets cannot rewind RTC');assert.equal(q.x,x);
 assert.equal(ctx.window.nsLobbyRtcHasFresh(id),true);
 now+=700;assert.equal(ctx.window.nsLobbyRtcHasFresh(id),false,'stale RTC yields to real fallback');
 for(let f=0;f<60;f++){now+=16;ctx.window.csLobbyMotionSample487(q,now)}assert.equal(q.moving,false,'loss holds the last known position');
 scenarios++;
}
console.log('ATRIA LOBBY MOTION SOURCE INTEGRATION PASS',JSON.stringify({scenarios,frames:240,realNetwork:false,staleServerRejected:true}));
