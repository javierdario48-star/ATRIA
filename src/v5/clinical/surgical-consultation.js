import {csSurgicalReview487} from '../../clinical/surgical-review-487.js';
import {csDxMatchesCase487} from '../../clinical/diagnostic-impression-487.js';
import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';
import {physicianExaminationsPerformed} from './diagnostic-evidence.js';
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
 const declared=c.clinicalPolicy?.closure?.consult;
 const declaredServices=new Set(Object.values(declared||{}).flat());
 const resolveService=id=>id==='cirugia'&&!declaredServices.has(id)?
  ['cardiovascular','neurosurgery'].find(service=>declaredServices.has(service))||id:id;
 function declaredReview(id){
  const evidence=surgicalReviewSnapshot(p,c,cases);
  const performed=new Set(physicianExaminationsPerformed(p));
  const required=c.clinicalPolicy.closure.requiredExams||[];
  const hasExam=required.length?required.every(key=>{
   const normalized=key==='neurological:all'?'neurological:neurological':key.replace(/^(?:heart|lungs):/,'thorax:');
   return performed.has(normalized);
  }):evidence.examDone||[...performed].some(key=>key.startsWith(c.specialty==='Neurología'?'neurological:':'thorax:'));
  if(!evidence.diagnosticCompatible||!evidence.vitalsKnown||!hasExam)return {accepted:false,status:'missing-evidence',
   reason:'El equipo receptor solicita una impresión diagnóstica compatible, signos vitales y exploración dirigida documentados.'};
  if(id==='uti'){
   const traits=c.clinicalPolicy.traits||[];
   const criticalIllness=traits.some(t=>['neuromuscularWeakness','intracranialBleed','statusEpilepticus','convulsiveStatusEpilepticus','respiratoryFailure','ards'].includes(t))||
    p.treatments.some(t=>t.patientUid===p.uid&&['intubation','lung_protective_ventilation','temporary_pacing'].includes(t.id)&&t.kind==='procedure.performed');
   return criticalCareReview487(p.liveVitals,{recentShock:evidence.initialShock,criticalIllness});
  }
  return {accepted:true,status:'accepted',reason:(serviceLabels[id]||id)+
   ' acepta la evaluación y recepción del paciente. Mantener soporte y vigilancia durante el traslado; la aceptación no acredita un procedimiento realizado.'};
 }
 const destinationFor=id=>declared?Object.entries(declared).find(([,services])=>services.includes(id))?.[0]:
  id==='uti'?'uti':id==='gastro'?'procedimiento':'quirofano';
 const reviewFor=id=>declared&&!declaredServices.has(id)?{accepted:false,status:'no-indication',
  reason:(serviceLabels[id]||id)+': con los hallazgos actuales no hay indicación de recepción por este servicio. Continuar el manejo y reevaluar el destino.'}:
  declared?declaredReview(id):id==='uti'?
  criticalCareReview487(p.liveVitals,{recentShock:Number(String(c.vitals.bp).split('/')[0])<90}):
  id==='gastro'?gastroReview():specialSurgicalReview()||csSurgicalReview487(surgicalReviewSnapshot(p,c,cases),c);
 function gastroReview(){
  if(!['CHOLANG-001','HDA-001','VARIX-001','LGIB-001'].includes(c.id))return {accepted:false,status:'review',
   reason:'Este caso no tiene indicación de endoscopía terapéutica urgente modelada.'};
  const evidence=surgicalReviewSnapshot(p,c,cases);
  if(!evidence.diagnosticCompatible||!evidence.vitalsKnown||!evidence.examDone)
   return {accepted:false,status:'missing-evidence',
    reason:'Gastroenterología solicita una sospecha diagnóstica compatible, signos vitales y exploración documentada antes de aceptar el traslado.'};
  return {accepted:true,status:'accepted',reason:['HDA-001','VARIX-001','LGIB-001'].includes(c.id)? 'Endoscopía acepta evaluar el sangrado y considerar hemostasia; todavía NO se realizó tratamiento definitivo. Mantener reanimación durante el traslado.':'Gastroenterología acepta la derivación urgente para valoración y posible drenaje biliar por CPRE. El drenaje todavía no se realizó; mantener soporte y antibióticos durante el traslado.'};
 }
 function specialSurgicalReview(){
  if(!['MESI-001','ILEO-001'].includes(c.id))return null;
  const snapshot=surgicalReviewSnapshot(p,c,cases);
  if(!snapshot.diagnosticCompatible||!snapshot.vitalsKnown||
   !snapshot.examDone&&snapshot.examRegions<2)return {accepted:false,status:'missing-evidence',
   reason:'Se requieren una sospecha diagnóstica compatible, signos vitales y exploración dirigida.'};
  // A surgical opinion can be requested while urgent CTA is pending. This
  // is not permission to skip the imaging/physiology required for transfer.
  return {accepted:true,status:'accepted',reason:c.id==='MESI-001'?
   'Cirugía acepta valoración urgente por posible isquemia mesentérica. La revascularización aún no se realizó; mantener reanimación y completar angio-TC.':
   'Cirugía acepta valorar obstrucción intestinal y eventual complicación. La cirugía no se realizó; mantener descompresión, soporte y vigilancia.'};
 }
 function receipt(cmd,consult,reused=false){
  const missing=consult.accepted?(readiness(destinationFor(consult.id))?.missing||[]):[];
  return executed(cmd,{consultId:consult.id,sourceEventId:consult.sourceEventId,
   accepted:consult.accepted,consultStatus:consult.status,reviewStatus:consult.reviewStatus,
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
     c.id==='PANC-001'?['uti']:[]);
   if(destination&&(!permitted.includes(destination)||typeof acceptTransfer!=='function'))return null;
   const service=destination?(declared?declared[destination]?.[0]:destination==='quirofano'?'cirugia':destination==='uti'?'uti':destination==='procedimiento'?'gastro':null):null;
   if(!service&&(!CLINICAL_CONSULT_SERVICES.includes(intent.id)||
      !['consult.request','procedure.request'].includes(intent.kind)))return null;
   if(destination&&p.pendingTreatments.length)
    return {status:'rejected',patientUid:p.uid,eventId:cmd.eventId,reason:'pending-clinical-treatment'};
   const id=resolveService(service||intent.id);
   const prior=p.consults.find(x=>x.id===id&&x.status==='done'&&x.accepted);
   if(prior)return destination?acceptTransfer(cmd,prior):receipt(cmd,prior,true);
   // Check the clinical basis when the transfer is REQUESTED, not 3.5s
   // later. New findings documented while awaiting the response cannot
   // retroactively justify a premature disposition request.
   if(destination&&(declared||id!=='uti')){
    const review=reviewFor(id);
    if(!review.accepted)return {status:'rejected',eventId:cmd.eventId,patientUid:p.uid,
     reason:'transfer-not-accepted',receipt:{patientUid:p.uid,eventId:cmd.eventId,message:review.reason}};
   }
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
   const review=reviewFor(task.id);
   const consult={id:task.id,patientUid:p.uid,sourceEventId:task.sourceEventId,
    status:review.accepted?'done':'rejected',accepted:review.accepted,
    reviewStatus:review.status,advice:review.reason,respondedAtRealSecond:at};
   p.consults.push(consult);
   return task.commands.map(cmd=>cmd.intent.kind==='case.close'&&!cmd.intent.partial?
    acceptTransfer(cmd,consult):receipt(cmd,consult));
  },
  dispose(){pending.clear();p.pendingConsults=[];}
 });
}
