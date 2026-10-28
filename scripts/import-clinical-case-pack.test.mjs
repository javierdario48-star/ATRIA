import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {importClinicalCasePack,compactClinicalCertificationEvidence} from './import-clinical-case-pack.mjs';
import {readCertifiedCaseCatalog} from '../src/v5/content/certified-case-catalog.js';
import {casePack, playableCase, executableRegistries, passingEvidence} from '../src/v5/content/clinical-case-pack.test-helpers.js';
import {respiratoryPack} from '../src/v5/content/packs/respiratory-pack.js';
test('runtime catalogs retain actual clinical proof without downloading duplicated command traces',()=>{
 const full={ok:true,packId:'proof',runnerId:'real-runtime',evidence:[{caseId:'RESP-101',passed:true,
  checks:{history:true},integrityChecks:{persistence:true},administrations:[{sourceEventId:'actual',dose:{amount:1,unit:'mg'}}],
  closureReceipt:{closed:true,eventId:'closure'},xpReceipts:[{eventId:'closure',xp:133}],evidenceDigest:'trace-digest',
  commands:[{receipt:'duplicated trace'}],observations:[{duplicate:'longitudinal trace'}]}]};
 const before=structuredClone(full),small=compactClinicalCertificationEvidence(full);
 assert.deepEqual(full,before);assert.equal(small.runnerId,'real-runtime');
 assert.deepEqual(small.evidence[0].administrations,full.evidence[0].administrations);
 assert.deepEqual(small.evidence[0].closureReceipt,full.evidence[0].closureReceipt);
 assert.deepEqual(small.evidence[0].checks,full.evidence[0].checks);
 assert.equal(small.evidence[0].evidenceDigest,'trace-digest');
 assert(!Object.hasOwn(small.evidence[0],'commands'));assert(!Object.hasOwn(small.evidence[0],'observations'));
});

async function setup(t, registries = executableRegistries()) {
 const dir = await fs.mkdtemp(join(tmpdir(), 'atria-case-import-'));
 t.after(() => fs.rm(dir, {recursive: true, force: true}));
 const packPath = join(dir, 'incoming.json'), outputPath = join(dir, 'catalog.json');
 const writePack = pack => fs.writeFile(packPath, JSON.stringify(pack));
 const certificationRunner = staged => ({...passingEvidence(staged), runnerId: 'controlled-test-fixture'});
 return {dir, packPath, outputPath, registries, writePack,
  dependencies: {registries, certificationRunner},
  run: (activate = false, dependencies = {}) => importClinicalCasePack({packPath, outputPath, activate}, {registries, certificationRunner, ...dependencies})};
}
test('the real importer reserves the original case identities before writing a catalog',async t=>{
 const f=await setup(t),pack=structuredClone(respiratoryPack);pack.cases=pack.cases.slice(0,1);
 pack.packId='legacy-collision';pack.cases[0].id='APP-001';await f.writePack(pack);
 const result=spawnSync(process.execPath,['scripts/import-clinical-case-pack.mjs','--pack',f.packPath,'--output',f.outputPath],{encoding:'utf8'});
 assert.equal(result.status,1);
 assert.match(result.stderr,/duplicate\/existing case APP-001/);
 await assert.rejects(fs.stat(f.outputPath),{code:'ENOENT'});
});

test('developer import dry-stages by default without running certification or writing a catalog', async t => {
 const fixture = await setup(t);
 await fixture.writePack(casePack(undefined, {packId: 'atria-respiratory'}));
 const result = await fixture.run(false, {certificationRunner: () => { throw Error('dry staging invoked certification'); }});
 assert.equal(result.ok, true);
 assert.equal(result.status, 'staged');
 assert.equal(result.packId, 'atria-respiratory');
 assert.equal(result.caseCount, 1);
 assert.deepEqual((await fs.readdir(fixture.dir)).sort(), ['incoming.json']);
});

test('developer activation executes owned certification and atomically appends complete serializable packs', async t => {
 const fixture = await setup(t);
 await fixture.writePack(casePack([playableCase('RESP-101')], {packId: 'atria-respiratory', source: 'Additional author metadata is preserved.'}));
 const first = await fixture.run(true);
 assert.equal(first.status, 'activated');
 const firstCatalog = JSON.parse(await fs.readFile(fixture.outputPath, 'utf8'));
 assert.equal(firstCatalog.packs[0].evidence.runnerId, 'controlled-test-fixture');
 assert.equal(firstCatalog.packs[0].pack.source, 'Additional author metadata is preserved.');
 await fixture.writePack(casePack([playableCase('CARD-101'), playableCase('CARD-102')], {packId: 'atria-cardiology'}));
 const result = await fixture.run(true);
 assert.equal(result.status, 'activated');
 assert.equal(result.catalogCaseCount, 3);
 const artifact = JSON.parse(await fs.readFile(fixture.outputPath, 'utf8'));
 const loaded = readCertifiedCaseCatalog(artifact, fixture.registries);
 assert.equal(loaded.ok, true);
 assert.deepEqual(loaded.cases.map(c => c.id), ['RESP-101', 'CARD-101', 'CARD-102']);
 assert.equal(artifact.packs[0].pack.source, 'Additional author metadata is preserved.');
 assert.deepEqual((await fs.readdir(fixture.dir)).sort(), ['catalog.json', 'incoming.json']);
});

test('failed clinical certification preserves prior catalog bytes and removes its owned temporary files', async t => {
 const fixture = await setup(t);
 await fixture.writePack(casePack());
 assert.equal((await fixture.run(true)).status, 'activated');
 const before = await fs.readFile(fixture.outputPath, 'utf8');
 await fixture.writePack(casePack([playableCase('CARD-101')], {packId: 'atria-cardiology'}));
 for (const certificationRunner of [
  () => { throw Error('real guard session failed'); },
  staged => { const evidence = passingEvidence(staged); evidence.evidence[0].checks.xp = false; return evidence; }
 ]) {
  const rejected = await fixture.run(true, {certificationRunner});
  assert.equal(rejected.ok, false);
  assert.equal(rejected.status, 'rejected');
  assert.equal(await fs.readFile(fixture.outputPath, 'utf8'), before);
  assert.deepEqual((await fs.readdir(fixture.dir)).sort(), ['catalog.json', 'incoming.json']);
 }
});

test('strict compilation or stored catalog validation fails before a clinical runner can run', async t => {
 const fixture = await setup(t);
 await fixture.writePack(casePack());
 const noRunner = () => { throw Error('runner must not execute'); };
 await fs.writeFile(fixture.outputPath, '{malformed existing catalog\n');
 const before = await fs.readFile(fixture.outputPath, 'utf8');
 const rejected = await fixture.run(true, {certificationRunner: noRunner});
 assert.equal(rejected.status, 'rejected');
 assert.equal(await fs.readFile(fixture.outputPath, 'utf8'), before);
 await fs.unlink(fixture.outputPath);
 const invalid = casePack(); delete invalid.cases[0].chief;
 await fixture.writePack(invalid);
 const invalidResult = await fixture.run(true, {certificationRunner: noRunner});
 assert.equal(invalidResult.status, 'rejected');
 assert.match(invalidResult.errors.join(' '), /chief/);
 await assert.rejects(fs.stat(fixture.outputPath), {code: 'ENOENT'});
});

test('changed runtime dependencies during certification cannot write an activated artifact', async t => {
 const fixture = await setup(t);
 await fixture.writePack(casePack());
 const result = await fixture.run(true, {certificationRunner: staged => {
  fixture.registries.executors.get('acute-policy-v1').version = '2.0.0';
  return passingEvidence(staged);
 }});
 assert.equal(result.status, 'rejected');
 assert.match(result.errors.join(' '), /changed clinical dependency/);
 await assert.rejects(fs.stat(fixture.outputPath), {code: 'ENOENT'});
});

test('rename failure leaves the previously committed catalog byte-for-byte intact', async t => {
 const fixture = await setup(t);
 await fixture.writePack(casePack());
 assert.equal((await fixture.run(true)).status, 'activated');
 const before = await fs.readFile(fixture.outputPath, 'utf8');
 await fixture.writePack(casePack([playableCase('CARD-101')], {packId: 'atria-cardiology'}));
 const fileSystem = {...fs, rename: async () => { throw Object.assign(Error('injected rename failure'), {code: 'EIO'}); }};
 const result = await fixture.run(true, {fileSystem});
 assert.equal(result.status, 'rejected');
 assert.match(result.errors.join(' '), /rename failure/);
 assert.equal(await fs.readFile(fixture.outputPath, 'utf8'), before);
 assert.deepEqual((await fs.readdir(fixture.dir)).sort(), ['catalog.json', 'incoming.json']);
});

test('a competing writer lock is preserved and prevents overwriting an existing catalog', async t => {
 const fixture = await setup(t);
 await fixture.writePack(casePack());
 const lockPath = fixture.outputPath + '.lock';
 await fs.writeFile(lockPath, 'another importer owns this lock');
 const result = await fixture.run(true);
 assert.equal(result.status, 'rejected');
 assert.match(result.errors.join(' '), /lock|another import/);
 assert.equal(await fs.readFile(lockPath, 'utf8'), 'another importer owns this lock');
 await assert.rejects(fs.stat(fixture.outputPath), {code: 'ENOENT'});
});

test('reusing a committed pack identity rejects disjoint cases and preserves the old output', async t => {
 const fixture = await setup(t);
 await fixture.writePack(casePack());
 assert.equal((await fixture.run(true)).status, 'activated');
 const before = await fs.readFile(fixture.outputPath, 'utf8');
 await fixture.writePack(casePack([playableCase('RESP-102')], {version: '2.0.0'}));
 const result = await fixture.run(true);
 assert.equal(result.status, 'rejected');
 assert.match(result.errors.join(' '), /pack already active/);
 assert.equal(await fs.readFile(fixture.outputPath, 'utf8'), before);
});

test('one developer command imports 10, 30 or 120 cases as a whole pack', async t => {
 const fixture = await setup(t);
 for (const size of [10, 30, 120]) {
  const cases = Array.from({length: size}, (_, i) => playableCase(`BATCH-${size}-${String(i).padStart(3, '0')}`));
  await fixture.writePack(casePack(cases, {packId: `batch-${size}`}));
  const result = await fixture.run(true);
  assert.equal(result.status, 'activated');
  assert.equal(result.caseCount, size);
 }
 const loaded = readCertifiedCaseCatalog(JSON.parse(await fs.readFile(fixture.outputPath, 'utf8')), fixture.registries);
 assert.equal(loaded.cases.length, 160);
});

test('CLI help explains dry staging and explicit activation without importing runtime dependencies', () => {
 const result = spawnSync(process.execPath, ['scripts/import-clinical-case-pack.mjs', '--help'], {encoding: 'utf8'});
 assert.equal(result.status, 0);
 assert.match(result.stdout, /--pack/);
 assert.match(result.stdout, /--activate/);
 assert.match(result.stdout, /dry|stag/i);
});
