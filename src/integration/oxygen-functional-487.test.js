/** Actual generated nursing / clinical VM. No B1 oxygen writer or policy stub. */
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487,nativeObserverPort487,
 serializeNativePatient487} from '../../qa/physiology-live/native-journey-487.mjs';
import {installPhysiologyQAObserver487} from './physiology-qa-observer-487.js';
import {csCriticalRescueEvidence487,csCriticalRescuePhysiology487} from '../clinical/critical-rescue-487.js';
import {enableNativeRinger487} from '../../qa/physiology-live/ringer-journey-487.mjs';

const advance=(r,s)=>advanceLiveNativeJourney487(r,s);
const order=(r,q)=>r.ctx.nurseNatural('enfermera '+q);
const rows=r=>r.ctx.sim.administrationLog.filter(x=>x.id==='oxygen');
const give=r=>{order(r,'oxigeno 4 L/min');advance(r,1);assert.equal(rows(r).length,1);};
let checks=0;
const check=async(name,fn)=>{await fn();checks++;console.log('OXYGEN FUNCTIONAL PASS',name);};

await check('suspension requires actual nurse completion and preserves the original administration',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');give(r);
 const original=JSON.stringify(rows(r)[0]),count=r.ctx.sim.therapyExposure.get('oxygen').count;
 order(r,'suspender oxigeno');
 advance(r,.1);
 assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true,'pending suspension must leave support active');
 assert.equal(rows(r).length,1,'an order cannot be a completed stop');
 advance(r,3);
 assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),false,'confirmed nurse suspension must remove active oxygen');
 assert.equal(rows(r).length,2,'one distinct confirmed stop belongs in the existing history');
 const stop=rows(r).at(-1);
 assert.equal(stop.action,'stop');assert.equal(stop.eventType,'suspension');
 assert.equal(stop.status,'administered');assert.equal(stop.route,'inhaled');
 assert.equal(stop.patientId,r.ctx.sim.patientInstance.uid);
 assert.equal(stop.dose,undefined,'stopping support must never add a new dose');
 assert.equal(JSON.stringify(rows(r)[0]),original);
 assert.equal(r.ctx.sim.therapyExposure.get('oxygen').count,count,'stop is not another administration');
 assert.equal(r.ctx.therapyEffectTotals().spo2,0,'the existing direct oxygen writer must stop');
 const p=r.ctx.sim.phys.oxygenation;
 csCriticalRescuePhysiology487(r.ctx.sim,r.ctx.C,.12);
 assert.equal(r.ctx.sim.phys.oxygenation,p,'existing rescue physiology must stop supplemental oxygen too');
 assert.equal(csCriticalRescueEvidence487(r.ctx.sim,r.ctx.C,{spo2:75,sys:100,dia:70}).oxygen,false);
 assert.equal(r.ctx.sim.csNurse487History.at(-1).items[0].status,'COMPLETED');
 assert.match(r.ctx.sim.monitorFeedback,/Oxígeno suspendido y registrado/,'monitor feedback must say suspended');
 assert(r.ctx.sim.events.some(x=>/Oxígeno suspendido — ejecutado/.test(x.t)),'native nursing receipt must announce suspension');
 order(r,'suspender oxigeno');advance(r,3);
 assert.equal(rows(r).length,2,'repeated stop on inactive support is idempotent');
});

await check('negation, questions, inactive support and unconfirmed preparation cannot create a stop',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');
 order(r,'suspender oxigeno');advance(r,3);assert.equal(rows(r).length,0);
 order(r,'oxigeno 4 L/min');order(r,'suspender oxigeno');advance(r,1);
 assert.equal(rows(r).length,1,'cannot suspend an unconfirmed start');
 for(const q of ['no suspender oxigeno','sin oxigeno','suspender oxigeno?','evitar oxigeno',
  'suspender ringer','no retirar oxigeno','suspender oxigeno si mejora','si mejora suspender oxigeno']){order(r,q);advance(r,3);}
 assert.equal(rows(r).length,1);assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true);
});

await check('a queued stop blocks start/rate races and cancels after lost continuation permission',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');give(r);
 order(r,'suspender oxigeno');order(r,'oxigeno 2 L/min');
 r.ctx.window.nsMayContinueTreatment=()=>false;advance(r,3);
 assert.equal(rows(r).length,1);assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true);
 assert.equal(r.ctx.sim.pendingTherapies.has('oxygen'),false,'failed completion releases its own pending marker');
 assert.equal(r.ctx.sim.csNurse487History.at(-1).items[0].status,'REJECTED');
});

await check('conditional/modal context cannot become a stop after a different recognized action',()=>{
 for(const q of ['cuando termine el Ringer suspender oxigeno','si mejora tomar signos vitales y suspender oxigeno',
  'deberia suspender oxigeno','conviene suspender oxigeno','quizas suspender oxigeno']){
  const r=createLiveNativeJourney487('PERI-SEC-001');give(r);order(r,q);advance(r,7);
  assert.equal(rows(r).length,1,q);assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true,q);
 }
});

await check('an interrogative or conditional preamble cannot be lost at an earlier recognized noun',()=>{
 for(const q of ['por que monitorizar y suspender oxigeno','puedo pedir monitor y suspender oxigeno',
  'seria prudente monitorizar y suspender oxigeno','al mejorar la saturacion suspender oxigeno',
  'en caso de mejoria de la saturacion suspender oxigeno','monitor y al mejorar la saturacion suspender oxigeno']){
  const r=createLiveNativeJourney487('PERI-SEC-001');give(r);order(r,q);advance(r,7);
  assert.equal(rows(r).length,1,q);assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true,q);
 }
 const direct=createLiveNativeJourney487('PERI-SEC-001');give(direct);
 order(direct,'monitor y suspender oxigeno');advance(direct,5);
 assert.equal(direct.ctx.sim.monitorConnected,true,'explicit composite command still uses both native tasks');
 assert.equal(rows(direct).at(-1).action,'stop');
});

await check('a stop remains bound to its original patient and cannot execute on a replaced UID',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');give(r);order(r,'suspender oxigeno');
 r.ctx.sim.patientInstance.uid='replacement-patient';advance(r,3);
 assert.equal(rows(r).length,1);assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true);
});

await check('a local queued stop cannot cross into a shared-mode context before completion',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');give(r);order(r,'suspender oxigeno');
 r.ctx.selectedPlayMode='coop';advance(r,3);
 assert.equal(rows(r).length,1);assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true);
});

await check('ambiguous tails after a later recognized action cannot confirm an earlier stop',()=>{
 for(const q of ['suspender oxigeno y monitor si mejora','suspender oxigeno y monitor cuando mejore',
  'suspender oxigeno y monitor tal vez','suspender oxigeno y monitor no lo hagas todavia']){
  const r=createLiveNativeJourney487('PERI-SEC-001');give(r);order(r,q);advance(r,7);
  assert.equal(rows(r).length,1,q);assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true,q);
 }
});

await check('active oxygen can still be suspended after its start leaves the rolling display history',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001');give(r);
 for(let i=0;i<81;i++){r.ctx.addMonitorTherapy('paracetamol 1000 mg');advance(r,.6);}
 assert.equal(r.ctx.sim.administrationLog.length,80);
 assert.equal(rows(r).length,0,'original start is outside the bounded display window');
 assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),true);
 order(r,'suspender oxigeno');advance(r,3);
 assert.equal(rows(r).length,1,'a confirmed stop is retained without adding dose counts');
 assert.equal(rows(r)[0].action,'stop');assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),false);
 assert.equal(r.ctx.sim.therapyExposure.get('oxygen').count,1);
 const receipt=r.ctx.sim.csNurse487History.at(-1).items[0];
 for(let i=0;i<81;i++){r.ctx.addMonitorTherapy('paracetamol 1000 mg');advance(r,.6);}
 assert.equal(rows(r).length,0,'stop also leaves the rolling display log');
 assert.equal(receipt.status,'COMPLETED','a verified completed suspension cannot regress to pending');
 assert.equal([...r.ctx.sim.csNurse487SeenEvents].filter(x=>x.startsWith('therapy_stop:')).length,0,
  'terminal bounded receipts must not grow a redundant permanent stop dedupe cache');
});

await check('observer accepts only confirmed stops, restart begins a new support episode, and cannot mutate native state',()=>{
 const plain=createLiveNativeJourney487('PERI-SEC-001'),observed=createLiveNativeJourney487('PERI-SEC-001');
 const observer=installPhysiologyQAObserver487(nativeObserverPort487(observed));
 for(const r of [plain,observed])give(r);
 assert.equal(observer.report().receipts[0].action,'start');
 for(const r of [plain,observed])order(r,'suspender oxigeno');
 assert.equal(observer.report().receipts.length,1);
 for(const s of [.1,3,6]){
  advance(plain,s);advance(observed,s);
  assert.equal(serializeNativePatient487(observed.ctx.sim),serializeNativePatient487(plain.ctx.sim));
 }
 let report=observer.report();assert.equal(report.status,'observing',report.reason);
 assert.deepEqual(report.receipts.map(x=>x.action),['start','stop']);
 assert.equal(report.last.state.oxygenFlowLpm,0);
 for(const r of [plain,observed]){order(r,'oxigeno 2 L/min');advance(r,1);}
 report=observer.report();assert.equal(report.status,'observing',report.reason);
 assert.deepEqual(report.receipts.map(x=>x.action),['start','stop','start']);
 assert.equal(report.last.state.oxygenFlowLpm,2);
 assert.equal(serializeNativePatient487(observed.ctx.sim),serializeNativePatient487(plain.ctx.sim));
 observer.stop();
});

await check('withdrawal changes the monitor over time and preserves banked grace without renewed rescue',()=>{
 const continued=createLiveNativeJourney487('PERI-SEC-001'),stopped=createLiveNativeJourney487('PERI-SEC-001');
 for(const r of [continued,stopped]){give(r);advance(r,9);}
 const grace=stopped.ctx.window.csGraceSurvival487.get().releaseAt;
 const before=stopped.ctx.sim.liveVitals.spo2;
 order(stopped,'suspender oxigeno');
 for(const s of [.1,3,6,10]){advance(stopped,s);advance(continued,s);}
 assert(stopped.ctx.sim.liveVitals.spo2<before);
 assert(stopped.ctx.sim.liveVitals.spo2<continued.ctx.sim.liveVitals.spo2);
 assert.equal(stopped.ctx.window.csGraceSurvival487.get().releaseAt,grace,'earned grace is preserved, never extended by stop');
 assert.equal(stopped.ctx.sim.phys.sourceControlled,false);
});

await check('native oxygen stop coexists with experimental Ringer without transferring any oxygen effect',async()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),api=await enableNativeRinger487(r);
 order(r,'Ringer 500 ml');give(r);order(r,'suspender oxigeno');advance(r,3);
 assert.equal(rows(r).at(-1).action,'stop');assert.equal(api.reportRinger().applications,1);
 assert.equal(api.ownsRinger(r.ctx.sim,r.ctx.C),true);
 assert.equal(r.ctx.therapyEffectTotals().spo2,0);
 assert.equal(api.rollbackRinger().status,'blocked-active-patient');
});

await check('the same confirmed stop executor works in all thirteen existing cases',()=>{
 const seed=createLiveNativeJourney487();
 for(const c of seed.ctx.CASES){
  const r=createLiveNativeJourney487(c.id);give(r);order(r,'retirar el oxigeno');advance(r,3);
  assert.equal(rows(r).length,2,c.id);assert.equal(rows(r).at(-1).action,'stop',c.id);
  assert.equal(r.ctx.sim.monitorTherapies.has('oxygen'),false,c.id);
 }
});

await check('stop/restart cannot renew the finite critical window or fabricate survival',()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),native=r.ctx.updateLiveVitals;
 let observed={sys:120,dia:75,hr:90,rr:18,spo2:98,temp:37};
 r.ctx.updateLiveVitals=function(){const out=native.apply(this,arguments);Object.assign(r.ctx.sim.liveVitals,observed);return out;};
 r.ctx.finishCase=()=>{r.ctx.sim.caseEnded=true;};
 advance(r,500);observed={...observed,spo2:77};
 give(r);const anchor=r.ctx.sim._criticalSupport487.startedAtSec;
 assert(Number.isFinite(anchor));assert.equal(r.ctx.window.csCriticalRescue487.window().protected,true);
 order(r,'suspender oxigeno');advance(r,3);
 assert.equal(r.ctx.window.csCriticalRescue487.window().protected,false,'withdrawn support is no longer rescue evidence');
 order(r,'oxigeno 4 L/min');advance(r,1);
 assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,anchor,'restart cannot create a new 65-second interval');
 assert.equal(r.ctx.window.csCriticalRescue487.window().protected,true);
 advance(r,anchor+65.1-r.ctx.sim._criticalSupport487.elapsedSeconds);
 assert.equal(r.ctx.window.csCriticalRescue487.window().protected,false);
 advance(r,12);assert.equal(r.ctx.sim.patientDied,true,'untreated refractory hypoxemia can still be fatal');
});

// Independent clinical expectation: oxygen should be titrated to a target,
// and low flows need not resolve hypoxemia (BTS guideline, section12). The old
// model is NOT accepted as clinically complete: report its unchanged dose gap.
const measured=[];
for(const [name,flow,baseline] of [['untreated',0,92],['low-flow',.5,92],['usual-flow',4,92],
 ['normoxic',4,98],['severely-hypoxic',4,76]]){
 const r=createLiveNativeJourney487('PERI-SEC-001');
 r.ctx.C={...r.ctx.C,vitals:{...r.ctx.C.vitals,spo2:baseline}};r.ctx.sim.liveVitals.spo2=baseline;
 if(flow)order(r,'oxigeno '+flow+' L/min');
 const trajectory=[];
 for(const at of [0,.1,1,3,10]){
  if(at>r.clock.realSeconds)advance(r,at-r.clock.realSeconds);
  trajectory.push({realSeconds:at,spo2:r.ctx.sim.liveVitals.spo2,oxygenation:r.ctx.sim.phys.oxygenation});
  assert(Number.isFinite(r.ctx.sim.liveVitals.spo2)&&r.ctx.sim.liveVitals.spo2<=100);
 }
 measured.push({name,flow,trajectory});
}
assert(measured[2].trajectory.at(-1).spo2>measured[0].trajectory.at(-1).spo2,'responsive hypoxemia must improve after execution');
assert(measured[4].trajectory.at(-1).spo2<94,'severe profile need not normalize simply because oxygen is active');
console.log('OXYGEN NATIVE RESPONSE REPORT',JSON.stringify({measured,
 unresolved:['native direct/rescue oxygen benefit is not flow-dependent','no CO2, gasometry or true shunt/refractoriness model'],
 clinicalQuantitativeValidation:false}));

console.log('OXYGEN FUNCTIONAL RESULT',JSON.stringify({checks,owner:'native',b1OxygenWriter:false,
 scope:'generated nursing / clinical Node VM; no physical browser or Android',policiesModified:false}));
