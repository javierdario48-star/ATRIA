import {createRoomAuthority} from '../core/room-authority.js';
import {createNativeClinicalPort} from '../adapters/native-clinical-port.js';
import {createStudyService} from './studies.js';
import {createCirrCare} from './cirr-care.js';
import {createAppCare} from './app-care.js';
import {createProgressionLedger} from './progression.js';
import {assertMatchingClinicalReceipt} from './receipts.js';
import {createGuardClock} from './guard-clock.js';
import {refreshMonitoring,parseNasalOxygenFlow} from './observations.js';
import {vegaGuidance} from './vega-guidance.js';
import {isStandardIVMedicine,parseStandardIVDose} from './native-medications.js';
import {parseCirrDose} from './native-cirr.js';

const copy=value=>structuredClone(value);
const routeReason={
 'no-patient-target':'Acercate al paciente para indicar el estudio.',
 'question-or-negation':'Pregunta o indicación negada: no ejecuté ninguna acción.',
 'unknown-clause':'La indicación necesita una aclaración; no ejecuté acciones.'
};

/** Local authoritative clinical composition. C1 studies and C2 native CIRR
 * care mutate the same owned patient through one port; UI never mutates it.
 */
export function createGuardSession({roomId,mode,actorId,actorName,patient,content,resolveContext,onChange=()=>{},progress=createProgressionLedger(),nursing=null}){
 if(!['solo','apprentice'].includes(mode)||typeof resolveContext!=='function')throw Error('local clinical mode/context required');
 const caseData=content.cases.find(c=>c.id===patient.caseId);if(!caseData)throw Error('unknown patient case');
 const nativePatient={uid:patient.uid,caseId:patient.caseId,orders:[],treatments:[]};
 const options={mode,defaultDoses:content.defaultDoses,progress};
 const care=caseData.id==='CIRR-001'?createCirrCare(nativePatient,caseData,options):
  caseData.id==='APP-001'?createAppCare(nativePatient,caseData,options):null;
 const studies=createStudyService(content.cases),catalog=studies.catalog(),nativeIds=new Set(caseData.studies.map(s=>s.id));
 const orderedStudies=[...caseData.studies,...catalog.filter(s=>!nativeIds.has(s.id))];
 const labels=new Map(orderedStudies.map(s=>[s.id,s.label])),pendingStudyRequests=new Map(),pendingNurseJobs=new Map(),waitingForAccess=new Map();
 if(nursing&&(!['enqueue','takeArrivals','accept'].every(k=>typeof nursing[k]==='function')))
  throw Error('nursing adapter needs enqueue, takeArrivals and accept');
 for(const item of [...content.therapies,...caseData.interventions])labels.set(item.id,item.label);
 const guardClock=createGuardClock(actorId);let clock=guardClock.read(),disposed=false;
 const credentials=Object.freeze({roomId,actorId,nonce:Symbol('local-room')});
 const port=createNativeClinicalPort({
  validateReceipt:assertMatchingClinicalReceipt,
  withPatient:async(uid,fn)=>{if(uid!==nativePatient.uid)throw Error('patient not in this room');return fn(nativePatient);},
  invoke:async({eventId,actorId,patientUid,intent})=>{
   if(nursing&&intent.kind==='case.close'&&(pendingNurseJobs.size||waitingForAccess.size))
    return {status:'rejected',patientUid,eventId,reason:'nursing-work-in-progress'};
   const ivMedicine=!!care&&intent.kind==='therapy.request'&&isStandardIVMedicine(intent.id);
   const oxygenAction=!!care&&intent.id==='oxygen'&&['therapy.request','therapy.stop'].includes(intent.kind);
   const cirrBedside=caseData.id==='CIRR-001'&&intent.kind==='therapy.request'&&
    ['espironolactona','paracentesis_ter'].includes(intent.id);
   const physical=nursing&&(intent.kind==='procedure.request'&&['iv','monitor'].includes(intent.id)||
    intent.kind==='monitor.set'&&intent.id==='connect'||ivMedicine||cirrBedside||oxygenAction);
   if(physical){
    if(nativePatient.caseEnded)return {status:'rejected',patientUid,eventId,reason:'patient-not-active'};
    // Native case policy remains the only executor. These are the same
    // certified dose/route parsers that it calls, never a new catalog.
    try{
     if(ivMedicine)parseStandardIVDose(intent.clause||intent.sourceText,content.defaultDoses?.[intent.id]);
     if(oxygenAction&&intent.kind==='therapy.request')parseNasalOxygenFlow(intent.clause||intent.sourceText);
     if(cirrBedside&&intent.id==='espironolactona')
      parseCirrDose(intent.clause||intent.sourceText,content.defaultDoses?.espironolactona);
    }catch(error){return {status:'rejected',patientUid,eventId,reason:error.message};}
    if(oxygenAction){
     const active=nativePatient.procedures.oxygen;
     if(intent.kind==='therapy.stop'&&!active?.active)
      return {status:'rejected',patientUid,eventId,reason:'oxygen-not-active'};
     if(intent.kind==='therapy.request'&&active?.active&&
        active.flowLpm===parseNasalOxygenFlow(intent.clause||intent.sourceText).amount)
      return care.execute({eventId,actorId,patientUid,intent},clock);
    }
    // IV therapy can only start its native pharmacological preparation
    // once access exists. If a legitimate IV trip is in progress, wait for its
    // exact receipt before queueing the bedside medication.
    if(ivMedicine&&nativePatient.venousAccessCount<1){
     if([...pendingNurseJobs.values()].some(j=>j.intent.kind==='procedure.request'&&j.intent.id==='iv')){
      waitingForAccess.set(eventId,{eventId,actorId,patientUid,intent:copy(intent)});
      return {status:'pending',patientUid,eventId};
     }
     return {status:'rejected',patientUid,eventId,reason:'venous-access-required'};
    }
    // Repeated requests for access that already exists should not schedule
    // fictitious second cannulation; two requested lines still need two.
    if(intent.kind==='procedure.request'&&intent.id==='iv'&&
       (nativePatient.venousAccessCount??0)>=(intent.count===2?2:1))
     return care.execute({eventId,actorId,patientUid,intent},clock);
    // Reconfirmed therapies reuse the native certificate, rather than send an
    // NPC on a fictitious second administration after a finished treatment.
    if(intent.kind==='therapy.request'&&nativePatient.treatments.some(t=>t.id===intent.id))
     return care.execute({eventId,actorId,patientUid,intent},clock);
    const travel=nursing.enqueue({eventId,patientUid,kind:intent.id});
    if(['queued','travelling'].includes(travel.status)){
     pendingNurseJobs.set(eventId,{eventId,actorId,patientUid,intent:copy(intent)});
     return {status:'pending',patientUid,eventId};
    }
    return {status:'rejected',patientUid,eventId,reason:'nurse-'+travel.status};
   }
   if(intent.kind==='study.request'){
    const result=studies.request(nativePatient,{id:intent.id,eventId,actorId,atMinute:clock.clinicalMinute});
    if(result.status==='pending'){
     const order=nativePatient.orders.find(o=>o.id===intent.id);
     if(!pendingStudyRequests.has(order.sourceEventId))pendingStudyRequests.set(order.sourceEventId,new Set());
     pendingStudyRequests.get(order.sourceEventId).add(eventId);
    }
    return result;
   }
   return care?care.execute({eventId,actorId,patientUid,intent},clock):{status:'rejected',patientUid,eventId,reason:'clinical-action-not-migrated'};
  }
 });
 const authority=createRoomAuthority({roomId,mode,members:[{id:actorId}],patients:[{uid:patient.uid}],
  authenticate:token=>token===credentials?{id:actorId,roomId}:null,clinicalPort:port,
  resolveSpeechContext:({envelope})=>({...resolveContext({targetPatientUid:envelope.targetPatientUid}),clinicalEvaluation:!!care,
   ...(care&&nursing?{venousAccessCount:nativePatient.venousAccessCount??0,pendingIV:[...pendingNurseJobs.values()].some(j=>j.intent.kind==='procedure.request'&&j.intent.id==='iv'),defaultDoses:content.defaultDoses}:{}),
   studies:orderedStudies,therapies:content.therapies,interventions:caseData.interventions}),
  respondNpc:({patientUid,text,mode})=>vegaGuidance(patientUid===nativePatient.uid?nativePatient:null,caseData,text,{mode}),
  time:()=>clock.clinicalMinute,emit:(event,snapshot)=>onChange(copy(event),copy(snapshot))});
 function resultText(item,label){
  // An unanswered history question is a patient reply, not a failed nursing procedure.
  if(item.kind==='history.ask')return null;
  if(item.status==='unconfirmed')
   return label+': ejecución no confirmada; comprobá el estado del paciente antes de repetir.';
  if(item.status!=='rejected')return null;
  if(item.receipt?.message)return 'No ejecutado: '+item.receipt.message;
  if(item.reason==='clinical-action-not-migrated')
   return item.kind==='therapy.request'?
    label+': no hay una regla de tratamiento validada para '+caseData.id+'. No administrado.':
    label+': este procedimiento no está implementado para '+caseData.id+'. No ejecutado.';
  if(item.reason==='oxygen-not-active')return label+': no hay oxígeno activo que suspender.';
  if(item.reason==='venous-access-required')
   return label+': necesitás una vía venosa confirmada antes de administrarlo.';
  return label+': no ejecutado ('+(item.reason||'sin autorización')+').';
 }
 function messages(room){
  const rows=[],announcedResults=new Set();
  for(const event of room.events){
   if(event.type==='chat.posted'){
    const message=event.message,selected=/^\/estudio\s+([a-z0-9_-]+)$/i.exec(message.text);
    // A menu selection retains its exact protocol ID; the shared presentation
    // uses the familiar clinical label rather than exposing that internal ID.
    const text=selected&&labels.has(selected[1])?'Enfermera, '+labels.get(selected[1]):message.text;
    rows.push({id:'player:'+message.id,name:actorName,text,role:'player'});
    if(event.routeError)rows.push({id:'route:'+message.id,name:'Enfermera',role:'nurse',
     text:routeReason[event.routeError]||'No pude ejecutar esa indicación.'});
    for(let i=0;i<event.clinical.length;i++){
     const item=event.clinical[i],label=labels.get(item.id)||item.id;
     const nativeText=item.receipt?.message;
     const feedback=resultText(item,label)||
      (nativeText|| (item.status==='pending'?
       item.kind==='study.request'?label+': solicitado; pendiente de resultado.':
        label+': orden recibida; pendiente de enfermería o preparación, todavía no ejecutada.':
       label+': resultado disponible.'));
     rows.push({id:'ack:'+message.id+':'+i,
      name:item.kind==='history.ask'?'Paciente':'Enfermera',
      role:item.kind==='history.ask'?'patient':'nurse',text:feedback});
    }
    if(event.npcReply?.role==='mentor')
     rows.push({id:'npc:'+message.id,name:event.npcReply.name,role:'mentor',text:event.npcReply.text});
   }else if(event.type==='clinical.completed'){
    for(const item of event.clinical){
     const source=item.receipt?.sourceEventId||event.eventId;if(announcedResults.has(source))continue;
     announcedResults.add(source);rows.push({id:'completion:'+source,name:'Enfermera',role:'nurse',
      text:resultText(item,labels.get(item.id)||item.id)||
       (item.receipt?.message||(labels.get(item.id)||item.id)+': resultado disponible.')});
    }
   }
  }
  return rows;
 }
 return Object.freeze({
  catalog:()=>copy(orderedStudies),
  post:envelope=>disposed?Promise.resolve({status:'rejected',reason:'room-disposed'}):authority.dispatch({kind:'chat.post',...envelope},credentials),
  advance(deltaRealSeconds,{typing=false}={}){
   if(disposed)throw Error('guard session disposed');
   const before=clock;
   clock=guardClock.advance(deltaRealSeconds,typing);
   for(const result of care?.advance(before,clock,deltaRealSeconds)||[]){
    // Once the ORIGINAL case preparation clock completes, publish its native
    // receipt and only then release the spatial bedside job.
    port.complete(result);
    if(pendingNurseJobs.has(result.eventId)){
     const ack=nursing.accept({eventId:result.eventId,patientUid:result.patientUid,
      status:result.status,receipt:result.receipt});
     if(ack.status!==(result.status==='executed'?'confirmed':'rejected'))
      throw Error('physical therapy completion mismatch');
     pendingNurseJobs.delete(result.eventId);
    }
   }
   refreshMonitoring(nativePatient,clock);
   const ready=studies.advance(nativePatient,clock.clinicalMinute);
   for(const order of ready){
    for(const eventId of pendingStudyRequests.get(order.sourceEventId)||[order.sourceEventId])
     port.complete({eventId,patientUid:nativePatient.uid,status:'executed',
      receipt:{eventId,patientUid:nativePatient.uid,studyId:order.id,sourceEventId:order.sourceEventId,
       actorId:order.actorId,result:order.result,resultSource:order.resultSource}});
    pendingStudyRequests.delete(order.sourceEventId);
   }
   return copy(ready);
  },
  flush:()=>authority.flush(),
  /** Drain ONLY arrivals issued by the existing spatial world. The UI cannot
   * fabricate an arrival, execute a native intervention or mint its receipt.
   * Completion is committed through the original port and room authority.
   */
  finishNurseArrivals(){
   if(disposed||!nursing)return [];
   const results=[];
   for(const arrival of nursing.takeArrivals()){
    const task=pendingNurseJobs.get(arrival.eventId);
    if(!task||task.patientUid!==arrival.patientUid)continue;
    const result=care?.execute(task,clock)??{
     status:'rejected',patientUid:task.patientUid,eventId:task.eventId,reason:'clinical-action-not-migrated'};
    if(result.status==='pending'){
     // The nurse is physically at the bedside, supervising the existing
     // preparation. care.advance() alone will issue the terminal receipt.
     results.push(copy(result));continue;
    }
    port.complete(result);
    pendingNurseJobs.delete(arrival.eventId);
    const spatial=nursing.accept({eventId:arrival.eventId,patientUid:arrival.patientUid,
     status:result.status,receipt:result.receipt});
    if(spatial.status!==(result.status==='executed'?'confirmed':'rejected'))
     throw Error('nursing spatial acknowledgment mismatch');
    if(task.intent.kind==='procedure.request'&&task.intent.id==='iv'){
     for(const [id,waiting] of waitingForAccess){
      waitingForAccess.delete(id);
      if(result.status==='executed'){
       const next=nursing.enqueue({eventId:id,patientUid:waiting.patientUid,kind:waiting.intent.id});
       if(['queued','travelling'].includes(next.status))
        pendingNurseJobs.set(id,waiting);
       else port.complete({status:'rejected',eventId:id,patientUid:waiting.patientUid,reason:'nurse-'+next.status});
      }else port.complete({status:'rejected',eventId:id,patientUid:waiting.patientUid,
       reason:'venous-access-unavailable'});
     }
    }
    results.push(copy(result));
   }
   return results;
  },
  // Minimal read-only projection for 30Hz ECG paint; never clone room events or
  // recalculate closure from the presentation loop. Authority owns all writes.
  monitorRead(uid){
   if(disposed||uid!==nativePatient.uid)return null;
   return {uid:nativePatient.uid,caseEnded:!!nativePatient.caseEnded,
    ecg:nativePatient.ecg?copy(nativePatient.ecg):null,
    procedures:{monitor:{connected:!!nativePatient.procedures?.monitor?.connected}},
    lastVitalsKnown:nativePatient.lastVitalsKnown?{vitals:copy(nativePatient.lastVitalsKnown.vitals)}:null};
  },
  read(){const room=authority.snapshot();return {room,patient:copy(nativePatient),clock:copy(clock),messages:messages(room),progress:progress.read(),
   closure:care?copy(care.readiness(caseData.id==='APP-001'?'quirofano':'sala')):null};},
  dispose(){if(disposed)return;disposed=true;pendingNurseJobs.clear();waitingForAccess.clear();pendingStudyRequests.clear();care?.dispose();authority.dispose();}
 });
}
