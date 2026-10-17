// C21.c — authoritative HTTP relay storage contract.
// Never execute medicine, tick patients or trust a supplied userId.
// Production must supply a genuinely atomic per-room storage adapter.
const valid=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const copy=x=>structuredClone(x);
const asJson=x=>JSON.stringify(x);
const types=new Set(['chat.command','chat.ack','room.snapshot','room.resync']);
const hostKinds=new Set(['chat.ack','room.snapshot']);
const guestKinds=new Set(['chat.command','room.resync']);
const reply=(status,body)=>({status,body});

export function createMemoryRoomRelayStore(){
 // TEST ONLY: local process state. Not safe across stateless deployments.
 const rooms=new Map(),queues=new Map();
 return Object.freeze({
  async create({roomId,hostId,members}){
   if(!valid(roomId)||!valid(hostId)||!Array.isArray(members)||members.length<2||
    members.length>4||new Set(members).size!==members.length||
    members.some(x=>!valid(x))||!members.includes(hostId))throw Error('invalid-room-spec');
   if(rooms.has(roomId))throw Error('room-already-exists');
   rooms.set(roomId,{roomId,hostId,members:[...members],sequence:0,
    firstRetained:1,records:[],identity:{}});
  },
  async transact(roomId,run){
   if(!valid(roomId)||typeof run!=='function')throw Error('invalid-room-transaction');
   const previous=queues.get(roomId)||Promise.resolve();
   const task=previous.catch(()=>{}).then(async()=>{
    const stored=rooms.get(roomId);
    if(!stored)return null;
    const draft=copy(stored);
    const result=await run(draft);
    rooms.set(roomId,draft);
    return result;
   });
   queues.set(roomId,task);
   try{return await task}finally{if(queues.get(roomId)===task)queues.delete(roomId);}
  }
 });
}

export function createRoomRelayService({
 store,authenticate,mayAccess=()=>true,maxRetained=512,maxHistoryIds=10000,
 maxPacketBytes=96000,pageSize=128
}={}){
 if(typeof store?.transact!=='function'||typeof authenticate!=='function'||
  typeof mayAccess!=='function'||![maxRetained,maxHistoryIds,maxPacketBytes,pageSize].every(Number.isSafeInteger)||
  maxRetained<2||maxHistoryIds<maxRetained||maxPacketBytes<100||pageSize<1||pageSize>maxRetained)
  throw Error('invalid-relay-service-config');

 async function handle({method,path,query={},headers={},body={}}={}){
  const found=/^\/api\/rooms\/([A-Za-z0-9_-]{1,160})\/(messages|checkpoint)$/.exec(path||'');
  if(!found||!['GET','POST'].includes(method)||found[2]==='checkpoint'&&method!=='GET')
   return reply(404,{error:'unknown-relay-route'});
  const roomId=found[1],checkpointRoute=found[2]==='checkpoint';
  let actor;
  try{actor=await authenticate(headers?.authorization||headers?.Authorization||'');}
  catch{return reply(401,{error:'not-authenticated'});}
  if(!valid(actor?.id))return reply(401,{error:'not-authenticated'});
  const text=method==='POST'?asJson(body):'';
  if(method==='POST'&&(typeof text!=='string'||text.length>maxPacketBytes+512))
   return reply(413,{error:'relay-packet-too-large'});
  const cursor=method==='GET'&&!checkpointRoute?Number(query.after):0;
  if(method==='GET'&&!checkpointRoute&&(!Number.isSafeInteger(cursor)||cursor<0))
   return reply(400,{error:'invalid-relay-cursor'});
  try{
   const outcome=await store.transact(roomId,async state=>{
    if(!state.members.includes(actor.id)||!await mayAccess(actor.id,state,actor))
     return reply(403,{error:'not-room-member'});
    if(checkpointRoute){
     if(!state.checkpoint)return reply(409,{error:'room-checkpoint-unavailable'});
     return reply(200,{roomId,checkpoint:copy(state.checkpoint),
      latest:state.sequence,firstRetained:state.firstRetained});
    }
    if(method==='GET'){
     if(cursor<state.firstRetained-1)
      return reply(409,{error:'relay-history-expired',cursor,
       firstRetained:state.firstRetained,latest:state.sequence});
     if(cursor>state.sequence)return reply(400,{error:'future-relay-cursor'});
     return reply(200,{roomId,messages:copy(state.records.filter(x=>x.sequence>cursor).slice(0,pageSize)),
      cursor,latest:state.sequence,firstRetained:state.firstRetained});
    }
    const value=body?.message;
    if(!value||value.protocol!=='atria.v5.room.1'||value.roomId!==roomId||
      !valid(value.id)||!types.has(value.kind)||!value.payload||
      typeof value.payload!=='object'||Array.isArray(value.payload))
     return reply(400,{error:'invalid-room-packet'});
    if(!(state.hostId===actor.id?hostKinds:guestKinds).has(value.kind))
     return reply(403,{error:'sender-not-authorized-for-packet-type'});
    const key=actor.id+':'+value.id,signature=asJson(value);
    const existing=state.identity[key];
    if(existing){
     return existing.signature===signature?
      reply(200,{ok:true,sequence:existing.sequence,replayed:true}):
      reply(409,{error:'relay-message-id-collision'});
    }
    if(Object.keys(state.identity).length>=maxHistoryIds)
     return reply(507,{error:'relay-identity-capacity'});
    // The atomic transaction owns both append and dedup record. Never
    // emulate exactly-once with two separate cache get/set operations.
    const seq=state.sequence+1;
    state.sequence=seq;state.identity[key]={signature,sequence:seq};
    const entry={sequence:seq,userId:actor.id,data:copy(value)};
    state.records.push(entry);
    // Trusted host checkpoints survive ordinary relay log compaction.
    if(value.kind==='room.snapshot')state.checkpoint=copy(entry);
    while(state.records.length>maxRetained)state.records.shift();
    state.firstRetained=state.records[0]?.sequence??seq+1;
    return reply(200,{ok:true,sequence:seq,replayed:false});
   });
   return outcome||reply(404,{error:'room-not-found'});
  }catch{
   // On ambiguous commit failures, clients retry the identical message id.
   // They must NOT generate a new clinical command or falsely report success.
   return reply(503,{error:'relay-transaction-unconfirmed'});
  }
 }
 return Object.freeze({handle});
}
