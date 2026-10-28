// Strict, browser-safe content compilation. This prepares a playable definition;
// only an injected runtime certification runner can certify clinical behavior.
import {validateVariation} from './patient-variation.js';

const compiledStates = new WeakMap();
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const stringList = value => Array.isArray(value) && value.length > 0 && value.every(text);
const references = [
 ['clinicalExecutorId', 'executors'], ['closurePolicyId', 'closurePolicies'],
 ['studyPolicyId', 'studyPolicies'], ['examPolicyId', 'examPolicies']
];
// Every action that a policy can request is an executable dependency, including
// bedside procedures and conducts. The historical registry slot is named
// `drugs`; a content marker alone cannot satisfy that execution contract.
export function clinicalCaseExecutableReferences(c) {
 const found = new Map();
 const add = (registry, id) => {
  if (text(id)) found.set(JSON.stringify([registry, id]), {registry, id});
 };
 const list = (registry, values) => {
  for (const value of Array.isArray(values) ? values : []) add(registry, value);
 };
 const policy = record(c?.clinicalPolicy) ? c.clinicalPolicy : {};
 for (const intervention of Array.isArray(c?.interventions) ? c.interventions : []) add('drugs', intervention?.id);
 list('drugs', c?.keyInterventions);
 add('drugs', policy.treatmentId);
 for (const field of ['regimens', 'eligibility', 'doNotDelay'])
  if (record(policy[field])) list('drugs', Object.keys(policy[field]));
 if (record(policy.eligibility)) for (const rule of Object.values(policy.eligibility)) {
  list('drugs', rule?.requiresCompletedTreatments);
  for (const prerequisite of Array.isArray(rule?.requiresStudiesAfterTreatments) ? rule.requiresStudiesAfterTreatments : [])
   add('drugs', prerequisite?.treatmentId);
 }
 for (const study of Array.isArray(c?.studies) ? c.studies : []) list('drugs', study?.requiresCompletedTreatments);
 list('drugs', policy.definitiveInterventions);
 for (const field of ['responses', 'observationResponses']) for (const response of Array.isArray(policy[field]) ? policy[field] : []) {
  list('drugs', response?.allOf); list('drugs', response?.anyOf);
 }
 const closure = record(policy.closure) ? policy.closure : {};
 for (const group of Array.isArray(closure.treatment) ? closure.treatment : []) list('drugs', group);
 list('drugs', closure.dischargeTreatments); list('drugs', closure.definitiveTreatmentIds);
 for (const allergy of Array.isArray(c?.variation?.allergies) ? c.variation.allergies : []) add('drugs', allergy?.drugId);
 const complications = [...(Array.isArray(policy.complications) ? policy.complications : []),
  ...(Array.isArray(c?.variation?.complications) ? c.variation.complications : [])];
 for (const complication of complications) {
  add('progressions', complication?.progressionId); add('rescues', complication?.rescueId);
  for (const key of ['rescueAllOf', 'rescueAnyOf', 'preventedBy', 'preventedByAllOf', 'preventedByAnyOf'])
   list('drugs', complication?.[key]);
 }
 return [...found.values()].sort((a, b) => a.registry.localeCompare(b.registry) || a.id.localeCompare(b.id));
}
const freeze = value => {
 if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  for (const item of Object.values(value)) freeze(item);
  Object.freeze(value);
 }
 return value;
};

// Canonical content is also retained privately. The short digest is an evidence
// correlation label, never an authentication token or a substitute for equality.
function canonicalJSON(value, active = new Set(), depth = 0) {
 if (depth > 100) throw Error('content nesting exceeds 100 levels');
 if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
 if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
 if ((!Array.isArray(value) && !record(value)) || active.has(value)) throw Error('content must be finite, acyclic plain JSON');
 active.add(value);
 if (Object.getOwnPropertySymbols(value).length) throw Error('content must use JSON string keys');
 const keys = Object.keys(value);
 if (keys.some(key => !('value' in Object.getOwnPropertyDescriptor(value, key)))) throw Error('content accessors are not JSON');
 let result;
 if (Array.isArray(value)) {
  if (keys.length !== value.length || keys.some((key, i) => key !== String(i))) throw Error('content arrays must be dense JSON arrays');
  result = '[' + value.map(item => canonicalJSON(item, active, depth + 1)).join(',') + ']';
 } else {
  result = '{' + keys.sort().map(key => JSON.stringify(key) + ':' + canonicalJSON(value[key], active, depth + 1)).join(',') + '}';
 }
 active.delete(value);
 return result;
}
function fingerprint(content) {
 let left = 2166136261, right = 3339675911;
 for (let i = 0; i < content.length; i++) {
  left = Math.imul(left ^ content.charCodeAt(i), 16777619);
  right = Math.imul(right ^ content.charCodeAt(i), 2246822519);
 }
 return 'casepack-v1-' + (left >>> 0).toString(16).padStart(8, '0') + (right >>> 0).toString(16).padStart(8, '0') + '-' + content.length;
}
function lookup(registry, id) {
 if (registry instanceof Map) return registry.get(id);
 return record(registry) && own(registry, id) ? registry[id] : undefined;
}
function bindingFor(registries, registryName, id) {
 const entry = lookup(registries?.[registryName], id);
 const execute = typeof entry === 'function' ? entry : entry?.execute;
 return {registry: registryName, id, entry, version: entry?.version, execute, validateCase: entry?.validateCase, eligible: entry?.eligible};
}
function changedBindingErrors(bindings, registries) {
 const errors = [];
 for (const expected of bindings) {
  try {
   const current = bindingFor(registries, expected.registry, expected.id);
   if (['entry', 'version', 'execute', 'validateCase', 'eligible'].some(key => current[key] !== expected[key])) errors.push('changed clinical dependency ' + expected.registry + '.' + expected.id);
  } catch (error) { errors.push('unreadable clinical dependency ' + expected.registry + '.' + expected.id + ': ' + error.message); }
 }
 return errors;
}
function resolveBinding(registries, registryName, id, c, at, errors, bindings) {
 let binding;
 try { binding = bindingFor(registries, registryName, id); }
 catch (error) { errors.push(at + ': unreadable ' + registryName + '.' + id + ': ' + error.message); return; }
 const label = at + ': ' + registryName + '.' + id;
 if (!binding.entry) { errors.push(label + ' is not registered as executable'); return; }
 if (!text(binding.version)) errors.push(label + ' requires a version');
 if (typeof binding.execute !== 'function') errors.push(label + ' requires an executable function');
 if (typeof binding.validateCase !== 'function') errors.push(label + ' requires validateCase');
 if (!text(binding.version) || typeof binding.execute !== 'function' || typeof binding.validateCase !== 'function') return;
 try {
  const validation = binding.validateCase.call(binding.entry, c);
  const issues = Array.isArray(validation) ? validation : validation?.errors;
  if (validation && typeof validation.then === 'function') {
   Promise.resolve(validation).catch(() => {});
   errors.push(label + ' validateCase must be synchronous');
  }
  else if (Array.isArray(issues)) {
   if (issues.length) errors.push(...issues.map(issue => label + ': ' + String(issue)));
   else if (validation?.ok === false) errors.push(label + ' rejected case');
  } else if (validation !== true && validation?.ok !== true) errors.push(label + ' rejected case');
 } catch (error) { errors.push(label + ': ' + (error?.message || String(error))); }
 bindings.push(binding);
}
function validateCollection(c, field, itemFields, at, errors) {
 if (!Array.isArray(c[field]) || !c[field].length) { errors.push(at + ': nonempty ' + field + ' required'); return new Set(); }
 const ids = new Set();
 for (const [index, item] of c[field].entries()) {
  const location = at + '.' + field + '[' + index + ']';
  if (!record(item)) { errors.push(location + ': object required'); continue; }
  if (!text(item.id)) errors.push(location + ': id required');
  else if (ids.has(item.id)) errors.push(location + ': duplicate id ' + item.id);
  else ids.add(item.id);
  for (const [key, validator] of Object.entries(itemFields)) if (!validator(item[key])) errors.push(location + ': invalid ' + key);
 }
 return ids;
}
function validateCase(c, at, errors, seen) {
 if (!record(c)) { errors.push(at + ': case object required'); return false; }
 if (!/^[A-Z][A-Z0-9-]{2,63}$/.test(c.id || '')) errors.push(at + ': invalid case id');
 else if (seen.has(c.id)) errors.push(at + ': duplicate/existing case ' + c.id);
 else seen.add(c.id);
 for (const key of ['specialty', 'selector', 'area', 'demo', 'chief', 'opening', 'exam', ...references.map(([field]) => field)]) {
  if (!text(c[key])) errors.push(at + ': missing ' + key);
 }
 if (!record(c.vitals)) errors.push(at + ': vitals object required');
 else {
  for (const key of ['temp', 'hr', 'rr', 'spo2']) if (!Number.isFinite(c.vitals[key]) || c.vitals[key] <= 0) errors.push(at + ': invalid vitals.' + key);
  if (c.vitals.spo2 > 100) errors.push(at + ': invalid vitals.spo2');
  const bp = typeof c.vitals.bp === 'string' && /^(\d{2,3})\/(\d{2,3})$/.exec(c.vitals.bp);
  if (!bp || Number(bp[1]) <= Number(bp[2]) || Number(bp[2]) <= 0) errors.push(at + ': invalid vitals.bp');
 }
 const intents = validateCollection(c, 'intents', {keys: stringList, answers: stringList, reveal: text}, at, errors);
 const studies = validateCollection(c, 'studies', {label: text, aliases: stringList, type: text, delay: n => Number.isFinite(n) && n >= 0, result: text}, at, errors);
 const interventions = validateCollection(c, 'interventions', {label: text, aliases: stringList}, at, errors);
 if (!stringList(c.dx)) errors.push(at + ': nonempty dx required');
 for (const [field, ids] of [['requiredHistory', intents], ['keyStudies', studies], ['keyInterventions', interventions]]) {
  if (!stringList(c[field])) errors.push(at + ': nonempty ' + field + ' required');
  else {
   if (new Set(c[field]).size !== c[field].length) errors.push(at + ': duplicate ' + field + ' reference');
   for (const id of c[field]) if (!ids.has(id)) errors.push(at + ': unknown ' + field + ' reference ' + id);
  }
 }
 if (!record(c.common)) errors.push(at + ': common object required');
 else {
  for (const key of ['name', 'age', 'arrival']) if (!text(c.common[key])) errors.push(at + ': common.' + key + ' required');
  for (const key of ['reason', 'current', 'concern', 'allergies', 'pmh', 'surgeries', 'meds', 'pain']) if (!stringList(c.common[key])) errors.push(at + ': common.' + key + ' required');
 }
 if (!record(c.anamnesis)) errors.push(at + ': anamnesis object required');
 else {
  for (const key of ['otherSymptoms', 'historySummary']) if (!text(c.anamnesis[key])) errors.push(at + ': anamnesis.' + key + ' required');
  for (const [key, value] of Object.entries(c.anamnesis)) if (!text(value)) errors.push(at + ': invalid anamnesis.' + key);
 }
 for (const issue of validateVariation(c.variation)) errors.push(at + ': ' + issue);
 if (c.variation && (!Array.isArray(c.variation.allergies) || !Array.isArray(c.variation.complications))) errors.push(at + ': variation allergies and complications arrays required');
 if (!record(c.clinicalPolicy) || !Object.keys(c.clinicalPolicy).length) errors.push(at + ': nonempty clinicalPolicy required');
 return true;
}
function rejected(errors) { return freeze({ok: false, status: 'rejected', errors, cases: []}); }

export function compileClinicalCasePack(pack, registries = {}) {
 let canonical, detached;
 try {
  canonical = canonicalJSON(pack);
  detached = JSON.parse(canonical);
 } catch (error) { return rejected([error.message]); }
 const errors = [], bindings = [];
 if (!record(detached) || detached.schemaVersion !== 1 || !Array.isArray(detached.cases) || !detached.cases.length) return rejected(['schemaVersion 1 and nonempty cases required']);
 if (typeof detached.packId !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(detached.packId) || detached.packId.length > 96) errors.push('invalid packId: lowercase letters, digits and hyphens required');
 if (!text(detached.version)) errors.push('pack version required');
 if (!Array.isArray(registries?.existingCaseIds ?? [])) errors.push('existingCaseIds must be an array');
 const seen = new Set(Array.isArray(registries?.existingCaseIds) ? registries.existingCaseIds : []);
 // Validators receive immutable detached content. A validator cannot rewrite a
 // case and accidentally certify different content than the author supplied.
 freeze(detached);
 for (const [index, c] of detached.cases.entries()) {
  const at = 'cases[' + index + ']';
  if (!validateCase(c, at, errors, seen)) continue;
  for (const [field, registry] of references) if (text(c[field])) resolveBinding(registries, registry, c[field], c, at, errors, bindings);
  for (const {registry, id} of clinicalCaseExecutableReferences(c)) resolveBinding(registries, registry, id, c, at, errors, bindings);
 }
 errors.push(...changedBindingErrors(bindings, registries));
 if (errors.length) return rejected(errors);
 const uniqueBindings = [...new Map(bindings.map(binding => [JSON.stringify([binding.registry, binding.id]), binding])).values()];
 const compiled = freeze({ok: true, status: 'compiled', schemaVersion: 1, packId: detached.packId,
  version: detached.version, digest: fingerprint(canonical), cases: detached.cases, errors: [],
  dependencies: uniqueBindings.map(({registry, id, version}) => ({registry, id, version}))});
 compiledStates.set(compiled, {canonical, bindings: uniqueBindings, pack: detached});
 return compiled;
}

// Recheck executable identities as well as advertised versions. Retained private
// canonical content prevents digest collisions from authorizing changed content.
export function validateCompiledClinicalCasePackDependencyIdentities(compiled, registries) {
 const state = compiledStates.get(compiled);
 return state ? changedBindingErrors(state.bindings, registries) : ['unrecognized compiled case pack'];
}

export function validateCompiledClinicalCasePackBindings(compiled, registries) {
 const state = compiledStates.get(compiled);
 if (!state) return ['unrecognized compiled case pack'];
 const errors = changedBindingErrors(state.bindings, registries);
 const recompiled = compileClinicalCasePack(state.pack, {...registries, existingCaseIds: []});
 if (!recompiled.ok) errors.push(...recompiled.errors);
 else if (compiledStates.get(recompiled).canonical !== state.canonical) errors.push('changed compiled content');
 errors.push(...changedBindingErrors(state.bindings, registries));
 return [...new Set(errors)];
}
