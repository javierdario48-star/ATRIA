import {buildStudyCatalog,resolveStudyById,materializeStudy,studyTurnaroundMinutes}
 from '../../clinical/study-registry.js';
import {isPhysicianExamStudy} from './exam-contract.js';

const identity=x=>typeof x==='string'&&x.trim().length>0;
const minute=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
const copy=x=>structuredClone(x);

// The caller owns the clinical clock and the authoritative patient objects.
// This service only requests/results existing studies; it has no drug writer.
export function createStudyService(cases,checkpoint=null){
 if(!Array.isArray(cases)||cases.some(c=>!identity(c?.id)||!Array.isArray(c.studies))||
    new Set(cases.map(c=>c.id)).size!==cases.length)throw Error('valid unique study cases required');
 const definitions=copy(cases),byCase=new Map(definitions.map(c=>[c.id,c]));
 // New V5 study timings are isolated here. Never mutate the legacy V4 registry.
 const localTiming=new Map(definitions.flatMap(c=>(c.studies||[])
  .filter(s=>String(s.id).startsWith('g_')&&Number.isFinite(s.delay)&&s.delay>=5&&s.delay<=1440)
  .map(s=>[s.id,s.delay])));
 const catalog=buildStudyCatalog(definitions).filter(s=>!isPhysicianExamStudy(s.id)),events=new Map(copy(checkpoint?.events??[]));
 const patientValid=p=>identity(p?.uid)&&byCase.has(p.caseId)&&Array.isArray(p.orders);
 const rejected=(p,eventId,reason)=>({status:'rejected',patientUid:p?.uid??null,eventId:eventId??null,reason});
 function acknowledged(p,eventId,order){
  if(order.status!=='done')return {status:'pending',patientUid:p.uid,eventId};
  return {status:'executed',patientUid:p.uid,eventId,receipt:{
   patientUid:p.uid,eventId,studyId:order.id,sourceEventId:order.sourceEventId,
   actorId:order.actorId,result:order.result,resultSource:order.resultSource,
   requestedAtMinute:order.requestedAtMinute,readyAtMinute:order.readyAtMinute
  }};
 }
 return Object.freeze({
  checkpoint:()=>copy({events:[...events]}),
  catalog:()=>copy(catalog.map(s=>localTiming.has(s.id)?{...s,gameHours:localTiming.get(s.id)/60}:s)),
  request(patient,command={}){
   const {id,eventId,actorId,atMinute}=command||{};
   if(!patientValid(patient))return rejected(patient,eventId,'invalid-patient');
   if(!identity(id)||!identity(eventId)||!identity(actorId)||!minute(atMinute))
    return rejected(patient,eventId,'invalid-study-request');
   if(isPhysicianExamStudy(id))return rejected(patient,eventId,'physician-exam-required');
   const fingerprint=JSON.stringify([patient.uid,patient.caseId,id,actorId]);
   const prior=events.get(eventId);
   if(prior&&prior.fingerprint!==fingerprint)
    return rejected(patient,eventId,'study-event-identity-collision');
   // The original binding survives a restored patient snapshot/new service.
   const source=patient.orders.find(o=>o.sourceEventId===eventId);
   if(source&&(source.id!==id||source.actorId!==actorId||
      source.patientUid!==patient.uid))return rejected(patient,eventId,'study-event-identity-collision');
   const existing=patient.orders.find(o=>o.id===id);
   if(existing){
    if(existing.patientUid!==patient.uid)return rejected(patient,eventId,'study-patient-mismatch');
    events.set(eventId,{fingerprint,sourceEventId:existing.sourceEventId});
    return acknowledged(patient,eventId,existing);
   }
   // A stale snapshot must not recreate an already dispatched effect.
   if(prior?.sourceEventId)return rejected(patient,eventId,'study-order-missing');
   events.set(eventId,{fingerprint});
   const caseDef=byCase.get(patient.caseId),study=resolveStudyById(id,caseDef,catalog);
   if(!study)return rejected(patient,eventId,'unknown-study');
   const definition=materializeStudy(study,caseDef);
   const order={id:definition.id,label:definition.label,type:definition.type,
    patientUid:patient.uid,result:definition.result,
    resultSource:definition.nativeResult?'native':'universal-fallback',
    nativeResult:definition.nativeResult,universalFallback:definition.universalFallback,
    status:'pending',requestedAtMinute:atMinute,
    readyAtMinute:atMinute+(localTiming.get(definition.id)??studyTurnaroundMinutes(definition)),sourceEventId:eventId,actorId};
   patient.orders.push(order);
   events.set(eventId,{fingerprint,sourceEventId:eventId});
   return acknowledged(patient,eventId,order);
  },
  advance(patient,atMinute){
   if(!minute(atMinute))throw Error('valid study minute required');
   if(!patientValid(patient))throw Error('valid study patient required');
   const ready=[];
   for(const order of patient.orders){
    if(order.status!=='pending'||order.patientUid!==patient.uid||
       !minute(order.readyAtMinute)||order.readyAtMinute>atMinute)continue;
    order.status='done';
    ready.push(copy(order));
   }
   return ready;
  }
 });
}
