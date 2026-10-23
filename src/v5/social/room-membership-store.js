import {createQaSocialServer} from '../../social/qa-social-server.js';
// Storage composition only: the characterized V4 backend remains byte-identical.
// A room has one host-owned metadata record and a distinct acceptance key per
// guest. Joining doctors cannot overwrite each other's room membership.
const ROOM='qa-v1:room:',MEMBER='atria-v5:room-member:';
export function createConflictFreeRoomStorage(store){
 const memberKey=(id,userId)=>MEMBER+id+':'+userId;
 const get=async key=>{
  const value=await store.get(key);
  if(!key.startsWith(ROOM)||!value?._memberSlotsV5)return value;
  const roomId=key.slice(ROOM.length),invited=value._invited||[];
  const records=await Promise.all(invited.map(userId=>store.get(memberKey(roomId,userId))));
  return {...value,members:[...value.members.slice(0,1),
   ...records.filter(x=>x?.state==='accepted').map(x=>x.member)],
   pending:invited.filter((userId,i)=>!records[i])};
 };
 const set=async(key,value,options)=>{
  if(!key.startsWith(ROOM))return store.set(key,value,options);
  const original=await store.get(key);
  if(!original){
   return store.set(key,{...value,_memberSlotsV5:true,
    _invited:[...(value.pending||[])],members:value.members.slice(0,1)},options);
  }
  if(!original._memberSlotsV5)return store.set(key,value,options);
  const id=key.slice(ROOM.length);
  // Mutation type is independent: member writes never rewrite room metadata.
  for(const member of value.members||[]){
   if(member.userId===original.hostUserId)continue;
   const k=memberKey(id,member.userId),previous=await store.get(k);
   if(previous?.state==='left'||previous?.state==='declined'||previous?.state==='removed')continue;
   await store.set(k,{state:'accepted',member},options);
  }
  const newlyInvited=(value.pending||[]).filter(uid=>!original._invited.includes(uid));
  if(value.closed!==original.closed||value.hostUserId!==original.hostUserId||newlyInvited.length){
   return store.set(key,{...original,closed:value.closed,hostUserId:value.hostUserId,
    _invited:[...original._invited,...newlyInvited]},options);
  }
 };
 const mark=async(id,userId,state)=>{
  if(!id||!userId)return;
  const room=await store.get(ROOM+id);
  if(room?._memberSlotsV5)await store.set(memberKey(id,userId),{state},{ttl:21600});
 };
 return {get,set,delete:key=>store.delete(key),mark};
}
export function createV5QaSocialServer(storage,options){
 const slots=createConflictFreeRoomStorage(storage);
 const legacy=createQaSocialServer(slots,options);
 return {...legacy,async route(request){
  const response=await legacy.route(request);
  if(response.status>=400)return response;
  const path=String(request.path||''),method=request.method||'GET';
  const match=path.match(/rooms\/([a-f0-9-]{36})\/(leave|invite)(?:\/(decline|remove))?$/);
  if(method!=='POST'||!match)return response;
  const [,id,action,sub]=match;
  const who=await legacy.route({method:'GET',path:'me',headers:request.headers});
  if(who.status!==200)return response;
  const actor=who.body.user.id;
  if(action==='leave')await slots.mark(id,actor,'left');
  else if(action==='invite'&&sub==='decline')await slots.mark(id,actor,'declined');
  else if(action==='invite'&&sub==='remove')await slots.mark(id,request.body?.userId,'removed');
  return response;
 }};
}
