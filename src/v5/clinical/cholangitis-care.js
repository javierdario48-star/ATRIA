// CHOLANG-001 — one acute-care owner, with the verified legacy sepsis_source
// trajectory. CPRE/ERCP and source control are performed AFTER ED handoff;
// an order, study or accepted consultation never means drainage occurred.
import {createAcuteCare} from './acute-care.js';
import {csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {initialPeritonitisVitals,initializeNativePeritonitis,advancePeritonitisVitals,
 applyConfirmedSepsisAdministration487} from './native-peritonitis.js';

export function cholangitisClosureSnapshot(p,c,destination){
 const valid=p.treatments.filter(t=>!matchesMedicationAllergy487(p,t.id));
 const delivered=[...new Set([...valid.map(t=>t.id),
  ...(p.venousAccessCount>0?['iv']:[])])];
 return {caseId:c.id,diagnosis:p.diagnosis,acceptedDiagnoses:c.dx,
  historyAnswered:p.intentHistory.map(x=>x.id),historyRelevant:c.requiredHistory,
  examDone:p.examDone,examRegionsCount:Object.keys(p.examFindings||{}).length,
  vitalsKnown:!!p.lastVitalsKnown,reassessments:p.reassessments,
  studiesDone:p.orders.filter(o=>o.status==='done').map(o=>o.id),
  extraStudies:p.orders.filter(o=>!c.keyStudies.includes(o.id)).map(o=>o.id),
  keyStudies:c.keyStudies,keyInterventions:c.keyInterventions,
  delivered,consultsDone:p.consults.filter(x=>x.status==='done'&&x.accepted).map(x=>x.id),
  disposition:destination,sys:p.liveVitals.sys,hr:p.liveVitals.hr,rr:p.liveVitals.rr,
  spo2:p.liveVitals.spo2,initialSys:initialPeritonitisVitals(c).sys,
  dead:!!p.patientDied,ended:!!p.caseEnded,
  adverseCount:confirmedClinicalMissteps(p,c).adverseCount,
  clinicalFlags:p.clinicalFlags||{},phys:p.phys||{},uid:p.uid};
}
export function createCholangitisCare(patient,caseData,options){
 if(caseData.id!=='CHOLANG-001'||caseData.physiology?.engine!=='sepsis_source')
  throw Error('CHOLANG requires certified source-sepsis data');
 return createAcuteCare(patient,caseData,options,{
  initialVitals:initialPeritonitisVitals,
  initialize:initializeNativePeritonitis,
  advanceVitals:advancePeritonitisVitals,
  onAdministration:applyConfirmedSepsisAdministration487,
  reassessmentRequired:true,
  evaluate:(p,c,destination)=>csEvaluateClosure487(cholangitisClosureSnapshot(p,c,destination)),
  reassessmentMessage:p=>'Reevaluación: PA '+Math.round(p.liveVitals.sys)+'/'+Math.round(p.liveVitals.dia)+
   ', FC '+Math.round(p.liveVitals.hr)+'. Sospecha de infección biliar obstructiva: comprobar respuesta y coordinar drenaje con el servicio receptor.',
  closureMessage:receipt=>(receipt.destination==='uti'?
   'Traslado a UTI aceptado; continuar estabilización y coordinar drenaje biliar. ':
   'Derivación para procedimiento endoscópico aceptada; CPRE y drenaje pendientes en el servicio receptor. ')+
   receipt.quality.score+'/100 · +'+receipt.xp+' XP.'
 });
}
