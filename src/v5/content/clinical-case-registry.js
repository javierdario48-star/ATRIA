// The active catalog is one immutable pointer. Compilation and injected guard
// certification happen off-catalog; activation publishes one complete snapshot.
import {compileClinicalCasePack, validateCompiledClinicalCasePackBindings} from './compile-clinical-case-pack.js';

export const CLINICAL_CASE_CERTIFICATION_CHECKS = Object.freeze(['history', 'exam', 'studies', 'treatment', 'trajectory', 'closure', 'xp']);
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
function freeze(value) {
 if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  for (const item of Object.values(value)) freeze(item);
  Object.freeze(value);
 }
 return value;
}
function copyJSON(value) {
 const active = new Set();
 function verify(item, depth = 0) {
  if (depth > 100) throw Error('evidence nesting exceeds 100 levels');
  if (item === null || ['string', 'boolean'].includes(typeof item) || (typeof item === 'number' && Number.isFinite(item))) return;
  if ((!Array.isArray(item) && !plain(item)) || active.has(item)) throw Error('evidence must be acyclic plain JSON');
  if (Object.getOwnPropertySymbols(item).length) throw Error('evidence must use JSON string keys');
  active.add(item);
  const keys = Object.keys(item);
  if (keys.some(key => !('value' in Object.getOwnPropertyDescriptor(item, key)))) throw Error('evidence accessors are not JSON');
  if (Array.isArray(item) && (keys.length !== item.length || keys.some((key, i) => key !== String(i)))) throw Error('evidence arrays must be dense');
  for (const child of Object.values(item)) verify(child, depth + 1);
  active.delete(item);
 }
 verify(value);
 return JSON.parse(JSON.stringify(value));
}
const rejected = errors => freeze({ok: false, status: 'rejected', errors, cases: []});
function snapshotOf(revision, cases, packs) {
 const caseById = Object.create(null);
 for (const c of cases) {
  if (!plain(c) || typeof c.id !== 'string' || !/^[A-Z][A-Z0-9-]{2,63}$/.test(c.id)) throw Error('invalid initial catalog case id');
  if (own(caseById, c.id)) throw Error('duplicate initial catalog case ' + c.id);
  caseById[c.id] = c;
 }
 return freeze({revision, cases, caseById, packs});
}
export function validateClinicalCaseCertificationEvidence(result, staged) {
 const errors = [];
 if (!plain(result) || result.ok !== true) return ['clinical certification runner did not pass'];
 for (const key of ['packId', 'version', 'digest']) if (result[key] !== staged[key]) errors.push('certification ' + key + ' does not match staged pack');
 if (!Array.isArray(result.evidence)) return [...errors, 'per-case clinical evidence required'];
 const expected = new Set(staged.cases.map(c => c.id)), seen = new Set();
 for (const item of result.evidence) {
  if (!plain(item) || !expected.has(item.caseId) || seen.has(item.caseId)) { errors.push('unknown or duplicate certification case'); continue; }
  seen.add(item.caseId);
  if (item.passed !== true) errors.push(item.caseId + ': clinical runner failed');
  for (const check of CLINICAL_CASE_CERTIFICATION_CHECKS) if (!plain(item.checks) || item.checks[check] !== true) errors.push(item.caseId + ': missing/failed certification check ' + check);
 }
 for (const id of expected) if (!seen.has(id)) errors.push('missing clinical evidence for ' + id);
 return errors;
}

/**
 * Registry integration boundary:
 * - stage(pack) compiles without mutating getSnapshot().
 * - certify(staged, runner) awaits actual runtime evidence for every case.
 * - activate(certificate) atomically appends the complete certified batch.
 * Certificates are owner-bound capabilities, valid only in this process. A
 * serialized result remains an audit artifact and cannot authorize activation.
 */
export function createClinicalCaseRegistry({registries, initialCases = []} = {}) {
 if (!registries || typeof registries !== 'object') throw Error('clinical executable registries required');
 if (!Array.isArray(initialCases)) throw Error('initialCases must be an array');
 let snapshot = snapshotOf(0, copyJSON(initialCases), []);
 const stagedRecords = new WeakMap(), certificates = new WeakMap();
 const conflicts = staged => {
  const errors = [];
  const reserved = registries.existingCaseIds;
  if (reserved !== undefined && !Array.isArray(reserved)) errors.push('existingCaseIds must be an array');
  if (snapshot.packs.some(pack => pack.packId === staged.packId)) errors.push('pack already active: ' + staged.packId);
  for (const c of staged.cases)
   if (own(snapshot.caseById, c.id) || (Array.isArray(reserved) && reserved.includes(c.id))) errors.push('duplicate/existing case ' + c.id);
  return errors;
 };
 function stage(pack) {
  if (registries.existingCaseIds !== undefined && !Array.isArray(registries.existingCaseIds)) return rejected(['existingCaseIds must be an array']);
  const compiled = compileClinicalCasePack(pack, {...registries, existingCaseIds: [...(registries.existingCaseIds || []), ...snapshot.cases.map(c => c.id)]});
  if (!compiled.ok) return compiled;
  const collision = conflicts(compiled);
  if (collision.length) return rejected(collision);
  const staged = freeze({...compiled, status: 'staged'});
  stagedRecords.set(staged, {compiled, state: 'staged'});
  return staged;
 }
 async function certify(staged, runner) {
  const record = stagedRecords.get(staged);
  if (!record || record.state !== 'staged') return rejected(['unrecognized or unavailable staged case pack']);
  if (typeof runner !== 'function') return rejected(['real clinical certification runner required']);
  let errors = [...validateCompiledClinicalCasePackBindings(record.compiled, registries), ...conflicts(staged)];
  if (errors.length) return rejected(errors);
  record.state = 'certifying';
  let evidence;
  try {
   evidence = copyJSON(await runner(staged));
   errors = [...validateClinicalCaseCertificationEvidence(evidence, staged), ...validateCompiledClinicalCasePackBindings(record.compiled, registries), ...conflicts(staged)];
  } catch (error) { errors = ['clinical certification runner: ' + (error?.message || String(error))]; }
  if (errors.length) { record.state = 'staged'; return rejected(errors); }
  const certificate = freeze({...staged, status: 'certified', evidence});
  record.state = 'certified';
  certificates.set(certificate, record);
  return certificate;
 }
 function activate(certificate) {
  const record = certificates.get(certificate);
  if (!record || record.state !== 'certified') return rejected(['owning registry certification required']);
  const errors = [...validateCompiledClinicalCasePackBindings(record.compiled, registries), ...conflicts(certificate)];
  if (errors.length) return rejected(errors);
  let next;
  try {
   const manifest = {packId: certificate.packId, version: certificate.version, digest: certificate.digest, caseIds: certificate.cases.map(c => c.id)};
   next = snapshotOf(snapshot.revision + 1, [...snapshot.cases, ...certificate.cases], [...snapshot.packs, manifest]);
  } catch (error) { return rejected(['catalog activation failed: ' + error.message]); }
  // No callbacks or awaits between constructing and publishing this snapshot.
  snapshot = next;
  record.state = 'activated';
  return freeze({ok: true, status: 'activated', errors: [], snapshot});
 }
 return Object.freeze({stage, certify, activate, getSnapshot: () => snapshot});
}
