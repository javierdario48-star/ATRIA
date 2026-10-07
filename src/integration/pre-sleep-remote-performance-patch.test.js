import assert from'node:assert/strict';
import fs from'node:fs';import vm from'node:vm';
const patch=fs.readFileSync(new URL('./pre-sleep-remote-performance-patch.js',import.meta.url),'utf8');
let now=0,timeoutCb=null,intervalCb=null,sends=0,audio=0,drawSeen=[];
const remote={x:0,y:0,moving:true};
const context={globalThis:null,console,performance:{now:()=>now},player:{moving:true},
 csCoop:{remote,remotes:{peer:remote},dc:{readyState:'open',bufferedAmount:0},syncTimer:null},
 csStartPeerSync(){},csSendPeerState(){sends++},csUpdateRemoteAudio(){audio++},
 csDrawRemote(){drawSeen.push({x:remote.x,y:remote.y})},
 setTimeout:fn=>{timeoutCb=fn;return 1},setInterval:fn=>{intervalCb=fn;return 2},clearInterval(){}};
context.globalThis=context;vm.createContext(context);vm.runInContext(patch,context);
assert.ok(timeoutCb,'install must defer until later baseline scripts complete');timeoutCb();
assert.equal(context.__atriaRemotePerformancePatch487,true);

context.csStartPeerSync();assert.ok(intervalCb);
now=55;intervalCb();assert.equal(sends,0);
now=110;intervalCb();assert.equal(sends,1,'moving cadence should be 110ms');
context.csCoop.dc.bufferedAmount=70000;now=220;intervalCb();assert.equal(sends,1,'backpressure must suppress state send');
context.csCoop.dc.bufferedAmount=0;context.player.moving=false;now=330;intervalCb();assert.equal(sends,2,'idle cadence should not spam state');
now=500;intervalCb();assert.equal(audio,1,'audio maintenance should run at 500ms cadence');

now=0;context.csDrawRemote();remote.x=100;remote.y=50;now=65;context.csDrawRemote();
assert.ok(drawSeen.at(-1).x>0&&drawSeen.at(-1).x<100,'remote x must interpolate rather than teleport');
assert.ok(drawSeen.at(-1).y>0&&drawSeen.at(-1).y<50,'remote y must interpolate rather than teleport');
assert.equal(remote.x,100,'raw remote x must be restored after draw');
assert.equal(remote.y,50,'raw remote y must be restored after draw');
now=300;context.csDrawRemote();assert.equal(Math.round(drawSeen.at(-1).x),100);
console.log('pre-sleep remote performance patch OK');
