import {executePatientDialogue} from './patient-dialogue.js';
import {csEvaluateClosure487} from '../../clinical/case-completion-487.js';
import {initializeExamination,executePhysicalExam} from './physical-exam.js';
import {executeObservation,executeVenousAccess,executeOxygenSupport,recordVitalMeasurement} from './observations.js';
import {initialCaseEcg} from './ecg-morphology.js';
import {nativeCaseXP} from './progression.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
import {createClosureDebrief} from './closure-debrief.js';
import {initialAppVitals,advanceAppVitals} from './native-app.js';
import {createIVAdministration} from './native-medications.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {createSurgicalConsultation} from './surgical-consultation.js';

const copy=x=>structuredClone(x);
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

/** APP-001 case policy. The room authority and ONE native clinical port own
 * dispatch, identity, receipts and completion. No parallel drug executor.
 * Surgery is an accepted ED transfer after consultation, NEVER a performed operation.
 */
export function createAppCare(p,c,{mode,defaultDoses,progress,cases}){
 if(c.id!=='APP-001')throw Error('C3a APP policy requires APP-001');
 Object.assign(p,{liveVitals:initialAppVitals(c),baselineVitals:initialAppVitals(c),ecg:initialCaseEcg(c),intentHistory:[],exam:{},examDone:false,
  lastVitalsKnown:null,diagnosis:'',reassessments:0,lastReassessment:null,
  pendingTreatments:[],administrationLog:[],procedures:{},venousAccessCount:0,
  consults:[],pendingConsults:[],caseEnded:false,closure:null});
 initializeExamination(p);
 const rejected=(cmd,reason,message)=>({status:'rejected',eventId:cmd.eventId,patientUid:p.uid,reason,
  ...(message?{receipt:{eventId:cmd.eventId,patientUid:p.uid,message}}:{})});
 const executed=(cmd,data)=>({status:'executed',eventId:cmd.eventId,patientUid:p.uid,
  receipt:{eventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,kind:cmd.intent.kind,id:cmd.intent.id,...data}});
 const proof=(cmd,t,reused=false)=>executed(cmd,{therapyId:t.id,sourceEventId:t.sourceEventId,
  dose:copy(t.dose),administeredAtRealSecond:t.administeredAtRealSecond,
  administeredAtNativeMinute:t.administeredAtNativeMinute,reused,
  message:(reused?'Ya confirmado por la orden original: ':t.id==='npo'?'Conducta registrada: ':'Administración confirmada: ')+t.label+
   (t.dose?' · '+t.dose.display:'')+'.'});
 const ivMedicines=createIVAdministration(p,{doses:defaultDoses,
  labels:id=>c.interventions.find(x=>x.id===id)?.label,
  proof,rejected});
 const surgery=createSurgicalConsultation(p,c,{cases,executed,readiness});
 function readiness(destination){
  const out=csEvaluateClosure487(appClosureSnapshot(p,c,destination));
  if(!out)return null;
  if(p.pendingTreatments.length||p.pendingConsults.length){
   out.ready=false;out.action=null;out.missing.push('Esperar las administraciones y las respuestas quirúrgicas pendientes.');
  }
  if(p.treatments.some(t=>!p.lastReassessment?.interventionEvents?.includes(t.sourceEventId))){
   out.ready=false;out.action=null;out.missing.push('Reevaluar tras las intervenciones realmente ejecutadas.');
  }
  return out;
 }
 return Object.freeze({
  readiness,
  execute(cmd,clock){
   if(cmd.patientUid!==p.uid)return rejected(cmd,'wrong-patient');
   if(p.caseEnded)return rejected(cmd,'patient-not-active');
   const {intent}=cmd;
   const dialogue=executePatientDialogue(p,c,cmd,clock);if(dialogue)return dialogue;
   const exam=executePhysicalExam(p,c,cmd,clock);if(exam)return exam;
   const observation=executeObservation(p,cmd,clock);if(observation)return observation;
   const access=executeVenousAccess(p,cmd);if(access)return access;
   const oxygen=executeOxygenSupport(p,cmd,clock);if(oxygen)return oxygen;
   const consult=surgery.request(cmd,clock);if(consult)return consult;
   const iv=ivMedicines.request(cmd,clock);if(iv)return iv;
   if(intent.kind==='therapy.request'&&intent.id==='npo'){
    const existing=p.treatments.find(t=>t.id==='npo');
    if(existing)return proof(cmd,existing,true);
    const label=c.interventions.find(i=>i.id==='npo')?.label||'Nada por boca';
    const t={id:'npo',label,dose:null,sourceEventId:cmd.eventId,actorId:cmd.actorId,
     patientUid:p.uid,administeredAtRealSecond:clock.clinicalMinute,administeredAtNativeMinute:clock.nativeMinute};
    p.treatments.push(t);return proof(cmd,t);
   }
   if(intent.kind==='patient.reassess'){
    p.reassessments++;
    p.lastReassessment={nativeMinute:clock.nativeMinute,eventId:cmd.eventId,vitals:copy(p.liveVitals),
     administrationEvents:p.administrationLog.map(t=>t.sourceEventId),
     interventionEvents:p.treatments.map(t=>t.sourceEventId)};
    recordVitalMeasurement(p,clock,cmd.eventId,'reassessment');
    return executed(cmd,{assessment:copy(p.lastReassessment),
     message:'Reevaluación: FC '+Math.round(p.liveVitals.hr)+', PA '+Math.round(p.liveVitals.sys)+'/'+Math.round(p.liveVitals.dia)+'. Se mantiene indicación de valoración quirúrgica.'});
   }
   if(intent.kind==='diagnosis.record'){
    p.diagnosis=intent.value;return executed(cmd,{diagnosis:p.diagnosis,message:p.diagnosis?'Impresión diagnóstica: '+p.diagnosis+'.':'Impresión diagnóstica borrada.'});
   }
   if(intent.kind==='case.close'){
    const evaluation=readiness(intent.id);
    if(!evaluation?.ready)return rejected(cmd,'closure-not-ready',(evaluation?.missing||['Destino no disponible.']).join(' '));
    const xp=nativeCaseXP({score:evaluation.quality.score,mode});
    const receipt={kind:'clinical.closure',eventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,
     caseId:c.id,destination:intent.id,quality:copy(evaluation.quality),
     debrief:createClosureDebrief(p,c,evaluation.quality),xp,closed:true};
    progress.award(receipt);p.caseEnded=true;p.closure=copy(receipt);
    return executed(cmd,{closure:copy(receipt),
     message:'Derivación a quirófano confirmada; no es una apendicectomía realizada. '+evaluation.quality.score+'/100 · +'+xp+' XP.'});
   }
   return rejected(cmd,'clinical-action-not-migrated');
  },
  advance(clockBefore,clockAfter,dt){
   const results=[];if(p.caseEnded)return results;
   let cursor=clockBefore.clinicalMinute;
   const due=[...ivMedicines.due(clockBefore,clockAfter),...surgery.due(clockBefore,clockAfter)]
    .sort((a,b)=>a.readyAtRealSecond-b.readyAtRealSecond);
   for(const task of due){
    const at=Math.max(cursor,task.readyAtRealSecond);
    advanceAppVitals(p,c,at-cursor,clockBefore.nativeMinute+(clockAfter.nativeMinute-clockBefore.nativeMinute)*(dt>0?(at-clockBefore.clinicalMinute)/dt:0));cursor=at;
    const fraction=dt>0?(at-clockBefore.clinicalMinute)/dt:0;
    const nativeMinute=clockBefore.nativeMinute+
      (clockAfter.nativeMinute-clockBefore.nativeMinute)*fraction;
    results.push(...(surgery.owns(task)?surgery.finish(task,at):ivMedicines.finish(task,at,nativeMinute)));
   }
   advanceAppVitals(p,c,Math.max(0,clockAfter.clinicalMinute-cursor),clockAfter.nativeMinute);
   return results;
  },
  dispose(){ivMedicines.dispose();surgery.dispose();p.pendingTreatments=[];}
 });
}
