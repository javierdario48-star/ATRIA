import {csSurgicalReview487} from '../../clinical/surgical-review-487.js';
import {csDxMatchesCase487} from '../../clinical/diagnostic-impression-487.js';

/** Effective V19 mentorAcuity + csConsultAdvice('uti'). The original reply
 * declines a critical bed while stable and accepts higher-complexity care
 * otherwise. No diagnosis, treatment, operation or vital write is inferred.
 */
export function criticalCareReview487(v,{recentShock=false}={}){
 const map=Math.round((v.sys+2*v.dia)/3);
 const unstable=v.sys<95||map<65||v.spo2<93||v.hr>=130||v.rr>=30;
 const critical=v.sys<80||map<55||v.spo2<90||v.hr>=155||v.rr>=36;
 const accepted=unstable||critical||recentShock;
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
export function createSurgicalConsultation(p,c,{cases=[c],executed,readiness,checkpoint=null}){
 const pending=new Set(structuredClone(checkpoint?.pending??[]));
 function gastroReview(){
  if(c.id!=='CHOLANG-001')return {accepted:false,status:'review',
   reason:'Este caso no tiene indicación de endoscopía terapéutica urgente modelada.'};
  const evidence=surgicalReviewSnapshot(p,c,cases);
  if(!evidence.diagnosticCompatible||!evidence.vitalsKnown||!evidence.examDone)
   return {accepted:false,status:'missing-evidence',
    reason:'Gastroenterología solicita una sospecha diagnóstica compatible, signos vitales y exploración documentada antes de aceptar el traslado.'};
  return {accepted:true,status:'accepted',reason:'Gastroenterología acepta la derivación urgente para valoración y posible drenaje biliar por CPRE. El drenaje todavía no se realizó; mantener soporte y antibióticos durante el traslado.'};
 }
 function receipt(cmd,consult,reused=false){
  const missing=consult.accepted?(readiness(consult.id==='uti'?'uti':consult.id==='gastro'?'procedimiento':'quirofano')?.missing||[]):[];
  return executed(cmd,{consultId:consult.id,sourceEventId:consult.sourceEventId,
   accepted:consult.accepted,consultStatus:consult.status,reviewStatus:consult.reviewStatus,
   respondedAtRealSecond:consult.respondedAtRealSecond,reused,
   message:(consult.id==='uti'?'UTI: ':consult.id==='gastro'?'Gastroenterología: ':'Cirugía: ')+consult.advice+(missing.length?' Pendiente para la derivación: '+missing.join(' '):'')});
 }
 return Object.freeze({
  checkpoint:()=>structuredClone({pending:[...pending]}),
  request(cmd,clock){
   const {intent}=cmd;
   if(!['cirugia','uti','gastro'].includes(intent.id)||!['consult.request','procedure.request'].includes(intent.kind))return null;
   const prior=p.consults.find(x=>x.id===intent.id&&x.status==='done'&&x.accepted);
   if(prior)return receipt(cmd,prior,true);
   const existing=[...pending].find(t=>t.id===intent.id);
   if(existing){existing.commands.push(structuredClone(cmd));return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};}
   const task={id:intent.id,sourceEventId:cmd.eventId,patientUid:p.uid,
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
   const review=task.id==='uti'?criticalCareReview487(p.liveVitals,{recentShock:Number(String(c.vitals.bp).split('/')[0])<90}):
    task.id==='gastro'?gastroReview():csSurgicalReview487(surgicalReviewSnapshot(p,c,cases),c);
   const consult={id:task.id,patientUid:p.uid,sourceEventId:task.sourceEventId,
    status:review.accepted?'done':'rejected',accepted:review.accepted,
    reviewStatus:review.status,advice:review.reason,respondedAtRealSecond:at};
   p.consults.push(consult);
   return task.commands.map(cmd=>receipt(cmd,consult));
  },
  dispose(){pending.clear();p.pendingConsults=[];}
 });
}
