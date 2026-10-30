import {csDxMatchesCase487} from '../../clinical/diagnostic-impression-487.js';
import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
import {CASE_CLOSURE_RULES_487} from '../../clinical/case-completion-487.js';
import {consultationEvidenceReview,consultationPreparationReview} from './consultation-evidence.js';
import {clinicalTransferContinuation} from './transfer-continuation.js';
const serviceLabels={uti:'UTI',cirugia:'Cirugía',gastro:'Gastroenterología',clinica:'Clínica médica',
 cardiologia:'Cardiología',cardiovascular:'Cirugía cardiovascular',neurology:'Neurología',neurosurgery:'Neurocirugía'};
export const CLINICAL_CONSULT_SERVICES=Object.freeze(Object.keys(serviceLabels));

/** Effective V19 mentorAcuity + csConsultAdvice('uti'). The original reply
 * declines a critical bed while stable and accepts higher-complexity care
 * otherwise. No diagnosis, treatment, operation or vital write is inferred.
 */
export function criticalCareReview487(v,{recentShock=false,criticalIllness=false}={}){
 const map=Math.round((v.sys+2*v.dia)/3);
 const unstable=v.sys<95||map<65||v.spo2<93||v.hr>=130||v.rr>=30;
 const critical=v.sys<80||map<55||v.spo2<90||v.hr>=155||v.rr>=36;
 const accepted=unstable||critical||recentShock||criticalIllness;
 if(criticalIllness&&!unstable&&!critical)return {accepted:true,status:'accepted',reason:
  'UTI acepta el cuadro crítico con soporte y vigilancia continuos; la estabilidad bajo soporte no elimina la necesidad de ingreso crítico.'};
 if(recentShock&&!unstable&&!critical)return {accepted:true,status:'accepted',reason:
  'UTI evalúa: antecedente reciente de shock pese a la respuesta al soporte. Aceptamos el ingreso crítico; mantener reanimación y vigilancia durante el traslado.'};
 return {accepted,status:accepted?'accepted':'stable',reason:accepted?
  'UTI evalúa: cuadro con criterios de alta complejidad; mantener reanimación y preparar ingreso crítico.':
  'UTI evalúa: por ahora no requiere cama crítica si mantiene estabilidad; reevaluar ante deterioro.'};
}

/** Specialist communication inside the existing care executor. It never
 * administers a procedure, changes vitals or approves a case closure.
 * The original 3500ms response uses the owned real-time clock domain.
 */
export function surgicalReviewSnapshot(p,c,cases=[c]){
 return {diagnosis:p.diagnosis,diagnosticCompatible:csDxMatchesCase487(cases,c.id,p.diagnosis),
  vitalsKnown:!!p.lastVitalsKnown,examDone:!!p.examDone,
  examRegions:Object.keys(p.examFindings||{}).length,sys:p.liveVitals.sys,
  initialShock:Number(String(c.vitals.bp).split('/')[0])<90,
  imagingDone:p.orders.some(o=>o.status==='done'&&/^(peri_ct|peri_rx|ter_ct)|ct|rx|imagen|radiografia|tomografia/i.test(o.id))};
}
export function createSurgicalConsultation(p,c,{cases=[c],executed,readiness,acceptTransfer,checkpoint=null}){
 // Native transfer callback is optional: CIRR's historical consultations have
 // no direct transfer finalizer and must retain their existing behavior.
 const pending=new Set(structuredClone(checkpoint?.pending??[]));
 const rule=c.clinicalPolicy?.closure||GASTRO_CASE_RULES[c.id]||CASE_CLOSURE_RULES_487[c.id];
 const declared=rule?.consult;
 const declaredServices=new Set(Object.values(declared||{}).flat());
 const resolveService=id=>id==='cirugia'&&!declaredServices.has(id)?
  ['cardiovascular','neurosurgery'].find(service=>declaredServices.has(service))||id:id;
 const destinationFor=id=>declared?Object.entries(declared).find(([,services])=>services.includes(id))?.[0]:
  id==='uti'?'uti':id==='gastro'?'procedimiento':'quirofano';
 const noIndication=id=>({accepted:false,status:'no-indication',reasonCode:'destination-not-indicated',decision:'REJECTED_NO_INDICATION',
  reason:(serviceLabels[id]||id)+': con los hallazgos actuales no hay una indicación de recepción por este servicio. Continuar manejo médico y reevaluar el destino.'});
 function reviewFor(id,{transfer=false}={}){
  if(p.caseEnded||p.patientDied)return {accepted:false,status:'inactive',reasonCode:'patient-not-active',
   decision:'REJECTED_NO_INDICATION',reason:'La atención ya finalizó.'};
  if(declared&&!declaredServices.has(id))return noIndication(id);
  if(!declared&&id!=='uti'&&!(id==='cirugia'&&
   ((c.keyInterventions||[]).some(key=>['source_control','surgery'].includes(key))||['MESI-001','ILEO-001','PERI-TER-001'].includes(c.id))))
   return noIndication(id);
  const evidence=consultationEvidenceReview(p,c,rule);if(evidence)return evidence;
  if(id==='uti'){
   const traits=c.clinicalPolicy?.traits||[];
   const criticalIllness=traits.some(t=>['neuromuscularWeakness','intracranialBleed','statusEpilepticus','convulsiveStatusEpilepticus','respiratoryFailure','ards'].includes(t))||
    p.treatments.some(t=>t.patientUid===p.uid&&['intubation','lung_protective_ventilation','temporary_pacing'].includes(t.id)&&t.kind==='procedure.performed');
   const critical=criticalCareReview487(p.liveVitals,{recentShock:Number(String(c.vitals.bp).split('/')[0])<90,criticalIllness});
   if(!critical.accepted)return {...critical,reasonCode:'destination-not-indicated',decision:'REJECTED_NO_INDICATION'};
  }
  const preparation=consultationPreparationReview(readiness(destinationFor(id)),{transfer,
   pendingTreatments:clinicalTransferContinuation(p,c,destinationFor(id)).pendingBlockers.length});
  if(preparation)return preparation;
  return {accepted:true,status:'accepted',decision:'ACCEPTED',reasonCode:null,reason:(serviceLabels[id]||id)+
   ' acepta la recepción del paciente. Mantener soporte y vigilancia durante el traslado; la aceptación no acredita un procedimiento realizado.'};
 }
 function evaluate(id,options){
  try{return reviewFor(id,options);}
  catch{return {accepted:false,status:'technical-error',decision:'ERROR_RECOVERABLE',reasonCode:'consultation-evaluation-failed',
   reason:'ATRIA: error técnico al evaluar la interconsulta. No es un rechazo clínico. El paciente conserva su atención y puede reintentar.'};}
 }
 function receipt(cmd,consult,reused=false){
  const missing=consult.accepted?(readiness(destinationFor(consult.id))?.missing||[]):[];
  return executed(cmd,{consultId:consult.id,sourceEventId:consult.sourceEventId,
   accepted:consult.accepted,consultStatus:consult.status,reviewStatus:consult.reviewStatus,
   decision:consult.decision,reasonCode:consult.reasonCode,
   respondedAtRealSecond:consult.respondedAtRealSecond,reused,
   message:(serviceLabels[consult.id]||consult.id)+': '+consult.advice+(missing.length?' Pendiente para la derivación: '+missing.join(' '):'')});
 }
 return Object.freeze({
  checkpoint:()=>structuredClone({pending:[...pending]}),
  request(cmd,clock){
   const {intent}=cmd;
   const destination=intent.kind==='case.close'&&!intent.partial?intent.id:null;
   // Only case-authorized accepting transfer routes use automatic closure.
   // PBE/TER preserve their proven direct ICU disposition contract.
   const permitted=declared?Object.keys(declared).filter(id=>(declared[id]||[]).length):GASTRO_CASE_RULES[c.id]?.destinations.filter(id=>['procedimiento','uti','quirofano'].includes(id)) ??
    (['CHOLANG-001','HDA-001'].includes(c.id)?['procedimiento','uti']:
     ['APP-001','CHOLE-001','PERI-SEC-001','MESI-001','ILEO-001'].includes(c.id)?['quirofano']:
     ['PANC-001','PERI-TER-001','PERI-PBE-001'].includes(c.id)?['uti']:[]);
   if(destination&&(!permitted.includes(destination)||typeof acceptTransfer!=='function'))return null;
   const service=destination?(declared?declared[destination]?.find(id=>CLINICAL_CONSULT_SERVICES.includes(id)):destination==='quirofano'?'cirugia':destination==='uti'?'uti':destination==='procedimiento'?'gastro':null):null;
   if(!service&&(!CLINICAL_CONSULT_SERVICES.includes(intent.id)||
      !['consult.request','procedure.request'].includes(intent.kind)))return null;
   if(destination&&clinicalTransferContinuation(p,c,destination).pendingBlockers.length)
    return {status:'rejected',patientUid:p.uid,eventId:cmd.eventId,reason:'pending-clinical-treatment'};
   const id=resolveService(service||intent.id);
   const review=evaluate(id,{transfer:!!destination});
   const prior=p.consults.findLast(x=>x.id===id&&x.status==='done'&&x.accepted);
   if(prior&&review.accepted)return destination?acceptTransfer(cmd,prior):receipt(cmd,prior,true);
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
  due:(_before,after)=>[...pending].filter(t=>t.readyAtRealSecond<=after.clinicalMinute+1e-9),
  owns:task=>pending.has(task),
  finish(task,at){
   if(!pending.delete(task))return [];
   p.pendingConsults=p.pendingConsults.filter(x=>x.sourceEventId!==task.sourceEventId);
   if(p.caseEnded||p.patientDied)return task.commands.map(cmd=>({status:'rejected',patientUid:p.uid,eventId:cmd.eventId,reason:'patient-not-active'}));
   const review=evaluate(task.id,{transfer:task.commands.some(cmd=>cmd.intent.kind==='case.close'&&!cmd.intent.partial)});
   const consult={id:task.id,patientUid:p.uid,sourceEventId:task.sourceEventId,
    status:review.decision==='ERROR_RECOVERABLE'?'error':review.accepted?'done':'rejected',accepted:review.accepted,
    decision:review.decision,reasonCode:review.reasonCode,
    reviewStatus:review.status,advice:review.reason,respondedAtRealSecond:at};
   p.consults.push(consult);
   if(review.decision==='ERROR_RECOVERABLE')return task.commands.map(cmd=>({status:'unconfirmed',eventId:cmd.eventId,patientUid:p.uid,reason:review.reasonCode,
    receipt:{eventId:cmd.eventId,patientUid:p.uid,decision:review.decision,reasonCode:review.reasonCode,message:review.reason}}));
   return task.commands.map(cmd=>cmd.intent.kind==='case.close'&&!cmd.intent.partial?
    acceptTransfer(cmd,consult):receipt(cmd,consult));
  },
  dispose(){pending.clear();p.pendingConsults=[];}
 });
}
