import {createAcuteCare} from './acute-care.js';
import {csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {initialAppVitals,advanceAppVitals} from './native-app.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';

export function appClosureSnapshot(p,c,destination){
 return {caseId:c.id,diagnosis:p.diagnosis,acceptedDiagnoses:c.dx,
  historyAnswered:p.intentHistory.map(x=>x.id),historyRelevant:c.requiredHistory,
  examDone:p.examDone,examRegionsCount:p.examDone?2:Object.keys(p.exam).length?1:0,
  vitalsKnown:!!p.lastVitalsKnown,reassessments:p.reassessments,
  studiesDone:p.orders.filter(x=>x.status==='done').map(x=>x.id),
  extraStudies:p.orders.filter(x=>!c.keyStudies.includes(x.id)).map(x=>x.id),
  keyStudies:c.keyStudies,keyInterventions:c.keyInterventions,
  delivered:p.treatments.filter(x=>!matchesMedicationAllergy487(p,x.id)).map(x=>x.id),consultsDone:p.consults.filter(x=>x.status==='done'&&x.accepted).map(x=>x.id),
  disposition:destination,sys:p.liveVitals.sys,hr:p.liveVitals.hr,spo2:p.liveVitals.spo2,
  rr:p.liveVitals.rr,initialSys:initialAppVitals(c).sys,
  dead:!!p.patientDied,ended:p.caseEnded,
  adverseCount:confirmedClinicalMissteps(p,c).adverseCount,autonomy:100,uid:p.uid};
}


/** Original APP policy, composed with the shared native executor. */
export function createAppCare(p,c,options){
 if(c.id!=='APP-001')throw Error('C3a APP policy requires APP-001');
 return createAcuteCare(p,c,options,{
  initialVitals:initialAppVitals,advanceVitals:advanceAppVitals,
  evaluate:(patient,caseData,destination)=>csEvaluateClosure487(appClosureSnapshot(patient,caseData,destination)),
  conducts:['npo'],reassessmentRequired:true,
  reassessmentMessage:patient=>'Reevaluación: FC '+Math.round(patient.liveVitals.hr)+', PA '+Math.round(patient.liveVitals.sys)+'/'+Math.round(patient.liveVitals.dia)+'. Se mantiene indicación de valoración quirúrgica.',
  closureMessage:receipt=>'Derivación a quirófano confirmada; no es una apendicectomía realizada. '+receipt.quality.score+'/100 · +'+receipt.xp+' XP.'
 });
}
