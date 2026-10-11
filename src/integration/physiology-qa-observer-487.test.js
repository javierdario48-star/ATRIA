import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createNativeReferenceRuntime487, advanceNativeReference487, orderNativeReference487,
  snapshotNativeReference487} from '../../qa/physiology-pilot/native-reference-487.mjs';
import {createLiveNativeJourney487, advanceLiveNativeJourney487, nativeObserverPort487, serializeNativePatient487}
  from '../../qa/physiology-live/native-journey-487.mjs';
import {createPhysiologyState487, stepPhysiology487} from '../clinical/physiology-pilot-487.js';
import {adaptConfirmedPharmacologyEvents487} from './pharmacology-receipts-487.js';
import {PILOT_DEFINITIONS_487} from '../clinical/physiology-pilot-definitions-487.js';

assert(fs.existsSync(new URL('./physiology-qa-observer-487.js', import.meta.url)),
  'Checkpoint 1 requires an opt-in observer of the actual administration boundary');
const {installPhysiologyQAObserver487} = await import('./physiology-qa-observer-487.js');
let checks = 0;
const check = (name, fn) => { fn(); checks++; console.log('LIVE SHADOW PASS', name); };
check('native-state comparisons detect mutations inside cross-VM Maps and Sets', () => {
  const r = createLiveNativeJourney487(), before = serializeNativePatient487(r.ctx.sim);
  r.ctx.sim.monitorTherapies.set('oxygen', {dose: {amount: 4, unit: 'L/min'}});
  const changed = serializeNativePatient487(r.ctx.sim);
  assert.notEqual(changed, before);
  r.ctx.sim.monitorTherapies.get('oxygen').dose.amount = 100;
  assert.notEqual(serializeNativePatient487(r.ctx.sim), changed);
  assert.notEqual(serializeNativePatient487({items: new Set(['one'])}),
    serializeNativePatient487({items: new Set(['two'])}));
  assert.notEqual(serializeNativePatient487({value: undefined}), serializeNativePatient487({}));
});
function portFor(runtime) {
  const {ctx} = runtime;
  return {
    read: () => ({patient: ctx.sim, caseDef: ctx.C, mode: ctx.selectedPlayMode,
      hidden: ctx.document.visibilityState === 'hidden'}),
    getAdministration: () => ctx.recordAdministration,
    setAdministration: fn => { ctx.recordAdministration = fn; },
    getUpdate: () => ctx.updateSimulation,
    setUpdate: fn => { ctx.updateSimulation = fn; },
  };
}
check('accepted manual orders remain pending until the native ledger confirms delivery', () => {
  const runtime = createNativeReferenceRuntime487({caseId: 'HDA-001'});
  const observer = installPhysiologyQAObserver487(portFor(runtime));
  orderNativeReference487(runtime, {id: 'fluid', text: 'Ringer 500 ml'});
  let report = observer.report();
  assert.equal(report.status, 'observing');
  assert.equal(report.receipts.length, 0);
  assert.equal(report.last.state.administeredFluidMl, 0);
  advanceNativeReference487(runtime, .12);
  report = observer.report();
  assert.equal(report.receipts.length, 1);
  assert.equal(report.receipts[0].treatmentId, 'fluid');
  assert.equal(report.receipts[0].verification.source, 'native-administration-log');
  assert.equal(report.last.state.administeredFluidMl, 500);
  const again = observer.report();
  assert.equal(again.receipts.length, 1);
  assert.equal(again.last.state.administeredFluidMl, 500, 'sampling must not administer a second dose');
  observer.stop();
});
check('the native patient has identical trajectories, history and protected clocks with shadow on', () => {
  const plain = createNativeReferenceRuntime487({caseId: 'PERI-SEC-001'});
  const observed = createNativeReferenceRuntime487({caseId: 'PERI-SEC-001'});
  const observer = installPhysiologyQAObserver487(portFor(observed));
  for (const r of [plain, observed]) {
    orderNativeReference487(r, {id: 'oxygen', text: 'oxigeno 4 L/min'});
    orderNativeReference487(r, {id: 'fluid', text: 'Ringer 500 ml'});
  }
  for (const at of [.12, .6, 1.8, 6, 15]) {
    advanceNativeReference487(plain, at); advanceNativeReference487(observed, at);
    assert.deepEqual(snapshotNativeReference487(observed), snapshotNativeReference487(plain));
    assert.equal(serializeNativePatient487(observed.ctx.sim), serializeNativePatient487(plain.ctx.sim));
  }
  assert.equal(observer.report().receipts.length, 2);
  assert.equal(observer.report().effectOwner, 'native');
  observer.stop();
});
const treatments = [
  ['oxygen', 'oxigeno 4 L/min', 4, 'L/min'], ['fluid', 'Ringer 500 ml', 500, 'ml'],
  ['vasopressor', 'noradrenalina 0,05 µg/kg/min', .05, 'mcg/kg/min'],
  ['morphine', 'morfina 4 mg', 4, 'mg'], ['furosemide', 'furosemida 40 mg', 40, 'mg'],
];
for (const caseId of ['PERI-SEC-001', 'HDA-001', 'CIRR-001']) {
  check(caseId + ': five actual nursing administrations match independent B1 receipt replay', () => {
    for (const [id, text, amount, unit] of treatments) {
      const r = createLiveNativeJourney487(caseId), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
      const initial = o.report().last.state;
      r.ctx.nurseNatural('Enfermera ' + text);
      // The existing oxygen dispatcher can return false during preparation;
      // neither that return value nor its chat is administration evidence.
      assert(r.ctx.sim.pendingTherapies.has(id), 'actual native preparation must exist');
      assert.equal(r.ctx.sim.administrationLog.length, 0, 'preparation is not delivery');
      assert.equal(o.report().receipts.length, 0);
      advanceLiveNativeJourney487(r, 1);
      const delivered = o.report();
      assert.equal(delivered.status, 'observing', delivered.reason);
      assert.equal(delivered.receipts.length, 1);
      assert.deepEqual(delivered.receipts[0].dose, {amount, unit});
      assert.equal(delivered.receipts[0].treatmentId, id);
      advanceLiveNativeJourney487(r, 59);
      const report = o.report();
      assert.equal(report.status, 'observing', report.reason);
      const confirmations = report.receipts.map(row => {
        const result = {...row, receiptId: row.verification.receiptId, source: row.verification.source};
        delete result.verification; delete result.nativeEvidence; return result;
      });
      const accepted = adaptConfirmedPharmacologyEvents487(report.receipts, {patientId: report.patientId,
        definitions: PILOT_DEFINITIONS_487, confirmations, clock: report.clock});
      const replay = stepPhysiology487(createPhysiologyState487(initial.profile, report.patientId),
        accepted.events, report.clock.clinicalMinute);
      assert.deepEqual(report.last.state, structuredClone(replay), 'adapter must preserve approved kernel trajectory and provenance');
      assert.equal(r.ctx.sim.administrationLog.length, 1, 'shadow does not append native doses');
      assert.equal(report.last.state.sourceControlled, initial.sourceControlled);
      o.stop();
    }
  });
}
check('actual bedside IV completion resumes pending orders without phantom shadow doses', () => {
  const r = createLiveNativeJourney487('PERI-SEC-001', {confirmedIV: 0});
  const o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  r.ctx.sendMessage('Enfermera monitor vías Ringer 500 ml morfina 4 mg noradrenalina 0,05 µg/kg/min oxígeno 4 L/min');
  assert.equal(r.ctx.sim.venousAccessCount, 0);
  assert.equal(r.ctx.sim.monitorConnected, false);
  assert.equal(r.ctx.sim.administrationLog.length, 0);
  advanceLiveNativeJourney487(r, 1);
  let report = o.report();
  assert.equal(report.status, 'observing', report.reason);
  assert.deepEqual(report.receipts.map(x => x.treatmentId), ['oxygen']);
  assert.equal(report.last.state.administeredFluidMl, 0);
  advanceLiveNativeJourney487(r, 16);
  report = o.report();
  assert.equal(report.status, 'observing', report.reason);
  assert.equal(r.ctx.sim.venousAccessCount, 2, 'actual native finishNurseTask establishes access');
  assert.equal(r.ctx.sim.monitorConnected, true);
  assert.deepEqual(report.receipts.map(x => x.treatmentId).sort(), ['fluid', 'morphine', 'oxygen', 'vasopressor']);
  assert.equal(report.last.state.administeredFluidMl, 500);
  assert.equal(r.ctx.sim.administrationLog.length, 4);
  o.stop();
});
check('typing maps delivered events through the explicit piecewise clock without changing native pace', () => {
  const r = createLiveNativeJourney487('HDA-001'), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  advanceLiveNativeJourney487(r, 2, {typing: true});
  r.ctx.nurseNatural('Enfermera Ringer 500 ml');
  advanceLiveNativeJourney487(r, 2, {typing: true});
  advanceLiveNativeJourney487(r, 2);
  const report = o.report();
  assert.equal(report.status, 'observing', report.reason);
  assert.equal(report.clock.clinicalMinute, 6);
  assert(Math.abs(r.ctx.sim.gameMinute - .36) < 1e-8);
  assert.equal(report.clock.segments.length, 2);
  const row = report.receipts[0];
  const confirmation = {...row, source: row.verification.source, receiptId: row.verification.receiptId};
  delete confirmation.verification;
  const adapted = adaptConfirmedPharmacologyEvents487([row], {patientId: report.patientId,
    definitions: PILOT_DEFINITIONS_487, confirmations: [confirmation], clock: report.clock});
  assert(Math.abs(adapted.events[0].atClinicalMinute - 2.8) < 1e-8);
  o.stop();
});
check('native repeated boluses and rate changes create unique receipts with no duplicate mechanism', () => {
  const r = createLiveNativeJourney487('HDA-001'), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  r.ctx.nurseNatural('Enfermera Ringer 500 ml noradrenalina 0,05 µg/kg/min');
  advanceLiveNativeJourney487(r, 2);
  r.ctx.nurseNatural('Enfermera Ringer 250 ml noradrenalina 0,1 µg/kg/min');
  advanceLiveNativeJourney487(r, 2);
  const report = o.report();
  assert.equal(report.status, 'observing', report.reason);
  assert.equal(report.receipts.length, 4);
  assert.equal(report.last.state.administeredFluidMl, 750);
  assert.equal(report.receipts.filter(x => x.eventType === 'dose-change').length, 1);
  assert.equal(Object.keys(report.last.state.exposures).length, 1);
  assert.equal(report.last.state.exposures.vasopressor.infusionRate, 2, 'one absolute normalized infusion input');
  o.stop();
});
check('native eighty-row truncation cannot erase events captured from session start', () => {
  const r = createLiveNativeJourney487('HDA-001'), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  for (let i = 0; i < 81; i++) {
    r.ctx.nurseNatural('Enfermera Ringer 1 ml'); advanceLiveNativeJourney487(r, 1);
  }
  const report = o.report();
  assert.equal(report.status, 'observing', report.reason);
  assert.equal(r.ctx.sim.administrationLog.length, 80);
  assert.equal(report.receipts.length, 81);
  assert.equal(report.last.state.administeredFluidMl, 81);
  o.stop();
});
check('rollback restores the exact native endpoints and leaves patient data untouched', () => {
  const r = createLiveNativeJourney487(), port = nativeObserverPort487(r);
  const admin = port.getAdministration(), update = port.getUpdate(), before = JSON.stringify(r.ctx.sim);
  const o = installPhysiologyQAObserver487(port);
  o.stop(); o.stop();
  assert.equal(port.getAdministration(), admin); assert.equal(port.getUpdate(), update);
  assert.equal(JSON.stringify(r.ctx.sim), before);
  assert.equal(o.report().status, 'stopped');
});
check('patients with existing time/history or shared ownership cannot start observation', () => {
  for (const mutation of [r => {r.ctx.sim.gameMinute = 1;},
    r => {r.ctx.sim.administrationLog.push({id: 'fluid'});},
    r => {r.ctx.sim.monitorTherapies.set('fluid', {});},
    r => {r.ctx.selectedPlayMode = 'coop';}, r => {r.ctx.selectedPlayMode = 'competitive';}]) {
    const r = createLiveNativeJourney487(), port = nativeObserverPort487(r), update = port.getUpdate();
    mutation(r); assert.throws(() => installPhysiologyQAObserver487(port), /untreated|local|solo/);
    assert.equal(port.getUpdate(), update);
  }
});
check('patient switching quarantines only shadow and preserves the new patient native tick', () => {
  const r = createLiveNativeJourney487(), port = nativeObserverPort487(r), update = port.getUpdate();
  const o = installPhysiologyQAObserver487(port), old = r.ctx.sim;
  r.ctx.sim = r.ctx.freshSim(); r.ctx.sim.patientInstance = {uid: 'other'};
  const result = r.ctx.updateSimulation(1 / 60);
  assert.equal(result, undefined); assert.equal(old.gameMinute, 0);
  assert(r.ctx.sim.gameMinute > 0);
  const report = o.report(); assert.equal(report.status, 'error'); assert.match(report.reason, /patient/);
  assert.equal(port.getUpdate(), update);
});
check('unsupported confirmed therapy is reported without an invented mechanism', () => {
  const r = createLiveNativeJourney487(), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  r.ctx.nurseNatural('Enfermera ceftriaxona'); advanceLiveNativeJourney487(r, 4);
  assert.equal(r.ctx.sim.administrationLog.length, 1, 'the unsupported intervention must actually be delivered');
  const report = o.report();
  assert.equal(report.status, 'observing', report.reason);
  assert.deepEqual(report.issues, [{code: 'unsupported-by-pilot', treatmentId: 'ceftriaxone'}]);
  assert.equal(report.receipts.length, 0); assert.equal(Object.keys(report.last.state.exposures).length, 0);
  o.stop();
});
check('unrecorded suspension never leaves a silently permanent shadow infusion', () => {
  const r = createLiveNativeJourney487(), port = nativeObserverPort487(r), update = port.getUpdate();
  const o = installPhysiologyQAObserver487(port);
  r.ctx.nurseNatural('Enfermera oxígeno 4 L/min'); advanceLiveNativeJourney487(r, 1);
  r.ctx.sim.monitorTherapies.delete('oxygen');
  advanceLiveNativeJourney487(r, .5);
  const report = o.report();
  assert.equal(report.status, 'error', 'missing actual stop evidence must quarantine the observer');
  assert.match(report.reason, /suspension|support|receipt|continuous/);
  assert.equal(port.getUpdate(), update);
  assert.equal(report.receipts.length, 1, 'no stop receipt may be fabricated');
});
check('a dose changed outside the native receipt boundary is not silently adopted', () => {
  const r = createLiveNativeJourney487(), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  r.ctx.nurseNatural('Enfermera noradrenalina 0,05 µg/kg/min'); advanceLiveNativeJourney487(r, 1);
  r.ctx.sim.monitorTherapies.get('vasopressor').dose.amount = .3;
  const report = o.report();
  assert.equal(report.status, 'error'); assert.match(report.reason, /rate|dose|receipt/);
  assert.equal(report.receipts.length, 1);
});
check('native ledger writes bypassing the observed executor fail closed', () => {
  const r = createLiveNativeJourney487(), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  r.ctx.sim.administrationLog.push({id: 'fluid', m: 0, count: 1, doseDisplay: '500 ml'});
  const report = o.report();
  assert.equal(report.status, 'error'); assert.match(report.reason, /ledger|boundary|receipt/);
  assert.equal(report.last.state.administeredFluidMl, 0);
});
check('an observed administration cannot hide a preceding ledger write outside its boundary', () => {
  const r = createLiveNativeJourney487(), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  r.ctx.sim.administrationLog.push({id: 'ceftriaxone', m: 0, count: 1, doseDisplay: '2 g'});
  // Execute immediately, before a sample/tick could detect the foreign tail.
  const therapy = {id: 'fluid', label: 'Ringer', dose: {amount: 500, unit: 'ml', display: '500 ml'},
    doseDisplay: '500 ml', raw: 'Ringer 500 ml', defaultApplied: false};
  r.ctx.recordAdministration(therapy);
  r.ctx.sim.monitorTherapies.set('fluid', therapy);
  const report = o.report();
  assert.equal(r.ctx.sim.administrationLog.length, 2, 'native delivery must still complete');
  assert.equal(report.status, 'error');
  assert.match(report.reason, /ledger|boundary/);
  assert.equal(report.comparisonComplete, false);
  assert.equal(report.last.state.administeredFluidMl, 0);
});
check('explicit non-IV and unknown routes never become an IV shadow receipt', () => {
  for (const route of ['IM', 'SC', 'VO', 'PO', 'intranasal', 'vía desconocida', 'vía IM', 'I.M.', 'sublingual']) {
    const r = createLiveNativeJourney487(), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
    // The reviewed morphine order now rejects unsupported routes at the shared
    // nurse/monitor execution gate, BEFORE any administration can reach the
    // observer. Earlier native behavior accepted these unsafe orders, forcing
    // the observer to flag an error only after the fact.
    assert.equal(r.ctx.addMonitorTherapy('morfina 4 mg ' + route),false,route);
    advanceLiveNativeJourney487(r, 1);
    const report = o.report();
    assert.equal(r.ctx.sim.administrationLog.length,0,'invalid route cannot be delivered: '+route);
    assert.equal(report.status,'observing','invalid order never reaches the observer: '+route);
    assert.equal(report.receipts.length,0,route);
    assert.equal(report.comparisonComplete,true,'observer remains healthy when unsafe orders are prevented');
  }
  for (const route of ['IV', 'EV', 'vía intravenosa', 'endovenosa', 'I.V.']) {
    const r = createLiveNativeJourney487(), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
    r.ctx.addMonitorTherapy('morfina 4 mg ' + route); advanceLiveNativeJourney487(r, 1);
    const report = o.report();
    assert.equal(report.status, 'observing', route + ': ' + report.reason);
    assert.equal(report.receipts.length, 1); o.stop();
  }
});
check('observer failure and diagnostic mutation never propagate into native execution or patient state', () => {
  const r = createLiveNativeJourney487(), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
  // QA injects a malformed low-level legacy delivery directly into the
  // authoritative native record boundary. Public nurse/monitor entry points
  // must reject it earlier, but the observer still detects dishonest evidence.
  r.ctx.recordAdministration({id:'morphine',label:'Morfina',
    raw:'morfina 4 mg vía oral',dose:{amount:4,unit:'mg',display:'4 mg'}});
  advanceLiveNativeJourney487(r, 1);
  const report = o.report();
  assert.equal(report.status,'error');assert.match(report.reason,/route/);
  assert.equal(r.ctx.sim.administrationLog.length,1,
    'malformed injected evidence is preserved for audit; observer rejects it');
  const before = JSON.stringify(r.ctx.sim);
  report.last.state.circulatingVolumeMl = 1; report.samples.length = 0;
  assert.equal(JSON.stringify(r.ctx.sim), before);
  assert.notEqual(o.report().last.state.circulatingVolumeMl, 1);
});
check('an unobserved pause, clock jump or external endpoint replacement requires replay', () => {
  for (const mutate of [r => {r.ctx.document.visibilityState = 'hidden';},
    r => {r.ctx.sim.gameMinute = 1;}, r => {const old = r.ctx.recordAdministration;
      r.ctx.recordAdministration = function(){return old.apply(this, arguments);};}]) {
    const r = createLiveNativeJourney487(), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
    mutate(r); const report = o.report();
    assert.equal(report.status, 'error');
  }
});
check('fixed-step replay is independent of the native render/update partition', () => {
  const run = dt => {
    const r = createLiveNativeJourney487('HDA-001'), o = installPhysiologyQAObserver487(nativeObserverPort487(r));
    r.ctx.nurseNatural('Enfermera Ringer 500 ml');
    advanceLiveNativeJourney487(r, 5, {dt}); const report = o.report(); o.stop();
    assert.equal(report.status, 'observing', report.reason); return report;
  };
  const a = run(1 / 60), b = run(1 / 30);
  for (const key of ['circulatingVolumeMl','perfusion','oxygenSupport','administeredFluidMl','renalFunction'])
    assert(Math.abs(a.last.state[key] - b.last.state[key]) < 1e-9, key + ': deterministic physiological partition');
  assert.equal(a.clock.clinicalMinute, b.clock.clinicalMinute);
});
console.log('LIVE PHYSIOLOGY QA OBSERVER PASS', JSON.stringify({checks, physicalAndroid: false}));
