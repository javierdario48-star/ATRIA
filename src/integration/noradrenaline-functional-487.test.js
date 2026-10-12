/** Confirmed existing native executor; no new B1 owner or clinical policy. */
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance,nativeObserverPort487,serializeNativePatient487} from '../../qa/physiology-live/native-journey-487.mjs';
import {installPhysiologyQAObserver487} from './physiology-qa-observer-487.js';
import {csCriticalRescueEvidence487} from '../clinical/critical-rescue-487.js';
import {enableNativeRinger487} from '../../qa/physiology-live/ringer-journey-487.mjs';
const rows=r=>r.ctx.sim.administrationLog.filter(x=>x.id==='vasopressor');
const order=(r,q)=>r.ctx.nurseNatural('enfermera '+q);
const give=(r,rate=.05)=>{order(r,'noradrenalina '+rate+' mcg/kg/min IV');advance(r,1);};
let checks=0;
async function check(name,fn){await fn();checks++;console.log('NORADRENALINE FUNCTIONAL PASS',name);}

await check('incompatible units/routes/identity must not be rewritten into a valid administered rate',()=>{
 for(const q of ['noradrenalina 0.05 mg IV','noradrenalina 0.05 mcg/kg/min oral','noradrenalina 0.05 mcg/kg/min IM','noradrenalina 0.05 mcg/kg/min I.M.',
  'noradrenalina 0.05 mcg/kg/min via nasal','noradrenalina 0.05 ml/h IV','noradrenalina 0.05 IV',
  'noradrenalina -0.05 mcg/kg/min IV','noradrenalina 0 mcg/kg/min IV','vasopresor 0.05 mcg/kg/min IV',
  'noradrenalina .05 mcg/kg/min IV','noradrenalina 0.05 mcg/kg/min y noradrenalina 0.1 mcg/kg/min',
  'administrar por via oral noradrenalina 0.05 mcg/kg/min','dar 0.05 mg de noradrenalina IV',
  'si sigue hipotenso dar noradrenalina 0.05 mcg/kg/min IV','puedo administrar noradrenalina 0.05 mcg/kg/min IV',
  'noradrenalina en bolo IV','noradrenalina cinco miligramos IV','noradrenalina −0.05 mcg/kg/min IV',
  'noradrenalina menos 0.05 mcg/kg/min IV','noradrenalina 0.05 mcg/kg/min PO',
  'noradrenalina 0.05 mcg/kg/min intraarterial','noradrenalina 0.05 mcg/kg/min intratecal',
  'noradrenalina 0.05 mcg/kg/min epidural',
  'si sigue hipotenso y administrar noradrenalina 0.05 mcg/kg/min IV',
  'si sigue hipotenso; noradrenalina 0.05 mcg/kg/min IV',
  'dar noradrenalina y via oral','dar noradrenalina y cinco miligramos IV',
  'noradrenalina y 0.05 mg IV','noradrenalina 0.05 mcg/kg/min IV; via oral',
  'noradrenalina via','noradrenalina 0.05 mcg/kg/min via',
  'oxigeno, dar 0.05 mg noradrenalina IV','Ringer 500 ml dar 0.05 mg noradrenalina IV',
  'oxigeno dar 0.5 mcg/kg/min noradrenalina IV']){
  for(const source of (q.startsWith('oxigeno')||q.startsWith('Ringer')?['nurse']:['nurse','monitor'])){
   const r=createLiveNativeJourney487('PERI-SEC-001',{confirmedIV:0});
   if(source==='nurse')order(r,q);else r.ctx.addMonitorTherapy(q);
   advance(r,6);
   assert.equal(rows(r).length,0,q+' '+source);
   assert.equal(r.ctx.sim.monitorTherapies.has('vasopressor'),false,q);
   const independentFluid=q.startsWith('Ringer')&&source==='nurse';
   assert.equal((r.ctx.sim.csPhase4Pending487||[]).some(x=>x.id==='vasopressor'),false,q+': invalid pressor may not wait for an IV');
   assert.equal(r.ctx.sim.csPhase4Pending487?.length||0,independentFluid?1:0,q+' '+source+': valid independent Ringer is retained');
   assert.equal(r.ctx.sim.venousAccessCount,0,'invalid route must not request cannulation either');
  }
 }
});

await check('explicit mcg/ug/Greek micrograms and decimal comma preserve one exact absolute rate',()=>{
 for(const q of ['noradrenalina 0,05 µg/kg/min EV','norepinefrina 0.05 μg/kg/min IV','nora 0.05 ug/kg/min IV']){
  const r=createLiveNativeJourney487('PERI-SEC-001');order(r,q);advance(r,1);
  assert.equal(rows(r).length,1,q);assert.equal(r.ctx.sim.monitorTherapies.get('vasopressor').dose.amount,.05,q);
 }
});

await check('validation and execution preserve the same dose even when the IV route precedes it',()=>{
 for(const iv of [0,1])for(const [q,expected] of [['noradrenalina via IV 0.2 mcg/kg/min',.2],
  ['noradrenalina via EV 0.02 mcg/kg/min',.02],['noradrenalina 0.2 mcg/kg/min via IV',.2]]){
  const r=createLiveNativeJourney487('PERI-SEC-001',{confirmedIV:iv});order(r,q);
  if(!iv){
   advance(r,.1);assert.equal(rows(r).length,0,'a medication route is not completed cannulation');
   assert.equal(r.ctx.nurse.task,null,'via IV denotes the medication route, not a new access request');
   order(r,'una via');
  }
  advance(r,15);
  assert.equal(rows(r).length,1,q);assert.equal(r.ctx.sim.monitorTherapies.get('vasopressor').dose.amount,expected,q);
  assert.equal(r.ctx.sim.csNurse487History.find(x=>x.items.some(y=>y.expectedNora)).items[0].status,'COMPLETED');
 }
});

await check('documented native default remains explicit and a missing IV requires actual cannulation',()=>{
 const d=createLiveNativeJourney487('PERI-SEC-001');order(d,'noradrenalina');advance(d,1);
 assert.equal(rows(d).length,1);assert.equal(rows(d)[0].defaultApplied,true);
 const r=createLiveNativeJourney487('PERI-SEC-001',{confirmedIV:0});give(r);
 assert.equal(rows(r).length,0);assert.equal(r.ctx.sim.monitorTherapies.has('vasopressor'),false);
 order(r,'una via');advance(r,15);assert.equal(r.ctx.sim.venousAccessCount,1);assert.equal(rows(r).length,1);
});

await check('titration is an absolute confirmed rate, stop is a separate executed event without another dose',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');give(r);
 const previous=JSON.stringify(rows(r)[0]);order(r,'noradrenalina 0.02 mcg/kg/min IV');advance(r,.1);
 assert.equal(rows(r).length,1);assert.equal(r.ctx.sim.monitorTherapies.get('vasopressor').dose.amount,.05);
 assert.equal(r.ctx.sim.csNurse487History.at(-1).items[0].status,'IN_PROGRESS','previous dose cannot complete a new rate request');
 advance(r,1);assert.equal(rows(r).length,2);assert.equal(r.ctx.sim.monitorTherapies.get('vasopressor').dose.amount,.02);
 const count=r.ctx.sim.therapyExposure.get('vasopressor').count;
 order(r,'suspender noradrenalina');advance(r,.1);
 assert.equal(r.ctx.sim.monitorTherapies.has('vasopressor'),true);assert.equal(rows(r).length,2);
 advance(r,3);
 assert.equal(r.ctx.sim.monitorTherapies.has('vasopressor'),false);assert.equal(rows(r).length,3);
 const stop=rows(r).at(-1);assert.equal(stop.action,'stop');assert.equal(stop.route,'iv');
 assert.equal(stop.eventType,'suspension');assert.equal(stop.dose,undefined);
 assert.equal(stop.previousDose.amount,.02);assert.equal(r.ctx.sim.therapyExposure.get('vasopressor').count,count);
 assert.equal(JSON.stringify(rows(r)[0]),previous);assert.equal(r.ctx.therapyEffectTotals().sys,0);
 assert.equal(csCriticalRescueEvidence487(r.ctx.sim,r.ctx.C,{sys:55,dia:30,spo2:98}).pressor,false);
 assert.equal(r.ctx.sim.csNurse487History.at(-1).items[0].status,'COMPLETED');
 order(r,'suspender noradrenalina');advance(r,3);assert.equal(rows(r).length,3);
 give(r,.03);assert.equal(rows(r).length,4);
});

await check('unconfirmed/negated/conditional/generic stops cannot suspend noradrenaline',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');order(r,'suspender noradrenalina');assert.equal(rows(r).length,0);
 give(r);
 for(const q of ['no suspender noradrenalina','suspender noradrenalina?','suspender noradrenalina si mejora',
  'suspender noradrenalina y monitor cuando mejore','suspender vasopresor']){order(r,q);advance(r,5);}
 assert.equal(rows(r).length,1);assert.equal(r.ctx.sim.monitorTherapies.has('vasopressor'),true);
});

await check('a queued stop cannot race a titration or cross patient/mode/permission boundaries',()=>{
 for(const change of ['permission','uid','mode']){
  const r=createLiveNativeJourney487('PERI-SEC-001');give(r);order(r,'suspender noradrenalina');
  order(r,'noradrenalina 0.08 mcg/kg/min IV');
  if(change==='permission')r.ctx.window.nsMayContinueTreatment=()=>false;
  if(change==='uid')r.ctx.sim.patientInstance.uid='replacement';
  if(change==='mode')r.ctx.selectedPlayMode='coop';
  advance(r,4);assert.equal(rows(r).length,1,change);assert.equal(r.ctx.sim.monitorTherapies.has('vasopressor'),true);
  assert.equal(r.ctx.sim.pendingTherapies.has('vasopressor'),false,change);
 }
});

await check('cancelled titration cannot borrow completion from an old or later matching dose',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');give(r);
 order(r,'noradrenalina 0.02 mcg/kg/min IV');const receipt=r.ctx.sim.csNurse487History.at(-1).items[0];
 assert.equal(receipt.status,'IN_PROGRESS');assert.notEqual(receipt.notified,true);
 r.ctx.window.nsMayContinueTreatment=()=>false;advance(r,3);
 assert.equal(receipt.status,'REJECTED');assert.equal(rows(r).length,1);
 assert.equal(r.ctx.sim.monitorTherapies.get('vasopressor').dose.amount,.05);
 r.ctx.window.nsMayContinueTreatment=()=>true;give(r,.02);
 assert.equal(receipt.status,'REJECTED','another actual same-rate administration cannot revive a cancelled request');
 assert.equal(r.ctx.sim.csNurse487History.at(-1).items[0].status,'COMPLETED');
});

await check('native 800ms cancellation is terminal before a new same-rate request or a simulation tick',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');give(r);
 order(r,'noradrenalina 0.02 mcg/kg/min IV');const cancelled=r.ctx.sim.csNurse487History.at(-1).items[0];
 r.ctx.window.nsMayContinueTreatment=()=>false;advance(r,.8);
 r.ctx.window.nsMayContinueTreatment=()=>true;order(r,'noradrenalina 0.02 mcg/kg/min IV');
 const replacement=r.ctx.sim.csNurse487History.at(-1).items[0];advance(r,1);
 assert.equal(cancelled.status,'REJECTED');assert.notEqual(cancelled.notified,true);
 assert.equal(replacement.status,'COMPLETED');assert.equal(rows(r).length,2);
});

await check('overlapping rates coalesce only when their actual requested rate matches',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');
 order(r,'noradrenalina 0.05 mcg/kg/min IV');const first=r.ctx.sim.csNurse487History.at(-1).items[0];
 order(r,'noradrenalina 0.05 mcg/kg/min IV');const same=r.ctx.sim.csNurse487History.at(-1).items[0];
 order(r,'noradrenalina 0.02 mcg/kg/min IV');const different=r.ctx.sim.csNurse487History.at(-1).items[0];
 advance(r,1);assert.equal(rows(r).length,1);assert.equal(first.status,'COMPLETED');
 assert.equal(same.status,'COMPLETED');assert.equal(same.preExisting,true);assert.equal(different.status,'REJECTED');
 assert.equal(r.ctx.sim.monitorTherapies.get('vasopressor').dose.amount,.05);
});

await check('existing simulation-tick IV drain binds waiting nursing evidence to its own pending execution',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001',{confirmedIV:0});order(r,'noradrenalina 0.05 mcg/kg/min IV');
 const item=r.ctx.sim.csNurse487History.at(-1).items[0];assert.equal(item.status,'WAITING');
 // Branch fixture only: actual bedside IV completion is tested above; here
 // exercise the other pre-existing drain, with the bedside scheduler disabled.
 r.ctx.sim.venousAccessCount=1;advance(r,1,{updateNurse:false});
 assert.equal(rows(r).length,1);assert.equal(item.status,'COMPLETED');assert(item.noraWaiting487.noraExecution487);
});

await check('observer accepts start/rate/stop/restart and stays identical to the unobserved native patient',()=>{
 const a=createLiveNativeJourney487('PERI-SEC-001'),b=createLiveNativeJourney487('PERI-SEC-001');
 const api=installPhysiologyQAObserver487(nativeObserverPort487(b));
 for(const r of [a,b])give(r);
 for(const r of [a,b]){order(r,'noradrenalina 0.02 mcg/kg/min IV');advance(r,1);}
 for(const r of [a,b]){order(r,'suspender noradrenalina');advance(r,3);}
 for(const r of [a,b])give(r,.03);
 const report=api.report();assert.equal(report.status,'observing',report.reason);
 assert.deepEqual(report.receipts.map(x=>x.action),['start','setRate','stop','start']);
 assert.equal(serializeNativePatient487(a.ctx.sim),serializeNativePatient487(b.ctx.sim));api.stop();
});

await check('suspending an already verified infusion does not require a new IV or a new administered dose',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),api=installPhysiologyQAObserver487(nativeObserverPort487(r));
 give(r);r.ctx.sim.venousAccessCount=0;order(r,'suspender noradrenalina');advance(r,3);
 const report=api.report();assert.equal(report.status,'observing',report.reason);
 assert.deepEqual(report.receipts.map(x=>x.action),['start','stop']);assert.equal(rows(r).at(-1).action,'stop');api.stop();
});

await check('native oxygen and experimental Ringer can combine with noradrenaline without adding a B1 pressor writer',async()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),api=await enableNativeRinger487(r);
 order(r,'Ringer 500 ml');order(r,'oxigeno 4 L/min');give(r);
 assert.equal(api.reportRinger().applications,1);assert.equal(rows(r).length,1);
 order(r,'suspender noradrenalina');advance(r,3);
 assert.equal(api.reportRinger().applications,1);assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true);
 assert.equal(r.ctx.sim.phys.sourceControlled,false);assert.equal(api.rollbackRinger().status,'blocked-active-patient');
});

await check('same noradrenaline start/stop executor serves all thirteen cases without disease-specific rules',()=>{
 const seed=createLiveNativeJourney487();
 for(const c of seed.ctx.CASES){const r=createLiveNativeJourney487(c.id);give(r);order(r,'retirar noradrenalina');advance(r,3);
  assert.equal(rows(r).at(-1).action,'stop',c.id);assert.equal(r.ctx.sim.monitorTherapies.has('vasopressor'),false,c.id);}
});

await check('repeated rate changes and stops keep eighty ledger rows and thirty-two terminal receipts',()=>{
 const r=createLiveNativeJourney487('CIRR-001');
 for(let i=0;i<30;i++){
  give(r);order(r,'noradrenalina 0.02 mcg/kg/min IV');advance(r,1);
  assert.equal(r.ctx.sim.csNurse487History.at(-1).items[0].status,'COMPLETED');
  order(r,'suspender noradrenalina');advance(r,3);
 }
 assert.equal(r.ctx.sim.administrationLog.length,80);assert.equal(r.ctx.sim.csNurse487History.length,32);
 assert.equal(r.ctx.sim.therapyExposure.get('vasopressor').count,60,'stops are never doses');
 assert(r.ctx.sim.csNurse487History.every(x=>x.items.every(y=>y.status==='COMPLETED')));
 assert.equal([...r.ctx.sim.csNurse487SeenEvents].filter(x=>x.includes('vasopressor')).length,0,
  'terminal bounded rate/stop receipts do not create permanent per-execution dedupe keys');
});

await check('noradrenaline withdrawal/restart cannot fabricate or renew finite rescue after initial grace',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),native=r.ctx.updateLiveVitals;
 let observed={sys:120,dia:75,hr:90,rr:18,spo2:98,temp:37};
 r.ctx.updateLiveVitals=function(){const out=native.apply(this,arguments);Object.assign(r.ctx.sim.liveVitals,observed);return out;};
 r.ctx.finishCase=()=>{r.ctx.sim.caseEnded=true;};
 advance(r,500);observed={...observed,sys:55,dia:30,hr:165};give(r);
 const anchor=r.ctx.sim._criticalSupport487.startedAtSec;
 assert(Number.isFinite(anchor));assert.equal(r.ctx.window.csCriticalRescue487.window().protected,true);
 order(r,'suspender noradrenalina');advance(r,3);
 assert.equal(r.ctx.window.csCriticalRescue487.window().protected,false);
 give(r);assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,anchor);
 advance(r,anchor+65.1-r.ctx.sim._criticalSupport487.elapsedSeconds);
 assert.equal(r.ctx.window.csCriticalRescue487.window().protected,false);
 advance(r,12);assert.equal(r.ctx.sim.patientDied,true,'persistent shock can still be fatal');
});

// Qualitative oracle from SSC2026/DailyMed, not copied numeric targets: pressure
// may improve without curing infection; depleted volume limits the response,
// and excessive exposure may produce excessive pressure/heart-rate response.
await check('native time/dose/volume/pump trajectories remain contextual and never control the infection source',()=>{
 const profiles=[];
 for(const [name,dose,volume,pump] of [['untreated',0,.6,.7],['low',.01,.6,.7],['usual',.05,.6,.7],
  ['high',.5,.6,.7],['hypovolemia',.05,.28,.7],['replete',.05,.95,.7],['weak-pump',.05,.6,.5]]){
  const r=createLiveNativeJourney487('PERI-SEC-001');Object.assign(r.ctx.sim.phys,{effectiveVolume:volume,contractility:pump});
  if(dose)order(r,'noradrenalina '+dose+' mcg/kg/min IV');
  const trajectory=[];let prior=0;
  for(const second of [0,.1,1,3,10]){
   advance(r,second-prior);prior=second;const p=r.ctx.sim.phys,v=r.ctx.sim.liveVitals;
   trajectory.push({second,sys:v.sys,map:(v.sys+2*v.dia)/3,hr:v.hr,svr:p.svr,volume:p.effectiveVolume,
    pump:p.contractility,inflammation:p.inflammation,sourceControlled:p.sourceControlled});
   assert.equal(p.sourceControlled,false);assert(Object.values(v).every(Number.isFinite));
  }
  profiles.push({name,dose,trajectory});
 }
 const end=name=>profiles.find(x=>x.name===name).trajectory.at(-1);
 assert(end('usual').map>end('low').map);assert(end('low').map>end('untreated').map);
 assert(end('hypovolemia').map<end('usual').map);assert(end('weak-pump').map<end('usual').map);
 assert(end('high').map>end('usual').map);assert(end('high').hr>end('usual').hr);
 assert.equal(end('usual').inflammation,end('untreated').inflammation,'pressor cannot treat infection');
 assert.equal(profiles.find(x=>x.name==='usual').trajectory[1].map,profiles.find(x=>x.name==='untreated').trajectory[1].map,
  'before confirmed delivery there is no pressor bonus');
 const continued=createLiveNativeJourney487('PERI-SEC-001'),stopped=createLiveNativeJourney487('PERI-SEC-001');
 for(const r of [continued,stopped]){give(r);advance(r,9);}
 order(stopped,'suspender noradrenalina');advance(stopped,10);advance(continued,10);
 const map=r=>(r.ctx.sim.liveVitals.sys+2*r.ctx.sim.liveVitals.dia)/3;
 assert(map(stopped)<map(continued),'observed pressure must fall relative to maintained infusion after confirmed withdrawal');
 console.log('NORADRENALINE NATIVE TRAJECTORIES',JSON.stringify({profiles,clinicalQuantitativeValidation:false,
  unresolved:['native direct pressure plus critical tone contribution retained','no validated drug half-life','no ischemia/arrhythmia/perfusion-risk model']}));
});
console.log('NORADRENALINE FUNCTIONAL RESULT',JSON.stringify({checks,owner:'native',b1PressorWriter:false,
 protectedPoliciesChanged:false,scope:'generated native nursing/clinical Node VM; no physical device'}));
