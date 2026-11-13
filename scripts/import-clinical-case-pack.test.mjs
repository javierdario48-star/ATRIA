import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {createServer} from 'node:http';
import {importClinicalCasePack,compactClinicalCertificationEvidence,DEFAULT_CERTIFIED_CASE_CATALOG_PATH} from './import-clinical-case-pack.mjs';
import {readCertifiedCaseCatalog} from '../src/v5/content/certified-case-catalog.js';
import {defineClinicalCase} from '../src/v5/content/clinical-case-definition.js';
import {loadContent} from '../src/v5/content/load.js';
import {casePack, playableCase, executableRegistries, passingEvidence} from '../src/v5/content/clinical-case-pack.test-helpers.js';
import {respiratoryPack} from '../src/v5/content/packs/respiratory-pack.js';
import {createGuardRuntime} from '../src/v5/clinical/guard-runtime.js';
import {createNavigation} from '../src/v5/engine/navigation.js';

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

async function temporaryImport(t) {
 const dir = await fs.mkdtemp(join(tmpdir(), 'atria-case-import-'));
 t.after(() => fs.rm(dir, {recursive: true, force: true}));
 const packPath = join(dir, 'incoming.json'), outputPath = join(dir, 'catalog.json');
 const writePack = pack => fs.writeFile(packPath, JSON.stringify(pack));
 return {dir, packPath, outputPath, writePack};
}

async function setup(t, registries = executableRegistries()) {
 const {dir, packPath, outputPath, writePack} = await temporaryImport(t);
 const certificationRunner = staged => ({...passingEvidence(staged), runnerId: 'controlled-test-fixture'});
 return {dir, packPath, outputPath, registries, writePack,
  dependencies: {registries, certificationRunner},
  run: (activate = false, dependencies = {}) => importClinicalCasePack({packPath, outputPath, activate}, {registries, certificationRunner, ...dependencies})};
}
test('the real importer reserves the original case identities before writing a catalog',async t=>{
 const f=await temporaryImport(t),pack=structuredClone(respiratoryPack);pack.cases=pack.cases.slice(0,1);
 pack.packId='legacy-collision';pack.cases[0].id='APP-001';await f.writePack(pack);
 const result=spawnSync(process.execPath,['scripts/import-clinical-case-pack.mjs','--pack',f.packPath,'--output',f.outputPath],{encoding:'utf8'});
 assert.equal(result.status,1);
 assert.match(result.stderr,/duplicate\/existing case APP-001/);
 await assert.rejects(fs.stat(f.outputPath),{code:'ENOENT'});
});

const respiratoryProofCaseId = 'RESP-56';
const respiratoryProofGasId = 'g_resp56_gas';
const respiratoryProofDiagnosis = 'exacerbación asmática por irritantes';

function respiratoryAdmissionPack() {
 const entry = defineClinicalCase({
  id: respiratoryProofCaseId, specialty: 'Respiratorio', title: 'Exacerbación asmática tras exposición a aerosol de limpieza',
  ageRange: [24, 47], chief: 'Tos seca, opresión torácica y disnea tras usar un aerosol de limpieza.',
  opening: 'Desde que usé el aerosol, siento que me cuesta sacar el aire.',
  history: {
   onset: 'La tos y la opresión empezaron hace una hora, al limpiar un baño con un aerosol.',
   pmh: 'Tengo asma desde la infancia. Nunca necesité intubación.',
   meds: 'Uso budesonida inhalada. El inhalador de rescate se me terminó ayer.',
   allergies: 'No conozco alergias a medicamentos.',
   risk: 'El baño estaba poco ventilado. No mezclé productos ni fumé.',
   symptoms: 'No tuve fiebre, ronchas ni hinchazón de labios.'
  },
  variation: {backgroundHistory: [
   {id: 'fractura-consolidada', history: {pmh: 'Tengo asma desde la infancia. Nunca necesité intubación. Hace cinco años me fracturé la muñeca y se curó sin secuelas.'}},
   {id: 'esguince-resuelto', history: {pmh: 'Tengo asma desde la infancia. Nunca necesité intubación. Hace tres años tuve un esguince de tobillo del que me recuperé por completo.'}}
  ]},
  vitals: {temp: 36.8, hr: 105, rr: 27, bp: '124/76', spo2: 91},
  examFindings: {
   appearance: 'Alerta y orientado, habla en frases cortas.', skin: 'Sin urticaria ni edema facial.',
   inspection: 'Espiración prolongada con uso leve de músculos accesorios.',
   palpation: 'Expansión torácica bilateral simétrica.', percussion: 'Sin matidez focal.',
   lungs: 'Sibilancias espiratorias bilaterales con entrada de aire conservada.', heart: 'Ritmo regular, sin soplos.'
  },
  studies: [{id: respiratoryProofGasId, label: 'Gasometría arterial', aliases: ['gasometría', 'gases arteriales'],
   type: 'lab', delay: 5, result: 'Aire ambiente: pH 7,44, PaCO2 34 mmHg, PaO2 62 mmHg, HCO3 22 mmol/L.',
   repeatable: true, dynamic: true}],
  dx: [respiratoryProofDiagnosis, 'crisis asmática'], differential: ['Neumonitis irritativa', 'Anafilaxia', 'Neumotórax'],
  requiredHistory: ['onset', 'pmh', 'meds', 'allergies'], keyStudies: [respiratoryProofGasId],
  interventionIds: ['oxygen', 'salbutamol'], keyInterventions: ['oxygen', 'salbutamol'],
  clinicalPolicy: {
   traits: ['bronchospasm'], oxygenTarget: [93, 95],
   trajectory: {early: [0, 2, 1, 0, 0, -1], late: [0, 9, 4, 0, 0, -4], earlyEnd: 12, lateEnd: 60, fluidResponse: 0},
   responses: [{allOf: ['salbutamol'], delay: 1, peak: 10, offsets: [0, -2, -5, 0, 0, 2]}],
   regimens: {salbutamol: {dose: {amount: 5, unit: 'mg', display: '5 mg nebulizados'}, route: 'inhaled', intervalMinutes: 20}},
   closure: {destinations: ['observacion'], treatment: [['oxygen', 'salbutamol']], requiredStudies: [respiratoryProofGasId],
    study: [], requiredExams: ['thorax:auscultation'],
    summary: 'Observación por broncoespasmo e hipoxemia tras inhalación de aerosol. Reevaluar el trabajo respiratorio y la necesidad de oxígeno después del tratamiento inicial.'},
   complications: []
  }
 });
 return casePack([entry], {packId: 'atria-respiratory-admission-proof'});
}

async function serveImportedCatalog(t, outputPath) {
 const contentDirectory = new URL('../src/v5/content/', import.meta.url);
 const server = createServer(async (request, response) => {
  const name = request.url?.match(/^\/([a-z-]+\.json)$/)?.[1];
  if (!name) return response.writeHead(404).end();
  try {
   const bytes = await fs.readFile(name === 'certified-case-packs.json' ? outputPath : new URL(name, contentDirectory));
   response.writeHead(200, {'content-type': 'application/json'}).end(bytes);
  } catch {
   response.writeHead(404).end();
  }
 });
 server.listen(0, '127.0.0.1');
 await once(server, 'listening');
 t.after(() => new Promise(resolve => server.close(resolve)));
 return new URL(`http://127.0.0.1:${server.address().port}/`);
}

async function exerciseImportedCase(t, content, mode, guardSelection) {
 const actorId = 'doctor', roomId = 'respiratory-import-proof';
 const members = [{id: actorId, name: 'Médico'}];
 if (mode === 'coop' || mode === 'competitive') members.push({id: 'colleague', name: 'Colega'});
 const config = {content, roomId, mode, hostId: actorId, members, guardSelection};
 let nowMs = 0, runtime = await createGuardRuntime({...config, nowMs});
 t.after(() => runtime.dispose());
 const state = () => runtime.view(actorId).clinical;
 const advance = async seconds => {
  nowMs += seconds * 1000;
  assert.equal((await runtime.advanceTo(nowMs)).recovering, false);
 };

 const initial = state(), {uid} = initial.patient;
 assert.equal(initial.patient.caseId, respiratoryProofCaseId);
 assert.deepEqual(initial.shift.guardSelection, {...guardSelection, multiplier: 1});
 assert.deepEqual(initial.shift.patients.map(row => row.caseId),
  mode === 'competitive' ? [respiratoryProofCaseId, respiratoryProofCaseId] : [respiratoryProofCaseId]);
 if(mode==='competitive')assert.deepEqual(initial.patient,{uid,caseId:respiratoryProofCaseId});
 const bed = content.beds.find(row => row.id === initial.shift.patients[0].bedId);
 const {x, y} = createNavigation(content.map).center(...bed.approach);
 assert(runtime.motion(actorId, [x, y], 1));
 await advance(20);
 assert(runtime.claim(actorId, uid));
 const {backgroundHistory,behavior}=state().patient;
 assert.match(backgroundHistory?.history?.pmh ?? '', /asma desde la infancia.*(?:fractur|esguince)/);
 assert(behavior);
 const send = (id, text) => runtime.post(actorId, {id, text, targetPatientUid: uid});

 await send('onset', '¿Desde cuándo empezó la falta de aire?');
 await send('history', '¿Antecedentes personales?');
 await send('meds', '¿Qué medicación toma?');
 await send('allergies', '¿Tiene alergias?');
 const history = state().patient.intentHistory;
 assert(history.some(row => row.source === 'patient.backgroundHistory' && row.answer === backgroundHistory.history.pmh));
 assert(history.some(row => row.id === 'onset' && /aerosol/.test(row.answer)));
 await send('vitals', '/signos');
 await send('exam', '/examen thorax auscultation');
 await send('diagnosis', '/diagnostico ' + respiratoryProofDiagnosis);

 const binding = state().hintBinding;
 const hint = await runtime.hint(actorId, {...binding, op: 'prepare', verify: true, requestId: 'gas-hint'});
 assert.equal(hint.status, 'verified');
 assert.equal(hint.action.kind, 'study');
 assert.equal(hint.action.id, respiratoryProofGasId);
 const display = {...binding, op: 'displayed', offerId: hint.offerId, requestId: 'gas-hint-displayed'};
 assert.equal((await runtime.hint(actorId, display)).hintCount, 1);
 assert.equal((await runtime.hint(actorId, display)).hintCount, 1);

 const firstOrder = await send('first-gas', 'Enfermera gasometría');
 assert.deepEqual(firstOrder.clinical.map(row => [row.id, row.status]), [[respiratoryProofGasId, 'pending']]);
 await advance(6);
 const [first] = state().patient.orders;
 assert.equal(first.patientUid, uid);
 assert.equal(first.status, 'done');
 assert.equal(first.resultSource, 'native');
 assert.match(first.result, /PaCO2 34 mmHg/);

 const beforeCare = state().patient.liveVitals;
 for (const [id, phrase] of [['oxygen', 'Enfermera oxígeno 4 L/min'], ['salbutamol', 'Enfermera salbutamol 5 mg nebulizados']]) {
  const ordered = await send(id, phrase);
  assert.deepEqual(ordered.clinical.map(row => [row.id, row.status]), [[id, 'pending']]);
 }
 assert.deepEqual(state().patient.administrationLog, []);
 assert.deepEqual(state().patient.liveVitals, beforeCare);
 await advance(40);
 const treated = state().patient;
 assert.deepEqual(treated.administrationLog.map(row => row.id).sort(), ['oxygen', 'salbutamol']);
 assert(treated.liveVitals.spo2 > beforeCare.spo2);
 const [oxygen, salbutamol] = ['oxygen', 'salbutamol'].map(id => treated.treatments.find(row => row.id === id));
 for (const care of [oxygen, salbutamol]) {
  assert.equal(care?.patientUid, uid);
  assert(care.administeredAtNativeMinute > first.sampledAtNativeMinute);
 }
 assert.equal(salbutamol.dose.amount, 5);

 const repeatOrder = await send('repeat-gas', 'Enfermera gases arteriales');
 assert.deepEqual(repeatOrder.clinical.map(row => [row.id, row.status]), [[respiratoryProofGasId, 'pending']]);
 await advance(6);
 const orders = state().patient.orders;
 assert.equal(orders.length, 2);
 assert.deepEqual(orders[0], first);
 const second = orders[1];
 assert.equal(second.id, respiratoryProofGasId);
 assert.equal(second.patientUid, uid);
 assert.equal(second.status, 'done');
 assert.equal(second.resultSource, 'native');
 assert(second.sampledAtNativeMinute > Math.max(oxygen.administeredAtNativeMinute, salbutamol.administeredAtNativeMinute));
 assert.notEqual(second.sourceEventId, first.sourceEventId);
 assert.notEqual(second.result, first.result);

 const saved = JSON.parse(JSON.stringify(await runtime.checkpoint()));
 const restored = await createGuardRuntime({...config, nowMs, checkpoint: saved});
 runtime.dispose();
 runtime = restored;
 assert.deepEqual(state().patient.backgroundHistory, backgroundHistory);
 assert.deepEqual(state().patient.intentHistory, history);
 assert.deepEqual(state().patient.orders, orders);
 assert.equal(state().hintCount, 1);
 const replayedStudy = await send('first-gas', 'Enfermera gasometría');
 assert.equal(replayedStudy.clinical[0].receipt.sourceEventId, first.sourceEventId);
 assert.equal(replayedStudy.clinical[0].receipt.result, first.result);
 assert.deepEqual(state().patient.orders, orders);

 await send('reassess', '/reevaluar');
 const closePhrase = 'Enfermera derivar a observación';
 const closure = await send('close', closePhrase);
 const closed = runtime.view(actorId);
 const receipt = closure.clinical[0]?.receipt?.closure;
 assert.equal(receipt?.closed, true, JSON.stringify(closed.clinical.closure));
 assert.equal(receipt.destination, 'observacion');
 assert.equal(receipt.patientUid, uid);
 assert(receipt.xp > 0);
 const xpReceipts = closed.clinical.progress.receipts.filter(row => row.patientUid === uid);
 assert.deepEqual(xpReceipts.map(row => row.eventId), [receipt.eventId]);
 const claims = closed.claims.map(([, claim]) => claim).filter(claim => claim.patientUid === uid);
 assert.deepEqual(claims.map(claim => claim.actorId), mode === 'coop' ? [actorId, 'colleague'] : [actorId]);
 assert(claims.every(claim => claim.eventId === receipt.eventId && claim.xp > 0));
 assert.deepEqual(claims[0], closed.clinical.caseReward);
 assert.equal(claims[0].hintCount, 1);
 assert.deepEqual(await send('close', closePhrase), closure);
 assert.deepEqual(runtime.view(actorId).claims, closed.claims);
 assert.deepEqual(state().progress.receipts, closed.clinical.progress.receipts);
}

test('real CLI certification makes an additional respiratory case selectable in all four guard modes', async t => {
 const {packPath, outputPath, writePack} = await temporaryImport(t);
 const originalCatalog = await fs.readFile(DEFAULT_CERTIFIED_CASE_CATALOG_PATH);
 await fs.writeFile(outputPath, originalCatalog);
 const base = await serveImportedCatalog(t, outputPath);
 const before = await loadContent(base);
 const guardSelection = {scope: 'specific', selection: respiratoryProofCaseId};
 await assert.rejects(createGuardRuntime({content: before, roomId: 'proof-before-import', mode: 'solo', nowMs: 0,
  hostId: 'doctor', members: [{id: 'doctor', name: 'Médico'}], guardSelection}), {code: 'invalid'});

 const pack = respiratoryAdmissionPack();
 await writePack(pack);
 const result = spawnSync(process.execPath, ['scripts/import-clinical-case-pack.mjs', '--pack', packPath,
  '--output', outputPath, '--activate'], {encoding: 'utf8'});
 assert.equal(result.status, 0, result.stderr || result.error?.message);
 const summary = JSON.parse(result.stdout);
 assert.equal(summary.status, 'activated');
 assert.equal(summary.caseCount, 1);
 const stored = JSON.parse(await fs.readFile(outputPath, 'utf8')).packs.find(row => row.pack.packId === pack.packId);
 assert(stored, 'the catalog contains the newly certified pack');
 const [evidence] = stored.evidence.evidence;
 assert.equal(evidence.caseId, respiratoryProofCaseId);
 assert.equal(evidence.authority, 'createGuardRuntime');
 assert.equal(evidence.passed, true);
 assert.equal(evidence.integrityChecks.nursing, true);
 assert.equal(evidence.integrityChecks.persistence, true);
 assert.deepEqual(evidence.xpReceipts.map(row => row.eventId), [evidence.closureReceipt.eventId]);

 const content = await loadContent(base);
 assert.deepEqual(content.cases.map(row => row.id), [...before.cases.map(row => row.id), respiratoryProofCaseId]);
 assert.deepEqual(await fs.readFile(DEFAULT_CERTIFIED_CASE_CATALOG_PATH), originalCatalog);
 for (const mode of ['solo', 'apprentice', 'coop', 'competitive']) {
  await t.test(mode, subtest => exerciseImportedCase(subtest, content, mode, guardSelection));
 }
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
