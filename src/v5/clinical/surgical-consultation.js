import {csSurgicalReview487} from '../../clinical/surgical-review-487.js';
import {csDxMatchesCase487} from '../../clinical/diagnostic-impression-487.js';

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
export function createSurgicalConsultation(p,c,{cases=[c],executed,readiness}){
 const pending=new Set();
 function receipt(cmd,consult,reused=false){
  const missing=consult.accepted?(readiness('quirofano')?.missing||[]):[];
  return executed(cmd,{consultId:'cirugia',sourceEventId:consult.sourceEventId,
   accepted:consult.accepted,consultStatus:consult.status,reviewStatus:consult.reviewStatus,
   respondedAtRealSecond:consult.respondedAtRealSecond,reused,
   message:'Cirugía: '+consult.advice+(missing.length?' Pendiente para la derivación: '+missing.join(' '):'')});
 }
 return Object.freeze({
  request(cmd,clock){
   const {intent}=cmd;
   if(intent.id!=='cirugia'||!['consult.request','procedure.request'].includes(intent.kind))return null;
   const prior=p.consults.find(x=>x.id==='cirugia'&&x.status==='done'&&x.accepted);
   if(prior)return receipt(cmd,prior,true);
   const existing=[...pending][0];
   if(existing){existing.commands.push(structuredClone(cmd));return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};}
   const task={id:'cirugia',sourceEventId:cmd.eventId,patientUid:p.uid,
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
   const review=csSurgicalReview487(surgicalReviewSnapshot(p,c,cases),c);
   const consult={id:'cirugia',patientUid:p.uid,sourceEventId:task.sourceEventId,
    status:review.accepted?'done':'rejected',accepted:review.accepted,
    reviewStatus:review.status,advice:review.reason,respondedAtRealSecond:at};
   p.consults.push(consult);
   return task.commands.map(cmd=>receipt(cmd,consult));
  },
  dispose(){pending.clear();p.pendingConsults=[];}
 });
}
