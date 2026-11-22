import {publicReceiverRecord,publicReceiverOptions,evaluatePublicReceiver} from './public-receiver-record.js';
import {clinicalTransferContinuation} from './transfer-continuation.js';
import {RECEIVER_SERVICE_LABELS as serviceLabels} from './public-receiver-policy.js';
export const CLINICAL_CONSULT_SERVICES=Object.freeze(Object.keys(serviceLabels));

export {criticalCareReview487} from './critical-care-review.js';

/** Specialist communication inside the existing care executor. It never
 * administers a procedure, changes vitals or approves a case closure.
 * The original 3500ms response uses the owned real-time clock domain.
 */
export function surgicalReviewSnapshot(p,_activeCase,cases=[]){
 return {diagnosis:p.diagnosis,diagnosticCompatible:publicReceiverOptions(publicReceiverRecord(p),cases).length>0,
  vitalsKnown:!!p.lastVitalsKnown,examDone:!!p.examDone,
  examRegions:Object.keys(p.examFindings||{}).length,sys:p.liveVitals.sys,
  initialShock:Number(p.firstVitalsKnown?.vitals?.sys)<90,
  imagingDone:p.orders.some(o=>o.status==='done'&&/^(peri_ct|peri_rx|ter_ct)|ct|rx|imagen|radiografia|tomografia/i.test(o.id))};
}
export function createSurgicalConsultation(p,_activeCase,{cases=[],publicReceiverCases=cases,executed,readiness,prepareTransfer,acceptTransfer,
 previewReadiness=null,nursingWorkPending=()=>false,checkpoint=null}){
 // Native transfer callback is optional: CIRR's historical consultations have
 // no direct transfer finalizer and must retain their existing behavior.
 const pending=new Set(structuredClone(checkpoint?.pending??[]));
 const transferCommand=task=>task.commands.find(cmd=>cmd.intent.kind==='case.close'&&!cmd.intent.partial);
 const destinationFor=id=>publicReceiverOptions(publicReceiverRecord(p),publicReceiverCases,null,id)[0]?.destination||
  (id==='uti'?'uti':id==='gastro'?'procedimiento':'quirofano');
 const noIndication=id=>({accepted:false,status:'no-indication',reasonCode:'destination-not-indicated',decision:'REJECTED_NO_INDICATION',
  reason:(serviceLabels[id]||id)+': con los hallazgos actuales no hay una indicación de recepción por este servicio. Continuar manejo médico y reevaluar el destino.'});
 function reviewFor(id,{transfer=false,command,clock,destination=null}={}){
  if(p.caseEnded||p.patientDied)return {accepted:false,status:'inactive',reasonCode:'patient-not-active',
   decision:'REJECTED_NO_INDICATION',reason:'La atención ya finalizó.'};
  const record=transfer&&previewReadiness?previewReadiness(destination,command,clock,{publicRecord:true}):publicReceiverRecord(p);
  return evaluatePublicReceiver(record,publicReceiverCases,{destination,service:id,transfer});
 }
 function evaluate(id,options){
  try{return reviewFor(id,options);}
  catch{return {accepted:false,status:'technical-error',decision:'ERROR_RECOVERABLE',reasonCode:'consultation-evaluation-failed',
   reason:'ATRIA: error técnico al evaluar la interconsulta. No es un rechazo clínico. El paciente conserva su atención y puede reintentar.'};}
 }
 function receipt(cmd,consult,reused=false){
  return executed(cmd,{consultId:consult.id,sourceEventId:consult.sourceEventId,
   accepted:consult.accepted,consultStatus:consult.status,reviewStatus:consult.reviewStatus,
   decision:consult.decision,reasonCode:consult.reasonCode,
   respondedAtRealSecond:consult.respondedAtRealSecond,reused,
   message:(serviceLabels[consult.id]||consult.id)+': '+consult.advice});
 }
 return Object.freeze({
  checkpoint:()=>structuredClone({pending:[...pending]}),
  request(cmd,clock){
   const {intent}=cmd;
   const destination=intent.kind==='case.close'&&!intent.partial?intent.id:null;
   const option=destination?publicReceiverOptions(publicReceiverRecord(p),publicReceiverCases,destination)[0]:null;
   const service=destination?(option?.service||({quirofano:'cirugia',uti:'uti',procedimiento:'gastro'})[destination]):null;
   if(destination&&(!service||typeof acceptTransfer!=='function'))return null;
   if(!service&&(!CLINICAL_CONSULT_SERVICES.includes(intent.id)||
      !['consult.request','procedure.request'].includes(intent.kind)))return null;
   const record=publicReceiverRecord(p);
   const chosen=option||publicReceiverOptions(record,publicReceiverCases,null,intent.id)[0];
   const id=service||chosen?.service||intent.id;
   if(destination&&chosen&&clinicalTransferContinuation(record,chosen.protocol,destination).pendingBlockers.length)
    return {status:'rejected',eventId:cmd.eventId,patientUid:p.uid,reason:'pending-clinical-treatment'};
   const review=evaluate(id,{transfer:!!destination,destination,command:cmd,clock});
   const prior=p.consults.findLast(x=>x.id===id&&x.status==='done'&&x.accepted);
   if(prior&&review.accepted)return destination?acceptTransfer(cmd,{...prior,
    receiverProof:{version:1,patientUid:p.uid,destination,sourceEventId:prior.sourceEventId,publicProtocolId:review.publicProtocolId}}):receipt(cmd,prior,true);
   // Check the clinical basis when the transfer is REQUESTED, not 3.5s
   // later. New findings documented while awaiting the response cannot
   // retroactively justify a premature disposition request.
   if(destination&&!review.accepted)return {status:review.decision==='ERROR_RECOVERABLE'?'unconfirmed':'rejected',eventId:cmd.eventId,patientUid:p.uid,
    reason:'transfer-not-accepted',receipt:{patientUid:p.uid,eventId:cmd.eventId,message:review.reason,
     decision:review.decision,reasonCode:review.reasonCode}};
   const existing=[...pending].find(t=>t.id===id);
   if(existing){existing.commands.push(structuredClone(cmd));return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};}
   const task={id,sourceEventId:cmd.eventId,patientUid:p.uid,
    readyAtRealSecond:clock.clinicalMinute+3.5,commands:[structuredClone(cmd)]};
   pending.add(task);
   p.pendingConsults.push({id:task.id,sourceEventId:task.sourceEventId,
    patientUid:p.uid,readyAtRealSecond:task.readyAtRealSecond});
   return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};
  },
  // A bedside intervention requested while the receiver deliberates remains
  // part of preparation. Once nursing confirms it, review current evidence.
  due:(_before,after)=>[...pending].filter(t=>t.readyAtRealSecond<=after.clinicalMinute+1e-9&&
   (!transferCommand(t)||!nursingWorkPending())),
  owns:task=>pending.has(task),
  finish(task,at,nativeMinute){
   if(!pending.delete(task))return [];
   p.pendingConsults=p.pendingConsults.filter(x=>x.sourceEventId!==task.sourceEventId);
   if(p.caseEnded||p.patientDied)return task.commands.map(cmd=>({status:'rejected',patientUid:p.uid,eventId:cmd.eventId,reason:'patient-not-active'}));
   const transfer=transferCommand(task);
   const clock={clinicalMinute:at,nativeMinute};
   const review=evaluate(task.id,{transfer:!!transfer,destination:transfer?.intent.id??null,command:transfer,clock});
   if(transfer&&review.accepted)prepareTransfer?.(transfer,clock);
   const consult={id:task.id,patientUid:p.uid,sourceEventId:task.sourceEventId,
    status:review.decision==='ERROR_RECOVERABLE'?'error':review.accepted?'done':'rejected',accepted:review.accepted,
    decision:review.decision,reasonCode:review.reasonCode,
    reviewStatus:review.status,advice:review.reason,respondedAtRealSecond:at,
    ...(review.accepted?{receiverProof:{version:1,patientUid:p.uid,destination:review.destination,
     sourceEventId:task.sourceEventId,publicProtocolId:review.publicProtocolId}}:{})};
   p.consults.push(consult);
   if(review.decision==='ERROR_RECOVERABLE')return task.commands.map(cmd=>({status:'unconfirmed',eventId:cmd.eventId,patientUid:p.uid,reason:review.reasonCode,
    receipt:{eventId:cmd.eventId,patientUid:p.uid,decision:review.decision,reasonCode:review.reasonCode,message:review.reason}}));
   return task.commands.map(cmd=>cmd.intent.kind==='case.close'&&!cmd.intent.partial?
    acceptTransfer(cmd,consult):receipt(cmd,consult));
  },
  dispose(){pending.clear();p.pendingConsults=[];}
 });
}
