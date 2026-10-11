/** CP2 preflight. Unsafe substitutions exist ONLY in this isolated QA VM.
 * No runtime adapter, clinical flag, nursing edit or protected policy change. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createLiveNativeJourney487,advanceLiveNativeJourney487,nativeObserverPort487,serializeNativePatient487}
 from '../../qa/physiology-live/native-journey-487.mjs';
import {loadNativeReferenceSources487} from '../../qa/physiology-pilot/native-reference-487.mjs';
import {createPhysiologyState487,stepPhysiology487} from '../clinical/physiology-pilot-487.js';
import {createPilotProfile487} from '../clinical/physiology-pilot-cases-487.js';
import {installPhysiologyQAObserver487} from './physiology-qa-observer-487.js';
import {adaptConfirmedPharmacologyEvents487} from './pharmacology-receipts-487.js';
import {PILOT_DEFINITIONS_487} from '../clinical/physiology-pilot-definitions-487.js';
import {csCriticalRescueEvidence487} from '../clinical/critical-rescue-487.js';
import {csSecondaryBridgeEvidence487,csSecondaryBridgePhysiology487} from '../clinical/secondary-sepsis-bridge-487.js';
import {csGraceState487} from '../clinical/grace-survival-487.js';

let checks=0;
const evidence={activation:'blocked',clinicalOwner:'native',unsafeExperiments:'isolated-node-vm-only'};
function check(name,fn){fn();checks++;console.log('TRANSITION PREFLIGHT PASS',name);}
const runtime=()=>createLiveNativeJourney487('PERI-SEC-001');
const order=(r,text)=>r.ctx.nurseNatural('Enfermera '+text);
function traceVolume(r){
 const writes=[],p=r.ctx.sim.phys;let value=p.effectiveVolume;
 Object.defineProperty(p,'effectiveVolume',{enumerable:true,configurable:true,get:()=>value,
  set:next=>{writes.push({before:value,after:next,stack:new Error().stack});value=next;}});
 return writes;
}
function replaceBolusInFixture(r){
 const original=r.ctx.applyImmediatePhysiology,initial=createPhysiologyState487(createPilotProfile487(r.ctx.C,r.ctx.sim),'test-patient');
 let applications=0;
 r.ctx.applyImmediatePhysiology=function(t){
  if(t.id!=='fluid')return original.apply(this,arguments);
  const s=stepPhysiology487(initial,[{eventId:'test-'+(++applications),patientId:initial.patientId,
   drugId:'fluid',status:'administered',action:'bolus',route:'iv',dose:{amount:t.dose.amount,unit:'ml'},atClinicalMinute:0}],0);
  // Diagnostic mapping already used by createPilotProfile: effectiveVolume*5000.
  // This mapping is NOT a clinically accepted live transition.
  r.ctx.sim.phys.effectiveVolume+=(s.circulatingVolumeMl-initial.circulatingVolumeMl)/initial.profile.euvolemicVolumeMl;
 };
 return {applications:()=>applications,restore:()=>{r.ctx.applyImmediatePhysiology=original;}};
}
check('actual nursing preparation cannot apply fluid before its native receipt',()=>{
 const r=runtime(),o=installPhysiologyQAObserver487(nativeObserverPort487(r));
 order(r,'Ringer 500 ml');advanceLiveNativeJourney487(r,.5);
 assert.equal(r.ctx.sim.administrationLog.length,0);assert.equal(r.ctx.sim.therapyTotals.fluidMl,0);
 assert.equal(o.report().last.state.administeredFluidMl,0);
 advanceLiveNativeJourney487(r,.5);const report=o.report();
 assert.equal(r.ctx.sim.administrationLog.length,1);assert.equal(report.receipts.length,1);
 assert.equal(report.last.state.administeredFluidMl,500);assert.equal(report.effectOwner,'native');o.stop();
});
check('native Ringer reaches physiology and vital targets through the actual nurse path',()=>{
 const given=runtime(),untreated=runtime();order(given,'Ringer 500 ml');
 advanceLiveNativeJourney487(given,30);advanceLiveNativeJourney487(untreated,30);
 assert(given.ctx.sim.phys.effectiveVolume>untreated.ctx.sim.phys.effectiveVolume);
 assert(given.ctx.sim.liveVitals.sys>untreated.ctx.sim.liveVitals.sys);
 assert.equal(given.ctx.sim.phys.sourceControlled,false,'fluid does not control the infectious source');
 evidence.native30Seconds={volume:given.ctx.sim.phys.effectiveVolume,sys:given.ctx.sim.liveVitals.sys,
  untreatedVolume:untreated.ctx.sim.phys.effectiveVolume,untreatedSys:untreated.ctx.sim.liveVitals.sys};
});
check('replacing only the native bolus still leaves a second fluid volume writer',()=>{
 const r=runtime(),writes=traceVolume(r),swap=replaceBolusInFixture(r);
 order(r,'Ringer 500 ml');advanceLiveNativeJourney487(r,1);
 assert.equal(swap.applications(),1,'the new bolus executes once');
 assert(writes.some(w=>w.after>w.before&&w.stack.includes('csCriticalRescuePhysiology487')),
  'the protected old rescue still adds fluid volume after the new bolus');
 assert.equal(r.ctx.sim.therapyTotals.fluidMl,500);assert.equal(r.ctx.sim.administrationLog.length,1);
 evidence.newBolusStillHasOldRescue=true;swap.restore();
});
check('source bridge independently changes fluid volume with confirmed care evidence',()=>{
 const r=runtime();for(const text of ['Ringer 500 ml','oxigeno 4 L/min','ceftriaxona 1 g','metronidazol 500 mg'])order(r,text);
 advanceLiveNativeJourney487(r,3);
 // A completed/accepted consult fixture, NOT a claim that surgery was performed.
 r.ctx.sim.consults.set('cirugia',{status:'done',accepted:true});
 const patient=structuredClone(r.ctx.sim),before={...patient.phys};
 assert.equal(csSecondaryBridgeEvidence487(patient,r.ctx.C).ready,true);
 patient.phys.effectiveVolume-=.01;
 const result=csSecondaryBridgePhysiology487(patient,r.ctx.C,before,.12);
 assert.equal(result.applied,true);assert(patient.phys.effectiveVolume>before.effectiveVolume-.01);
 assert.equal(patient.phys.sourceControlled,false);assert.equal(r.ctx.sim.phys.sourceControlled,false);
 evidence.bridgeIsAnIndependentVolumeWriter=true;
});
check('hiding fluid from the old ledger removes evidence used by protected policies',()=>{
 const r=runtime();for(const text of ['Ringer 500 ml','oxigeno 4 L/min','ceftriaxona 1 g','metronidazol 500 mg'])order(r,text);
 advanceLiveNativeJourney487(r,3);r.ctx.sim.consults.set('cirugia',{status:'done',accepted:true});
 const actual=r.ctx.sim,hidden=structuredClone(actual);
 hidden.administrationLog=hidden.administrationLog.filter(x=>x.id!=='fluid');
 const severe={sys:56,dia:30,hr:158,spo2:77};
 assert.equal(csCriticalRescueEvidence487(actual,r.ctx.C,severe).supported,true);
 assert.equal(csCriticalRescueEvidence487(hidden,r.ctx.C,severe).supported,false);
 assert.equal(csSecondaryBridgeEvidence487(actual,r.ctx.C).ready,true);
 assert.equal(csSecondaryBridgeEvidence487(hidden,r.ctx.C).ready,false);
 const before=csGraceState487(actual,r.ctx.C,220),after=csGraceState487(hidden,r.ctx.C,220);
 assert(after.observedCredit<before.observedCredit,'future earned credit depends on real ledger evidence');
 assert.equal(after.credit,before.credit,'already banked grace is monotonic; hiding evidence does not undo it');
 evidence.hiddenLedgerBreaksRescueAndBridge=true;
});
check('Ringer overload still has an old direct vital-sign safety contribution',()=>{
 const r=runtime();order(r,'Ringer 3000 ml');advanceLiveNativeJourney487(r,1);
 const safety=r.ctx.medicationSafetyOffsets();assert(safety.spo2<0);assert(safety.rr>0);
 assert.equal(r.ctx.sim.therapyTotals.fluidMl,3000);
 assert.equal(r.ctx.sim.phys.sourceControlled,false);evidence.nativeFluidToxicityAlsoNeedsOwnership=true;
});
check('later convalescence and fatal-predicate overrides are present in the effective source order',()=>{
 const sources=loadNativeReferenceSources487(),evolution=sources.compiled.find(x=>x.id==='ns423-evolution').code;
 assert(evolution.includes('p.effectiveVolume+=dm*.12*(.86-p.effectiveVolume)'));
 assert(evolution.includes('csDeathRescueMissing=window.csCriticalRescue487.fatalMissing;'));
 const r=runtime();assert.equal(r.ctx.csDeathRescueMissing({spo2:98,sys:120,dia:80},100),true);
 assert.equal(typeof r.ctx.window.csEarlyCriticalDeathGuard487,'function');
 assert.equal(r.ctx.window.csEarlyCriticalDeathGuard487(r.ctx.sim,r.ctx.C),true,
  'the separate irreversible-boundary grace guard remains authoritative');
 evidence.laterPredicateOverride='ns423: finite critical window, then true; separate irreversible grace guard remains';
});
check('actual CP1 receipts lack the explicit v2 formulation and episode evidence',()=>{
 const r=runtime(),o=installPhysiologyQAObserver487(nativeObserverPort487(r));order(r,'Ringer 500 ml');advanceLiveNativeJourney487(r,1);
 const report=o.report(),e=structuredClone(report.receipts[0]);
 assert.equal(e.schemaVersion,1);assert.equal(e.nativeEvidence.routeSource,'pilot-definition-with-native-dose-and-access');
 // Negative qualification test; never use this upgrade as delivery evidence.
 e.schemaVersion=2;const c={...e,receiptId:e.verification.receiptId,source:e.verification.source};delete c.verification;
 assert.throws(()=>adaptConfirmedPharmacologyEvents487([e],{patientId:report.patientId,clock:report.clock,
  definitions:PILOT_DEFINITIONS_487,confirmations:[c]}),/formulation/);
 assert.equal(report.shadowOnly,true);o.stop();
});
check('shadow and rollback preserve complete native state through earned grace',()=>{
 const a=runtime(),b=runtime(),admin=b.ctx.recordAdministration,update=b.ctx.updateSimulation,
  immediate=b.ctx.applyImmediatePhysiology,phys=b.ctx.updatePhysiologyState,fatal=b.ctx.csDeathRescueMissing;
 const observer=installPhysiologyQAObserver487(nativeObserverPort487(b));
 for(const r of [a,b]){order(r,'Ringer 500 ml');order(r,'oxigeno 4 L/min');}
 let at=0,comparisons=0;
 for(const end of [1,30,60,179,180,240,300]){
  advanceLiveNativeJourney487(a,end-at);advanceLiveNativeJourney487(b,end-at);at=end;
  assert.equal(serializeNativePatient487(b.ctx.sim),serializeNativePatient487(a.ctx.sim));comparisons++;
  if(end===60){
   assert.equal(observer.report().status,'observing');observer.stop();
   assert.equal(b.ctx.recordAdministration,admin);assert.equal(b.ctx.updateSimulation,update);
   for(const r of [a,b])order(r,'Ringer 250 ml');
  }
 }
 assert.equal(b.ctx.applyImmediatePhysiology,immediate);assert.equal(b.ctx.updatePhysiologyState,phys);assert.equal(b.ctx.csDeathRescueMissing,fatal);
 assert.equal(!!b.ctx.sim.patientDied,false);assert.equal(b.ctx.sim.phys.sourceControlled,false);
 assert.equal(b.ctx.sim.therapyTotals.fluidMl,750);evidence.completeStateRollbackComparisons=comparisons;
});
check('switching a bolus function back cannot undo its prior physiological divergence',()=>{
 const a=runtime(),b=runtime(),swap=replaceBolusInFixture(b);
 for(const r of [a,b])order(r,'Ringer 500 ml');advanceLiveNativeJourney487(a,1);advanceLiveNativeJourney487(b,1);
 const atDisable=b.ctx.sim.phys.effectiveVolume;swap.restore();
 assert.equal(b.ctx.sim.phys.effectiveVolume,atDisable,'restoring a function reference must not reset patient state');
 assert.notEqual(serializeNativePatient487(b.ctx.sim),serializeNativePatient487(a.ctx.sim));
 advanceLiveNativeJourney487(a,4);advanceLiveNativeJourney487(b,4);
 assert.notEqual(a.ctx.sim.phys.effectiveVolume,b.ctx.sim.phys.effectiveVolume);
 evidence.midPatientClinicalRollbackRequiresVersionedReplay=true;
});
check('experimental preflight has no published clinical effect writer or heparin activation',()=>{
 const r=runtime();assert.equal(r.ctx.window.csPharm487Boot.status,'rejected');assert.equal(r.ctx.window.csPharm487,undefined);
 const bootstrap=fs.readFileSync(new URL('./physiology-qa-bootstrap-487.js',import.meta.url),'utf8');
 assert(!bootstrap.includes('setPhysiology')&&!bootstrap.includes('enableClinical'));
});
console.log('PHYSIOLOGY TRANSITION PREFLIGHT PASS',JSON.stringify({checks,...evidence}));
