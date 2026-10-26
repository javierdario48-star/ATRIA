// PANC-001 handoff policy, staged behind the case-certification gate.
// ICU acceptance is a destination, NOT cure, drainage or a fictitious
// pancreatitis procedure. Reuses the ONLY acute-care authority.
import {createAcuteCare} from './acute-care.js';
import {csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {initialPancVitals,advancePancVitals} from './native-panc.js';
export function pancClosureSnapshot(p,c,destination){
 return {caseId:c.id,diagnosis:p.diagnosis,acceptedDiagnoses:c.dx,
  historyAnswered:p.intentHistory.map(x=>x.id),historyRelevant:c.requiredHistory,
  examDone:p.examDone,examRegionsCount:Object.keys(p.examFindings||{}).length,
  vitalsKnown:!!p.lastVitalsKnown,reassessments:p.reassessments,
  studiesDone:p.orders.filter(o=>o.status==='done').map(o=>o.id),
  extraStudies:p.orders.filter(o=>!c.keyStudies.includes(o.id)).map(o=>o.id),
  keyStudies:c.keyStudies,keyInterventions:c.keyInterventions,
  delivered:[...new Set([...p.treatments.filter(x=>!matchesMedicationAllergy487(p,x.id)).map(x=>x.id),
   ...(p.venousAccessCount>0?['iv']:[])])],
  consultsDone:p.consults.filter(x=>x.status==='done'&&x.accepted).map(x=>x.id),
  disposition:destination,sys:p.liveVitals.sys,hr:p.liveVitals.hr,
  spo2:p.liveVitals.spo2,rr:p.liveVitals.rr,
  initialSys:initialPancVitals(c).sys,
  dead:!!p.patientDied,ended:!!p.caseEnded,
  adverseCount:confirmedClinicalMissteps(p,c).adverseCount,uid:p.uid};
}
export function createPancCare(p,c,options){
 if(c.id!=='PANC-001')throw Error('PANC care requires native PANC-001');
 return createAcuteCare(p,c,options,{
  initialVitals:initialPancVitals,advanceVitals:advancePancVitals,
  evaluate:(patient,caseData,destination)=>csEvaluateClosure487(pancClosureSnapshot(patient,caseData,destination)),
  conducts:['npo'],reassessmentRequired:true,
  reassessmentMessage:patient=>'Reevaluación: PA '+Math.round(patient.liveVitals.sys)+'/'+
   Math.round(patient.liveVitals.dia)+', FC '+Math.round(patient.liveVitals.hr)+
   '. Valorar diuresis, oxigenación y persistencia de hipoperfusión antes de confirmar traslado.',
  closureMessage:receipt=>'Traslado a UTI aceptado; continúa la atención de pancreatitis grave. '+
   'No se ha declarado resolución de necrosis ni curación. '+receipt.quality.score+
   '/100 · +'+receipt.xp+' XP.'
 });
}
