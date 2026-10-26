// Shared native clinical executor. Case policies supply physiology and closure;
// the authority, IV tasks, consultation, bedside receipts and XP remain unique.
import {executePatientDialogue} from './patient-dialogue.js';
import {initializeExamination,executePhysicalExam} from './physical-exam.js';
import {executeObservation,executeVenousAccess,executeOxygenSupport,recordVitalMeasurement} from './observations.js';
import {initialCaseEcg} from './ecg-morphology.js';
import {nativeCaseXP} from './progression.js';
import {createClosureDebrief} from './closure-debrief.js';
import {partialDisposition} from './partial-closure.js';
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
 const pendingConducts=new Map(copy(checkpoint?.conducts??[]));
 const conductSeconds=Object.freeze({steroid:.8,aza:.8,ppi:.8,ngt:1.2,staging_order:.55});
 const ivMedicines=createIVAdministration(p,{doses:defaultDoses,
  labels:id=>c.interventions.find(x=>x.id===id)?.label,
  proof,rejected,checkpoint:checkpoint?.iv});
 const surgery=createSurgicalConsultation(p,c,{cases,executed,readiness,
  acceptTransfer:completeAcceptedTransfer,checkpoint:checkpoint?.surgery});
 function finalize(cmd,evaluation){
  const xp=nativeCaseXP({score:evaluation.quality.score,mode});
  const receipt={kind:'clinical.closure',eventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,
   caseId:c.id,destination:cmd.intent.id,quality:copy(evaluation.quality),
   debrief:createClosureDebrief(p,c,evaluation.quality),xp,closed:true};
  progress.award(receipt);p.caseEnded=true;p.closure=copy(receipt);
  return executed(cmd,{closure:copy(receipt),message:policy.closureMessage(receipt)});
 }
 function completeAcceptedTransfer(cmd,consult){
  if(p.caseEnded)return rejected(cmd,'patient-not-active');
  if(!consult.accepted||consult.status!=='done')
   return rejected(cmd,'transfer-rejected',consult.advice);
  // The accepting service owns definitive surgery/procedure AFTER transfer.
  // Missing nonessential studies and treatments affect XP, not the handoff gate.
  // A confirmed pending drug is not discarded while the patient is leaving.
  if(p.pendingTreatments.length)return rejected(cmd,'pending-clinical-treatment',
   'Esperá la administración pendiente antes de completar el traslado.');
  const assessed=readiness(cmd.intent.id);
  const evaluation=partialDisposition(p,c,cmd.intent.id,assessed,{cases});
  if(!evaluation.ready)return rejected(cmd,'transfer-not-authorized',evaluation.missing.join(' '));
  return finalize(cmd,evaluation);
 }
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
  checkpoint:()=>({iv:ivMedicines.checkpoint(),surgery:surgery.checkpoint(),conducts:[...pendingConducts]}),
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
    const id=intent.id,label=c.interventions.find(i=>i.id===id)?.label||id;
    const existing=p.treatments.find(t=>t.id===id&&t.patientUid===p.uid);
    if(existing)return proof(cmd,existing,true);
    if(id==='npo'){
     const t={id,label,dose:null,sourceEventId:cmd.eventId,actorId:cmd.actorId,
      patientUid:p.uid,administeredAtRealSecond:clock.clinicalMinute,administeredAtNativeMinute:clock.nativeMinute};
     p.treatments.push(t);return proof(cmd,t);
    }
    if(!Object.hasOwn(conductSeconds,id))return rejected(cmd,'unmodeled-conduct');
    const prior=[...pendingConducts.values()].find(t=>t.id===id);
    if(prior){prior.commands.push(copy(cmd));return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};}
    // One native due queue. No effect is credited until the task completes.
    const task={id,label,sourceEventId:cmd.eventId,patientUid:p.uid,actorId:cmd.actorId,
     readyAtRealSecond:clock.clinicalMinute+conductSeconds[id],commands:[copy(cmd)]};
    pendingConducts.set(cmd.eventId,task);
    p.pendingTreatments.push({id,patientUid:p.uid,sourceEventId:cmd.eventId,readyAtRealSecond:task.readyAtRealSecond});
    return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};
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
    // For a requested transfer surgery.request() above either returns a
    // patient-scoped pending acceptance or commits the same native closure.
    // Other destinations retain the existing clinical decision path.
    const strict=readiness(intent.id);
    const evaluation=intent.partial?partialDisposition(p,c,intent.id,strict,{cases}):strict;
    if(!evaluation?.ready)return rejected(cmd,'closure-not-ready',(evaluation?.missing||['Destino no disponible.']).join(' '));
    return finalize(cmd,evaluation);
   }
   return rejected(cmd,'clinical-action-not-migrated');
  },
  advance(clockBefore,clockAfter,dt){
   const results=[];if(p.caseEnded)return results;
   let cursor=clockBefore.clinicalMinute;
   const due=[...ivMedicines.due(clockBefore,clockAfter),...surgery.due(clockBefore,clockAfter),
    ...[...pendingConducts.values()].filter(t=>t.readyAtRealSecond<=clockAfter.clinicalMinute+1e-9)]
    .sort((a,b)=>a.readyAtRealSecond-b.readyAtRealSecond);
   for(const task of due){
    const at=Math.max(cursor,task.readyAtRealSecond);
    policy.advanceVitals(p,c,at-cursor,clockBefore.nativeMinute+(clockAfter.nativeMinute-clockBefore.nativeMinute)*(dt>0?(at-clockBefore.clinicalMinute)/dt:0));cursor=at;
    const fraction=dt>0?(at-clockBefore.clinicalMinute)/dt:0;
    const nativeMinute=clockBefore.nativeMinute+
      (clockAfter.nativeMinute-clockBefore.nativeMinute)*fraction;
    const consultation=surgery.owns(task),conduct=pendingConducts.get(task.sourceEventId)===task;
    if(conduct){
     pendingConducts.delete(task.sourceEventId);
     p.pendingTreatments=p.pendingTreatments.filter(x=>x.sourceEventId!==task.sourceEventId);
     const done={id:task.id,label:task.label,dose:null,sourceEventId:task.sourceEventId,
      patientUid:p.uid,actorId:task.actorId,administeredAtRealSecond:at,
      administeredAtNativeMinute:nativeMinute,kind:'documented-clinical-conduct'};
     p.treatments.push(done);
     for(const command of task.commands)results.push(proof(command,done,command.eventId!==task.sourceEventId));
    }else{
     results.push(...(consultation?surgery.finish(task,at):ivMedicines.finish(task,at,nativeMinute)));
     if(!consultation){
      const administered=p.administrationLog.find(row=>row.sourceEventId===task.sourceEventId);
      if(administered)policy.onAdministration?.(p,c,administered);
     }
    }
   }
   policy.advanceVitals(p,c,Math.max(0,clockAfter.clinicalMinute-cursor),clockAfter.nativeMinute);
   return results;
  },
  dispose(){pendingConducts.clear();ivMedicines.dispose();surgery.dispose();p.pendingTreatments=[];}
 });
}
