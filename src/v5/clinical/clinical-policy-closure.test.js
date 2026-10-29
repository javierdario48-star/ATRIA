import test from 'node:test';
import assert from 'node:assert/strict';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {csClosureQuality487} from '../../clinical/case-completion-487.js';
import {evaluateClinicalPolicyDisposition as evaluate} from './clinical-policy-closure.js';
const clone = value => structuredClone(value);
const caseById = id => clone([...respiratoryPack.cases, ...cardiologyPack.cases, ...neurologyPack.cases].find(c => c.id === id));

function evidencePatient(c) {
 const uid = 'policy-closure-' + c.id;
 return {uid, caseId: c.id, diagnosis: c.dx[0], intentHistory: c.requiredHistory.map(id => ({id})),
  examDone: true, examFindings: {general: {general: {patientUid: uid, eventId: 'general', rows: [{text: 'Alerta.'}]}},
   thorax: {auscultation: {patientUid: uid, eventId: 'auscultation', rows: [{text: 'Exploración pulmonar realizada.'}]}}},
  lastVitalsKnown: {patientUid: uid, eventId: 'vitals', nativeMinute: 60},
  liveVitals: {temp: 37, hr: 82, rr: 18, sys: 120, dia: 75, spo2: 96},
  policyState: {nativeMinute: 60}, orders: c.studies.map(s => ({...s, patientUid: uid, sourceEventId: 'study-' + s.id,
   requestedAtMinute: 0, readyAtMinute: s.delay, status: 'done'})),
  treatments: [], administrationLog: [], consults: [], pendingTreatments: [], pendingConsults: [],
  venousAccessCount: 0, reassessments: 1, lastReassessment: {eventId: 'reassessment', nativeMinute: 60, interventionEvents: [], administrationEvents: []}};
}
function administered(p, id, route = 'oral') {
 const t = {id, patientUid: p.uid, sourceEventId: 'admin-' + id, route, dose: {amount: 1, unit: 'mg'},
  administeredAtNativeMinute: 1, administeredAtRealSecond: 1};
 if(id==='oxygen'){
  t.action='start';t.dose={amount:4,unit:'L/min',device:'nasal-cannula'};
  p.procedures={oxygen:{patientUid:p.uid,sourceEventId:t.sourceEventId,active:true,flowLpm:4}};
 }
 p.treatments.push(t); p.administrationLog.push(clone(t));
 p.lastReassessment.interventionEvents.push(t.sourceEventId);
 p.lastReassessment.administrationEvents.push(t.sourceEventId);
 return t;
}
function performed(p, id) {
 const t = {id, patientUid: p.uid, sourceEventId: 'procedure-' + id, route: 'procedure', kind: 'procedure.performed',
  completionStatus: 'completed', administeredAtNativeMinute: 2, administeredAtRealSecond: 2};
 p.treatments.push(t); p.lastReassessment.interventionEvents.push(t.sourceEventId);
 return t;
}
function accepted(p, id) {
 p.consults.push({id, patientUid: p.uid, status: 'done', accepted: true, sourceEventId: 'consult-' + id});
}

test('policy closure reads real patient evidence and delegates its score to the original quality calculator', () => {
 const c = caseById('RESP-01'), p = evidencePatient(c);
 administered(p, 'amoxicillin');
 const result = evaluate(p, c, 'alta');
 assert.equal(result.ready, true, result.missing.join(' '));
 assert.equal(result.action, 'alta');
 const examinations = c.clinicalPolicy.closure.requiredExams.map(id => 'exam:' + id);
 const quality = csClosureQuality487({diagnosis: p.diagnosis, acceptedDiagnoses: c.dx,
  historyAnswered: c.requiredHistory, historyRelevant: c.requiredHistory, vitalsKnown: true, examDone: true,
  reassessments: 1, disposition: 'alta', keyStudies: [...c.keyStudies, ...examinations],
  keyInterventions: c.keyInterventions, extraStudies: c.studies.filter(s => !c.keyStudies.includes(s.id)).map(s => s.id),
  adverseCount: 0}, c.clinicalPolicy.closure, new Set(['amoxicillin']), new Set([...c.studies.map(s => s.id), ...examinations]));
 assert.deepEqual(result.quality, quality);
 assert.equal(result.procedurePerformed, false);
});
test('an authored alternative regimen earns the same treatment credit as its completed reference',()=>{
 const c=caseById('RESP-01');c.clinicalPolicy.closure.treatment.push(['doxycycline']);
 c.clinicalPolicy.closure.dischargeTreatments=[];
 for(const id of ['amoxicillin','doxycycline']){
  const p=evidencePatient(c);administered(p,id);
  const result=evaluate(p,c,'alta');
  assert.equal(result.ready,true,result.missing.join(' '));
  assert.equal(result.quality.treatment,25,'the common score must recognize the declared completed alternative');
 }
});

test('destination-specific handoff care earns treatment credit without inventing the receiver procedure', () => {
 for (const [caseId, destination, interventions, receiver] of [
  ['RESP-07', 'procedimiento', ['needle_decompression'], 'cirugia'],
  ['RESP-07', 'uti', ['needle_decompression'], 'uti'],
  ['RESP-08', 'procedimiento', ['amoxiclav'], 'cirugia'],
  ['RESP-08', 'quirofano', ['ceftriaxone', 'metronidazole'], 'cirugia']
 ]) {
  const c = caseById(caseId), p = evidencePatient(c);
  p.examFindings.thorax.percussion = {patientUid: p.uid, eventId: 'percussion', rows: [{text: 'Exploración pleural realizada.'}]};
  for (const id of interventions) id === 'needle_decompression' ? performed(p, id) : administered(p, id, 'iv');
  accepted(p, receiver);
  const result = evaluate(p, c, destination);
  assert.equal(result.ready, true, caseId + ': ' + result.missing.join(' '));
  assert.equal(result.quality.treatment, 25, caseId + ': the accepted destination owns definitive drainage');
  assert(!p.treatments.some(row => row.id === 'chest_drainage'));
  assert(!p.administrationLog.some(row => row.id === 'chest_drainage'));
 }
});

test('accepted receiver never replaces immediate tension decompression or permits undrained ward admission', () => {
 for (const [caseId, interventions, receiver] of [
  ['RESP-07', [], 'cirugia'], ['RESP-08', ['amoxiclav'], 'clinica']
 ]) {
  const c = caseById(caseId), p = evidencePatient(c);
  p.examFindings.thorax.percussion = {patientUid: p.uid, eventId: 'percussion', rows: [{text: 'Exploración pleural realizada.'}]};
  for (const id of interventions) administered(p, id, 'iv');
  accepted(p, receiver);
  for (const destination of caseId === 'RESP-07' ? ['procedimiento', 'sala', 'uti'] : ['sala']) {
   const result = evaluate(p, c, destination);
   assert.equal(result.ready, false, caseId + ': ' + destination);
   assert.match(result.missing.join(' '), /intervenciones imprescindibles/);
  }
 }
});

test('pending, cross-patient, future and unmatched administration rows never satisfy treatment evidence', () => {
 const c = caseById('RESP-01');
 for (const change of [
  p => { p.treatments = []; p.pendingTreatments.push({id: 'amoxicillin'}); },
  p => { p.administrationLog = []; },
  p => { p.administrationLog[0].patientUid = 'another-patient'; },
  p => { p.treatments[0].administeredAtNativeMinute = 100; p.administrationLog[0].administeredAtNativeMinute = 100; },
  p => { p.administrationLog[0].status = 'infusing'; },
  p => { p.administrationLog[0].dose.amount = 10; }
 ]) {
  const p = evidencePatient(c); administered(p, 'amoxicillin'); change(p);
  const result = evaluate(p, c, 'alta');
  assert.equal(result.ready, false);
  assert.match(result.missing.join(' '), /intervenciones|administraciones/i);
 }
});

test('diagnosis text and bare exam/study booleans cannot impersonate patient-bound evidence', () => {
 const c = caseById('RESP-01');
 for (const change of [
  p => { p.diagnosis = 'asma'; },
  p => { p.examFindings = {}; },
  p => { p.examFindings.thorax.auscultation.patientUid = 'another-patient'; },
  p => { p.orders = [{id: c.keyStudies[0], status: 'done'}]; },
  p => { p.orders.forEach(row => { row.patientUid = 'another-patient'; }); },
  p => { p.orders.forEach(row => { row.status = 'pending'; }); }
 ]) {
  const p = evidencePatient(c); administered(p, 'amoxicillin'); change(p);
  assert.equal(evaluate(p, c, 'alta').ready, false);
 }
});

test('closure supports alternative completed treatment groups and requires the accepting receiver', () => {
 const c = caseById('RESP-03');
 for (const ventilation of ['niv', 'intubation']) {
  const p = evidencePatient(c);
  for (const id of ['oxygen', 'salbutamol', 'ipratropium', 'methylprednisolone', 'amoxiclav']) administered(p, id, id === 'oxygen' ? 'inhaled' : 'iv');
  performed(p, ventilation);
  assert.equal(evaluate(p, c, 'uti').ready, false);
  accepted(p, 'uti');
  assert.equal(evaluate(p, c, 'uti').ready, true);
  p.consults[0].accepted = false;
  assert.equal(evaluate(p, c, 'uti').ready, false);
  p.consults[0].accepted = true; p.consults[0].patientUid = 'another-patient';
  assert.equal(evaluate(p, c, 'uti').ready, false);
 }
});

test('accepting a transfer never invents a performed definitive procedure', () => {
 const c = caseById('NEUR-02'), p = evidencePatient(c);
 p.examFindings.neurological = {all: {patientUid: p.uid, eventId: 'neuro', rows: [{text: 'Déficit focal documentado.'}]}};
 performed(p, 'stroke_prevention'); accepted(p, 'neurology');
 const result = evaluate(p, c, 'procedimiento');
 assert.equal(result.ready, true, result.missing.join(' '));
 assert.equal(result.procedurePerformed, false);
 assert(!p.treatments.some(t => t.id === 'thrombectomy'));
 assert(!p.administrationLog.some(t => t.id === 'thrombectomy'));
});

test('closure waits for native observation and reassessment after completed interventions', () => {
 const c = caseById('RESP-01'), p = evidencePatient(c);
 c.clinicalPolicy.closure.minimumObservationMinutes = 90;
 administered(p, 'amoxicillin');
 p.policyState.nativeMinute = 89; p.clinicalMinute = 9000;
 assert.equal(evaluate(p, c, 'alta').ready, false);
 p.policyState.nativeMinute = 90;
 assert.equal(evaluate(p, c, 'alta').ready, true);
 p.lastReassessment.interventionEvents = [];
 assert.equal(evaluate(p, c, 'alta').ready, false);
 p.lastReassessment.interventionEvents = ['admin-amoxicillin'];
 p.liveVitals.sys = 80;
 assert.equal(evaluate(p, c, 'alta').ready, false);
 p.liveVitals.sys = 120; p.caseEnded = true;
 assert.equal(evaluate(p, c, 'alta').ready, false);
});

test('completed study timestamps use the study service clock while observation uses native minutes', () => {
 const c = caseById('RESP-01'), p = evidencePatient(c);
 administered(p, 'amoxicillin');
 p.policyState.nativeMinute = 60; p.policyState.realSecond = 1000;
 for (const order of p.orders) { order.requestedAtMinute = 900; order.readyAtMinute = 1000; }
 assert.equal(evaluate(p, c, 'alta').ready, true);
 p.policyState.realSecond = 999;
 assert.equal(evaluate(p, c, 'alta').ready, false);
});
