import test from 'node:test';
import assert from 'node:assert/strict';
import {createClinicalCaseRegistry} from './clinical-case-registry.js';
import {casePack, playableCase, executableRegistries, passingEvidence} from './clinical-case-pack.test-helpers.js';
const create = (registries = executableRegistries(), initialCases = []) => createClinicalCaseRegistry({registries, initialCases});
const certification = (registry, staged) => registry.certify(staged, candidate => passingEvidence(candidate));

test('staging leaves the active immutable catalog unchanged until the entire certified batch activates', async () => {
 const existing = playableCase('BASE-100');
 const registry = create(executableRegistries(), [existing]);
 const before = registry.getSnapshot();
 const staged = registry.stage(casePack([playableCase('RESP-101'), playableCase('RESP-102')]));
 assert.equal(staged.status, 'staged');
 assert.strictEqual(registry.getSnapshot(), before);
 assert.equal(before.cases.length, 1);
 existing.chief = 'changed externally';
 assert.equal(before.caseById['BASE-100'].chief, 'Disnea y fiebre.');
 const certified = await certification(registry, staged);
 assert.equal(certified.status, 'certified');
 assert.strictEqual(registry.getSnapshot(), before);
 const result = registry.activate(certified);
 assert.equal(result.status, 'activated');
 const snapshot = registry.getSnapshot();
 assert.strictEqual(result.snapshot, snapshot);
 assert.equal(snapshot.revision, 1);
 assert.deepEqual(snapshot.cases.map(c => c.id), ['BASE-100', 'RESP-101', 'RESP-102']);
 assert.equal(snapshot.packs[0].version, '1.0.0');
 assert.throws(() => { snapshot.caseById['RESP-101'].vitals.hr = 1; }, TypeError);
 assert.throws(() => { snapshot.cases.push(playableCase()); }, TypeError);
 assert.equal(before.cases.length, 1);
});

test('uncertified, fabricated, copied and foreign registry certificates cannot activate content', async () => {
 const registry = create(); const before = registry.getSnapshot();
 const staged = registry.stage(casePack());
 assert.equal(registry.activate(staged).status, 'rejected');
 assert.equal(registry.activate({...staged, status: 'certified'}).status, 'rejected');
 const certified = await certification(registry, staged);
 assert.equal(registry.activate(structuredClone(certified)).status, 'rejected');
 assert.equal(create().activate(certified).status, 'rejected');
 assert.strictEqual(registry.getSnapshot(), before);
 assert.equal(registry.activate(certified).status, 'activated');
 assert.equal(registry.activate(certified).status, 'rejected');
});

test('failed or incomplete real-runner evidence never issues an activatable certificate', async () => {
 for (const alter of [
  e => { e.ok = false; },
  e => { e.version = 'different'; },
  e => { e.digest = 'different'; },
  e => { e.evidence = []; },
  e => { e.evidence[0].caseId = 'OTHER-999'; },
  e => { e.evidence[0].passed = false; },
  e => { delete e.evidence[0].checks.xp; },
  e => { e.evidence[0].checks.trajectory = false; },
  e => { e.evidence.push({...e.evidence[0]}); }
 ]) {
  const registry = create(); const before = registry.getSnapshot();
  const staged = registry.stage(casePack());
  const rejected = await registry.certify(staged, candidate => { const evidence = passingEvidence(candidate); alter(evidence); return evidence; });
  assert.equal(rejected.status, 'rejected');
  assert.equal(registry.activate(rejected).status, 'rejected');
  assert.strictEqual(registry.getSnapshot(), before);
 }
 const registry = create(); const before = registry.getSnapshot();
 const result = await registry.certify(registry.stage(casePack()), () => { throw Error('guard session failed'); });
 assert.equal(result.status, 'rejected');
 assert.match(result.errors.join(' '), /guard session failed/);
 assert.strictEqual(registry.getSnapshot(), before);
});

test('changed executable, validator or advertised version rolls back the entire pending activation', async () => {
 for (const change of [
  entry => { entry.version = '2.0.0'; },
  entry => { entry.execute = () => ({different: true}); },
  entry => { entry.validateCase = () => []; }
 ]) {
  const registries = executableRegistries(); const registry = create(registries);
  const before = registry.getSnapshot();
  const staged = registry.stage(casePack([playableCase('RESP-101'), playableCase('RESP-102')]));
  const certified = await certification(registry, staged);
  change(registries.executors.get('acute-policy-v1'));
  const result = registry.activate(certified);
  assert.equal(result.status, 'rejected');
  assert.match(result.errors.join(' '), /changed clinical dependency/);
  assert.strictEqual(registry.getSnapshot(), before);
  assert.deepEqual(before.cases, []);
 }
});

test('replacing a descriptor with an equal-looking entry invalidates staged certification', async () => {
 const registries = executableRegistries(); const registry = create(registries);
 const staged = registry.stage(casePack());
 registries.studyPolicies.set('case-studies-v1', {...registries.studyPolicies.get('case-studies-v1')});
 const rejected = await certification(registry, staged);
 assert.equal(rejected.status, 'rejected');
 assert.equal(registry.getSnapshot().revision, 0);
});

test('case conflicts introduced after staging reject the losing batch without partial records', async () => {
 const registry = create();
 const first = registry.stage(casePack([playableCase('RESP-101')], {packId: 'first'}));
 const second = registry.stage(casePack([playableCase('RESP-101'), playableCase('RESP-102')], {packId: 'second'}));
 const firstCertificate = await certification(registry, first);
 const secondCertificate = await certification(registry, second);
 assert.equal(registry.activate(firstCertificate).status, 'activated');
 const before = registry.getSnapshot();
 assert.equal(registry.activate(secondCertificate).status, 'rejected');
 assert.strictEqual(registry.getSnapshot(), before);
 assert.equal(before.caseById['RESP-102'], undefined);
});

test('changed pack metadata or case/version cannot be substituted for the certified staged identity', async () => {
 const registry = create();
 const staged = registry.stage(casePack());
 const certified = await certification(registry, staged);
 for (const change of [{version: '2.0.0'}, {packId: 'substitute'}, {cases: [playableCase('OTHER-199')]}, {digest: 'forged'}]) {
  assert.equal(registry.activate({...certified, ...change}).status, 'rejected');
 }
 assert.equal(registry.getSnapshot().revision, 0);
 assert.equal(registry.activate(certified).status, 'activated');
});

test('the same pack identity cannot be activated again with another version or disjoint case IDs', async () => {
 const registry = create();
 const first = registry.stage(casePack());
 const second = registry.stage(casePack([playableCase('RESP-102')], {version: '2.0.0'}));
 const cert1 = await certification(registry, first); const cert2 = await certification(registry, second);
 assert.equal(registry.activate(cert1).status, 'activated');
 const before = registry.getSnapshot();
 assert.equal(registry.activate(cert2).status, 'rejected');
 assert.strictEqual(registry.getSnapshot(), before);
});

test('large certified packs activate once with no staged case escaping early', async () => {
 for (const size of [10, 30, 120]) {
  const registry = create();
  const staged = registry.stage(casePack(Array.from({length: size}, (_, i) => playableCase(`SCALE-${String(i).padStart(3, '0')}`))));
  const cert = await certification(registry, staged);
  assert.equal(registry.getSnapshot().cases.length, 0);
  assert.equal(registry.activate(cert).status, 'activated');
  assert.equal(registry.getSnapshot().cases.length, size);
 }
});

test('certification rejects caller-created staged objects and cannot invoke a missing runner', async () => {
 const registry = create(); const staged = registry.stage(casePack());
 assert.equal((await registry.certify({...staged}, passingEvidence)).status, 'rejected');
 assert.equal((await registry.certify(staged)).status, 'rejected');
 assert.equal(registry.getSnapshot().revision, 0);
});

test('dependency mutation during final validation cannot escape the activation gate', async () => {
 const registries = executableRegistries();
 let mutate = false;
 const descriptor = registries.executors.get('acute-policy-v1');
 descriptor.validateCase = () => { if (mutate) descriptor.execute = () => 'changed'; return []; };
 const registry = create(registries);
 const certified = await certification(registry, registry.stage(casePack()));
 assert.equal(certified.status, 'certified');
 const before = registry.getSnapshot();
 mutate = true;
 const result = registry.activate(certified);
 assert.equal(result.status, 'rejected');
 assert.strictEqual(registry.getSnapshot(), before);
});

test('an asynchronous certification checks dependencies again after the clinical runner finishes', async () => {
 const registries = executableRegistries(); const registry = create(registries);
 const staged = registry.stage(casePack());
 let finish;
 const pending = registry.certify(staged, candidate => new Promise(resolve => { finish = () => resolve(passingEvidence(candidate)); }));
 assert.equal((await certification(registry, staged)).status, 'rejected');
 registries.executors.get('acute-policy-v1').version = '2.0.0';
 finish();
 const rejected = await pending;
 assert.equal(rejected.status, 'rejected');
 assert.equal(registry.getSnapshot().revision, 0);
});

test('malformed existing-case registry never throws or creates partial staged records', () => {
 const registries = executableRegistries(); registries.existingCaseIds = {};
 const registry = create(registries); const before = registry.getSnapshot();
 const result = registry.stage(casePack());
 assert.equal(result.status, 'rejected');
 assert.strictEqual(registry.getSnapshot(), before);
});

test('a case ID reserved after staging invalidates certification and activation atomically', async () => {
 for (const reserveBeforeCertification of [true, false]) {
  const registries = executableRegistries(), registry = create(registries);
  const before = registry.getSnapshot();
  const staged = registry.stage(casePack([playableCase('RESP-101'), playableCase('RESP-102')]));
  if (reserveBeforeCertification) registries.existingCaseIds.push('RESP-102');
  const certificate = await certification(registry, staged);
  if (reserveBeforeCertification) {
   assert.equal(certificate.status, 'rejected');
   assert.match(certificate.errors.join(' '), /existing.*RESP-102/);
  } else {
   assert.equal(certificate.status, 'certified');
   registries.existingCaseIds.push('RESP-102');
   const result = registry.activate(certificate);
   assert.equal(result.status, 'rejected');
   assert.match(result.errors.join(' '), /existing.*RESP-102/);
  }
  assert.strictEqual(registry.getSnapshot(), before);
  assert.deepEqual(before.cases, []);
 }
});

test('a malformed case reservation registry introduced after certification fails closed', async () => {
 const registries = executableRegistries(), registry = create(registries);
 const before = registry.getSnapshot();
 const certificate = await certification(registry, registry.stage(casePack()));
 registries.existingCaseIds = {};
 const result = registry.activate(certificate);
 assert.equal(result.status, 'rejected');
 assert.match(result.errors.join(' '), /existingCaseIds must be an array/);
 assert.strictEqual(registry.getSnapshot(), before);
});

test('the real guard runtime issues patient-bound clinical evidence accepted by the activation registry', async () => {
 const [{CLINICAL_POLICY_REGISTRIES}, {respiratoryPack}, {certifyClinicalCases}] = await Promise.all([
  import('../clinical/clinical-policy-registry.js'), import('./packs/respiratory-pack.js'),
  import('../../../qa/v5/certify-clinical-cases.mjs')
 ]);
 const registry = create(CLINICAL_POLICY_REGISTRIES), before = registry.getSnapshot();
 const staged = registry.stage({...respiratoryPack, cases: respiratoryPack.cases.slice(0, 1)});
 assert.equal(staged.status, 'staged', staged.errors.join('\n'));
 const certificate = await registry.certify(staged, certifyClinicalCases);
 assert.equal(certificate.status, 'certified', certificate.errors.join('\n'));
 const [row] = certificate.evidence.evidence;
 assert.equal(row.caseId, 'RESP-01');
 assert.equal(row.passed, true);
 assert(row.history.some(item => item.patientUid === row.patientUid && item.id === 'support'));
 assert(row.administrations.some(item => item.patientUid === row.patientUid && item.id === 'amoxicillin' && item.sourceEventId));
 assert.equal(row.closureReceipt.patientUid, row.patientUid);
 assert.equal(row.closureReceipt.destination, 'alta');
 assert.equal(row.xpReceipts.length, 1);
 assert.equal(row.xpReceipts[0].eventId, row.closureReceipt.eventId);
 assert.strictEqual(registry.getSnapshot(), before);
 assert.equal(registry.activate(certificate).status, 'activated');
 assert.deepEqual(registry.getSnapshot().cases.map(item => item.id), ['RESP-01']);
});
