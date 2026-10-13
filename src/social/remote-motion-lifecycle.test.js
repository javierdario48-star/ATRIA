import assert from 'node:assert/strict';
import {createRemotePose,receiveRemotePose,sampleRemotePose} from './remote-motion.js';
const msg=(session,seq,t,x,y=0,transport='rtc')=>({peerId:'P',motionSession:session,seq,motionAt:t,now:t,x,y,moving:true,dir:'E',motionCadence:transport==='rtc'?100:260,transport});
// A late packet from a retired page must not reactivate that page.
const p=createRemotePose();receiveRemotePose(p,msg('A',100,0,0));receiveRemotePose(p,msg('B',1,100,20));receiveRemotePose(p,msg('A',101,200,-80));
assert.equal(p.session,'B','retired generations are rejected');assert.equal(p.x,20);
// Sampling one timestamp twice cannot produce a silent jump.
const same=createRemotePose({cadence:100});receiveRemotePose(same,msg('A',1,0,0));receiveRemotePose(same,msg('A',2,100,20));sampleRemotePose(same,150);const x=same.x;sampleRemotePose(same,150);assert.equal(same.x,x);
// Explicit fallback cadence must replace RTC cadence without a pose reset.
const fallback=createRemotePose({cadence:100});receiveRemotePose(fallback,msg('A',1,0,0));receiveRemotePose(fallback,msg('A',2,100,20));receiveRemotePose(fallback,msg('A',3,360,72,0,'http'));assert.equal(fallback.cadence,260);
// A real source position after a long outage must not leave permanent backlog.
const loss=createRemotePose({cadence:100});
for(let t=0;t<=5000;t+=10){if(t%100===0&&(t<1000||t>=3000))receiveRemotePose(loss,msg('A',t/100+1,t,t*.205));sampleRemotePose(loss,t)}
assert(5000*.205-loss.x<205*.35,'recover to a real snapshot after an interruption');
// A collision-safe elbow must complete after a render pause.
const route=createRemotePose({cadence:100});receiveRemotePose(route,msg('A',1,0,0));sampleRemotePose(route,50);
for(let t=100;t<=1000;t+=100)receiveRemotePose(route,{...msg('A',t/100+1,t,Math.min(100,t*.2),Math.max(0,(t-500)*.2)),moving:t<1000});
const canMove=(ax,ay,bx,by)=>{for(let i=0;i<=20;i++){const x=ax+(bx-ax)*i/20,y=ay+(by-ay)*i/20;if(x<80&&y>20)return false}return true};
sampleRemotePose(route,1800,{canMove});for(let t=1816;t<=4000;t+=16)sampleRemotePose(route,t,{canMove});
assert(Math.hypot(route.x-100,route.y-100)<.01,'bounded travel follows the route through its corner');
console.log('remote motion generation, outage, cadence, suspension and collision-route lifecycle OK');
