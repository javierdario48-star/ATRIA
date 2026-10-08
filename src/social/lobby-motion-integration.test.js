import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from '../integration/apply-487.js';
const html=apply487(fs.readFileSync('vendor/atria-4.8.6/index.html','utf8'));
const a=html.indexOf('window.nsLobbyRtcHasFresh=function(id)'),pulse=html.indexOf('window.nsLobbyRtcPulse=function(ts)',a),end=html.indexOf('};',pulse);
assert(a>=0&&pulse>a&&end>pulse,'actual single-loop RTC visual sampler is compiled');
const source=html.slice(a,end+2);
let scenarios=0,freshSeen=0,expiredSeen=0,sendCount=0;
for(let test=0;test<120;test++){
 let now=0,localSeq=0,rtcSends=0;
 const id='remote_'+test,peer={open:true,dc:{readyState:'open'}},initial={x:10,y:30,moving:true,walkPhase:0};
 const net={lastRtcSend:0,lastDiscovery:0,remotes:new Map(),peers:new Map([[id,peer]])};
 const lobby={active:true,players:new Map([[id,{...initial,_tx:10,_ty:30,_vx:0,_vy:0,_seen:0}]])};
 const ctx={window:{nsLobby:lobby},net,performance:{now:()=>now},Map,
  localState:()=>({seq:++localSeq,x:0,y:0}),sendRtc:()=>{rtcSends++;sendCount++},discovery(){}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 let lastPacket=0,x=10,visual=10,maxLag=0,packets=0;
 const speed=75+test%75,cadence=80+test%80;
 for(let frame=1;frame<240;frame++){
  now=frame*16;
  if(now-lastPacket>=cadence){
   lastPacket=now;x=10+speed*now/1000;
   net.remotes.set(id,{rtc:true,at:now,tx:x,ty:30,vx:speed,vy:0,data:{moving:true,dir:'E',walkPhase:frame/9}});
   packets++;
  }
  ctx.window.nsLobbyRtcPulse(now);
  const q=lobby.players.get(id);
  visual+=(q._tx-visual)*Math.min(1,16/1000*9);
  maxLag=Math.max(maxLag,Math.abs(x-visual));
  if(packets>0)assert.equal(q.dir,'E','direction must follow the most recent RTC packet');
  assert(q._seen<=now);
 }
 assert(packets>=20,'RTC supplies regular independent position frames');
 assert(visual>200,'remote actor makes real visual progress instead of remaining stale');
 assert(maxLag<70,'bounded visual position lag at real 60 Hz sampling');
 assert(rtcSends>20&&rtcSends<70,'single owner emits bounded 10 Hz transmissions');
 assert.equal(ctx.window.nsLobbyRtcHasFresh(id),true);
 freshSeen++;
 now+=700;assert.equal(ctx.window.nsLobbyRtcHasFresh(id),false,'stale RTC must yield to HTTP fallback');
 expiredSeen++;scenarios++;
}
assert.equal(scenarios,120);
console.log('ATRIA LOBBY REMOTE MOTION BOT PASS',JSON.stringify({scenarios,framesPerScenario:240,sendCount,freshSeen,expiredSeen,transport:'simulated RTC packets',visual:'single-scheduler integrated sampler; physical Android still unverified'}));
