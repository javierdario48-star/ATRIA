import assert from 'node:assert/strict';
import vm from 'node:vm';
import {csGraceState487,csMissingAdminRescue487} from './grace-survival-487.js';
import {applyGraceSurvival487} from '../integration/grace-survival-487.js';

const C={risk:'shock',vitals:{bp:'72/42',spo2:83},
 physiology:{engine:'peritonitis',sourceControlRequired:true,
 coverageSets:[['ceftriaxone','metronidazole']]}};
function patient(mode='apprentice'){
 return {playMode:mode,caseEnded:false,monitorConnected:false,venousAccessCount:0,
 monitorTherapies:new Map(),administrationLog:[],therapyTotals:{fluidMl:0},
 phys:{sourceControlled:false},liveVitals:{sys:72,dia:42,spo2:83,hr:138},
 gameMinute:0,_fatalExposure:0,patientDied:false};
}
function admin(p,id){p.monitorTherapies.set(id,{id});p.administrationLog.push({id,m:p.gameMinute});}
const indicated=patient();indicated.interventions=new Set(['fluid','oxygen']);
assert.equal(csMissingAdminRescue487(indicated,C,{spo2:75},40),true,
 'indication alone cannot prevent terminal hypoxia and shock');
const delivered=patient();admin(delivered,'oxygen');admin(delivered,'fluid');
assert.equal(csMissingAdminRescue487(delivered,C,{spo2:75},40),false,
 'native administration log and active monitor confirm genuine rescue before late source-control risk');
delivered.gameMinute=13;
assert.equal(csMissingAdminRescue487(delivered,C,{spo2:86},40),true,
 'source control remains relevant in unresolved late shock');
const checkpoints=[0,60,179,180,240,299,300,320];
const untreated=patient(),pending=patient(),partial=patient(),adequate=patient();
pending.csPhase4Pending487=[{id:'ceftriaxone'},{id:'metronidazole'},{id:'fluid'}];
partial.monitorConnected=true;partial.venousAccessCount=2;
admin(partial,'oxygen');admin(partial,'fluid');partial.therapyTotals.fluidMl=700;
adequate.monitorConnected=true;adequate.venousAccessCount=2;
for(const t of ['oxygen','fluid','ceftriaxone','metronidazole'])admin(adequate,t);
adequate.therapyTotals.fluidMl=1000;adequate.liveVitals={sys:102,dia:65,spo2:96,hr:101};
adequate.phys.sourceControlled=true;
for(const t of checkpoints){
 const u=csGraceState487(untreated,C,t),p=csGraceState487(partial,C,t),a=csGraceState487(adequate,C,t),
  q=csGraceState487(pending,C,t);
 if(t<180){assert(u.protected);assert(p.protected);assert(a.protected);}
 if(t===180){assert.equal(u.protected,false,'untreated exposure starts progressively at 180');
  assert(p.protected);assert(a.protected);assert.equal(q.protected,false,'pending therapies earn no clinical credit');}
 if(t===240){assert.equal(u.protected,false);assert.equal(p.protected,true);assert(a.protected);}
 if(t===299){assert.equal(a.protected,true);assert.equal(p.protected,false);}
 if(t>=300){assert.equal(a.protected,false);assert.equal(p.protected,false);}
}
for(const mode of ['apprentice','solo','coop','competitive']){
 const untreatedMode=patient(mode);
 for(const second of [0,30,59,60,119,120,179])assert(csGraceState487(untreatedMode,C,second).protected,
  mode+' must survive its first three active real minutes regardless of how fast game hours pass');
 assert.equal(csGraceState487(untreatedMode,C,180).protected,false,
  mode+' untreated exposure resumes after the initial 180 seconds, not an instantaneous death');
}
assert.equal(csGraceState487(adequate,C,250).credit,1);
assert(csGraceState487(partial,C,180).credit>csGraceState487(pending,C,180).credit);
const fatalFixture='if((sim._fatalExposure||0)>=1.35&&!sim._deathTriggered){sim.patientDied=true}';
const guardedHtml=applyGraceSurvival487('<body><script>'+fatalFixture+'</script></body>');
assert(guardedHtml.includes('!window.csEarlyCriticalDeathGuard487?.(sim,C)'),
 'actual native fatal boundary has a direct final safety gate');
const script=guardedHtml.split('<script id="atria-grace-survival-487">')[1].split('</script>')[0];
new vm.Script(script,{filename:'grace-survival-487-runtime.js'});
let sim=patient(),calls=0;
const ctx={window:{},document:{visibilityState:'visible'},sim,C,
 csDeathRescueMissing:()=>true,
 updateSimulation(dt){calls++;sim.gameMinute+=dt*0.12;
  if(ctx.csDeathRescueMissing({},0)){
   sim._fatalExposure+=dt*0.12;
   if(sim._fatalExposure>=1.35)sim.patientDied=true;
  }else sim._fatalExposure=Math.max(0,sim._fatalExposure-dt*0.084);
 }};
vm.runInNewContext(script,ctx,{timeout:4000});
const advance=(seconds)=>{for(let i=0;i<seconds*4;i++)ctx.updateSimulation(.25)};
advance(179);assert.equal(sim.patientDied,false);assert.equal(sim._fatalExposure,0);
const gameAt179=sim.gameMinute;assert(gameAt179>10,'native accelerated clinical time still progresses');
advance(1);assert.equal(sim.patientDied,false,'no instant death at exactly 180');
advance(12);assert.equal(sim.patientDied,true,'untreated eventually deteriorates naturally after 180');
sim=adequate;ctx.sim=sim;advance(179);
assert.equal(sim.patientDied,false);
ctx.document.visibilityState='hidden';advance(20);
assert(Math.abs(sim.csGrace487.activeSeconds-179)<0.01,'background time not counted as bedside attention');
ctx.document.visibilityState='visible';advance(120);
assert.equal(sim.patientDied,false,'adequately treated remains alive through second 299');
advance(1);assert.equal(sim.patientDied,false,'no automatic fatal event at exactly 300');
advance(12);assert.equal(sim.patientDied,true,'if fatal predicate remains true native exposure eventually resumes');
// A different patient has a separate clock; duplicate requests cannot reset an existing one.
const first=patient(),second=patient();ctx.sim=first;ctx.updateSimulation(.25);
ctx.sim=second;ctx.updateSimulation(.25);
assert(first.csGrace487.activeSeconds>0&&second.csGrace487.activeSeconds>0);
assert.equal(first.csGrace487.activeSeconds,second.csGrace487.activeSeconds);
// End-to-end native terminal-exposure behavior under all modes; not just a pure policy test.
for(const mode of ['apprentice','solo','coop','competitive']){
 const subject=patient(mode);
 const runtime={window:{},document:{visibilityState:'visible'},sim:subject,C,
  csDeathRescueMissing:()=>true,
  updateSimulation(dt){
   // Game hours advance separately. This native-like fatal clock is independent
   // of whether the player typed a medication, or a nurse is walking to the bed.
   runtime.sim.gameMinute+=dt*.12;
   if(runtime.csDeathRescueMissing({spo2:75,sys:56,dia:30,hr:160},40))
    runtime.sim._fatalExposure+=dt*.12;
   else runtime.sim._fatalExposure=Math.max(0,runtime.sim._fatalExposure-dt*.084);
   if(runtime.sim._fatalExposure>=1.35)runtime.sim.patientDied=true;
  }
 };
 vm.runInNewContext(script,runtime,{timeout:4000});
 const tick=(sec)=>{for(let i=0;i<sec*4;i++)runtime.updateSimulation(.25)};
 tick(60);assert.equal(subject.patientDied,false,mode+' alive 60 s');
 tick(119);assert.equal(subject.patientDied,false,mode+' alive 179 s');
 assert.equal(subject._fatalExposure,0,mode+' accumulated no lethal exposure during protected nursing');
 tick(1);assert.equal(subject.patientDied,false,mode+' no boundary-triggered death');
 tick(12);assert.equal(subject.patientDied,true,mode+' native fatal exposure resumes after allotted time');
}
console.log('ALL MODES MINIMUM REAL CLOCK SURVIVAL PASS',JSON.stringify({earlyDeathBlocked:true,solo:true,coop:true,competitive:true}));
console.log('GRACE SURVIVAL REAL CLOCK BOTS PASS',JSON.stringify({checkpoints,
 modes:4,scenarios:4,pendingNotCredited:true,simulatedSeconds:300,clinicalClockUnchanged:true}));
