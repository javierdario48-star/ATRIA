// A committed developer-generated audit artifact is data, not an activation
// capability. Loading it repeats strict content/dependency/evidence validation;
// it never creates registry certificates or accepts browser activation requests.
import {compileClinicalCasePack, validateCompiledClinicalCasePackDependencyIdentities} from './compile-clinical-case-pack.js';
import {validateClinicalCaseCertificationEvidence} from './clinical-case-registry.js';

export const CERTIFIED_CASE_CATALOG_SCHEMA_VERSION = 1;
export const CERTIFIED_CASE_CATALOG_KIND = 'atria-certified-case-catalog';
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function freeze(value) {
 if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  for (const item of Object.values(value)) freeze(item);
  Object.freeze(value);
 }
 return value;
}
function detachedJSON(value) {
 const active = new Set();
 function verify(item, depth = 0) {
  if (depth > 100) throw Error('catalog nesting exceeds 100 levels');
  if (item === null || ['string', 'boolean'].includes(typeof item) || (typeof item === 'number' && Number.isFinite(item))) return;
  if ((!Array.isArray(item) && !plain(item)) || active.has(item)) throw Error('catalog must be acyclic plain JSON');
  if (Object.getOwnPropertySymbols(item).length) throw Error('catalog must use JSON string keys');
  active.add(item);
  const keys = Object.keys(item);
  if (keys.some(key => !('value' in Object.getOwnPropertyDescriptor(item, key)))) throw Error('catalog accessors are not JSON');
  if (Array.isArray(item) && (keys.length !== item.length || keys.some((key, i) => key !== String(i)))) throw Error('catalog arrays must be dense');
  for (const child of Object.values(item)) verify(child, depth + 1);
  active.delete(item);
 }
 verify(value);
 return JSON.parse(JSON.stringify(value));
}
function dependencyErrors(stored, current) {
 if (!Array.isArray(stored)) return ['certified dependency versions required'];
 const expected = new Map(current.map(item => [JSON.stringify([item.registry, item.id]), item.version]));
 const seen = new Set(), errors = [];
 for (const item of stored) {
  if (!plain(item)) { errors.push('malformed certified dependency'); continue; }
  const key = JSON.stringify([item.registry, item.id]);
  if (seen.has(key) || !expected.has(key) || item.version !== expected.get(key)) errors.push('changed/duplicate certified dependency ' + item.registry + '.' + item.id);
  seen.add(key);
 }
 for (const [key] of expected) if (!seen.has(key)) errors.push('missing certified dependency ' + key);
 return errors;
}
const rejected = errors => freeze({ok: false, cases: [], packs: [], errors});

/** Validate trusted committed catalog JSON; this does not authorize activation. */
export function readCertifiedCaseCatalog(artifact, registries) {
 let detached;
 try { detached = detachedJSON(artifact); }
 catch (error) { return rejected([error.message]); }
 if (!plain(detached) || detached.schemaVersion !== CERTIFIED_CASE_CATALOG_SCHEMA_VERSION || detached.kind !== CERTIFIED_CASE_CATALOG_KIND || !Array.isArray(detached.packs)) {
  return rejected(['certified case catalog schemaVersion 1, kind and packs array required']);
 }
 if (!Array.isArray(registries?.existingCaseIds ?? [])) return rejected(['existingCaseIds must be an array']);
 const existing = [...(registries?.existingCaseIds || [])], seenPacks = new Set();
 const errors = [], cases = [], packs = [], compiledPacks = [];
 for (const [index, stored] of detached.packs.entries()) {
  const at = 'packs[' + index + ']';
  if (!plain(stored)) { errors.push(at + ': certified pack record required'); continue; }
  const compiled = compileClinicalCasePack(stored.pack, {...registries, existingCaseIds: existing});
  if (!compiled.ok) { errors.push(...compiled.errors.map(issue => at + ': ' + issue)); continue; }
  compiledPacks.push({compiled, at});
  if (seenPacks.has(compiled.packId)) errors.push(at + ': duplicate active packId ' + compiled.packId);
  seenPacks.add(compiled.packId);
  if (stored.digest !== compiled.digest) errors.push(at + ': changed certified content digest');
  errors.push(...dependencyErrors(stored.dependencies, compiled.dependencies).map(issue => at + ': ' + issue));
  errors.push(...validateClinicalCaseCertificationEvidence(stored.evidence, compiled).map(issue => at + ': ' + issue));
  cases.push(...compiled.cases);
  existing.push(...compiled.cases.map(c => c.id));
  packs.push({packId: compiled.packId, version: compiled.version, digest: compiled.digest,
   caseIds: compiled.cases.map(c => c.id), dependencies: compiled.dependencies, evidence: stored.evidence});
 }
 // A later pack's validator can change an earlier pack's dependency. Compare
 // every retained binding after all validators finish, without invoking them
 // again and giving a later validator another opportunity to invalidate it.
 for (const {compiled, at} of compiledPacks)
  errors.push(...validateCompiledClinicalCasePackDependencyIdentities(compiled, registries).map(issue => at + ': ' + issue));
 return errors.length ? rejected(errors) : freeze({ok: true, cases, packs, errors: []});
}
