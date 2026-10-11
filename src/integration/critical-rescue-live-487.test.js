/** Actual generated clinical/nursing chain. DOM/transport/closure UI are stubs.
 * Forced observed vitals represent refractory/recurrent shock; physiology,
 * evidence, both protection clocks and irreversible death remain native. */
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487} from '../../qa/physiology-live/native-journey-487.mjs';

const stable={sys:120,dia:75,hr:90,rr:18,spo2:98,temp:37};
const fatal={sys:56,dia:30,hr:158,rr:34,spo2:77,temp:39.2};
function fixture(){
 const r=createLiveNativeJourney487('PERI-SEC-001'),native=r.ctx.updateLiveVitals;
 let observed=stable;
 r.ctx.updateLiveVitals=function(){const out=native.apply(this,arguments);Object.assign(r.ctx.sim.liveVitals,observed);return out;};
 r.ctx.finishCase=reason=>{r.closed=reason;r.ctx.sim.caseEnded=true;};
 r.setVitals=v=>{observed=v;Object.assign(r.ctx.sim.liveVitals,v);};
 r.advance=seconds=>advanceLiveNativeJourney487(r,seconds);
 r.order=text=>r.ctx.nurseNatural('enfermera '+text);
 return r;
}
let checks=0;
function check(name,fn){fn();checks++;console.log('INTEGRATED CRITICAL RESCUE PASS',name);}

check('final HTML predicate opens 65 seconds only after actual nurse delivery',()=>{
 const r=fixture();r.advance(500);r.setVitals(fatal);
 assert.equal(r.ctx.window.csEarlyCriticalDeathGuard487(r.ctx.sim,r.ctx.C),false);
 r.order('Ringer 500 ml');r.order('oxigeno 4 L/min');r.advance(.1);
 assert.equal(r.ctx.sim.administrationLog.length,0);
 assert.equal(r.ctx.csDeathRescueMissing(fatal,39),true,'pending support provides no rescue');
 assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,undefined);
 r.advance(.9);
 assert.equal(r.ctx.sim.administrationLog.length,2);
 assert(Math.abs(r.ctx.sim._criticalSupport487.elapsedSeconds-r.clock.realSeconds)<1e-8,'selected clock advances once per native tick');
 assert.equal(r.ctx.csDeathRescueMissing(fatal,39),false,'late ns423 must preserve the finite critical window');
 assert.equal(r.ctx.window.csCriticalRescue487.window().protected,true);
 const anchor=r.ctx.sim._criticalSupport487.startedAtSec;
 assert(Number.isFinite(anchor));
 r.advance(30);r.order('Ringer 250 ml');r.advance(1);
 assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,anchor,'a repeat cannot renew rescue');
 r.advance(anchor+64.9-r.ctx.sim._criticalSupport487.elapsedSeconds);
 assert.equal(r.ctx.csDeathRescueMissing(fatal,39),false);
 assert.equal(!!r.ctx.sim.patientDied,false);
 r.advance(.2);
 assert.equal(r.ctx.csDeathRescueMissing(fatal,39),true,'old active-fluid immunity must NOT return');
 assert(r.ctx.sim._fatalExposure>0);
 r.advance(11.5);
 assert.equal(r.ctx.sim.patientDied,true,'persistent shock can die after finite rescue');
 assert.equal(r.closed,'death');assert.equal(r.ctx.sim.phys.sourceControlled,false);
});
check('initial grace survives the final predicate without fabricated treatments',()=>{
 const r=fixture();r.setVitals(fatal);r.advance(179);
 assert.equal(!!r.ctx.sim.patientDied,false);
 assert.equal(r.ctx.sim.administrationLog.length,0);
 assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,undefined);
 const grace=r.ctx.window.csGraceSurvival487.get();
 assert(grace.releaseAt>=180&&grace.releaseAt<=480);
 r.advance(grace.releaseAt-179+12);
 assert.equal(r.ctx.sim.patientDied,true,'untreated fatal physiology is not immortal');
 assert.equal(r.closed,'death');
});
check('early rescue overlaps grace without adding 65 seconds to its deadline',()=>{
 const r=fixture();r.setVitals(fatal);r.order('Ringer 500 ml');r.order('oxigeno 4 L/min');r.advance(1);
 const anchor=r.ctx.sim._criticalSupport487.startedAtSec;
 assert(Number.isFinite(anchor));r.advance(65);
 assert.equal(r.ctx.window.csCriticalRescue487.window().protected,false);
 assert.equal(r.ctx.window.csEarlyCriticalDeathGuard487(r.ctx.sim,r.ctx.C),true);
 assert.equal(!!r.ctx.sim.patientDied,false);
 const release=r.ctx.window.csGraceSurvival487.get().releaseAt;
 assert(release<=480);r.advance(release-66+12);
 assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,anchor);
 assert.equal(r.ctx.sim.patientDied,true);
});
check('recovery and recurrent shock do not reset the window or protect another patient',()=>{
 const r=fixture();r.advance(500);r.setVitals(fatal);r.order('Ringer 500 ml');r.order('oxigeno 4 L/min');r.advance(1);
 const anchor=r.ctx.sim._criticalSupport487.startedAtSec;
 r.setVitals(stable);r.advance(70);assert.equal(!!r.ctx.sim.patientDied,false);
 r.setVitals(fatal);r.advance(.1);
 assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,anchor);
 assert.equal(r.ctx.csDeathRescueMissing(fatal,39),true);
 const other=fixture();other.advance(500);other.setVitals(fatal);other.advance(.1);
 assert.equal(other.ctx.sim._criticalSupport487.startedAtSec,undefined);
 assert.equal(other.ctx.csDeathRescueMissing(fatal,39),true);
});
check('native waiting-patient updates expire the same rescue clock after changing box',()=>{
 const r=fixture();r.advance(500);r.setVitals(fatal);r.order('Ringer 500 ml');r.order('oxigeno 4 L/min');r.advance(1);
 const treated=r.ctx.sim,anchor=treated._criticalSupport487.startedAtSec;
 const observed=r.ctx.updateLiveVitals;
 r.ctx.updateLiveVitals=function(){const out=observed.apply(this,arguments);if(r.ctx.sim!==treated)Object.assign(r.ctx.sim.liveVitals,stable);return out;};
 // Admission/triage presentation is excluded; V19's actual cached background
 // clinical update and its patient binding are executed without replacement.
 r.ctx.announceWaitingPatient=()=>{};r.ctx.csDeteriorateWaiting=()=>{};
 r.ctx.sim=r.ctx.freshSim();r.ctx.sim.__csV19Init=true;
 r.ctx.sim.patientInstance={uid:'second-same-ward',bed:{approach:[24,17],label:'QA second box'}};
 r.ctx.sim.clinicalV3={response:{factor:1},trajectory:{factor:1},complication:{offset:{}}};
 const other=r.ctx.sim;
 r.ctx.shiftSession={active:true,index:1,clock:0,queue:['PERI-SEC-001','PERI-SEC-001'],waitingCount:0,transcript:[],records:[
  {caseId:'PERI-SEC-001',sim:treated,state:'waiting',index:0,waitMinutes:0},
  {caseId:'PERI-SEC-001',sim:other,state:'active',index:1,waitMinutes:0}]};
 r.advance(66);
 assert.equal(treated._criticalSupport487.startedAtSec,anchor);
 assert(treated._criticalSupport487.elapsedSeconds-anchor>=65,'background clock cannot freeze while physiology progresses');
 assert.equal(r.ctx.window.csCriticalRescue487.window(treated,r.ctx.C).protected,false);
 assert(treated._fatalExposure>0);assert.equal(!!treated.patientDied,false);
 assert.equal(other._criticalSupport487.startedAtSec,undefined,'other patient gains no fake support');
});
check('a waiting patient can start and expire rescue without ever using the outer tick',()=>{
 const r=fixture(),waiting=r.ctx.sim;r.setVitals(fatal);
 // Actual delivery happens while selected; the first fatal tick happens only
 // in V19's cached background path. No manually fabricated receipt is needed.
 r.order('Ringer 500 ml');r.order('oxigeno 4 L/min');
 r.setVitals(stable);r.advance(1);
 assert.equal(waiting._criticalSupport487.startedAtSec,undefined);
 const live=r.ctx.updateLiveVitals;r.ctx.updateLiveVitals=function(){const out=live.apply(this,arguments);if(r.ctx.sim===waiting)Object.assign(waiting.liveVitals,fatal);return out;};
 r.ctx.sim=r.ctx.freshSim();r.ctx.sim.__csV19Init=true;
 r.ctx.sim.patientInstance={uid:'other-before-rescue'};
 r.ctx.sim.clinicalV3={response:{factor:1},trajectory:{factor:1},complication:{offset:{}}};
 r.ctx.announceWaitingPatient=()=>{};r.ctx.csDeteriorateWaiting=()=>{};
 r.ctx.shiftSession={active:true,index:1,clock:0,records:[{caseId:'PERI-SEC-001',sim:waiting,state:'waiting',index:0,waitMinutes:0}]};
 r.advance(1);assert(Number.isFinite(waiting._criticalSupport487.startedAtSec));
 const anchor=waiting._criticalSupport487.startedAtSec;r.advance(65);
 assert.equal(waiting._criticalSupport487.startedAtSec,anchor);
 assert.equal(r.ctx.window.csCriticalRescue487.window(waiting,r.ctx.C).protected,false);
 const at=waiting._criticalSupport487.elapsedSeconds;waiting.patientDied=true;r.advance(1);
 assert.equal(waiting._criticalSupport487.elapsedSeconds,at,'dead patients cannot gain clock time');
});
console.log('INTEGRATED CRITICAL RESCUE SUMMARY',JSON.stringify({checks,windowSeconds:65,graceUnchanged:true,lateDeath:true,sourceControlled:false,environment:'generated-HTML Node VM, not physical browser'}));
