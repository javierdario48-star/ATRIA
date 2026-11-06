import {createGuardRuntime} from '../clinical/guard-runtime.js';

const copy=x=>structuredClone(x);
const fail=(code,message)=>Object.assign(Error(message),{code});
const eventRevisions=checkpoint=>JSON.stringify([
 checkpoint.session?.authority?.revision??0,
 ...(checkpoint.sessions||[]).map(([uid,session])=>[uid,session.authority?.revision??0]),
 checkpoint.communication?.revision??0,checkpoint.turn?.number??1
]);
/** Store contract: read returns null or {etag,value}; compareAndSwap is atomic,
 * returns null on conflict and otherwise the new etag. No TTL, cache or fallback.
 * A short durable lease fences active workers; the final CAS fences a worker
 * whose lease expired while suspended. No ACK/view escapes before commit. */
export function createDurableGuardAuthority({store,content,now=()=>Date.now(),uuid=()=>crypto.randomUUID(),leaseMs=10000,maxSteps=3600}){
 if(typeof store?.read!=='function'||typeof store?.compareAndSwap!=='function'||leaseMs<1000)throw Error('atomic durable guard store required');
 function validate(record,roomId,actorId){
  if(record.schemaVersion!==1||record.roomId!==roomId||!Number.isSafeInteger(record.epoch))throw fail('incompatible','incompatible durable guard');
  if(!record.runtime.members.some(x=>x.id===actorId))throw fail('forbidden','not a clinical member');
 }
 async function viewRecord(record,roomId,actorId,targetPatientUid=null){
  validate(record,roomId,actorId);
  const runtime=await createGuardRuntime({content,roomId,nowMs:now(),checkpoint:record.runtime});
  try{return {epoch:record.committedEpoch??(record.lease?Math.max(0,record.epoch-1):record.epoch),recovering:record.runtime.pendingQuanta>=1000,
   readOnly:true,...runtime.view(actorId,{patientUid:targetPatientUid})};}
  finally{runtime.dispose();}
 }
 async function observe({roomId,actorId,targetPatientUid=null}){
  const stored=await (store.observe?store.observe(roomId):store.read(roomId));
  if(!stored)throw fail('missing','clinical guard not found');
  return viewRecord(stored.value,roomId,actorId,targetPatientUid);
 }
 async function bootstrap({roomId,caseId,members,hostId,actorId,mode='coop',guardSelection=null}){
  if(actorId!==hostId)throw fail('forbidden','only the verified host can create a clinical guard');
  const runtime=await createGuardRuntime({content,roomId,caseId,members,hostId,mode,guardSelection,nowMs:now()});
   try{const value={schemaVersion:1,roomId,epoch:0,committedEpoch:0,lease:null,runtime:await runtime.checkpoint()};
   const etag=await store.compareAndSwap(roomId,null,value);if(!etag)throw fail('exists','clinical guard already exists');
   return {epoch:0,...runtime.view(actorId)};
  }finally{runtime.dispose();}
 }
 async function transact({roomId,actorId,commands=[],motion=null,motionSequence=null,claim=null,typing=null,confirmation=null,actorProfile=null,hintRequest=null,shiftRequest=null}){
  if(!Array.isArray(commands)||commands.length>16)throw fail('invalid','invalid command batch');
  const idle=!commands.length&&!motion&&!claim&&typing===null&&!confirmation&&!hintRequest&&!shiftRequest;
  // A new invited member has no account-controller binding until their first
  // fenced CAS. An observation cannot establish that binding or bypass it.
  const mayObserve=store.requiresAdmission!==true;
  const before=await (idle&&mayObserve&&store.observe?store.observe(roomId):store.read(roomId));if(!before)throw fail('missing','clinical guard not found');
  const record=before.value;
  validate(record,roomId,actorId);
  const at=now(),leased=record.lease&&record.lease.untilMs>at;
  // Several doctors observing one guard are not several clock writers.
  // A real command still uses the same fenced transaction and receipt lane.
  if(idle&&mayObserve&&(leased||at-record.runtime.lastWallMs<750&&(record.runtime.pendingQuanta??0)<1000))return viewRecord(record,roomId,actorId);
  if(leased)throw fail('busy','clinical authority busy; retry the same event');
  const lease={owner:uuid(),untilMs:at+leaseMs},epoch=record.epoch+1;
  const fenced={...record,epoch,committedEpoch:record.committedEpoch??record.epoch,lease};
  const acquired=await store.compareAndSwap(roomId,before.etag,fenced);
  if(!acquired)throw fail('busy','clinical authority changed; retry the same event');
  let runtime;
  try{
   runtime=await createGuardRuntime({content,roomId,nowMs:at,checkpoint:fenced.runtime});
   const recovery=await runtime.advanceTo(Math.max(at,Math.ceil(fenced.runtime.lastWallMs)),{maxSteps});
   const acknowledgements=[];let confirmationAccepted=null,hintAcknowledgement=null,shiftAcknowledgement=null;
   if(!recovery.recovering){
    if(actorProfile&&Number.isSafeInteger(actorProfile.level)&&actorProfile.level>0)
     runtime.updateDoctorLevel(actorId,actorProfile.level);
    // A display acknowledgement refers to an instruction already painted
    // for the old focus. Settle it before commands that can end that encounter.
    if(hintRequest?.op==='displayed')hintAcknowledgement=await runtime.hint(actorId,hintRequest);
    if(shiftRequest&&shiftRequest.op!=='leave')shiftAcknowledgement=runtime.shiftControl(actorId,shiftRequest);
    if(motion)runtime.motion(actorId,motion,motionSequence);
    if(claim)runtime.claim(actorId,claim);
    if(typeof typing==='boolean')runtime.typing(actorId,typing,at);
    if(confirmation)confirmationAccepted=runtime.confirm(actorId,confirmation.revision,confirmation.outcomeId);
    for(const command of commands)acknowledgements.push(await runtime.post(actorId,command));
    // A save decision follows the doctor's already queued orders. Their
    // prescriptions and same-event receipts remain in this committed guard.
    if(shiftRequest?.op==='leave')shiftAcknowledgement=runtime.shiftControl(actorId,shiftRequest);
    if(hintRequest&&hintRequest.op!=='displayed')hintAcknowledgement=await runtime.hint(actorId,hintRequest);
   }
   const next={schemaVersion:1,roomId,epoch,committedEpoch:epoch,lease:null,runtime:await runtime.checkpoint()};
   // Every external effect is clinical data in this aggregate. A stale worker
   // can calculate privately but cannot publish, ACK or execute a second dose.
   if(now()>=lease.untilMs||!await store.compareAndSwap(roomId,acquired,next))throw fail('fenced','previous clinical authority fenced');
   const commitNotice=!!(commands.length||claim||hintRequest||shiftRequest||eventRevisions(record.runtime)!==eventRevisions(next.runtime));
   return {epoch,commitNotice,recovering:recovery.recovering,acknowledgements,confirmationAccepted,
    ...(hintRequest?{hintAcknowledgement,hintRequestId:hintRequest.requestId}:{}),
    ...(shiftRequest?{shiftAcknowledgement,shiftRequestId:shiftRequest.requestId}:{}),...runtime.view(actorId)};
  }finally{runtime?.dispose();}
 }
 return Object.freeze({bootstrap,transact,observe});
}
