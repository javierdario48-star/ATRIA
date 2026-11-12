import {createQaSocialServer} from '../../social/qa-social-server.js';
import {presenceAppearance} from '../app/avatar-appearance.js';
import {clinicalContent} from '../server/content.js';
import {playableClinicalCaseIds} from '../content/clinical-cases.js';
const cases=clinicalContent.cases;
import {resolveGuardSelection} from '../clinical/guard-selection-policy.js';
import {presenceActor,presenceStatus,publishPresenceSerially,readCurrentPresence,
 scopedMotionSession,scopedPresenceStorage,stalePresenceWrite,wardRoomId} from './presence-storage.js';
import {privateRoomMotionPrefix} from './room-motion-scope.js';
// Storage composition only: the characterized V4 backend remains byte-identical.
// A room has one host-owned metadata record and a distinct acceptance key per
// guest. Joining doctors cannot overwrite each other's room membership.
const ROOM='qa-v1:room:',MEMBER='atria-v5:room-member:',ROOM_TTL_SECONDS=21600;
export function createConflictFreeRoomStorage(store,{now=Date.now}={}){
 const memberKey=(id,userId)=>MEMBER+id+':'+userId;
 const expired=room=>Number.isFinite(room?.createdAt)&&now()-room.createdAt>=ROOM_TTL_SECONDS*1000;
 const get=async key=>{
  const value=await store.get(key);
  if(!key.startsWith(ROOM)||!value)return value;
  const roomId=key.slice(ROOM.length);
  if(expired(value)){
   // The durable clinical guard has its own lifetime and recovery contract.
   await Promise.all((value._invited||[]).map(userId=>store.delete(memberKey(roomId,userId))));
   await store.delete(key);
   return null;
  }
  if(!value._memberSlotsV5)return value;
  const invited=(value._invited||[]).filter(userId=>userId!==value.hostUserId);
  const records=await Promise.all(invited.map(userId=>store.get(memberKey(roomId,userId))));
  return {...value,members:[...value.members.slice(0,1),
   ...records.filter(x=>x?.state==='accepted').map(x=>x.member)],
   pending:invited.filter((userId,i)=>!records[i])};
 };
 const set=async(key,value,options)=>{
  if(!key.startsWith(ROOM))return store.set(key,value,options);
  const original=await store.get(key);
  if(expired(original??value))return;
  if(!original){
   return store.set(key,{...value,_memberSlotsV5:true,
    _invited:[...(value.pending||[])],members:value.members.slice(0,1)},options);
  }
  if(!original._memberSlotsV5)return store.set(key,value,options);
  if(original.closed)return;
  const id=key.slice(ROOM.length);
  // Mutation type is independent: member writes never rewrite room metadata.
  for(const member of value.members||[]){
   if(member.userId===original.hostUserId)continue;
   const k=memberKey(id,member.userId),acceptance={state:'accepted',member};
   if(store.setIfAbsent)await store.setIfAbsent(k,acceptance);
   else if(!await store.get(k))await store.set(k,acceptance,options);
  }
  const newlyInvited=(value.pending||[]).filter(uid=>!original._invited.includes(uid));
  const successor=value.hostUserId!==original.hostUserId&&original._invited.includes(value.hostUserId)&&
   await store.get(memberKey(id,value.hostUserId));
  const hostChanged=successor?.state==='accepted';
  if(value.closed||hostChanged||newlyInvited.length){
   return store.set(key,{...original,closed:value.closed,
    hostUserId:hostChanged?successor.member.userId:original.hostUserId,
    members:hostChanged?[successor.member]:original.members,
    _invited:[...original._invited,...newlyInvited]},options);
  }
 };
 const mark=async(id,userId,state)=>{
  if(!id||!userId)return;
  const room=await store.get(ROOM+id);
  if(!expired(room)&&room?._invited?.includes(userId))
   await store.set(memberKey(id,userId),{state},{ttl:ROOM_TTL_SECONDS});
 };
 return {get,set,delete:key=>store.delete(key),mark};
}
export function createV5QaSocialServer(storage,options){
 const slots=createConflictFreeRoomStorage(storage,options);
 const legacy=createQaSocialServer(slots,options),now=options?.now??Date.now;
 const currentPresence=(id,options)=>readCurrentPresence(storage,id,now(),options);
 async function memberRoom(headers,roomId){
  if(!wardRoomId(roomId))return null;
  const actor=await presenceActor(storage,headers);
  const room=actor&&await slots.get(ROOM+roomId);
  return !room?.closed&&room?.members?.some(member=>member.userId===actor)?room:null;
 }
 function publicPose(row){
  const {_motionRetired,_presenceV5,...pose}=row;
  // Client motion epochs order heartbeats from one device. Server time keeps
  // rendering monotonic after an explicit handoff to a differently set clock.
  if(_presenceV5?.publisherNonce)pose.motionEpoch=row.lastSeen;
  return pose;
 }
 async function projectPresence(body,room=null){
  const wardPlayers=[];
  const members=new Set(room?.members?.map(member=>member.userId));
  const rows=await Promise.all(body.players.map(async candidate=>({candidate,
   row:await currentPresence(candidate.userId,{candidate})})));
  const players=rows.map(({candidate,row})=>{
   const status=presenceStatus(row);
   if(status==='disponible')return {...publicPose(row),status};
   if(row?._presenceV5?.wardId===room?.id&&members.has(row?.userId))wardPlayers.push(publicPose(row));
   const {userId,name,handle}=row??candidate;
   return {userId,name,handle,status};
  });
  return {...body,players,wardPlayers};
 }
 async function readPlayerProfile(id,viewer){
  if(!/^qa_[0-9a-f]{30}$/.test(id))return null;
  const [user,friends,live]=await Promise.all([slots.get('qa-v1:user:'+id),slots.get('qa-v1:friends:'+id),currentPresence(id)]);
  if(!user)return null;const appearance=presenceAppearance(live?.color);
  return {actorId:id,name:user.name,username:user.handle,scrubColor:appearance.color,sex:appearance.sex,
   verified:false,friendsCount:Array.isArray(friends)?friends.length:0,status:presenceStatus(live),self:viewer===id};
 }
 async function signalRoute(request,scope={}){
  const presence=request.method==='POST'&&request.body?.presence;
  if(presence){
   const phase=scope.phase??(presence.phase==='guard'||/^ward-[a-f0-9]{8}-/.test(presence.motionSession)?'guard':'lobby');
   const wardId=scope.publisher?scope.wardId:phase==='guard'?(await memberRoom(request.headers,presence.roomId))?.id:null;
   const pageEpoch=Number.isSafeInteger(presence.pageEpoch)&&presence.pageEpoch>0&&presence.pageEpoch<=1e15?presence.pageEpoch:0;
   scope={...scope,phase,wardId,pageEpoch};
   const motionSession=scopedMotionSession(presence.motionSession||presence.peerId,scope,privateRoomMotionPrefix(wardId));
   request={...request,body:{...request.body,presence:{...presence,motionSession}}};
  }
  const run=()=>createQaSocialServer(scopedPresenceStorage(slots,scope),options).signalRoute(request);
  let response;
  try{response=await (presence?publishPresenceSerially(storage,request,run):run());}
  catch(error){if(error===stalePresenceWrite)return {status:200,body:{ok:true,stale:true}};throw error;}
  if(response.body.players)response.body=await projectPresence(response.body);
  return response;
 }
 return {...legacy,readPlayerProfile,currentPresence,signalRoute,async route(request,scope){
  const path=String(request.path||'').replace(/^\/?(?:api\/)?/,'').split('?')[0].replace(/^\//,''),method=String(request.method||'GET').toUpperCase();
  if(path==='lobby/state'&&method==='POST')return signalRoute({...request,method,body:{presence:request.body}});
  if(path==='lobby/leave'&&method==='POST')return publishPresenceSerially(storage,request,
   ()=>createQaSocialServer(scopedPresenceStorage(slots,{...scope,leaving:true}),options).route(request));
  let guardSelection=null;
  if(path==='rooms'&&method==='POST'&&request.body?.guardSelection!=null){
   try{const p=resolveGuardSelection(cases,playableClinicalCaseIds(cases),request.body.guardSelection);
    guardSelection={scope:p.scope,selection:p.selection};
   }catch{return {status:400,body:{error:'Selección de guardia no disponible.'}};}
  }
  if(path.startsWith('profiles/')&&method==='GET'){
   const me=await legacy.route({method:'GET',path:'me',headers:request.headers});
   if(me.status!==200)return me;
   const profile=await readPlayerProfile(path.slice(9),me.body.user.id);
   return profile?{status:200,body:{profile}}:{status:404,body:{error:'Médico no encontrado.'}};
  }
  const response=await legacy.route(request);
  if(response.status>=400)return response;
  if(path==='lobby'&&response.body.players)response.body=await projectPresence(response.body,await memberRoom(request.headers,request.query?.roomId));
  if(guardSelection&&response.body.room){
   const room=response.body.room,raw=await storage.get(ROOM+room.id);
   // Host metadata uses the existing room record. Guest acceptances retain
   // their independent slots, including if one arrives during this write.
   await storage.set(ROOM+room.id,{...raw,guardSelection},{ttl:ROOM_TTL_SECONDS});
   response.body.room={...room,guardSelection};
  }
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
