// Case-specific disposition and physiology policies composed into the ONLY
// existing native acute-care executor; no second authority, XP engine or clock.
import {createAcuteCare} from './acute-care.js';
import {csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {evaluateGastroDisposition} from './gastro-closure-v5.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {createPancCare} from './panc-care.js';
import {GASTRO_CASE_RULES,GASTRO_CASE_CONDUCTS,GASTRO_CLOSURE_TEXT} from './gastro-expansion-policies.js';
import {additionalCaseInitialVitals,advanceAdditionalCaseVitals,ADDITIONAL_CASE_TRAJECTORIES} from './native-additional-cases.js';
import {physicianExaminationsPerformed,diagnosticRequirements} from './diagnostic-evidence.js';
export {createPancCare};
function snapshot(p,c,destination){
 return {caseId:c.id,diagnosis:p.diagnosis,acceptedDiagnoses:c.dx,
  historyAnswered:p.intentHistory.map(x=>x.id),historyRelevant:c.requiredHistory,
  examDone:p.examDone,examRegionsCount:Object.keys(p.examFindings||{}).length,
  examPerformed:physicianExaminationsPerformed(p),
  vitalsKnown:!!p.lastVitalsKnown,reassessments:p.reassessments,
  studiesDone:p.orders.filter(x=>x.status==='done').map(x=>x.id),
  extraStudies:p.orders.filter(x=>!c.keyStudies.includes(x.id)).map(x=>x.id),
  keyStudies:diagnosticRequirements(c).studies,keyInterventions:c.keyInterventions,
  delivered:[...new Set([...p.treatments.filter(x=>!matchesMedicationAllergy487(p,x.id)).map(x=>x.id),
   ...(p.venousAccessCount>0?['iv']:[])])],
  consultsDone:p.consults.filter(x=>x.status==='done'&&x.accepted).map(x=>x.id),
  disposition:destination,sys:p.liveVitals.sys,hr:p.liveVitals.hr,
  spo2:p.liveVitals.spo2,rr:p.liveVitals.rr,
  initialSys:additionalCaseInitialVitals(c).sys,
  dead:!!p.patientDied,ended:!!p.caseEnded,
  adverseCount:confirmedClinicalMissteps(p,c).adverseCount,uid:p.uid};
}
export const ADDITIONAL_CASE_DISPOSITIONS=Object.freeze({
 ...Object.fromEntries(Object.entries(GASTRO_CASE_RULES).map(([id,rule])=>[id,
  {conducts:GASTRO_CASE_CONDUCTS[id]||[],destinations:rule.destinations,summary:GASTRO_CLOSURE_TEXT[id]}])),
 'CROHN-001':{conducts:['steroid','aza'],destinations:['sala','observacion'],
  summary:'Enfermedad inflamatoria intestinal: la internación permite seguimiento; no se presume remisión.'},
 'HDA-001':{conducts:[],destinations:['procedimiento','uti'],
  summary:'Hemorragia digestiva: el equipo receptor acepta la evaluación. No se afirma hemostasia endoscópica.'},
 'COLON-001':{conducts:['staging_order'],destinations:['alta','sala'],
  summary:'Lesión colónica: el plan diagnóstico y oncológico continúa. No se declara resección ni curación.'},
 'ILEO-001':{conducts:['npo','ngt'],destinations:['sala','quirofano','uti'],
  summary:'Obstrucción intestinal: continuar vigilancia de isquemia y control del tránsito; no se supone resolución.'},
 'MESI-001':{conducts:['npo'],destinations:['quirofano'],
  summary:'Isquemia mesentérica: cirugía acepta el traslado urgente. La revascularización no fue realizada aquí.'}
});
export function createAdditionalCaseCare(p,c,options){
 if(!Object.hasOwn(ADDITIONAL_CASE_DISPOSITIONS,c.id)||!Object.hasOwn(ADDITIONAL_CASE_TRAJECTORIES,c.id))
  throw Error('unported case policy');
 const policy=ADDITIONAL_CASE_DISPOSITIONS[c.id];
 return createAcuteCare(p,c,options,{
  initialVitals:additionalCaseInitialVitals,advanceVitals:advanceAdditionalCaseVitals,
  evaluate:(patient,caseData,destination)=>GASTRO_CASE_RULES[caseData.id]?
   evaluateGastroDisposition(snapshot(patient,caseData,destination)):
   csEvaluateClosure487(snapshot(patient,caseData,destination)),
  conducts:policy.conducts,reassessmentRequired:true,
  reassessmentMessage:patient=>'Reevaluación: PA '+Math.round(patient.liveVitals.sys)+'/'+Math.round(patient.liveVitals.dia)+
   ', FC '+Math.round(patient.liveVitals.hr)+
   '. Reevaluar evolución, tratamientos realizados y riesgo antes de decidir destino.',
  closureMessage:receipt=>policy.summary+' '+receipt.quality.score+'/100 · +'+receipt.xp+' XP.'
 });
}
