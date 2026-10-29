// Policy-based cases use the existing disposition/quality contract. This is a
// read-only adapter over native receipts; it owns neither closure nor XP.
import {csClosureQuality487} from '../../clinical/case-completion-487.js';
import {currentClinicalTreatment} from './receipts.js';
import {physicianExaminationsPerformed} from './diagnostic-evidence.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {CLINICAL_TREATMENTS} from '../content/clinical-treatment-definitions.js';

const text = value => typeof value === 'string' && value.trim().length > 0;
const norm = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
const finiteMinute = value => Number.isFinite(value) && value >= 0;
const contextualHistory = new Set(['anamnesis:reason', 'anamnesis:pmh', 'anamnesis:allergies', 'anamnesis:meds', 'anamnesis:surgeries', 'anamnesis:familyHistory']);
function nativeMinute(patient) {
 for (const value of [patient.policyState?.nativeMinute, patient.lastReassessment?.nativeMinute, patient.phys?.minute])
  if (finiteMinute(value)) return value;
 return 0;
}
function actualExaminations(patient) {
 const performed = new Set(physicianExaminationsPerformed(patient));
 // Native thoracic auscultation records both heart and lung observations.
 // These aliases do not create a second exam or a laboratory result.
 if (performed.has('thorax:auscultation')) {
  performed.add('heart:auscultation'); performed.add('lungs:auscultation');
 }
 if (performed.has('neurological:neurological')) performed.add('neurological:all');
 return performed;
}
function acceptedConsultations(patient) {
 return (patient.consults || []).filter(row => row.patientUid === patient.uid && row.status === 'done' &&
  row.accepted === true && text(row.sourceEventId)).map(row => row.id);
}
function completedStudies(patient, minute) {
 const realSecond = patient.policyState?.realSecond;
 return (patient.orders || []).filter(row => row.patientUid === patient.uid && row.status === 'done' &&
  text(row.id) && text(row.sourceEventId) && text(row.result) && finiteMinute(row.requestedAtMinute) &&
  finiteMinute(row.readyAtMinute) && row.readyAtMinute >= row.requestedAtMinute &&
  // Study service deadlines use its clinical-second clock. Native observation
  // and medication latency use the separate native-minute clock.
  (finiteMinute(row.readyAtNativeMinute) ? row.readyAtNativeMinute <= minute :
   !finiteMinute(realSecond) || row.readyAtMinute <= realSecond));
}

export function evaluateClinicalPolicyDisposition(patient, caseData, destination) {
 const rule = caseData?.clinicalPolicy?.closure;
 if (!rule) return null;
 const caseId = caseData.id, missing = [], target = destination || rule.destinations[0];
 if (!patient || patient.patientDied || patient.caseEnded)
  return {caseId, ready: false, missing: ['Atención finalizada.'], action: null};
 const minute = nativeMinute(patient), examined = actualExaminations(patient), requiredExams = rule.requiredExams || [];
 const rows = completedStudies(patient, minute), studies = new Set(rows.map(row => row.id));
 const treatmentIds = [...new Set((patient.treatments || []).map(row => row.id))];
 const confirmed = treatmentIds.map(id => currentClinicalTreatment(patient, id, minute))
  .filter(row => row && !matchesMedicationAllergy487(patient, row.id));
 const done = new Set(confirmed.map(row => row.id));
 const access = patient.procedures?.iv;
 if (patient.venousAccessCount > 0 && access?.patientUid === patient.uid && text(access.eventId)) done.add('iv');
 const diagnosis = norm(patient.diagnosis);
 const matched = !!diagnosis && (caseData.dx || []).some(value => {
  const accepted = norm(value);
  return accepted && (' ' + diagnosis + ' ').includes(' ' + accepted + ' ');
 });
 const vitals = patient.liveVitals || {}, measured = patient.lastVitalsKnown;
 const vitalsKnown = measured?.patientUid === patient.uid && text(measured.eventId);
 if (!vitalsKnown) missing.push('Registrar signos vitales.');
 const examDone = examined.size > 0 && (patient.examDone === true ||
  requiredExams.length > 0 && requiredExams.every(id => examined.has(id)) ||
  new Set([...examined].map(id => id.split(':')[0])).size >= 2);
 if (!examDone) missing.push('Completar examen físico dirigido.');
 for (const id of requiredExams) if (!examined.has(id)) missing.push('Completar la exploración dirigida: ' + id + '.');
 if (!matched) missing.push('Registrar un diagnóstico presuntivo compatible.');
 const historyAnswered = [...new Set((patient.intentHistory || []).map(row => row.id))];
 const relevant = historyAnswered.filter(id => (caseData.requiredHistory || []).includes(id) || contextualHistory.has(id));
 const initialSys = Number(String(caseData.vitals?.bp || '').split('/')[0]);
 if (!relevant.length && !(initialSys < 90 || vitals.sys < 90)) missing.push('Obtener al menos un dato relevante de anamnesis.');
 const orientedStudy = (rule.study || []).some(group => group.some(id => studies.has(id)));
 const evidence = orientedStudy || (rule.requiredStudies || []).some(id => studies.has(id)) ||
  requiredExams.length > 0 && requiredExams.every(id => examined.has(id));
 if (rule.study?.length && !orientedStudy && !rule.urgentStudyBypass) missing.push('Completar un estudio orientador.');
 for (const id of rule.requiredStudies || [])
  if (!studies.has(id)) missing.push('Revisar estudio imprescindible ' + id + ' antes de cerrar el caso.');
 const requiredTreatmentGroups = rule.treatmentByDestination?.[target] || rule.treatment;
 if (!requiredTreatmentGroups?.some(group => group.length > 0 && group.every(id => done.has(id))))
  missing.push('Confirmar las intervenciones imprescindibles y su ejecución real.');
 if (target === 'alta' && (rule.dischargeTreatments || []).some(id => !done.has(id)))
  missing.push('Documentar el tratamiento y plan de seguimiento antes del alta.');
 const reassessment = patient.lastReassessment;
 const reassessed = Number(patient.reassessments) > 0 && text(reassessment?.eventId) && finiteMinute(reassessment?.nativeMinute) &&
  reassessment.nativeMinute <= minute && confirmed.every(row =>
   row.administeredAtNativeMinute <= reassessment.nativeMinute && (reassessment.interventionEvents || []).includes(row.sourceEventId));
 if (!reassessed) missing.push('Reevaluar tras las intervenciones realmente ejecutadas.');
 if ((patient.pendingTreatments || []).length || (patient.pendingConsults || []).length)
  missing.push('Esperar las administraciones y las respuestas del equipo receptor pendientes.');
 const observationStart = finiteMinute(patient.policyState?.startedAtNativeMinute) ? patient.policyState.startedAtNativeMinute : 0;
 if (minute - observationStart < (rule.minimumObservationMinutes || 0))
  missing.push('Completar el tiempo de observación clínica requerido antes del destino.');
 if (!rule.destinations.includes(target)) missing.push('Destino no autorizado para este paciente.');
 const consultsDone = acceptedConsultations(patient), receivers = rule.consult?.[target] || [];
 if ((receivers.length || ['sala', 'uti', 'quirofano', 'procedimiento'].includes(target)) && !receivers.some(id => consultsDone.includes(id)))
  missing.push('Esperar aceptación documentada del servicio receptor.');
 if (target === 'alta' && (!['sys', 'hr', 'spo2', 'rr'].every(axis => Number.isFinite(vitals[axis])) ||
  vitals.sys < 100 || vitals.spo2 < 94 || vitals.hr < 40 || vitals.hr > 110 || vitals.rr < 10 || vitals.rr > 24))
  missing.push('Alta no segura: signos vitales inestables.');
 if (['sala', 'observacion'].includes(target) && (!Number.isFinite(vitals.sys) || !Number.isFinite(vitals.spo2) || vitals.sys < 90 || vitals.spo2 < 90))
  missing.push('No trasladar a sala/observación con shock o hipoxemia grave.');
 const examinationEvidence = requiredExams.map(id => 'exam:' + id);
 let adverseCount = 0;
 try { adverseCount = confirmedClinicalMissteps(patient, caseData).adverseCount; }
 catch {
  // An inconsistent administration log cannot authorize a handoff, and is not
  // itself evidence that a clinical adverse event occurred.
  missing.push('Revisar los recibos nativos de administración inconsistentes antes del cierre.');
 }
 const acceptedTreatmentGroup=requiredTreatmentGroups?.find(group=>group.length&&group.every(id=>done.has(id))),
  // Destination alternatives replace the original reference care for scoring
  // as well as readiness. Receiver-owned drainage must not remain an omitted
  // bedside intervention after an authored handoff alternative was completed.
  referenceTreatmentGroup=rule.treatment?.[0]||requiredTreatmentGroups?.[0]||[],
  qualityInterventions=acceptedTreatmentGroup?[...new Set([
   ...(caseData.keyInterventions||[]).filter(id=>!referenceTreatmentGroup.includes(id)),...acceptedTreatmentGroup
  ])]:caseData.keyInterventions||[];
 const qualityInput = {caseId, diagnosis: patient.diagnosis, acceptedDiagnoses: caseData.dx,
  historyAnswered, historyRelevant: caseData.requiredHistory || [], vitalsKnown: !!vitalsKnown, examDone: !!examDone,
  reassessments: reassessed ? patient.reassessments : 0, disposition: target,
  keyStudies: [...(caseData.keyStudies || []), ...examinationEvidence], keyInterventions: qualityInterventions,
  extraStudies: rows.filter(row => !(caseData.keyStudies || []).includes(row.id)).map(row => row.id),
  consultsDone, adverseCount};
 const qualityEvidence = new Set([...studies, ...requiredExams.filter(id => examined.has(id)).map(id => 'exam:' + id)]);
 const definitiveIds = rule.definitiveTreatmentIds || caseData.clinicalPolicy.definitiveInterventions ||
  confirmed.filter(row => CLINICAL_TREATMENTS[row.id]?.kind === 'procedure').map(row => row.id);
 const ready = missing.length === 0;
 return {caseId, ready, action: ready ? target : null, destination: rule.destinations[0],
  choices: ready ? [...rule.destinations] : [], missing, diagnostic: matched, historyCount: relevant.length,
  studiesSatisfied: evidence, procedurePerformed: definitiveIds.some(id => confirmed.some(row => row.id === id && row.kind === 'procedure.performed')),
  quality: csClosureQuality487(qualityInput, rule, done, qualityEvidence)};
}
