// Shared native clinical executor. Case policies supply physiology and closure;
// the authority, IV tasks, consultation, bedside receipts and XP remain unique.
import {executePatientDialogue} from './patient-dialogue.js';
import {initializeExamination,executePhysicalExam} from './physical-exam.js';
import {executeObservation,executeVenousAccess,executeOxygenSupport,recordVitalMeasurement} from './observations.js';
import {initialCaseEcg} from './ecg-morphology.js';
import {nativeCaseXP} from './progression.js';
import {createClosureDebrief} from './closure-debrief.js';
import {createIVAdministration} from './native-medications.js';
import {createSurgicalConsultation} from './surgical-consultation.js';

const copy=x=>structuredClone(x);
export function createAcuteCare(p,c,{mode,defaultDoses,progress,cases,checkpoint=null},policy){
 Object.assign(p,{liveVitals:policy.initialVitals(c),baselineVitals:policy.initialVitals(c),ecg:initialCaseEcg(c),intentHistory:[],exam:{},examDone:false,
  lastVitalsKnown:null,diagnosis:'',reassessments:0,lastReassessment:null,
  pendingTreatments:[],administrationLog:[],procedures:{},venousAccessCount:0,
  consults:[],pendingConsults:[],caseEnded:false,closure:null});
 initializeExamination(p);policy.initialize?.(p,c);
 const rejected=(cmd,reason,message)=>({status:'rejected',eventId:cmd.eventId,patientUid:p.uid,reason,
  ...(message?{receipt:{eventId:cmd.eventId,patientUid:p.uid,message}}:{})});
 const executed=(cmd,data)=>({status:'executed',eventId:cmd.eventId,patientUid:p.uid,
  receipt:{eventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,kind:cmd.intent.kind,id:cmd.intent.id,...data}});
 const proof=(cmd,t,reused=false)=>executed(cmd,{therapyId:t.id,sourceEventId:t.sourceEventId,
  dose:copy(t.dose),administeredAtRealSecond:t.administeredAtRealSecond,
  ...(t.action?{action:t.action,route:t.route,previousDose:copy(t.previousDose)}:{}),
  administeredAtNativeMinute:t.administeredAtNativeMinute,reused,
  message:(reused?'Ya confirmado por la orden original: ':t.action==='stop'?'Suspensión confirmada: ':t.id==='npo'?'Conducta registrada: ':'Administración confirmada: ')+t.label+
   (t.dose?' · '+t.dose.display:'')+'.'});
 const ivMedicines=createIVAdministration(p,{doses:defaultDoses,
  labels:id=>c.interventions.find(x=>x.id===id)?.label,
  proof,rejected,checkpoint:checkpoint?.iv});
 const surgery=createSurgicalConsultation(p,c,{cases,executed,readiness,checkpoint:checkpoint?.surgery});
 function readiness(destination){
  const out=policy.evaluate(p,c,destination);
  if(!out)return null;
  if(p.pendingTreatments.length||p.pendingConsults.length){
   out.ready=false;out.action=null;out.missing.push('Esperar las administraciones y las respuestas del equipo receptor pendientes.');
  }
  if(policy.reassessmentRequired&&p.treatments.some(t=>!p.lastReassessment?.interventionEvents?.includes(t.sourceEventId))){
   out.ready=false;out.action=null;out.missing.push('Reevaluar tras las intervenciones realmente ejecutadas.');
  }
  return out;
 }
 return Object.freeze({
  checkpoint:()=>({iv:ivMedicines.checkpoint(),surgery:surgery.checkpoint()}),
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
   if(intent.kind==='therapy.request'&&(policy.conducts||[]).includes(intent.id)){
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
     message:policy.reassessmentMessage(p)});
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
     message:policy.closureMessage(receipt)});
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
    policy.advanceVitals(p,c,at-cursor,clockBefore.nativeMinute+(clockAfter.nativeMinute-clockBefore.nativeMinute)*(dt>0?(at-clockBefore.clinicalMinute)/dt:0));cursor=at;
    const fraction=dt>0?(at-clockBefore.clinicalMinute)/dt:0;
    const nativeMinute=clockBefore.nativeMinute+
      (clockAfter.nativeMinute-clockBefore.nativeMinute)*fraction;
    const consultation=surgery.owns(task);
    results.push(...(consultation?surgery.finish(task,at):ivMedicines.finish(task,at,nativeMinute)));
    if(!consultation){
     const administered=p.administrationLog.find(row=>row.sourceEventId===task.sourceEventId);
     if(administered)policy.onAdministration?.(p,c,administered);
    }
   }
   policy.advanceVitals(p,c,Math.max(0,clockAfter.clinicalMinute-cursor),clockAfter.nativeMinute);
   return results;
  },
  dispose(){ivMedicines.dispose();surgery.dispose();p.pendingTreatments=[];}
 });
}
