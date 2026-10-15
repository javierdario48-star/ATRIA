import {createRoomAuthority} from '../core/room-authority.js';
import {createNativeClinicalPort} from '../adapters/native-clinical-port.js';
import {createStudyService} from './studies.js';
import {createClinicalClock487,advanceClinicalClock487} from '../../clinical/clinical-clock-487.js';

const copy=value=>structuredClone(value);
const routeReason={
 'no-patient-target':'Acercate al paciente para indicar el estudio.',
 'question-or-negation':'Pregunta o indicación negada: no ejecuté ninguna acción.',
 'unknown-clause':'La indicación necesita una aclaración; no ejecuté acciones.'
};

/** Local authoritative clinical slice. It owns study state; UI never mutates it.
 * Native administration/physiology remain unavailable, rather than simulated by
 * a second medication engine. The same port can accept their migrated executor.
 */
export function createGuardSession({roomId,mode,actorId,actorName,patient,content,resolveContext,onChange=()=>{}}){
 if(!['solo','apprentice'].includes(mode)||typeof resolveContext!=='function')throw Error('local clinical mode/context required');
 const caseData=content.cases.find(c=>c.id===patient.caseId);if(!caseData)throw Error('unknown patient case');
 const nativePatient={uid:patient.uid,caseId:patient.caseId,orders:[],treatments:[]};
 const studies=createStudyService(content.cases),catalog=studies.catalog(),nativeIds=new Set(caseData.studies.map(s=>s.id));
 const orderedStudies=[...caseData.studies,...catalog.filter(s=>!nativeIds.has(s.id))];
 const labels=new Map(orderedStudies.map(s=>[s.id,s.label])),pendingStudyRequests=new Map();
 let clock=createClinicalClock487({authorityId:actorId}),disposed=false;
 const credentials=Object.freeze({roomId,actorId,nonce:Symbol('local-room')});
 const port=createNativeClinicalPort({
  withPatient:async(uid,fn)=>{if(uid!==nativePatient.uid)throw Error('patient not in this room');return fn(nativePatient);},
  invoke:async({eventId,actorId,patientUid,intent})=>{
   if(intent.kind==='study.request'){
    const result=studies.request(nativePatient,{id:intent.id,eventId,actorId,atMinute:clock.clinicalMinute});
    if(result.status==='pending'){
     const order=nativePatient.orders.find(o=>o.id===intent.id);
     if(!pendingStudyRequests.has(order.sourceEventId))pendingStudyRequests.set(order.sourceEventId,new Set());
     pendingStudyRequests.get(order.sourceEventId).add(eventId);
    }
    return result;
   }
   return {status:'rejected',patientUid,eventId,reason:'clinical-action-not-migrated'};
  }
 });
 const authority=createRoomAuthority({roomId,mode,members:[{id:actorId}],patients:[{uid:patient.uid}],
  authenticate:token=>token===credentials?{id:actorId,roomId}:null,clinicalPort:port,
  resolveSpeechContext:()=>({...resolveContext(),studies:orderedStudies,therapies:content.therapies,interventions:caseData.interventions}),
  time:()=>clock.clinicalMinute,emit:(event,snapshot)=>onChange(copy(event),copy(snapshot))});
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
     rows.push({id:'ack:'+message.id+':'+i,name:'Enfermera',role:'nurse',text:item.status==='pending'?label+': solicitado; pendiente de resultado.':
      item.reason==='clinical-action-not-migrated'?'Los tratamientos todavía no están habilitados en esta versión experimental.':
       item.status==='executed'?label+': resultado ya disponible.':label+': no ejecutado ('+(item.reason||item.status)+').'});
    }
   }else if(event.type==='clinical.completed'){
    for(const item of event.clinical){
     const source=item.receipt?.sourceEventId||event.eventId;if(announcedResults.has(source))continue;
     announcedResults.add(source);rows.push({id:'completion:'+source,name:'Enfermera',role:'nurse',
      text:(labels.get(item.id)||item.id)+(item.status==='executed'?': resultado disponible.':': sin confirmación de resultado.')});
    }
   }
  }
  return rows;
 }
 return Object.freeze({
  catalog:()=>copy(orderedStudies),
  post:envelope=>disposed?Promise.resolve({status:'rejected',reason:'room-disposed'}):authority.dispatch({kind:'chat.post',...envelope},credentials),
  advance(deltaRealSeconds){
   if(disposed)throw Error('guard session disposed');
   clock=advanceClinicalClock487(clock,{deltaRealSeconds,nativeMinutesPerRealSecond:.12});
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
  read(){const room=authority.snapshot();return {room,patient:copy(nativePatient),clock:copy(clock),messages:messages(room)};},
  dispose(){if(disposed)return;disposed=true;pendingStudyRequests.clear();authority.dispose();}
 });
}
