import test from 'node:test';
import assert from 'node:assert/strict';
import {readCertifiedCaseCatalog} from './certified-case-catalog.js';
import {compileClinicalCasePack} from './compile-clinical-case-pack.js';
import {createClinicalCaseRegistry} from './clinical-case-registry.js';
import {casePack, playableCase, executableRegistries, passingEvidence} from './clinical-case-pack.test-helpers.js';

function artifactFor(packs, registries) {
 return {schemaVersion: 1, kind: 'atria-certified-case-catalog', packs: packs.map(pack => {
  const compiled = compileClinicalCasePack(pack, registries);
  assert.equal(compiled.ok, true);
  return {pack: structuredClone(pack), digest: compiled.digest, dependencies: structuredClone(compiled.dependencies), evidence: passingEvidence(compiled)};
 })};
}

test('serialized certified content loads as one detached immutable catalog without granting activation', () => {
 const registries = executableRegistries();
 const artifact = artifactFor([casePack([playableCase('RESP-101'), playableCase('RESP-102')], {packId: 'atria-respiratory'})], registries);
 const loaded = readCertifiedCaseCatalog(JSON.parse(JSON.stringify(artifact)), registries);
 assert.equal(loaded.ok, true);
 assert.deepEqual(loaded.cases.map(c => c.id), ['RESP-101', 'RESP-102']);
 assert.equal(loaded.packs[0].packId, 'atria-respiratory');
 artifact.packs[0].pack.cases[0].chief = 'edited source';
 assert.equal(loaded.cases[0].chief, 'Disnea y fiebre.');
 assert.throws(() => { loaded.cases[0].chief = 'edited loaded case'; }, TypeError);
 assert.throws(() => { loaded.packs[0].dependencies[0].version = 'fake'; }, TypeError);
 const registry = createClinicalCaseRegistry({registries});
 assert.equal(registry.activate(loaded.packs[0]).status, 'rejected');
 assert.equal(registry.getSnapshot().revision, 0);
});

test('catalog reader rechecks content digest, executable dependency versions and evidence before exposing any case', () => {
 const registries = executableRegistries();
 const baseline = artifactFor([casePack()], registries);
 for (const change of [
  a => { a.packs[0].pack.cases[0].chief = 'changed content'; },
  a => { a.packs[0].digest = 'invented'; },
  a => { a.packs[0].dependencies[0].version = '2.0.0'; },
  a => { a.packs[0].dependencies.pop(); },
  a => { a.packs[0].dependencies.push({...a.packs[0].dependencies[0]}); },
  a => { a.packs[0].evidence.version = '2.0.0'; },
  a => { a.packs[0].evidence.evidence[0].checks.closure = false; },
  a => { a.packs[0].evidence.evidence[0].caseId = 'OTHER-999'; }
 ]) {
  const artifact = structuredClone(baseline); change(artifact);
  const result = readCertifiedCaseCatalog(artifact, registries);
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, []);
  assert.deepEqual(result.packs, []);
 }
 const currentRegistries = executableRegistries();
 currentRegistries.executors.get('acute-policy-v1').version = '2.0.0';
 assert.equal(readCertifiedCaseCatalog(baseline, currentRegistries).ok, false);
});

test('catalog rejects duplicate case IDs or pack identities across otherwise valid certified batches atomically', () => {
 const registries = executableRegistries();
 const first = casePack([playableCase('RESP-101')], {packId: 'atria-respiratory'});
 for (const second of [
  casePack([playableCase('RESP-101'), playableCase('RESP-102')], {packId: 'atria-cardiology'}),
  casePack([playableCase('RESP-102')], {packId: 'atria-respiratory', version: '2.0.0'})
 ]) {
  const result = readCertifiedCaseCatalog(artifactFor([first, second], registries), registries);
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, []);
  assert.deepEqual(result.packs, []);
 }
});

test('catalog schema and malformed records fail closed while an explicit empty catalog is valid', () => {
 const registries = executableRegistries();
 const empty = {schemaVersion: 1, kind: 'atria-certified-case-catalog', packs: []};
 assert.equal(readCertifiedCaseCatalog(empty, registries).ok, true);
 for (const artifact of [null, [], {}, {...empty, schemaVersion: 2}, {...empty, kind: 'claimed-certificate'}, {...empty, packs: {}}, {...empty, packs: [null]}]) {
  const result = readCertifiedCaseCatalog(artifact, registries);
  assert.equal(result.ok, false);
  assert.deepEqual(result.cases, []);
 }
});

test('catalog validates 10, 30 and 120 stored cases through the strict compiler', () => {
 const registries = executableRegistries();
 for (const size of [10, 30, 120]) {
  const cases = Array.from({length: size}, (_, i) => playableCase(`SAVED-${String(i).padStart(3, '0')}`));
  const artifact = artifactFor([casePack(cases)], registries);
  assert.equal(readCertifiedCaseCatalog(artifact, registries).cases.length, size);
  artifact.packs[0].pack.cases[size - 1].vitals = {};
  assert.deepEqual(readCertifiedCaseCatalog(artifact, registries).cases, []);
 }
});

test('a later pack validator cannot leave an earlier pack bound to changed executable code', () => {
 const registries = executableRegistries();
 const artifact = artifactFor([
  casePack([playableCase('FIRST-101')], {packId: 'first'}),
  casePack([playableCase('SECOND-102')], {packId: 'second'})
 ], registries);
 registries.executors.get('acute-policy-v1').validateCase = c => {
  if (c.id === 'SECOND-102') registries.drugs.get('oxygen').execute = () => 'changed while loading another pack';
  return [];
 };
 const result = readCertifiedCaseCatalog(artifact, registries);
 assert.equal(result.ok, false);
 assert.match(result.errors.join(' '), /changed clinical dependency drugs.oxygen/);
 assert.deepEqual(result.cases, []);
 assert.deepEqual(result.packs, []);
});
