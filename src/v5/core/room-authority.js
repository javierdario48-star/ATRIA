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
 emit=()=>{},time=()=>0}={}){
 if(!id(roomId)||!VALID_MODES.has(mode)||typeof authenticate!=='function'||
  typeof clinicalPort?.execute!=='function'||typeof resolveSpeechContext!=='function')
  throw Error('invalid authoritative room configuration');
 if(!Array.isArray(members)||!members.length||!Array.isArray(patients))throw Error('roster/patients required');
 const memberSet=new Set(members.map(x=>x.id));
 const byPatient=new Map(patients.map(x=>[x.uid,{uid:x.uid,closed:!!x.closed,ownerId:x.ownerId||null}]));
 if(memberSet.size!==members.length||byPatient.size!==patients.length||
  [...byPatient.keys()].some(x=>!id(x))||[...memberSet].some(x=>!id(x)))throw Error('invalid room members/patients');
 let revision=0,sequence=Promise.resolve();
 const transcript=[],events=[],seen=new Map();
 const snapshot=()=>copy({roomId,mode,revision,members:[...memberSet],
  patients:[...byPatient.values()],transcript,events});
 const rejection=(commandId,reason)=>({commandId,status:'rejected',reason,roomId,revision});
 async function process(envelope,credentials){
  // Only the transport's credential validator chooses identity. Never trust
  // client-supplied actorId, room role, patient owner or permissions.
  const actor=await authenticate(credentials);
  if(!id(actor?.id)||!memberSet.has(actor.id)||actor.roomId!==roomId)
   return rejection(envelope?.id??null,'unauthenticated-or-not-member');
  if(!id(envelope?.id)||envelope.id.length>160||envelope.kind!=='chat.post')
   return rejection(envelope?.id??null,'invalid-command');
  if(typeof envelope.text!=='string'||!envelope.text.trim()||envelope.text.length>500)
   return rejection(envelope.id,'invalid-text');
  if(seen.size>=10000)return rejection(envelope.id,'room-command-capacity');
  const fingerprint=JSON.stringify([envelope.kind,envelope.text,envelope.patientUid??null]);
  const key=actor.id+':'+envelope.id;
  if(seen.has(key)){
   const prior=seen.get(key);
   return prior.fingerprint===fingerprint?copy(prior.ack):
    rejection(envelope.id,'command-id-reused-with-different-payload');
  }
  const context=await resolveSpeechContext({actorId:actor.id,roomId,mode,envelope});
  const patientUid=context?.patientUid??null;
  // Patient selection and NPC proximity come from the trusted game context,
  // never from an arbitrary patientUid in the network packet.
  const routed=routeWardSpeech(envelope.text,{...context,patientUid});
  const clinical=[];
  if(routed.recipient==='nurse'&&!routed.error){
   for(let n=0;n<routed.intents.length;n++){
    const intent=routed.intents[n],patient=byPatient.get(patientUid);
    let outcome;
    if(!patient||patient.closed)outcome={status:'rejected',reason:'patient-not-active'};
    else if(mode==='competitive'&&patient.ownerId&&patient.ownerId!==actor.id)
     outcome={status:'rejected',reason:'other-player-owns-patient'};
    else{
     const eventId=roomId+':'+actor.id+':'+envelope.id+':'+n;
     try{
      outcome=await clinicalPort.execute({eventId,patientUid,actorId:actor.id,intent});
      if(!outcome||!['executed','pending','rejected','unconfirmed'].includes(outcome.status)||
       outcome.patientUid!==patientUid||outcome.eventId!==eventId)
       throw Error('invalid native execution receipt');
      if(mode==='competitive'&&!patient.ownerId&&['executed','pending'].includes(outcome.status))
       patient.ownerId=actor.id;
     }catch(error){outcome={status:'unconfirmed',reason:'native-execution-unconfirmed'};}
    }
    clinical.push({kind:intent.kind,id:intent.id,status:outcome.status,
     reason:outcome.reason??null,receipt:outcome.receipt??null});
   }
  }
  const message={id:envelope.id,actorId:actor.id,text:envelope.text,recipient:routed.recipient,
   patientUid,at:time(),revision:revision+1};
  transcript.push(message);if(transcript.length>300)transcript.shift();
  const event={type:'chat.posted',message,clinical,routeError:routed.error??null,
   revision:revision+1};
  events.push(event);if(events.length>300)events.shift();
  revision++;
  const ack={commandId:envelope.id,status:routed.error?'received-not-executed':'received',
   roomId,revision,recipient:routed.recipient,patientUid,routeError:routed.error??null,clinical};
  seen.set(key,{fingerprint,ack:copy(ack)});
  // Presentation and networking are subscribers; they do not reinterpret
  // chat text or execute clinical actions.
  emit(copy(event),snapshot());
  return copy(ack);
 }
 return Object.freeze({
  dispatch(envelope,credentials){
   const next=sequence.then(()=>process(envelope,credentials));
   sequence=next.catch(()=>{});
   return next;
  },
  snapshot,
  readRevision:()=>revision
 });
}
