// C21.b — single clinical host, read-only guests. The relay authenticates
// sender IDs and delivers packets; only the existing room authority can
// execute clinical commands. No game rules, vitals or reward logic here.
import {createRoomMailbox} from './room-mailbox.js';
import {createRoomReplica} from '../core/replica.js';

const valid=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const copy=x=>structuredClone(x);
function command(value){
 if(!valid(value?.id)||typeof value?.text!=='string'||!value.text.trim()||
    value.text.length>500)throw Error('invalid-remote-clinical-command');
 // Never forward actorId, patientUid, claims, role or fabricated clinical receipts.
 if(value.targetPatientUid!==undefined&&!valid(value.targetPatientUid))
  throw Error('invalid-remote-patient-selection');
 return {id:value.id,kind:'chat.post',text:value.text,
  ...(value.targetPatientUid?{targetPatientUid:value.targetPatientUid}:{})};
}
export function createGuardRelayHost({
 roomId,hostId,authority,transport,authenticateSender
}={}){
 if(!valid(roomId)||!valid(hostId)||typeof authority?.dispatch!=='function'||
  typeof authority?.snapshot!=='function'||typeof authority?.authorize!=='function'||typeof authority?.readRevision!=='function'||typeof authenticateSender!=='function')
  throw Error('invalid-host-gateway');
 let lastPublished=-1,disposed=false;
 const mailbox=createRoomMailbox({roomId,transport,onMessage:async message=>{
  if(message.kind==='chat.command'){
   const credentials=await authenticateSender(message.senderId);
   let ack,requested;
   try{requested=command(message.payload);}
   catch{
    // A malformed command from a valid party member must NOT poison the
    // shared cursor or block every other doctor's messages.
    ack={commandId:valid(message.payload?.id)?message.payload.id:null,
     roomId,status:'rejected',reason:'invalid-command',revision:authority.readRevision()};
   }
   if(requested)ack=await authority.dispatch(requested,credentials);
   mailbox.queue('chat.ack',{to:message.senderId,ack},
    'ack:'+message.senderId+':'+message.id);
   publish();
  }else if(message.kind==='room.resync'){
   const credentials=await authenticateSender(message.senderId);
   // A read-only resync never creates chat, clinical intents or room ticks.
   if(!await authority.authorize(credentials))return;
   mailbox.queue('room.snapshot',{room:authority.snapshot()},
    'resync:'+message.senderId+':'+message.id);
  }
 }});
 function publish(){
  if(disposed)throw Error('host-gateway-disposed');
  const snapshot=authority.snapshot();
  if(snapshot.roomId!==roomId)throw Error('room-owner-mismatch');
  if(snapshot.revision>lastPublished){
   mailbox.queue('room.snapshot',{room:snapshot},'state:'+snapshot.revision);
   lastPublished=snapshot.revision;
  }
  return snapshot.revision;
 }
 return Object.freeze({
  poll:()=>mailbox.poll(),flush:()=>mailbox.flush(),publish,
  status:()=>mailbox.status(),
  dispose(){disposed=true;mailbox.dispose();}
 });
}
export function createGuardRelayGuest({
 roomId,hostId,actorId,transport
}={}){
 if(!valid(roomId)||!valid(hostId)||!valid(actorId))throw Error('invalid-guest-gateway');
 const replica=createRoomReplica(roomId),acks=new Map(),posted=new Set();
 const mailbox=createRoomMailbox({roomId,transport,onMessage:async event=>{
  // The HTTP service must assign senderId from authenticated credentials.
  // A guest (including an opponent) cannot author snapshot or ACK.
  if(event.senderId!==hostId)return;
  if(event.kind==='room.snapshot')replica.apply(event.payload.room);
  if(event.kind==='chat.ack'&&event.payload.to===actorId){
   const ack=event.payload.ack;
   if(valid(ack?.commandId)&&ack.roomId===roomId)acks.set(ack.commandId,copy(ack));
  }
 }});
 return Object.freeze({
  post(value){const c=command(value);
   const result=mailbox.queue('chat.command',c,'command:'+c.id);
   posted.add(c.id);return result;},
  poll:()=>mailbox.poll(),flush:()=>mailbox.flush(),
  snapshot:()=>replica.snapshot(),
  acknowledgement:id=>acks.has(id)?copy(acks.get(id)):null,
  requestResync(id){if(!valid(id))throw Error('invalid-resync-id');
   return mailbox.queue('room.resync',{requestedRevision:replica.revision()},'resync-request:'+id);},
  /** Authenticated host snapshot recovery after truncated relay history.
   * Never auto-repeat an unacknowledged medicine; require receipt review.
   */
  async recover(){
   if(typeof transport?.checkpoint!=='function')throw Error('checkpoint-transport-unavailable');
   const response=await transport.checkpoint(),entry=response?.checkpoint,p=entry?.data;
   if(response?.roomId!==roomId||entry?.userId!==hostId||
    p?.protocol!=='atria.v5.room.1'||p.roomId!==roomId||
    p.kind!=='room.snapshot'||!p.payload?.room||
    !Number.isSafeInteger(entry.sequence)||!Number.isSafeInteger(response.firstRetained)||
    entry.sequence<response.firstRetained-1)
    throw Error('invalid-or-expired-host-checkpoint');
   if(entry.sequence<mailbox.status().cursor)throw Error('checkpoint-older-than-client');
   const applied=replica.apply(p.payload.room);
   if(!applied.applied&&applied.reason!=='stale-or-duplicate')
    throw Error('invalid-host-recovery-snapshot');
   const reset=mailbox.rebaseFromVerifiedCheckpoint(entry.sequence);
   const unconfirmed=[...posted].filter(id=>!acks.has(id));
   return {cursor:reset.cursor,revision:replica.revision(),
    unconfirmedCommands:unconfirmed,requiresReceiptReview:unconfirmed.length>0};
  },
  status:()=>mailbox.status(),
  dispose(){mailbox.dispose();acks.clear();posted.clear();}
 });
}
