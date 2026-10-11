/** Oxygen ownership checkpoint C. Execution facts come from the current
 * generated nursing/clinical Node VM. This bot installs NO oxygen writer.
 * Do not treat a model action schema as proof of a native stop/titration. */
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487}
  from './native-journey-487.mjs';
import {installPhysiologyQAObserver487}
  from '../../src/integration/physiology-qa-observer-487.js';
import {nativeObserverPort487} from './native-journey-487.mjs';
import {enableNativeRinger487} from './ringer-journey-487.mjs';
import {csCriticalRescuePhysiology487}
  from '../../src/clinical/critical-rescue-487.js';

const advance=(r,seconds)=>advanceLiveNativeJourney487(r,seconds);
const delivered=(r,id)=>r.ctx.sim.administrationLog.filter(x=>x.id===id);
const order=(r,raw)=>r.ctx.nurseNatural('enfermera '+raw);
const untreated=createLiveNativeJourney487('PERI-SEC-001');
const treated=createLiveNativeJourney487('PERI-SEC-001');
const observer=installPhysiologyQAObserver487(nativeObserverPort487(treated));
assert.equal(delivered(treated,'oxygen').length,0);
assert.equal(observer.report().receipts.length,0,'untreated patient must have no oxygen evidence');
order(treated,'oxigeno 4 L/min');
advance(treated,.1);
assert.equal(delivered(treated,'oxygen').length,0,'pending order cannot affect oxygen ownership');
assert.equal(observer.report().receipts.length,0,'pending oxygen cannot be represented as given');
advance(treated,9.9);
advance(untreated,10);
let report=observer.report(),rows=delivered(treated,'oxygen');
assert.equal(report.status,'observing',report.reason);
assert.equal(rows.length,1,'native nursing confirms only one start');
assert.equal(report.receipts.filter(x=>x.treatmentId==='oxygen').length,1);
assert.equal(report.receipts.find(x=>x.treatmentId==='oxygen').action,'start');
assert.equal(report.effectOwner,'native');
assert.equal(report.shadowOnly,true);
assert.equal(report.last.state.oxygenFlowLpm,4);
assert(treated.ctx.sim.liveVitals.spo2>untreated.ctx.sim.liveVitals.spo2,
  'native confirmed oxygen must benefit this responsive hypoxic example');
assert.equal(treated.ctx.sim.phys.sourceControlled,false);
const direct=treated.ctx.therapyEffectTotals().spo2;
assert(direct>0,'legacy therapyEffectTotals remains a positive SpO2 writer');
const before=treated.ctx.sim.phys.oxygenation;
const rescue=csCriticalRescuePhysiology487(treated.ctx.sim,treated.ctx.C,.12);
assert.equal(rescue,true);
assert(treated.ctx.sim.phys.oxygenation>before,
  'critical-rescue pathway independently changes physiologic oxygenation');
assert.equal(report.effectOwner,'native','two native writers forbid B1 activation');

// The scanner treats negation/suspension wording as non-executable. In
// particular, "suspender" must NOT become a fabricated stop receipt.
const preStopRows=delivered(treated,'oxygen').length;
order(treated,'suspender oxigeno');
advance(treated,1);
assert.equal(delivered(treated,'oxygen').length,preStopRows,
  'negative wording does not prove execution of an oxygen stop');
assert.equal(treated.ctx.sim.monitorTherapies.has('oxygen'),true,
  'oxygen remains active after the unexecuted stop instruction');
report=observer.report();
assert.equal(report.status,'observing',report.reason);
assert.equal(report.receipts.filter(x=>x.treatmentId==='oxygen'&&x.action==='stop').length,0,
  'observer must never invent stop evidence');

// A second real order MAY become a native new administration / dose change.
// Capture its observed outcome instead of pretending the B1 schema executes it.
const prior=delivered(treated,'oxygen').length;
order(treated,'oxigeno 2 L/min');
advance(treated,1);
const after=delivered(treated,'oxygen').length;
report=observer.report();
assert.equal(report.status,'observing',report.reason);
assert(after===prior||after===prior+1,'unexpected native oxygen receipt cardinality');
const changes=report.receipts.filter(x=>x.treatmentId==='oxygen'&&x.action==='setRate');
if(after>prior){
 assert.equal(changes.length,1,'confirmed re-administration must map to one observed rate change');
 assert.equal(changes[0].dose.amount,2);
}else{
 assert.equal(changes.length,0,'no native execution means no shadow titration');
}
assert.equal(report.effectOwner,'native');
observer.stop();

// Ringer owner is permitted for a different mechanism, but cannot silently
// migrate oxygen or take responsibility for critical rescue / initial grace.
const combined=createLiveNativeJourney487('PERI-SEC-001');
const ringerAPI=await enableNativeRinger487(combined);
order(combined,'Ringer 500 ml');
order(combined,'oxigeno 4 L/min');
advance(combined,2);
assert.equal(delivered(combined,'fluid').length,1);
assert.equal(delivered(combined,'oxygen').length,1);
assert.equal(ringerAPI.reportRinger().applications,1);
assert.equal(ringerAPI.ownsRinger(combined.ctx.sim,combined.ctx.C),true);
assert(combined.ctx.therapyEffectTotals().spo2>0,'oxygen stays with native vital-sign pathway');
assert.equal(combined.ctx.sim.phys.sourceControlled,false);
assert.equal(ringerAPI.rollbackRinger().status,'blocked',
  'active admission may not swap owner on rollback');
assert.equal(ringerAPI.ownsRinger(combined.ctx.sim,combined.ctx.C),true);
assert.equal(combined.ctx.window.csGraceSurvival487.get().releaseAt>=180,true,
  'native grace contract must remain present');

// A more impaired model state is measured rather than declared clinically
// refractory: this VM does not validate quantitative hypoxemia refractoriness.
const impaired=createLiveNativeJourney487('PERI-SEC-001');
impaired.ctx.sim.phys.oxygenation=.2;
order(impaired,'oxigeno 4 L/min');
advance(impaired,10);
assert.equal(delivered(impaired,'oxygen').length,1);
assert(Number.isFinite(impaired.ctx.sim.liveVitals.spo2));
console.log('OXYGEN OWNERSHIP BOUNDARY',JSON.stringify({
 scope:'generated nurse and physiology Node VM only',
 initialAndPendingWithoutEvidence:true,
 confirmedStarts:1,directSpO2Writer:direct,independentRescueOxygenationWriter:true,
 stopInstructionExecuted:false,stopReceiptEmitted:false,
 repeatedFlowOrderProducesNativeReceipt:after>prior,observedSetRateReceipts:changes.length,
 combinedRingerApplications:ringerAPI.reportRinger().applications,
 activeRollbackBlocked:true,impairedModelSpO2:impaired.ctx.sim.liveVitals.spo2,
 experimentalOxygenOwnerEnabled:false,clinicalOwner:'native',
 fatalAndGracePoliciesChanged:false,physicalBrowser:false,physicalAndroid:false
}));
