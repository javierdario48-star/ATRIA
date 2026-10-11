/**
 * Oxygen Checkpoint B, READ-ONLY clinical ownership preflight.
 * Real generated 487 nursing + native physiology under Node VM.
 * This deliberately installs NO new oxygen patient writer.
 */
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487,nativeObserverPort487}
  from './native-journey-487.mjs';
import {installPhysiologyQAObserver487} from '../../src/integration/physiology-qa-observer-487.js';
import {csCriticalRescuePhysiology487} from '../../src/clinical/critical-rescue-487.js';

const untreated=createLiveNativeJourney487('PERI-SEC-001');
const given=createLiveNativeJourney487('PERI-SEC-001');
const observer=installPhysiologyQAObserver487(nativeObserverPort487(given));
const dose='enfermera oxigeno 4 L/min';
given.ctx.nurseNatural(dose);
assert.equal(given.ctx.sim.administrationLog.length,0,'requested oxygen is not administration evidence');
assert.equal(observer.report().receipts.length,0,'shadow must not fabricate an early oxygen dose');
advanceLiveNativeJourney487(untreated,10);
advanceLiveNativeJourney487(given,10);
const report=observer.report();
assert.equal(report.status,'observing',report.reason);
assert.equal(report.receipts.filter(x=>x.treatmentId==='oxygen').length,1,
 'one actual nursing oxygen delivery must produce one shadow receipt');
assert.equal(given.ctx.sim.administrationLog.filter(x=>x.id==='oxygen').length,1);
assert.equal(report.effectOwner,'native','shadow cannot claim live ownership');
assert.equal(report.shadowOnly,true);
assert.equal(given.ctx.sim.phys.sourceControlled,false,'oxygen is not septic focus treatment');
assert(given.ctx.sim.liveVitals.spo2>untreated.ctx.sim.liveVitals.spo2,
 'oxygen must show some benefit in this compatible hypoxic native case');

const totals=given.ctx.therapyEffectTotals();
assert(totals.spo2>0,'existing native oxygen pathway adds a direct vital-sign contribution');
const p=given.ctx.sim.phys;
const before=Number(p.oxygenation);
const additional=csCriticalRescuePhysiology487(given.ctx.sim,given.ctx.C,.12);
assert.equal(additional,true);
assert(Number(p.oxygenation)>before,
 'rescue uses the same oxygen evidence to modify the physiologic oxygenation axis');
assert.equal(report.last.state.oxygenFlowLpm,4,'B1 shadow has an independent active oxygen flow mechanism');

observer.stop();
console.log('OXYGEN OWNER PREFLIGHT',JSON.stringify({
 scope:'real generated nurse/clinical Node VM; no browser/device or live B1 oxygen writer',
 caseId:'PERI-SEC-001',confirmedNativeReceipts:1,shadowReceipts:report.receipts.length,
 nativeSpO2WithSupport:given.ctx.sim.liveVitals.spo2,
 nativeSpO2WithoutSupport:untreated.ctx.sim.liveVitals.spo2,
 nativeDirectSpO2Contribution:totals.spo2,
 independentRescueOxygenationWriter:additional,
 b1ShadowFlow:report.last.state.oxygenFlowLpm,
 clinicalOwner:'native',safeToSwitchOwner:false,
 blockingDependencies:[
  'native direct vital-sign effect and critical rescue oxygenation share treatment evidence',
  'validated native continuous oxygen stop/titration execution receipts are not yet proven',
  'Ringer experimental ownership endpoint compatibility must be assessed before combined activation'
 ],
 physicalBrowser:false,physicalAndroid:false
}));
