// Versioned bindings to the existing clinical owners. Compilation checks their
// executable identities; these descriptors never grant activation or rewards.
import {CLINICAL_TREATMENTS} from '../content/clinical-treatment-definitions.js';
import {clinicalCaseExecutableReferences} from '../content/compile-clinical-case-pack.js';
import {createAdditionalCaseCare} from './additional-case-care.js';
import {evaluateClinicalPolicyDisposition} from './clinical-policy-closure.js';
import {createStudyService} from './studies.js';
import {executePhysicalExam} from './physical-exam.js';
import {EXAM_REGIONS} from './exam-contract.js';
import {IV_MEDICINES} from './native-medications.js';
import {GASTRO_CASE_CONDUCTS} from './gastro-expansion-policies.js';
import {CLINICAL_CONSULT_SERVICES} from './surgical-consultation.js';
import {complicationStateEligible, progressClinicalComplication, rescueClinicalComplication} from './clinical-policy-effects.js';

const text = value => typeof value === 'string' && value.trim().length > 0;
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const strings = (value, empty = false) => Array.isArray(value) && (empty || value.length > 0) && value.every(text) && new Set(value).size === value.length;
const nonnegative = value => Number.isFinite(value) && value >= 0;
const positive = value => Number.isFinite(value) && value > 0;
const destinations = new Set(['alta', 'observacion', 'sala', 'uti', 'quirofano', 'procedimiento']);
const axes = new Set(['temp', 'hr', 'rr', 'sys', 'dia', 'spo2', 'map']);
const services = new Set(CLINICAL_CONSULT_SERVICES);
const nativeActions = new Set([...Object.keys(IV_MEDICINES), ...Object.keys(CLINICAL_TREATMENTS),
 ...Object.values(GASTRO_CASE_CONDUCTS).flat(), 'iv', 'monitor', 'oxygen', 'steroid', 'aza', 'ngt', 'staging_order']);
const supportedExamination = id => {
 if (['heart:auscultation', 'lungs:auscultation', 'neurological:all'].includes(id)) return true;
 const [region, technique, extra] = String(id).split(':');
 return !extra && !!EXAM_REGIONS[region]?.techniques?.includes(technique);
};
const vector = value => Array.isArray(value) && value.length === 6 && value.every((n, i) => Number.isFinite(n) && Math.abs(n) <= [10, 180, 80, 250, 160, 100][i]);
function actionList(value, label, errors, empty = false) {
 if (!strings(value, empty)) { errors.push('invalid ' + label); return; }
 for (const id of value) if (!nativeActions.has(id)) errors.push('unknown executable treatment ' + id + ' in ' + label);
}
function studyReferences(value, c, label, errors, empty = true) {
 if (!strings(value, empty)) { errors.push('invalid ' + label); return; }
 const ids = new Set((c.studies || []).map(row => row?.id));
 for (const id of value) if (!ids.has(id)) errors.push('unknown study ' + id + ' in ' + label);
}
function validateStudies(c) {
 const errors = [];
 if (!Array.isArray(c?.studies) || !c.studies.length) return ['executable case studies required'];
 for (const study of c.studies){
  if (!text(study?.id) || !text(study?.result) || !['lab', 'imaging', 'procedure'].includes(study?.type) ||
   !Number.isFinite(study?.delay) || study.delay < 5 || study.delay > 1440) errors.push('invalid executable study ' + study?.id);
  if(study?.requiresCompletedTreatments!==undefined)actionList(study.requiresCompletedTreatments,'study.'+study.id+'.requiresCompletedTreatments',errors);
 }
 const policy = c.clinicalPolicy || {};
 for (const [id, eligibility] of Object.entries(policy.eligibility || {}))
  if (eligibility?.requiredStudies !== undefined) studyReferences(eligibility.requiredStudies, c, 'eligibility.' + id + '.requiredStudies', errors);
 if (policy.doNotDelayTreatmentFor !== undefined) studyReferences(policy.doNotDelayTreatmentFor, c, 'doNotDelayTreatmentFor', errors);
 for (const [id, refs] of Object.entries(policy.doNotDelay || {})) studyReferences(refs, c, 'doNotDelay.' + id, errors);
 return errors;
}
function validateExaminations(c) {
 const required = c?.clinicalPolicy?.closure?.requiredExams;
 return required === undefined ? [] : !strings(required, true) ? ['invalid requiredExams'] :
  required.filter(id => !supportedExamination(id)).map(id => 'unknown executable examination ' + id);
}
function validateClosure(c) {
 const errors = [], rule = c?.clinicalPolicy?.closure;
 if (!record(rule)) return ['clinical closure policy required'];
 if (!strings(rule.destinations) || rule.destinations.some(id => !destinations.has(id))) errors.push('invalid closure destinations');
 if (!Array.isArray(rule.treatment) || !rule.treatment.length) errors.push('nonempty closure treatment alternatives required');
 else for (const [i, group] of rule.treatment.entries()) actionList(group, 'closure.treatment[' + i + ']', errors);
 studyReferences(rule.requiredStudies, c, 'closure.requiredStudies', errors);
 if (!Array.isArray(rule.study)) errors.push('closure study alternatives required');
 else for (const [i, group] of rule.study.entries()) studyReferences(group, c, 'closure.study[' + i + ']', errors, false);
 errors.push(...validateExaminations(c));
 if (!(rule.requiredStudies?.length || rule.study?.length || rule.requiredExams?.length)) errors.push('meaningful diagnostic closure evidence required');
 if (!text(rule.summary)) errors.push('clinical closure summary required');
 if (rule.minimumObservationMinutes !== undefined && (!nonnegative(rule.minimumObservationMinutes) || rule.minimumObservationMinutes > 10080)) errors.push('invalid minimumObservationMinutes');
 if (rule.urgentStudyBypass !== undefined && typeof rule.urgentStudyBypass !== 'boolean') errors.push('invalid urgentStudyBypass');
 if (rule.consult !== undefined && !record(rule.consult)) errors.push('invalid closure receiver policy');
 else for (const [destination, receivers] of Object.entries(rule.consult || {}))
  if (!rule.destinations?.includes(destination) || !strings(receivers) || receivers.some(id => !services.has(id))) errors.push('invalid closure receiver ' + destination);
 for (const destination of Array.isArray(rule.destinations) ? rule.destinations : [])
  if (['sala', 'uti', 'quirofano', 'procedimiento'].includes(destination) && !strings(rule.consult?.[destination])) errors.push('accepting closure receiver required for ' + destination);
 for (const field of ['dischargeTreatments', 'definitiveTreatmentIds']) if (rule[field] !== undefined) actionList(rule[field], 'closure.' + field, errors, true);
 return errors;
}
function validateComplications(c) {
 const errors = [], policy = c?.clinicalPolicy || {}, seen = new Set();
 if (!Array.isArray(policy.complications)) return ['clinical complications array required'];
 for (const complication of policy.complications) {
  const id = complication?.id;
  if (!text(id) || seen.has(id)) errors.push('invalid/duplicate complication id');
  seen.add(id);
  if (complication?.progressionId !== 'offset-ramp-v1' || complication?.rescueId !== 'confirmed-rescue-v1') errors.push('unregistered complication progression/rescue ' + id);
  if (!nonnegative(complication?.minMinute) || !positive(complication?.riseMinutes) || !positive(complication?.recoveryMinutes) ||
   !nonnegative(complication?.probability) || complication.probability > 1 || !vector(complication?.offsets)) errors.push('invalid complication time/vector ' + id);
  if (!text(complication?.rationale || complication?.manifestation) || !text(complication?.manifestation)) errors.push('meaningful complication rationale/manifestation required ' + id);
  if (complication?.rescueAllOf !== undefined) actionList(complication.rescueAllOf, id + '.rescueAllOf', errors, true);
  if (complication?.rescueAnyOf !== undefined) actionList(complication.rescueAnyOf, id + '.rescueAnyOf', errors, true);
  if (!(complication?.rescueAllOf?.length || complication?.rescueAnyOf?.length)) errors.push('executable rescue actions required ' + id);
  if(complication?.neurology!==undefined)validateNeurology(complication.neurology,id+'.neurology',errors);
  if (complication?.requiredState !== undefined) {
   if (!record(complication.requiredState)) errors.push('invalid requiredState ' + id);
   else for (const [axis, conditions] of Object.entries(complication.requiredState))
    if (!axes.has(axis) || !record(conditions) || !Object.keys(conditions).length ||
     Object.entries(conditions).some(([operator, threshold]) => !['lt', 'lte', 'gt', 'gte'].includes(operator) || !Number.isFinite(threshold))) errors.push('invalid complication state ' + id);
  }
 }
 for (const candidate of Array.isArray(c?.variation?.complications) ? c.variation.complications : [])
  if (!policy.complications.some(item => item.id === candidate?.id && item.progressionId === candidate?.progressionId && item.rescueId === candidate?.rescueId)) errors.push('variation complication has no clinical owner ' + candidate?.id);
 return errors;
}
function validateNeurology(value,label,errors){
 if(!record(value)||!Object.keys(value).length){errors.push('invalid '+label);return;}
 const limits={eye:4,verbal:5,motor:6};
 for(const [key,n] of Object.entries(value)){
  if(Object.hasOwn(limits,key)?!Number.isInteger(n)||n<1||n>limits[key]:
   !['seizureActive','postictal'].includes(key)||typeof n!=='boolean')errors.push('invalid '+label+'.'+key);
 }
}
function validateObservationResponses(c){
 const responses=c.clinicalPolicy.observationResponses,errors=[];
 if(responses===undefined)return errors;
 if(!Array.isArray(responses))return ['invalid observationResponses'];
 for(const [i,response] of responses.entries()){
  const label='observationResponses['+i+']';
  if(!record(response)){errors.push('invalid '+label);continue;}
  actionList(response.allOf,label+'.allOf',errors,!!response.anyOf?.length);
  if(response.anyOf!==undefined)actionList(response.anyOf,label+'.anyOf',errors);
  if(!nonnegative(response.delay)||!positive(response.peak)||response.peak<=response.delay)errors.push('invalid '+label+' timing');
  validateNeurology(response.neurology,label+'.neurology',errors);
 }
 return errors;
}
function validateTreatment(c, id) {
 const errors = [], definition = CLINICAL_TREATMENTS[id], regimen = c?.clinicalPolicy?.regimens?.[id];
 if (!nativeActions.has(id)) return ['unknown executable treatment ' + id];
 if (definition && (!['medication', 'procedure', 'conduct'].includes(definition.kind) ||
  !['oral', 'iv', 'inhaled', 'sc', 'im', 'procedure'].includes(definition.route) || !positive(definition.dose?.amount) ||
  !text(definition.dose?.unit) || !text(definition.dose?.display) || !nonnegative(definition.preparationSeconds) ||
  !nonnegative(definition.latencyMinutes) || !(definition.kind === 'conduct' && definition.regimen?.noAcuteVitalBenefit ? nonnegative(definition.peakMinutes) : positive(definition.peakMinutes)) ||
  definition.peakMinutes < definition.latencyMinutes || !positive(definition.durationMinutes))) errors.push('invalid native treatment definition ' + id);
 if (regimen !== undefined) {
  if (!record(regimen)) return [...errors, 'invalid treatment regimen ' + id];
  if (regimen.dose !== undefined && (!positive(regimen.dose?.amount) || !text(regimen.dose?.unit) || !text(regimen.dose?.display))) errors.push('invalid treatment dose ' + id);
  if (regimen.route !== undefined && (!['oral', 'iv', 'inhaled', 'sc', 'im', 'procedure'].includes(regimen.route) || definition && regimen.route !== definition.route)) errors.push('invalid treatment route ' + id);
  for (const key of ['intervalMinutes', 'administrationMinutes']) if (regimen[key] !== undefined && !positive(regimen[key])) errors.push('invalid treatment timing ' + id + '.' + key);
 }
 return errors;
}
function validateEligibility(c) {
 const policy = c.clinicalPolicy, errors = [];
 if (policy.eligibility === undefined) return errors;
 if (!record(policy.eligibility)) return ['invalid clinical eligibility map'];
 const booleans = ['requiresCoronaryAnatomy', 'unlessUnstable', 'requiresNoIntracranialBleed', 'disablingDeficit',
  'requiresLargeVesselOcclusion', 'requiresFavorablePerfusion', 'requiresConfirmedAneurysm', 'enteralOnly', 'requiresSafeSwallowOrEnteralTube'];
 const numbers = ['onsetMinutes', 'onsetLimitMinutes', 'maxOnsetMinutes', 'minimumPlatelets', 'maximumINR', 'baselineMRS', 'nihss', 'afterThrombolysisMinutes'];
 const supported = new Set([...booleans, ...numbers, 'excludeTraits', 'requiresHistory', 'requiredStudies', 'bpLimit', 'anticoagulant',
  'requiresCompletedTreatments','requiresStudiesAfterTreatments']);
 const histories = new Set((c.intents || []).map(row => row.id));
 for (const [id, rule] of Object.entries(policy.eligibility)) {
  if (!record(rule)) { errors.push('invalid clinical eligibility ' + id); continue; }
  for (const key of Object.keys(rule)) if (!supported.has(key)) errors.push('unsupported eligibility field ' + id + '.' + key);
  for (const key of booleans) if (rule[key] !== undefined && typeof rule[key] !== 'boolean') errors.push('invalid eligibility flag ' + id + '.' + key);
  for (const key of numbers) if (rule[key] !== undefined && !nonnegative(rule[key])) errors.push('invalid eligibility number ' + id + '.' + key);
  if (rule.excludeTraits !== undefined && !strings(rule.excludeTraits, true)) errors.push('invalid eligibility excludeTraits ' + id);
  if (rule.requiresHistory !== undefined && (!strings(rule.requiresHistory, true) || rule.requiresHistory.some(key => !histories.has(key)))) errors.push('unknown eligibility history ' + id);
  if(rule.requiresCompletedTreatments!==undefined)actionList(rule.requiresCompletedTreatments,'eligibility.'+id+'.requiresCompletedTreatments',errors);
  if(rule.requiresStudiesAfterTreatments!==undefined){
   if(!Array.isArray(rule.requiresStudiesAfterTreatments))errors.push('invalid post-treatment studies '+id);
   else for(const dependency of rule.requiresStudiesAfterTreatments){
    if(!record(dependency)){errors.push('invalid post-treatment study '+id);continue;}
    actionList([dependency.treatmentId],'eligibility.'+id+'.treatmentId',errors);
    studyReferences([dependency.studyId],c,'eligibility.'+id+'.studyId',errors,false);
   }
  }
  if (rule.anticoagulant !== undefined && !text(rule.anticoagulant)) errors.push('invalid anticoagulant indication ' + id);
  if (rule.bpLimit !== undefined && (!record(rule.bpLimit) || !Object.keys(rule.bpLimit).length ||
   Object.entries(rule.bpLimit).some(([axis, value]) => !['min', 'max', 'sys', 'dia'].includes(axis) || !positive(value)) ||
   positive(rule.bpLimit.min) && positive(rule.bpLimit.max) && rule.bpLimit.min > rule.bpLimit.max)) errors.push('invalid eligibility blood pressure ' + id);
 }
 return errors;
}
export function validateClinicalPolicyCase(c) {
 const policy = c?.clinicalPolicy, errors = [];
 if (!record(policy) || policy.schemaVersion !== 1) return ['unsupported clinical policy schema'];
 if(policy.historySource!==undefined&&(!record(policy.historySource)||
  !['companion','clinical-record'].includes(policy.historySource.kind)||!text(policy.historySource.label)))errors.push('invalid clinical history source');
 const trajectory = policy.trajectory;
 if (!record(trajectory) || !vector(trajectory.early) || !vector(trajectory.late) ||
  !positive(trajectory.earlyEnd) || !positive(trajectory.lateEnd) || trajectory.lateEnd <= trajectory.earlyEnd ||
  !nonnegative(trajectory.fluidResponse) || trajectory.fluidResponse > 2) errors.push('invalid clinical trajectory vectors/timing');
 if (!strings(policy.traits, true)) errors.push('invalid clinical traits');
 if (policy.regimens !== undefined && !record(policy.regimens)) errors.push('invalid clinical regimens map');
 if (!Array.isArray(policy.responses)) errors.push('clinical responses array required');
 else for (const [index, response] of policy.responses.entries()) {
  if (!record(response)) { errors.push('invalid response ' + index); continue; }
  actionList(response.allOf, 'responses[' + index + '].allOf', errors, !!response.anyOf?.length);
  if (response.anyOf !== undefined) actionList(response.anyOf, 'responses[' + index + '].anyOf', errors);
  if (!nonnegative(response.delay) || !positive(response.peak) || response.peak <= response.delay || !vector(response.offsets)) errors.push('invalid response vector/timing ' + index);
 }
 if (policy.oxygenTarget !== undefined && (!Array.isArray(policy.oxygenTarget) || policy.oxygenTarget.length !== 2 ||
  !policy.oxygenTarget.every(n => Number.isFinite(n) && n >= 50 && n <= 100) || policy.oxygenTarget[0] >= policy.oxygenTarget[1])) errors.push('invalid oxygenTarget');
 for (const {registry, id} of clinicalCaseExecutableReferences(c)) {
  if (registry === 'drugs') errors.push(...validateTreatment(c, id));
  else if (registry === 'progressions' && id !== 'offset-ramp-v1' || registry === 'rescues' && id !== 'confirmed-rescue-v1') errors.push('unknown executable ' + registry + '.' + id);
 }
 errors.push(...validateStudies(c), ...validateClosure(c), ...validateComplications(c), ...validateEligibility(c),...validateObservationResponses(c));
 return [...new Set(errors)];
}
const descriptor = (execute, validateCase, extra = {}) => Object.freeze({version: '1.0.0', execute, validateCase, ...extra});
const drugs = Object.create(null);
for (const id of nativeActions) drugs[id] = descriptor((owner, command, clock) => {
 if (typeof owner?.execute !== 'function' || command?.intent?.id !== id ||
  !['therapy.request', 'therapy.stop', 'procedure.request'].includes(command.intent.kind)) throw Error('matching native treatment owner/action required for ' + id);
 const result = owner.execute(command, clock);
 if (!['pending', 'executed', 'rejected'].includes(result?.status)) throw Error('invalid native treatment owner result for ' + id);
 return result;
}, c => validateTreatment(c, id));

export const CLINICAL_POLICY_REGISTRIES = Object.freeze({
 executors: Object.freeze({'acute-policy-v1': descriptor(createAdditionalCaseCare, validateClinicalPolicyCase)}),
 closurePolicies: Object.freeze({'policy-closure-v1': descriptor(evaluateClinicalPolicyDisposition, validateClosure)}),
 studyPolicies: Object.freeze({'case-studies-v1': descriptor(createStudyService, validateStudies)}),
 examPolicies: Object.freeze({'case-exam-v1': descriptor(executePhysicalExam, validateExaminations)}),
 drugs: Object.freeze(drugs),
 progressions: Object.freeze({'offset-ramp-v1': descriptor(progressClinicalComplication, validateComplications, {eligible: complicationStateEligible})}),
 rescues: Object.freeze({'confirmed-rescue-v1': descriptor(rescueClinicalComplication, validateComplications)}),
 existingCaseIds: Object.freeze([])
});
