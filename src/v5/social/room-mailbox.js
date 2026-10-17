// C21.a — lossless, authenticated-relay-compatible protocol boundary.
// This is NOT a server, a clinical executor, or a second game clock.
// Hosts dispatch messages through the existing createRoomAuthority; clients
// receive verified sender IDs from the authenticated HTTP relay.
const clone=value=>structuredClone(value);
const id=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const types=new Set(['chat.command','chat.ack','room.snapshot','room.resync']);
function packet(roomId,kind,payload,messageId){
 if(!id(roomId)||!id(messageId)||!types.has(kind)||!payload||
   typeof payload!=='object'||Array.isArray(payload))
  throw Error('invalid-room-packet');
 return {protocol:'atria.v5.room.1',roomId,id:messageId,kind,payload:clone(payload)};
}
function checkPacket(value,roomId){
 if(value?.protocol!=='atria.v5.room.1'||value.roomId!==roomId)
  throw Error('foreign-or-unsupported-room-packet');
 return packet(value.roomId,value.kind,value.payload,value.id);
}
/** All calls are explicit, with no hidden timers, global fetch interceptors or
 * dependency on the old HTML. The host runner decides the polling cadence.
 * A gap is fatal to the current cursor until resynchronized; never silently
 * drop an unrecoverable clinical command.
 */
export function createRoomMailbox({roomId,transport,onMessage,maxPending=128,maxSeen=10000}={}){
 if(!id(roomId)||typeof transport?.send!=='function'||typeof transport?.poll!=='function'||
  typeof onMessage!=='function'||!Number.isSafeInteger(maxPending)||maxPending<1||
  !Number.isSafeInteger(maxSeen)||maxSeen<1)throw Error('invalid-mailbox-configuration');
 let cursor=0,disposed=false,sending=null,polling=null;
 const outgoing=new Map(),completed=new Map(),seen=new Map();
 function queue(kind,payload,messageId){
  if(disposed)throw Error('mailbox-disposed');
  const p=packet(roomId,kind,payload,messageId);
  const prior=outgoing.get(p.id)||completed.get(p.id);
  if(prior){
   if(JSON.stringify(prior)!==JSON.stringify(p))throw Error('mailbox-message-id-collision');
   return {queued:outgoing.has(p.id),id:p.id};
  }
  if(outgoing.size>=maxPending)throw Error('mailbox-outbox-full');
  if(completed.size>=maxSeen)throw Error('mailbox-completion-capacity');
  outgoing.set(p.id,p);return {queued:true,id:p.id};
 }
 async function flush(){
  if(disposed)throw Error('mailbox-disposed');
  if(sending)return sending;
  const task=(async()=>{
   let count=0;
   for(const [key,value] of outgoing){
    if(disposed)throw Error('mailbox-disposed');
    const ack=await transport.send(clone(value));
    if(!Number.isSafeInteger(ack?.sequence)||ack.sequence<1)
     throw Error('relay-send-not-confirmed');
    if(disposed)throw Error('mailbox-disposed');
    outgoing.delete(key);completed.set(key,value);count++;
   }
   return {sent:count,pending:outgoing.size};
  })();
  sending=task;
  try{return await task}finally{if(sending===task)sending=null}
 }
 async function poll(){
  if(disposed)throw Error('mailbox-disposed');
  if(polling)return polling;
  const task=(async()=>{
   const response=await transport.poll(cursor);
   if(!Array.isArray(response?.messages))throw Error('invalid-relay-page');
   let applied=0,duplicates=0;
   for(const item of response.messages){
    if(disposed)throw Error('mailbox-disposed');
    if(!Number.isSafeInteger(item?.sequence)||item.sequence<1||
      !id(item.userId))throw Error('invalid-relay-record');
    if(item.sequence<=cursor)continue;
    if(item.sequence!==cursor+1)
     throw Error('relay-sequence-gap:'+String(cursor+1)+':'+String(item.sequence));
    const value=checkPacket(item.data,roomId);
    const key=item.userId+':'+value.id,signature=JSON.stringify(value);
    const prior=seen.get(key);
    if(prior){
     if(prior!==signature)throw Error('relay-message-id-collision');
     duplicates++;
    }else{
     if(seen.size>=maxSeen)throw Error('mailbox-seen-capacity');
     await onMessage({senderId:item.userId,sequence:item.sequence,...clone(value)});
     // Record only AFTER the callback has committed. Failed dispatches must
     // remain replayable from the same cursor.
     seen.set(key,signature);applied++;
    }
    cursor=item.sequence;
   }
   return {applied,duplicates,cursor};
  })();
  polling=task;
  try{return await task}finally{if(polling===task)polling=null}
 }
 return Object.freeze({queue,flush,poll,
  /** Read-only guest checkpoint recovery only. Never invoke on clinical host. */
  rebaseFromVerifiedCheckpoint(sequence){
   if(disposed)throw Error('mailbox-disposed');
   if(!Number.isSafeInteger(sequence)||sequence<cursor)throw Error('invalid-mailbox-rebase');
   if(polling)throw Error('mailbox-rebase-during-poll');
   cursor=sequence;seen.clear();
   return {cursor,needsAckReview:outgoing.size>0};
  },
  status:()=>({roomId,cursor,pending:outgoing.size,seen:seen.size,disposed}),
  dispose(){disposed=true;outgoing.clear();completed.clear();seen.clear();}
 });
}

/** Minimal adapter for the existing authenticated /api/rooms/:id/messages
 * protocol. It can run on any HTTPS origin. Storage consistency, idempotent
 * writes and access control are obligations of the server, not this client.
 */
export function createHttpRoomTransport({roomId,token,request=globalThis.fetch,basePath='/api'}={}){
 if(!id(roomId)||typeof token!=='string'||!token||typeof request!=='function'||
  typeof basePath!=='string'||!basePath.startsWith('/')||basePath.includes('?'))
  throw Error('invalid-http-room-configuration');
 const url=basePath.replace(/\/$/,'')+'/rooms/'+encodeURIComponent(roomId)+'/messages';
 async function api(method,uri,data){
  const response=await request(uri,{method,cache:'no-store',headers:{
   Authorization:'Bearer '+token,...(data?{'Content-Type':'application/json'}:{})},
   ...(data?{body:JSON.stringify(data)}:{})});
  const body=await response.json();
  if(!response.ok){
   const error=Error('room-http-'+response.status+':'+String(body?.error||'unavailable'));
   error.status=response.status;throw error;
  }
  return body;
 }
 return Object.freeze({
  async send(value){
   const body=await api('POST',url,{message:checkPacket(value,roomId)});
   if(body?.ok!==true||!Number.isSafeInteger(body.sequence)||body.sequence<1)
    throw Error('relay-send-not-confirmed');
   return {sequence:body.sequence};
  },
  async poll(after){
   if(!Number.isSafeInteger(after)||after<0)throw Error('invalid-room-cursor');
   return api('GET',url+'?after='+after);
  },
  checkpoint:()=>api('GET',url.replace(/\/messages$/,'/checkpoint'))
 });
}
