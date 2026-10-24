// CHOLE-001: case-specific closure & dynamics, shared acute-care executor.
// A confirmed surgical handoff is NOT a completed cholecystectomy.
import {createAcuteCare} from './acute-care.js';
import {csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {initialCholeVitals,advanceCholeVitals} from './native-chole.js';
export function choleClosureSnapshot(p,c,destination){
 return {caseId:c.id,diagnosis:p.diagnosis,acceptedDiagnoses:c.dx,
  historyAnswered:p.intentHistory.map(x=>x.id),historyRelevant:c.requiredHistory,
  examDone:p.examDone,examRegionsCount:Object.keys(p.examFindings||{}).length,
  vitalsKnown:!!p.lastVitalsKnown,reassessments:p.reassessments,
  studiesDone:p.orders.filter(o=>o.status==='done').map(o=>o.id),
  extraStudies:p.orders.filter(o=>!c.keyStudies.includes(o.id)).map(o=>o.id),
  keyStudies:c.keyStudies,keyInterventions:c.keyInterventions,
  delivered:p.treatments.filter(x=>!matchesMedicationAllergy487(p,x.id)).map(x=>x.id),
  consultsDone:p.consults.filter(x=>x.status==='done'&&x.accepted).map(x=>x.id),
  disposition:destination,sys:p.liveVitals.sys,hr:p.liveVitals.hr,spo2:p.liveVitals.spo2,
  rr:p.liveVitals.rr,initialSys:initialCholeVitals(c).sys,
  dead:!!p.patientDied,ended:!!p.caseEnded,
  adverseCount:confirmedClinicalMissteps(p,c).adverseCount,uid:p.uid};
}
export function createCholeCare(p,c,options){
 if(c.id!=='CHOLE-001')throw Error('CHOLE native policy requires CHOLE-001');
 return createAcuteCare(p,c,options,{
  initialVitals:initialCholeVitals,advanceVitals:advanceCholeVitals,
  evaluate:(patient,caseData,destination)=>csEvaluateClosure487(choleClosureSnapshot(patient,caseData,destination)),
  conducts:['npo'],reassessmentRequired:true,
  reassessmentMessage:patient=>'Reevaluación: FC '+Math.round(patient.liveVitals.hr)+
   ', PA '+Math.round(patient.liveVitals.sys)+'/'+Math.round(patient.liveVitals.dia)+
   '. Continuar vigilancia y preparar valoración quirúrgica.',
  closureMessage:receipt=>'Derivación a quirófano confirmada; la colecistectomía aún no fue realizada. '+
   receipt.quality.score+'/100 · +'+receipt.xp+' XP.'
 });
}
