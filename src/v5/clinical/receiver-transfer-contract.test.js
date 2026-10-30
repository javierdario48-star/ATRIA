import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {createClinicalContent} from '../content/clinical-content.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';

const read = name => JSON.parse(readFileSync(new URL('../content/' + name + '.json', import.meta.url)));
const content = createClinicalContent({cases: read('cases'), therapies: read('therapies'), defaultDoses: read('default-doses')},
 {additionalCases: [...respiratoryPack.cases, ...cardiologyPack.cases, ...neurologyPack.cases]});
const scenarios = [
 {caseId: 'CARD-01', destination: 'procedimiento', receiver: 'cardiologia', definitive: 'coronary_reperfusion',
  studies: ['g_card01_ecg'], treatments: ['aspirin', 'ticagrelor', 'enoxaparin']},
 {caseId: 'CARD-10', destination: 'procedimiento', receiver: 'cardiologia', definitive: 'coronary_reperfusion',
  studies: ['g_card10_ecg'], treatments: ['oxygen', 'vasopressor noradrenalina 0.1 mcg/kg/min IV', 'aspirin', 'ticagrelor', 'enoxaparin']},
 {caseId: 'NEUR-02', destination: 'procedimiento', receiver: 'neurology', definitive: 'thrombectomy',
  studies: ['g_neur02_ct', 'g_neur02_cta', 'g_neur02_perfusion'], treatments: ['stroke_prevention']},
 {caseId: 'CARD-08', destination: 'quirofano', receiver: 'cardiovascular', definitive: 'aortic_surgery',
  studies: ['g_card08_cta'], treatments: ['esmolol', 'Enfermera morfina 4 mg']},
 {caseId: 'CARD-07', destination: 'procedimiento', receiver: 'cardiologia', definitive: 'pericardial_drainage',
  studies: ['g_card07_echo'], treatments: []},
 {caseId: 'RESP-08', destination: 'procedimiento', receiver: 'cirugia', definitive: 'chest_drainage',
  studies: ['g_resp08_ultrasound', 'g_resp08_pleural', 'g_resp08_labs'], treatments: ['amoxiclav']},
 {caseId: 'RESP-07', destination: 'procedimiento', receiver: 'cirugia', definitive: 'chest_drainage',
  studies: [], treatments: ['oxygen', 'needle_decompression']},
 {caseId: 'VARIX-001', destination: 'procedimiento', receiver: 'gastro', definitive: 'variceal_ligation',
  studies: ['g_varix_cbc'], treatments: ['fluid 500 ml IV', 'ceftriaxone', 'terlipressin']}
];

function fixture(scenario, mode = 'solo') {
 const uid = 'receiver-' + scenario.caseId + '-' + mode;
 const c = content.cases.find(c => c.id === scenario.caseId);
 const s = createGuardSession({roomId: uid, mode, actorId: 'doctor', actorName: 'Médica',
  patient: {uid, caseId: c.id}, content, resolveContext: () => ({patientUid: uid}),
  members: mode === 'coop' ? [{id: 'doctor', name: 'Médica'}, {id: 'other', name: 'Colega'}] : [{id: 'doctor', name: 'Médica'}]});
 let sequence = 0;
 async function post(text, id = 'care-' + (++sequence)) {
  const result = await s.post({id, text});
  assert(!result.routeError, c.id + ': ' + text + ': ' + result.routeError);
  assert(result.clinical.length > 0, c.id + ': ' + text + ' must enter the clinical authority');
  return result;
 }
 async function care(text) {
  const result = await post(text);
  assert(!result.clinical.some(row => row.status === 'rejected'), c.id + ': ' + text + ': ' + JSON.stringify(result.clinical));
  return result;
 }
 async function advance(seconds) {s.advance(seconds); await s.flush();}
 async function settle() {
  for (let elapsed = 0; s.read().patient.pendingTreatments.length && elapsed < 600; elapsed += 2) await advance(2);
  assert.equal(s.read().patient.pendingTreatments.length, 0, c.id + ': native bedside work must complete');
 }
 async function workup() {
  await care('/diagnostico ' + c.dx[0]); await care('/signos');
  for (const technique of ['general', 'inspection', 'auscultation', 'percussion', 'palpation']) await care('/examen ' + technique);
  if (c.specialty === 'Neurología') await care('/examen neurological neurological');
  for (const id of c.requiredHistory) {
   const intent = c.intents.find(row => row.id === id);
   if (intent) await care('¿' + intent.keys[0] + '?');
  }
  await care('Enfermera una vía'); await care('Enfermera monitor');
  for (const id of scenario.studies) await care('/estudio ' + id);
  for (const treatment of scenario.treatments) await care(treatment.startsWith('Enfermera ')?treatment:'/tratamiento ' + treatment);
  await settle();
  const wait = Math.max(0, ...s.read().patient.orders.filter(row => row.status === 'pending').map(row => row.readyAtMinute - s.read().clock.clinicalMinute));
  if (wait > 0) await advance(wait);
  await care('/reevaluar');
 }
 return {s, c, uid, post, care, advance, settle, workup};
}

for (const scenario of scenarios) for (const mode of ['solo', 'apprentice', 'coop']) {
 test(scenario.caseId + ' ' + mode + ': accepted receiver closes initial care without the definitive procedure', async () => {
  const f = fixture(scenario, mode);
  try {
   await f.workup();
   const before = f.s.read();
   assert.equal(!!before.patient.patientDied, false);
   assert.equal(!!before.patient.caseEnded, false);
   assert.equal(before.progress.xp, 0);
   assert(!before.eligibleDestinations.includes(scenario.destination), 'receiver must first accept');
   const transferId = 'accepted-transfer';
   const transfer = await f.post('/disposicion ' + scenario.destination, transferId);
   assert.equal(transfer.clinical[0].status, 'pending');
   assert.equal(!!f.s.read().patient.caseEnded, false, 'request is not acceptance');
   await f.advance(3.5);
   const state = f.s.read(), p = state.patient;
   assert.equal(p.caseEnded, true, JSON.stringify({consults: p.consults, closure: state.closure, last: state.messages.at(-1)}));
   assert(p.consults.some(row => row.id === scenario.receiver && row.accepted && row.patientUid === f.uid && row.sourceEventId));
   assert.equal(p.closure.destination, scenario.destination);
   assert.equal(p.closure.patientUid, f.uid);
   assert.equal(p.closure.actorId, 'doctor');
   assert.equal(p.closure.quality.diagnosticFactor, 1);
   assert.equal(p.closure.quality.treatment, 25);
   assert.equal(state.progress.receipts.length, 1);
   assert.equal(state.progress.xp, p.closure.xp);
   assert(!p.treatments.some(row => row.id === scenario.definitive));
   assert(!p.administrationLog.some(row => row.id === scenario.definitive));
   assert(!p.procedures[scenario.definitive]);
   const events=structuredClone(state.room.events);
   await f.post('/disposicion ' + scenario.destination, transferId);
   assert.deepEqual(f.s.read().room.events,events,'replaying the accepted handoff cannot publish new clinical events');
   await f.post('/disposicion ' + scenario.destination);
   assert.deepEqual(f.s.read().progress, state.progress, 'one patient has one closure and one XP award');
   assert.deepEqual(f.s.read().patient.administrationLog, p.administrationLog);
  } finally {f.s.dispose();}
 });
}

test('accepted surgery cannot hand off tension pneumothorax before immediate decompression', async () => {
 const scenario = {...scenarios.find(row => row.caseId === 'RESP-07'), treatments: ['oxygen']}, f = fixture(scenario);
 try {
  await f.workup();
  const attempt = await f.post('/disposicion procedimiento');
  assert.equal(attempt.clinical[0].status, 'rejected');
  assert.equal(attempt.clinical[0].receipt.reasonCode, 'stabilization-insufficient');
  const state = f.s.read();
  assert(!state.patient.consults.some(row => row.id === 'cirugia' && row.accepted));
  assert.equal(state.patient.caseEnded, false);
  assert.equal(state.progress.receipts.length, 0);
  assert.match(state.messages.at(-1).text, /intervenciones imprescindibles/);
  await f.care('/tratamiento needle_decompression'); await f.settle(); await f.care('/reevaluar');
  assert.equal((await f.post('/disposicion procedimiento')).clinical[0].status, 'pending');
  await f.advance(3.5);
  assert.equal(f.s.read().progress.receipts.length, 1);
 } finally {f.s.dispose();}
});

test('an unreevaluated infusion cannot bypass an earlier receiver acceptance', async () => {
 const scenario = scenarios.find(row => row.caseId === 'CARD-01'), f = fixture(scenario);
 try {
  await f.workup(); await f.care('/consulta cardiologia'); await f.advance(3.5);
  assert(f.s.read().patient.consults.some(row => row.id === 'cardiologia' && row.accepted));
  await f.care('/tratamiento metoprolol 2.5 mg IV'); await f.advance(3);
  const administering = f.s.read().patient.administrationLog.find(row => row.id === 'metoprolol');
  assert.equal(administering.status, 'administering');
  assert(administering.deliveryFraction < 1);
  const attempt = await f.post('/disposicion procedimiento');
  assert.equal(attempt.clinical[0].status, 'rejected');
  assert.equal(attempt.clinical[0].receipt.reasonCode, 'stabilization-insufficient');
  assert.equal(f.s.read().progress.receipts.length, 0);
  await f.settle();
  const reassessment=await f.post('/disposicion procedimiento');
  assert.equal(reassessment.clinical[0].receipt.reasonCode, 'stabilization-insufficient', 'completed new care needs reassessment');
  await f.care('/reevaluar');
  assert.equal((await f.post('/disposicion procedimiento')).clinical[0].status, 'executed');
  assert.equal(f.s.read().progress.receipts.length, 1);
 } finally {f.s.dispose();}
});
