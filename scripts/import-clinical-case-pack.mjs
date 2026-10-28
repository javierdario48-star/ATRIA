#!/usr/bin/env node
// Developer-only authoring command. No HTTP route or browser evidence can invoke
// activation: this process owns staging, the runtime runner and the certificate.
import * as fs from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import {basename, dirname, resolve} from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {createClinicalCaseRegistry} from '../src/v5/content/clinical-case-registry.js';
import {readCertifiedCaseCatalog, CERTIFIED_CASE_CATALOG_KIND, CERTIFIED_CASE_CATALOG_SCHEMA_VERSION} from '../src/v5/content/certified-case-catalog.js';

export const DEFAULT_CERTIFIED_CASE_CATALOG_PATH = fileURLToPath(new URL('../src/v5/content/certified-case-packs.json', import.meta.url));
const emptyCatalog = () => ({schemaVersion: CERTIFIED_CASE_CATALOG_SCHEMA_VERSION, kind: CERTIFIED_CASE_CATALOG_KIND, packs: []});
const rejected = errors => ({ok: false, status: 'rejected', errors});

async function writeAtomically(outputPath, bytes, fileSystem) {
 const temporaryPath = resolve(dirname(outputPath), '.' + basename(outputPath) + '.' + process.pid + '.' + randomUUID() + '.tmp');
 let handle;
 try {
  handle = await fileSystem.open(temporaryPath, 'wx', 0o644);
  await handle.writeFile(bytes, 'utf8');
  await handle.sync();
  await handle.close();
  handle = undefined;
  // The temporary file shares the destination directory/filesystem. Until this
  // final operation succeeds the existing catalog bytes remain untouched.
  await fileSystem.rename(temporaryPath, outputPath);
 } finally {
  if (handle) await handle.close().catch(() => {});
  await fileSystem.unlink(temporaryPath).catch(() => {});
 }
}

/** Testable orchestration; production CLI dependencies are imported in main. */
export async function importClinicalCasePack({packPath, outputPath = DEFAULT_CERTIFIED_CASE_CATALOG_PATH, activate = false} = {}, {registries, certificationRunner, fileSystem = fs} = {}) {
 if (typeof packPath !== 'string' || !packPath.trim()) return rejected(['--pack JSON file required']);
 if (typeof outputPath !== 'string' || !outputPath.trim()) return rejected(['--output path required']);
 const absolutePackPath = resolve(packPath), absoluteOutputPath = resolve(outputPath);
 if (absolutePackPath === absoluteOutputPath) return rejected(['pack input and catalog output must be different files']);
 const lockPath = absoluteOutputPath + '.lock';
 let lock;
 try {
  let pack;
  try { pack = JSON.parse(await fileSystem.readFile(absolutePackPath, 'utf8')); }
  catch (error) { return rejected(['cannot read case pack: ' + error.message]); }
  if (activate) {
   await fileSystem.mkdir(dirname(absoluteOutputPath), {recursive: true});
   try { lock = await fileSystem.open(lockPath, 'wx', 0o644); }
   catch (error) {
    if (error.code === 'EEXIST') return rejected(['catalog lock exists; another import may be running: ' + lockPath]);
    throw error;
   }
  }
  let artifact;
  try { artifact = JSON.parse(await fileSystem.readFile(absoluteOutputPath, 'utf8')); }
  catch (error) {
   if (error.code === 'ENOENT') artifact = emptyCatalog();
   else return rejected(['cannot read existing certified catalog: ' + error.message]);
  }
  const catalog = readCertifiedCaseCatalog(artifact, registries);
  if (!catalog.ok) return rejected(catalog.errors.map(error => 'existing catalog: ' + error));
  if (catalog.packs.some(current => current.packId === pack?.packId)) return rejected(['pack already active: ' + pack.packId]);
  const registry = createClinicalCaseRegistry({registries, initialCases: catalog.cases});
  const staged = registry.stage(pack);
  if (!staged.ok) return rejected(staged.errors);
  const summary = {packId: staged.packId, version: staged.version, digest: staged.digest,
   caseCount: staged.cases.length, outputPath: absoluteOutputPath};
  if (!activate) return {ok: true, status: 'staged', errors: [], ...summary, catalogCaseCount: catalog.cases.length};
  const certificate = await registry.certify(staged, certificationRunner);
  if (certificate.status !== 'certified') return rejected(certificate.errors);
  const activation = registry.activate(certificate);
  if (activation.status !== 'activated') return rejected(activation.errors);
  const nextArtifact = {...artifact, packs: [...artifact.packs, {
   // Preserve the exact raw pack, including author metadata covered by digest.
   pack, digest: certificate.digest, dependencies: certificate.dependencies, evidence: certificate.evidence
  }]};
  const finalCatalog = readCertifiedCaseCatalog(nextArtifact, registries);
  if (!finalCatalog.ok) return rejected(finalCatalog.errors.map(error => 'activated artifact: ' + error));
  await writeAtomically(absoluteOutputPath, JSON.stringify(nextArtifact, null, 2) + '\n', fileSystem);
  return {ok: true, status: 'activated', errors: [], ...summary, catalogCaseCount: finalCatalog.cases.length};
 } catch (error) { return rejected(['case pack import failed: ' + (error?.message || String(error))]); }
 finally {
  if (lock) {
   await lock.close().catch(() => {});
   await fileSystem.unlink(lockPath).catch(() => {});
  }
 }
}

const usage = `Usage: node scripts/import-clinical-case-pack.mjs --pack CASES.json [--output CATALOG.json] [--activate]

Default: compile and dry-stage the complete pack without writing a catalog.
--activate runs the real guard-session certification, activates the whole pack,
then atomically writes the catalog. Existing active pack identities are immutable.
Default output: src/v5/content/certified-case-packs.json
`;
function parseArguments(argv) {
 const options = {}, seen = new Set();
 for (let index = 0; index < argv.length; index++) {
  const flag = argv[index];
  if (flag === '--help' || flag === '-h') return {help: true};
  if (!['--pack', '--output', '--activate'].includes(flag)) throw Error('unknown argument: ' + flag);
  if (seen.has(flag)) throw Error('duplicate argument: ' + flag);
  seen.add(flag);
  if (flag === '--activate') options.activate = true;
  else {
   const value = argv[++index];
   if (!value || value.startsWith('--')) throw Error('value required for ' + flag);
   options[flag === '--pack' ? 'packPath' : 'outputPath'] = value;
  }
 }
 if (!options.packPath) throw Error('--pack JSON file required');
 return options;
}

export async function runClinicalCasePackCli(argv = process.argv.slice(2)) {
 let options;
 try { options = parseArguments(argv); }
 catch (error) { process.stderr.write(error.message + '\n' + usage); return 2; }
 if (options.help) { process.stdout.write(usage); return 0; }
 try {
  const {CLINICAL_POLICY_REGISTRIES} = await import('../src/v5/clinical/clinical-policy-registry.js');
  const certificationRunner = options.activate ? (await import('../qa/v5/certify-clinical-cases.mjs')).certifyClinicalCases : undefined;
  const result = await importClinicalCasePack(options, {registries: CLINICAL_POLICY_REGISTRIES, certificationRunner});
  (result.ok ? process.stdout : process.stderr).write(JSON.stringify(result, null, 2) + '\n');
  return result.ok ? 0 : 1;
 } catch (error) { process.stderr.write(JSON.stringify(rejected(['clinical runtime import failed: ' + error.message]), null, 2) + '\n'); return 1; }
}
if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) process.exitCode = await runClinicalCasePackCli();
