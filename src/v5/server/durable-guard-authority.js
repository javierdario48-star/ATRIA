import {createGuardRuntime} from '../clinical/guard-runtime.js';

const copy=x=>structuredClone(x);
const fail=(code,message)=>Object.assign(Error(message),{code});
/** Store contract: read returns null or {etag,value}; compareAndSwap is atomic,
 * returns null on conflict and otherwise the new etag. No TTL, cache or fallback.
 * A short durable lease fences active workers; the final CAS fences a worker
 * whose lease expired while suspended. No ACK/view escapes before commit. */
export function createDurableGuardAuthority({store,content,now=()=>Date.now(),uuid=()=>crypto.randomUUID(),leaseMs=10000,maxSteps=3600}){
 if(typeof store?.read!=='function'||typeof store?.compareAndSwap!=='function'||leaseMs<1000)throw Error('atomic durable guard store required');
 async function bootstrap({roomId,caseId,members,hostId,actorId}){
  if(actorId!==hostId)throw fail('forbidden','only the verified host can create a clinical guard');
  const runtime=await createGuardRuntime({content,roomId,caseId,members,hostId,nowMs:now()});
  try{const value={schemaVersion:1,roomId,epoch:0,lease:null,runtime:await runtime.checkpoint()};
   const etag=await store.compareAndSwap(roomId,null,value);if(!etag)throw fail('exists','clinical guard already exists');
   return {epoch:0,...runtime.view()};
  }finally{runtime.dispose();}
 }
 async function transact({roomId,actorId,commands=[],motion=null,motionSequence=null,typing=null,confirmation=null}){
  if(!Array.isArray(commands)||commands.length>16)throw fail('invalid','invalid command batch');
  const before=await store.read(roomId);if(!before)throw fail('missing','clinical guard not found');
  const record=before.value;
  if(record.schemaVersion!==1||record.roomId!==roomId||!Number.isSafeInteger(record.epoch))throw fail('incompatible','incompatible durable guard');
  if(!record.runtime.members.some(x=>x.id===actorId))throw fail('forbidden','not a clinical member');
  const at=now();if(record.lease&&record.lease.untilMs>at)throw fail('busy','clinical authority busy; retry the same event');
  const lease={owner:uuid(),untilMs:at+leaseMs},epoch=record.epoch+1;
  const fenced={...record,epoch,lease};
  const acquired=await store.compareAndSwap(roomId,before.etag,fenced);
  if(!acquired)throw fail('busy','clinical authority changed; retry the same event');
  let runtime;
  try{
   runtime=await createGuardRuntime({content,roomId,nowMs:at,checkpoint:fenced.runtime});
   const recovery=await runtime.advanceTo(Math.max(at,Math.ceil(fenced.runtime.lastWallMs)),{maxSteps});
   const acknowledgements=[];let confirmationAccepted=null;
   if(!recovery.recovering){
    if(motion)runtime.motion(actorId,motion,motionSequence);
    if(typeof typing==='boolean')runtime.typing(actorId,typing,at);
    if(confirmation)confirmationAccepted=runtime.confirm(actorId,confirmation.revision,confirmation.outcomeId);
    for(const command of commands)acknowledgements.push(await runtime.post(actorId,command));
   }
   const next={schemaVersion:1,roomId,epoch,lease:null,runtime:await runtime.checkpoint()};
   // Every external effect is clinical data in this aggregate. A stale worker
   // can calculate privately but cannot publish, ACK or execute a second dose.
   if(now()>=lease.untilMs||!await store.compareAndSwap(roomId,acquired,next))throw fail('fenced','previous clinical authority fenced');
   return {epoch,recovering:recovery.recovering,acknowledgements,confirmationAccepted,...runtime.view()};
  }finally{runtime?.dispose();}
 }
 return Object.freeze({bootstrap,transact});
}
