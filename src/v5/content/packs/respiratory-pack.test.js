import test from 'node:test';
import assert from 'node:assert/strict';
import {respiratoryPack} from './respiratory-pack.js';
import {createStudyService} from '../../clinical/studies.js';
import {clinicalInterventionEligibility} from '../../clinical/native-medication-eligibility.js';
import {parseNativeMedicineDose} from '../../clinical/native-medications.js';

test('declared post-lysis UFH treatment is a titratable infusion with no default bolus', () => {
 const c = respiratoryPack.cases.find(x => x.id === 'RESP-06');
 const dose = parseNativeMedicineDose('heparin_therapeutic', '18 U/kg/h IV', undefined, undefined, c);
 assert.deepEqual([dose.amount, dose.unit], [18, 'U/kg/h']);
 assert.throws(() => parseNativeMedicineDose('heparin_therapeutic', '80 U/kg IV', undefined, undefined, c));
 assert.match(c.clinicalPolicy.regimens.heparin_therapeutic.dose.display, /sin bolo/);
});

test('high-risk PE uses a fresh completed post-lysis coagulation sample before its declared heparin strategy', () => {
 const c = respiratoryPack.cases.find(x => x.id === 'RESP-06');
 const id = 'g_resp06_coag_followup', prerequisite = 'alteplase_pe';
 const rule = c.clinicalPolicy.eligibility?.heparin_therapeutic;
 assert.deepEqual(rule?.requiresCompletedTreatments, [prerequisite]);
 assert.deepEqual(rule.requiresStudiesAfterTreatments, [{treatmentId: prerequisite, studyId: id}]);
 const definition = c.studies.find(x => x.id === id);
 assert.deepEqual(definition.requiresCompletedTreatments, [prerequisite]);
 assert.equal(definition.repeatable, true);
 assert.equal(definition.dynamic, true);
 const p = {uid: 'resp06:post-lysis', caseId: c.id, orders: [], treatments: [], administrationLog: [],
  liveVitals: {sys: 100, dia: 65, hr: 100, rr: 24, spo2: 93}, intentHistory: [], procedures: {}};
 const service = createStudyService([c]);
 const request = (eventId, realSecond, nativeMinute) => service.request(p, {
  id, eventId, actorId: 'doctor', atMinute: realSecond, atNativeMinute: nativeMinute
 });
 assert.equal(request('before-lysis', 0, 0).status, 'rejected', 'no invented post-treatment specimen');
 assert.equal(p.orders.length, 0);
 const receipt = {id: prerequisite, patientUid: p.uid, sourceEventId: 'lysis:completed', route: 'iv',
  dose: {amount: 100, unit: 'mg'}, administeredAtNativeMinute: 1, completedAtNativeMinute: 121,
  status: 'completed', completionStatus: 'completed', deliveryFraction: 1};
 p.treatments.push(receipt);p.administrationLog.push(structuredClone(receipt));
 assert.equal(request('after-lysis', 1010, 121.2).status, 'pending');
 assert.equal(clinicalInterventionEligibility(p, c, 'heparin_therapeutic', {
  clinicalMinute: 1010, nativeMinute: 121.2
 }).reason, 'clinical-post-treatment-study-required');
 service.advance(p, 1020);
 assert.equal(p.orders[0].sampledAtNativeMinute, 121.2);
 assert.match(p.orders[0].result, /TTPa/);
 assert.equal(clinicalInterventionEligibility(p, c, 'heparin_therapeutic', {
  clinicalMinute: 1020, nativeMinute: 122.4
 }), null);
});
