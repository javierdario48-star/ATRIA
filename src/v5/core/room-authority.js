import {routeWardSpeech} from './speech-router.js';

const VALID_MODES=new Set(['solo','apprentice','coop','competitive']);
const id=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const copy=x=>structuredClone(x);

/**
 * ATRIA's equivalent of TFS's authoritative Game/action boundary.
 * Network transport supplies authenticated session context; callers cannot
 * choose actorId through their command payload.
 * One serial dispatch lane per room, one native clinical port.
 */
export function createRoomAuthority({roomId,mode,members,patients,authenticate,clinicalPort,resolveSpeechContext,
 respondNpc=null,emit=()=>{},time=()=>0}={}){
 if(!id(roomId)||!VALID_MODES.has(mode)||typeof authenticate!=='function'||
  typeof clinicalPort?.execute!=='function'||typeof resolveSpeechContext!=='function')
  throw Error('invalid authoritative room configuration');
 if(!Array.isArray(members)||!members.length||!Array.isArray(patients))throw Error('roster/patients required');
 const memberSet=new Set(members.map(x=>x.id));
 const byPatient=new Map(patients.map(x=>[x.uid,{uid:x.uid,closed:!!x.closed,ownerId:x.ownerId||null}]));
 if(memberSet.size!==members.length||byPatient.size!==patients.length||
  [...byPatient.keys()].some(x=>!id(x))||[...memberSet].some(x=>!id(x)))throw Error('invalid room members/patients');
 let revision=0,sequence=Promise.resolve(),disposed=false,unsubscribeCompletion=null;
 const transcript=[],events=[],seen=new Map(),pendingExecutions=new Map();
 const snapshot=()=>copy({roomId,mode,revision,members:[...memberSet],
  patients:[...byPatient.values()],transcript,events});
 const rejection=(commandId,reason)=>({commandId,status:'rejected',reason,roomId,revision});
 const enqueue=task=>{
  const next=sequence.then(task);sequence=next.catch(()=>{});return next;
 };
 function complete(result){
  if(disposed||!result||!['executed','rejected','unconfirmed'].includes(result.status))return;
  const binding=pendingExecutions.get(result.eventId);
  if(!binding||result.patientUid!==binding.patientUid)return;
  if(result.status==='executed'&&(!result.receipt||
   result.receipt.patientUid!==binding.patientUid||result.receipt.eventId!==result.eventId))return;
  const original=seen.get(binding.key)?.ack,entry=original?.clinical[binding.index];
  if(!entry||entry.status!=='pending'||original.patientUid!==binding.patientUid||
     entry.kind!==binding.kind||entry.id!==binding.id)return;
  const clinical={...entry,status:result.status,reason:result.reason??null,receipt:copy(result.receipt??null)};
  const event={type:'clinical.completed',roomId,eventId:result.eventId,
   commandId:binding.commandId,actorId:binding.actorId,patientUid:binding.patientUid,
   clinical:[copy(clinical)],revision:revision+1,at:time()};
  original.clinical[binding.index]=clinical;original.revision=event.revision;
  pendingExecutions.delete(result.eventId);
  events.push(event);if(events.length>300)events.shift();revision++;
  try{emit(copy(event),snapshot());}catch{/* a subscriber cannot roll back a confirmed completion */}
 }
 if(typeof clinicalPort.subscribeCompletion==='function'){
  unsubscribeCompletion=clinicalPort.subscribeCompletion(result=>{
   if(disposed)return;
   let completion;
   try{completion=copy(result);}catch{return;}
   // Even a callback arriving before execute resolves waits until the command
   // and its pending action have been recorded on this same room lane.
   enqueue(()=>complete(completion));
  });
 }
 async function process(envelope,credentials){
  if(disposed)return rejection(envelope?.id??null,'authority-disposed');
  // Only the transport's credential validator chooses identity. Never trust
  // client-supplied actorId, room role, patient owner or permissions.
  const actor=await authenticate(credentials);
  if(disposed)return rejection(envelope?.id??null,'authority-disposed');
  if(!id(actor?.id)||!memberSet.has(actor.id)||actor.roomId!==roomId)
   return rejection(envelope?.id??null,'unauthenticated-or-not-member');
  if(!id(envelope?.id)||envelope.id.length>160||envelope.kind!=='chat.post')
   return rejection(envelope?.id??null,'invalid-command');
  if(typeof envelope.text!=='string'||!envelope.text.trim()||envelope.text.length>500)
   return rejection(envelope.id,'invalid-text');
  const fingerprint=JSON.stringify([envelope.kind,envelope.text,envelope.patientUid??null,envelope.targetPatientUid??null]);
  const key=actor.id+':'+envelope.id;
  if(seen.has(key)){
   const prior=seen.get(key);
   return prior.fingerprint===fingerprint?copy(prior.ack):
    rejection(envelope.id,'command-id-reused-with-different-payload');
  }
  if(seen.size>=10000)return rejection(envelope.id,'room-command-capacity');
  const context=await resolveSpeechContext({actorId:actor.id,roomId,mode,envelope});
  if(disposed)return rejection(envelope.id,'authority-disposed');
  const patientUid=context?.patientUid??null;
  // Patient selection and NPC proximity come from the trusted game context,
  // never from an arbitrary patientUid in the network packet.
  const routed=routeWardSpeech(envelope.text,{...context,patientUid});
  const clinical=[];
  if(routed.intents.length&&!routed.error){
   for(let n=0;n<routed.intents.length;n++){
    if(disposed)return rejection(envelope.id,'authority-disposed');
    const intent=routed.intents[n],patient=byPatient.get(patientUid);
    let outcome;
    if(!patient||patient.closed)outcome={status:'rejected',reason:'patient-not-active'};
    else if(mode==='competitive'&&patient.ownerId&&patient.ownerId!==actor.id)
     outcome={status:'rejected',reason:'other-player-owns-patient'};
    else{
     const eventId=roomId+':'+actor.id+':'+envelope.id+':'+n;
     try{
      outcome=await clinicalPort.execute({eventId,patientUid,actorId:actor.id,intent});
      if(disposed)return rejection(envelope.id,'authority-disposed');
      if(!outcome||!['executed','pending','rejected','unconfirmed'].includes(outcome.status)||
       outcome.patientUid!==patientUid||outcome.eventId!==eventId)
       throw Error('invalid native execution receipt');
      if(mode==='competitive'&&!patient.ownerId&&['executed','pending'].includes(outcome.status))
       patient.ownerId=actor.id;
      if(intent.kind==='case.close'&&outcome.status==='executed'){
       const proof=outcome.receipt?.closure;
       if(!proof||proof.closed!==true||proof.eventId!==eventId||proof.patientUid!==patientUid)
        throw Error('invalid native closure receipt');
       patient.closed=true;
      }
      if(outcome.status==='pending'&&!disposed)pendingExecutions.set(eventId,{key,
       commandId:envelope.id,actorId:actor.id,patientUid,index:clinical.length,
       kind:intent.kind,id:intent.id});
     }catch(error){outcome={status:'unconfirmed',reason:'native-execution-unconfirmed'};}
    }
    clinical.push({kind:intent.kind,id:intent.id,status:outcome.status,
     reason:outcome.reason??null,receipt:outcome.receipt??null});
   }
  }
  if(disposed)return rejection(envelope.id,'authority-disposed');
  const message={id:envelope.id,actorId:actor.id,text:envelope.text,recipient:routed.recipient,
   patientUid,at:time(),revision:revision+1};
  transcript.push(message);if(transcript.length>300)transcript.shift();
  // An NPC reply is an immutable part of the same room event, not a second
  // chat transport. It cannot invoke the clinical port or claim a patient.
  let npcReply=null;
  if(routed.recipient==='vega'&&typeof respondNpc==='function'){
   try{
    const response=respondNpc({actorId:actor.id,patientUid,text:envelope.text,mode});
    if(typeof response==='string'&&response.length<=600)npcReply={role:'mentor',name:'Dr. Vega',text:response};
   }catch{/* tutor failure cannot lose a user's original chat message */}
  }
  const event={type:'chat.posted',message,clinical,routeError:routed.error??null,
   ...(npcReply?{npcReply}:{}),revision:revision+1};
  events.push(event);if(events.length>300)events.shift();
  revision++;
  const ack={commandId:envelope.id,status:routed.error?'received-not-executed':'received',
   roomId,revision,recipient:routed.recipient,patientUid,routeError:routed.error??null,clinical};
  seen.set(key,{fingerprint,ack:copy(ack)});
  // Presentation and networking are subscribers; they do not reinterpret
  // chat text or execute clinical actions.
  // Network subscribers cannot retroactively invalidate native effects.
  try{emit(copy(event),snapshot());}catch{/* transport retries read the cached ack */ }
  return copy(ack);
 }
 return Object.freeze({
  dispatch(envelope,credentials){
   if(disposed)return Promise.resolve(rejection(envelope?.id??null,'authority-disposed'));
   return enqueue(()=>process(envelope,credentials));
  },
  flush:()=>sequence,
  dispose(){
   if(disposed)return;
   disposed=true;pendingExecutions.clear();
   if(typeof unsubscribeCompletion==='function')unsubscribeCompletion();
   unsubscribeCompletion=null;
  },
  snapshot,
  readRevision:()=>revision
 });
}
