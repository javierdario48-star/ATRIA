import test from 'node:test';
import assert from 'node:assert/strict';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {compileClinicalCasePack} from '../content/compile-clinical-case-pack.js';
import * as registryModule from './clinical-policy-registry.js';
import * as treatmentModule from '../content/clinical-treatment-definitions.js';
const registries = () => {
 assert.ok(registryModule.CLINICAL_POLICY_REGISTRIES, 'real callable clinical policy registries must exist');
 return registryModule.CLINICAL_POLICY_REGISTRIES;
};
const clone = value => structuredClone(value);
const row = (registry, id) => registry instanceof Map ? registry.get(id) : registry[id];
test('destination treatment contracts reject invalid routes, empty alternatives and unexecutable actions', () => {
 for (const treatmentByDestination of [
  [], {alta: []}, {alta: [[]]}, {quirofano: [['amoxicillin']]}, {alta: [['invented-action']]}
 ]) {
  const pack = clone(respiratoryPack); pack.cases = pack.cases.slice(0, 1);
  pack.cases[0].clinicalPolicy.closure.treatmentByDestination = treatmentByDestination;
  const result = compileClinicalCasePack(pack, registries());
  assert.equal(result.ok, false, JSON.stringify(treatmentByDestination));
  assert.deepEqual(result.cases, []);
 }
});

test('destination-only treatment actions remain executable dependencies of the compiled pack', () => {
 const pack = clone(respiratoryPack); pack.cases = pack.cases.slice(0, 1);
 pack.cases[0].clinicalPolicy.closure.treatmentByDestination = {alta: [['amoxiclav']]};
 const result = compileClinicalCasePack(pack, registries());
 assert.equal(result.ok, true, result.errors.join('\n'));
 assert(result.dependencies.some(row => row.registry === 'drugs' && row.id === 'amoxiclav'));
 const r = registries(), without = {...r, drugs: {...r.drugs}};
 delete without.drugs.amoxiclav;
 assert.equal(compileClinicalCasePack(pack, without).ok, false);
});

test('declarative observation and post-treatment evidence contracts are validated before activation',()=>{
 for(const corrupt of [
  c=>{c.clinicalPolicy.observationResponses=[{allOf:['amoxicillin'],delay:2,peak:2,neurology:{eye:4}}];},
  c=>{c.clinicalPolicy.observationResponses=[{allOf:['amoxicillin'],delay:1,peak:2,neurology:{verbal:8}}];},
  c=>{c.clinicalPolicy.observationResponses=[{allOf:['amoxicillin'],delay:1,peak:2,neurology:{seizureActive:'no'}}];},
  c=>{c.studies[0].requiresCompletedTreatments=['invented-drug'];},
  c=>{c.clinicalPolicy.eligibility={amoxicillin:{requiresStudiesAfterTreatments:[{treatmentId:'amoxicillin',studyId:'missing-study'}]}};}
 ]){
  const pack=clone(respiratoryPack);pack.cases=pack.cases.slice(0,1);corrupt(pack.cases[0]);
  const result=compileClinicalCasePack(pack,registries());
  assert.equal(result.ok,false,'invalid observation or prerequisite must reject the whole pack');
  assert.deepEqual(result.cases,[]);
 }
});

test('pure treatment definitions expose one immutable cross-specialty administration catalogue', () => {
 const definitions = treatmentModule.CLINICAL_TREATMENTS;
 assert.ok(definitions, 'shared content-only treatment catalogue must exist');
 for (const id of ['salbutamol', 'aspirin', 'lorazepam', 'epi_im']) {
  assert.equal(definitions[id].id, id);
  assert.equal(treatmentModule.clinicalTreatmentDefinition(id), definitions[id]);
  assert(Object.isFrozen(definitions[id].dose));
 }
 assert.equal(treatmentModule.clinicalTreatmentDefinition('not-a-drug'), null);
 assert.throws(() => { definitions.aspirin.dose.amount = 1; }, TypeError);
});

test('all thirty authored cases compile against versioned executable policy and treatment dependencies', () => {
 for (const pack of [respiratoryPack, cardiologyPack, neurologyPack]) {
  const compiled = compileClinicalCasePack(pack, registries());
  assert.equal(compiled.ok, true, compiled.errors.join('\n'));
  assert.equal(compiled.cases.length, 10);
  for (const c of pack.cases) for (const intervention of c.interventions) {
   assert(compiled.dependencies.some(d => d.registry === 'drugs' && d.id === intervention.id), c.id + ':' + intervention.id);
  }
 }
});

test('runtime validators reject malformed vectors, unreal timings and marker-only closure conditions atomically', () => {
 for (const change of [
  c => { c.clinicalPolicy.trajectory.early = [1, 2]; },
  c => { c.clinicalPolicy.trajectory.lateEnd = c.clinicalPolicy.trajectory.earlyEnd; },
  c => { c.clinicalPolicy.responses[0].peak = c.clinicalPolicy.responses[0].delay - 1; },
  c => { c.clinicalPolicy.responses[0].allOf = ['surgery']; },
  c => { c.clinicalPolicy.closure.treatment = [[]]; },
  c => { c.clinicalPolicy.closure.requiredStudies = ['unknown-study']; },
  c => { c.clinicalPolicy.closure.requiredExams = ['pretend:performed']; },
  c => { c.clinicalPolicy.closure.minimumObservationMinutes = -1; },
  c => { c.studies[0].delay = 0; },
  c => { c.clinicalPolicy.regimens = []; },
  c => { c.clinicalPolicy.eligibility = {amoxicillin: 'approved'}; },
  c => { c.clinicalPolicy.eligibility = {amoxicillin: {requiresHistory: ['invented-history']}}; },
  c => { c.clinicalPolicy.eligibility = {amoxicillin: {bpLimit: {sys: -1}}}; }
 ]) {
  const pack = clone(respiratoryPack); change(pack.cases[0]);
  const compiled = compileClinicalCasePack(pack, registries());
  assert.equal(compiled.ok, false);
  assert.deepEqual(compiled.cases, []);
 }
});

test('clinical executors, study services and examination dependencies call the existing owners', () => {
 const r = registries(), c = clone(respiratoryPack.cases[0]);
 const p = {uid: 'registry-patient', caseId: c.id, orders: [], treatments: []};
 const care = row(r.executors, c.clinicalExecutorId).execute(p, c, {mode: 'solo', defaultDoses: {}, cases: [c], progress: {award() {}}});
 assert.equal(typeof care.execute, 'function');
 const diagnosis = care.execute({patientUid: p.uid, actorId: 'doctor', eventId: 'diagnosis', intent: {kind: 'diagnosis.record', value: c.dx[0]}}, {clinicalMinute: 0, nativeMinute: 0});
 assert.equal(diagnosis.status, 'executed');
 assert.equal(p.diagnosis, c.dx[0]);
 const study = row(r.studyPolicies, c.studyPolicyId).execute([c]);
 const request = study.request(p, {id: c.keyStudies[0], eventId: 'study', actorId: 'doctor', atMinute: 0});
 assert.equal(request.status, 'pending');
 study.advance(p, 20);
 assert.equal(p.orders[0].status, 'done');
 assert.equal(p.orders[0].result, c.studies[0].result);
 const examination = row(r.examPolicies, c.examPolicyId).execute(p, c,
  {patientUid: p.uid, actorId: 'doctor', eventId: 'examination', intent: {kind: 'exam.record', id: 'auscultation', regionId: 'thorax'}}, {nativeMinute: 20});
 assert.equal(examination.status, 'executed');
 assert.equal(p.examFindings.thorax.auscultation.patientUid, p.uid);
 const pending = row(r.drugs, 'amoxicillin').execute(care,
  {patientUid: p.uid, actorId: 'nurse', eventId: 'amoxicillin', intent: {kind: 'therapy.request', id: 'amoxicillin'}}, {clinicalMinute: 0, nativeMinute: 0});
 assert.equal(pending.status, 'pending');
 assert.equal(p.administrationLog.length, 0);
 care.advance({clinicalMinute: 0, nativeMinute: 0}, {clinicalMinute: 5, nativeMinute: 5}, 5);
 assert(p.administrationLog.some(t => t.id === 'amoxicillin' && t.patientUid === p.uid));
 assert.throws(() => row(r.drugs, 'amoxicillin').execute(care,
  {patientUid: p.uid, intent: {kind: 'diagnosis.record', id: 'amoxicillin', value: c.dx[0]}}, {nativeMinute: 5}), /action/);
 assert.throws(() => row(r.drugs, 'amoxicillin').execute({execute: () => true},
  {patientUid: p.uid, intent: {kind: 'therapy.request', id: 'amoxicillin'}}, {nativeMinute: 5}), /native.*result|owner/);
 care.dispose();
});

test('generic complication dependencies execute real bounded progression and recovery functions', () => {
 const r = registries(), progression = row(r.progressions, 'offset-ramp-v1'), rescue = row(r.rescues, 'confirmed-rescue-v1');
 const candidate = {minMinute: 10, offsets: [0, 10, 4, -20, -10, -8], riseMinutes: 20, recoveryMinutes: 30};
 assert.equal(progression.eligible(candidate, {nativeMinute: 9, clinicalState: {}}), false);
 assert.equal(progression.eligible(candidate, {nativeMinute: 10, clinicalState: {}}), true);
 assert(Object.values(progression.execute(candidate, 0)).every(value => value === 0));
 assert.equal(progression.execute(candidate, 20).sys, -20);
 assert.equal(rescue.execute(candidate, 0), 1);
 assert.equal(rescue.execute(candidate, 30), 0);
 assert.equal(row(r.progressions, 'invented-progression'), undefined);
});
