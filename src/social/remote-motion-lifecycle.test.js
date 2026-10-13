import assert from 'node:assert/strict';
import {createRemotePose,receiveRemotePose,sampleRemotePose} from './remote-motion.js';
const msg=(session,seq,t,x,y=0,transport='rtc')=>({peerId:'P',motionSession:session,seq,motionAt:t,now:t,x,y,moving:true,dir:'E',motionCadence:transport==='rtc'?100:260,transport});
// A late packet from a retired page must not reactivate that page.
const p=createRemotePose();receiveRemotePose(p,msg('A',100,0,0));receiveRemotePose(p,msg('B',1,100,20));receiveRemotePose(p,msg('A',101,200,-80));
assert.equal(p.session,'B','retired generations are rejected');assert.equal(p.x,20);
const unseen=createRemotePose();receiveRemotePose(unseen,{...msg('NEW',1,10,50),motionEpoch:2000});receiveRemotePose(unseen,{...msg('UNSEEN_OLD',100,20,-50),motionEpoch:1000});
assert.equal(unseen.session,'NEW','an unseen older page cannot replace the current generation');
// A reloaded page has a lower performance.now() origin than its predecessor.
const reload=createRemotePose({cadence:100});
receiveRemotePose(reload,{...msg('OLD',1,100000,0),now:200000});
receiveRemotePose(reload,{...msg('OLD',2,100100,20.5),now:200100});sampleRemotePose(reload,200200);
for(let t=10;t<=5010;t+=100){receiveRemotePose(reload,{...msg('NEW',t/100+1,t,50+(t-10)*.205),now:200300+t});sampleRemotePose(reload,200350+t)}
assert(reload.x>950,'new generation clears the old source cursor');
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
// Background rendering may stop while receives continue and trim old corners.
const hidden=createRemotePose({cadence:100});
for(let t=0;t<=8000;t+=100){const x=t<=500?t*.2:t<=1000?100:t<=1500?100-(t-1000)*.2:0,y=t<=500?0:t<=1000?(t-500)*.2:t<=1500?100:100+(t-1500)*.2;receiveRemotePose(hidden,msg('H',t/100+1,t,x,y));if(t<=200)sampleRemotePose(hidden,t)}
sampleRemotePose(hidden,8001,{canMove:(ax,ay,bx,by)=>!(bx<80&&by>20&&by<80)});
assert(hidden.y>1200,'resume at a retained actual snapshot when route history was trimmed');
assert.equal(hidden.moving,false,'a suspension rebase is not a walking step');
console.log('remote motion generation, outage, cadence, suspension and collision-route lifecycle OK');
