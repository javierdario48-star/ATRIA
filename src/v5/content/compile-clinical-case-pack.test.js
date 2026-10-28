import test from 'node:test';
import assert from 'node:assert/strict';
import * as compiler from './compile-clinical-case-pack.js';
import {casePack, playableCase, executableRegistries} from './clinical-case-pack.test-helpers.js';
const compile = (...args) => compiler.compileClinicalCasePack(...args);

test('strict compiler accepts complete playable content and detaches an immutable batch', () => {
 const pack = casePack();
 const compiled = compile(pack, executableRegistries());
 assert.equal(compiled.ok, true);
 assert.equal(compiled.status, 'compiled');
 assert.equal(compiled.cases[0].studies[0].result, 'Infiltrado basal derecho.');
 pack.cases[0].studies[0].result = 'Caller changed result';
 assert.equal(compiled.cases[0].studies[0].result, 'Infiltrado basal derecho.');
 assert.throws(() => { compiled.cases[0].vitals.hr = 1; }, TypeError);
 assert.ok(compiled.digest);
});

test('strict compiler rejects integration IDs and variation without playable fields', () => {
 const c = playableCase();
 const minimal = Object.fromEntries(Object.entries(c).filter(([key]) => ['id', 'variation', 'clinicalExecutorId', 'closurePolicyId', 'studyPolicyId', 'examPolicyId'].includes(key)));
 const result = compile(casePack([minimal]), executableRegistries());
 assert.equal(result.ok, false);
 assert.deepEqual(result.cases, []);
 assert.match(result.errors.join(' '), /chief/);
 assert.match(result.errors.join(' '), /clinicalPolicy/);
});

test('strict compiler requires versioned callable registry entries with validation', () => {
 for (const replacement of ['acute-policy-v1', {}, {version: '1', execute() {}}, {version: '1', validateCase() { return []; }}]) {
  const registries = executableRegistries();
  registries.executors.set('acute-policy-v1', replacement);
  const result = compile(casePack(), registries);
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, []);
  assert.match(result.errors.join(' '), /executable|validateCase|version/);
 }
 const claims = {executorIds: ['acute-policy-v1'], closurePolicyIds: ['policy-closure-v1'], studyPolicyIds: ['case-studies-v1'], examPolicyIds: ['case-exam-v1']};
 assert.equal(compile(casePack(), claims).ok, false);
});

test('runtime descriptor validation rejects a policy it cannot execute', () => {
 const broken = playableCase();
 broken.clinicalPolicy.schemaVersion = 99;
 const result = compile(casePack([playableCase('RESP-100'), broken]), executableRegistries());
 assert.equal(result.ok, false);
 assert.deepEqual(result.cases, []);
 assert.match(result.errors.join(' '), /unsupported clinical policy schema/);
});

test('strict compiler resolves all case-local references and rejects duplicate IDs atomically', () => {
 for (const change of [
  c => { c.requiredHistory = ['unknown']; },
  c => { c.keyStudies = ['unknown']; },
  c => { c.keyInterventions = ['unknown']; },
  c => { c.studies.push({...c.studies[0]}); },
  c => { c.examPolicyId = 'unregistered'; }
 ]) {
  const broken = playableCase(); change(broken);
  const result = compile(casePack([playableCase('RESP-100'), broken]), executableRegistries());
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, []);
 }
 assert.equal(compile(casePack([playableCase(), playableCase()]), executableRegistries()).ok, false);
});

test('strict compiler rejects malformed JSON fields, incomplete vitals and policy validator exceptions without partial output', () => {
 for (const change of [
  c => { c.vitals.hr = NaN; },
  c => { delete c.vitals.bp; },
  c => { c.intents = [null]; },
  c => { c.common = {}; },
  c => { c.anamnesis = {}; },
  c => { c.clinicalPolicy = {}; },
  c => { c.studies[0].result = () => 'not content'; },
  c => { c.clinicalPolicy.loop = c; }
 ]) {
  const broken = playableCase(); change(broken);
  const result = compile(casePack([playableCase('RESP-100'), broken]), executableRegistries());
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, []);
 }
 const registries = executableRegistries();
 registries.executors.get('acute-policy-v1').validateCase = () => { throw new Error('policy validation failed'); };
 const result = compile(casePack(), registries);
 assert.equal(result.ok, false);
 assert.match(result.errors.join(' '), /policy validation failed/);
});

test('strict compiler requires executable variation dependencies and never accepts an ID-only claim', () => {
 const c = playableCase();
 c.variation.allergies = [{id: 'penicillin', drugId: 'ampicillin', probability: 0.2, historyDisclosure: 'Me da urticaria.'}];
 c.variation.complications = [{id: 'fatigue', progressionId: 'respiratory-fatigue', rescueId: 'ventilation', probability: 0.1, rationale: 'Agotamiento respiratorio.'}];
 const registries = executableRegistries();
 registries.drugIds = ['ampicillin'];
 registries.progressionIds = ['respiratory-fatigue'];
 registries.rescueIds = ['ventilation'];
 assert.equal(compile(casePack([c]), registries).ok, false);
 for (const [key, id] of [['drugs', 'ampicillin'], ['progressions', 'respiratory-fatigue'], ['rescues', 'ventilation']]) {
  registries[key].set(id, {version: '1', execute: entry => entry.id, validateCase: () => []});
 }
 assert.equal(compile(casePack([c]), registries).ok, true);
});

test('strict compiler handles 10, 30 and 120 case batches without partial acceptance', () => {
 for (const size of [10, 30, 120]) {
  const cases = Array.from({length: size}, (_, i) => playableCase(`BATCH-${String(i).padStart(3, '0')}`));
  assert.equal(compile(casePack(cases), executableRegistries()).cases.length, size);
  cases[size - 1].studies[0].result = '';
  assert.deepEqual(compile(casePack(cases), executableRegistries()).cases, []);
 }
});

test('content digest is stable across object key order and changes with content or version', () => {
 const pack = casePack();
 const reordered = {cases: pack.cases, version: pack.version, packId: pack.packId, schemaVersion: 1};
 const digest = compile(pack, executableRegistries()).digest;
 assert.equal(compile(reordered, executableRegistries()).digest, digest);
 assert.notEqual(compile({...pack, version: '1.0.1'}, executableRegistries()).digest, digest);
 const changed = structuredClone(pack); changed.cases[0].chief = 'Otra presentación';
 assert.notEqual(compile(changed, executableRegistries()).digest, digest);
});

test('malformed variation collections fail closed without iterating invalid objects', () => {
 for (const value of [{}, null, 'bad', [null]]) {
  const c = playableCase(); c.variation.allergies = value;
  const result = compile(casePack([c]), executableRegistries());
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, []);
 }
});

test('registry validation cannot mutate the executable dependency it is certifying', () => {
 const registries = executableRegistries();
 const descriptor = registries.executors.get('acute-policy-v1');
 descriptor.validateCase = () => { descriptor.execute = () => 'changed during validation'; return []; };
 const result = compile(casePack(), registries);
 assert.equal(result.ok, false);
 assert.match(result.errors.join(' '), /changed clinical dependency/);
});

test('inherited registry entries do not satisfy an explicit executable reference', () => {
 const registries = executableRegistries();
 const descriptor = registries.executors.get('acute-policy-v1');
 registries.executors = Object.create({'acute-policy-v1': descriptor});
 const result = compile(casePack(), registries);
 assert.equal(result.ok, false);
});

test('function registries and plain descriptor maps support the same strict capability checks', () => {
 const registries = executableRegistries();
 const execute = entry => ({caseId: entry.id});
 execute.version = '1.0.0';
 execute.validateCase = () => true;
 registries.executors = {'acute-policy-v1': execute};
 assert.equal(compile(casePack(), registries).ok, true);
});

test('strict pack metadata and batch shape reject missing versions, empty or malformed batches', () => {
 for (const pack of [null, [], {}, {...casePack(), schemaVersion: 2}, {...casePack(), packId: ''}, {...casePack(), version: undefined}, {...casePack(), cases: []}, {...casePack(), cases: [null]}]) {
  const result = compile(pack, executableRegistries());
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, []);
 }
});

test('asynchronous validators fail closed even when their promise rejects', async () => {
 const registries = executableRegistries();
 registries.executors.get('acute-policy-v1').validateCase = async () => { throw Error('async validation is not supported'); };
 const result = compile(casePack(), registries);
 assert.equal(result.ok, false);
 assert.match(result.errors.join(' '), /must be synchronous/);
 await new Promise(resolve => setImmediate(resolve));
});

test('safe pack IDs support specialty packs and reject paths, blanks or ambiguous identities', () => {
 for (const packId of ['atria-respiratory', 'atria-cardiology', 'atria-neurology']) {
  assert.equal(compile(casePack(undefined, {packId}), executableRegistries()).ok, true);
 }
 for (const packId of ['../atria-respiratory', 'atria/neurology', 'atria cardiology', ' ', 'ATRIA', '-atria']) {
  const result = compile(casePack(undefined, {packId}), executableRegistries());
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /packId/);
 }
});

test('every declared clinical action and policy dependency is bound even without a variation allergy', () => {
 const c = playableCase(), r = executableRegistries();
 r.drugs.delete('oxygen');
 const missing = compile(casePack([c]), r);
 assert.equal(missing.ok, false);
 assert.match(missing.errors.join(' '), /drugs\.oxygen/);
 r.drugs.set('oxygen', {version: '1', execute: entry => entry.id, validateCase: () => []});
 const compiled = compile(casePack([c]), r);
 assert.equal(compiled.ok, true);
 assert(compiled.dependencies.some(d => d.registry === 'drugs' && d.id === 'oxygen'));
 c.clinicalPolicy.responses = [{allOf: ['salbutamol'], delay: 1, peak: 10, offsets: [0, 0, 0, 0, 0, 0]}];
 c.clinicalPolicy.complications = [{id: 'fatigue', progressionId: 'ramp-v1', rescueId: 'rescue-v1', rescueAllOf: ['intubation']}];
 const rejected = compile(casePack([c]), r);
 assert.equal(rejected.ok, false);
 assert.match(rejected.errors.join(' '), /drugs\.salbutamol/);
 assert.match(rejected.errors.join(' '), /drugs\.intubation/);
 assert.match(rejected.errors.join(' '), /progressions\.ramp-v1/);
 assert.match(rejected.errors.join(' '), /rescues\.rescue-v1/);
 assert.deepEqual(rejected.cases, []);
});

test('changing a registered complication eligibility callback invalidates the compiled dependency', () => {
 const c = playableCase(), r = executableRegistries();
 c.variation.complications = [{id: 'fatigue', probability: 0.1, rationale: 'Agotamiento.', progressionId: 'ramp-v1', rescueId: 'rescue-v1'}];
 const progression = {version: '1', execute: () => ({hr: 1}), eligible: () => true, validateCase: () => []};
 r.progressions.set('ramp-v1', progression);
 r.rescues.set('rescue-v1', {version: '1', execute: () => 0, validateCase: () => []});
 const compiled = compile(casePack([c]), r);
 assert.equal(compiled.ok, true);
 progression.eligible = () => false;
 assert.match(compiler.validateCompiledClinicalCasePackBindings(compiled, r).join(' '), /changed clinical dependency/);
});

for (const [name, declare] of [
 ['observation response allOf', c => { c.clinicalPolicy.observationResponses = [{allOf: ['prerequisite_action']}]; }],
 ['observation response anyOf', c => { c.clinicalPolicy.observationResponses = [{anyOf: ['prerequisite_action']}]; }],
 ['eligibility completed treatment', c => { c.clinicalPolicy.eligibility = {oxygen: {requiresCompletedTreatments: ['prerequisite_action']}}; }],
 ['eligibility study after treatment', c => { c.clinicalPolicy.eligibility = {oxygen: {requiresStudiesAfterTreatments: [{treatmentId: 'prerequisite_action', studyId: 'chest_xray'}]}}; }],
 ['study completed treatment', c => { c.studies[0].requiresCompletedTreatments = ['prerequisite_action']; }]
]) test(name + ' requires an executable prerequisite rather than an ID marker', () => {
 const c = playableCase(), registries = executableRegistries();
 declare(c);
 registries.drugIds = ['oxygen', 'prerequisite_action'];
 for (const marker of [undefined, {version: '1.0.0'}]) {
  if (marker) registries.drugs.set('prerequisite_action', marker);
  const rejected = compile(casePack([c]), registries);
  assert.equal(rejected.ok, false);
  assert.match(rejected.errors.join(' '), /drugs\.prerequisite_action/);
  assert.deepEqual(rejected.cases, []);
 }
 registries.drugs.set('prerequisite_action', {version: '1.0.0', execute: () => 'executed', validateCase: () => []});
 const compiled = compile(casePack([c]), registries);
 assert.equal(compiled.ok, true, compiled.errors.join('\n'));
 assert(compiled.dependencies.some(item => item.registry === 'drugs' && item.id === 'prerequisite_action'));
});
