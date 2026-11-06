import {createAccountGateway} from '../../src/v5/server/account-gateway.js';
import {createV5QaSocialServer} from '../../src/v5/social/room-membership-store.js';
export function accountGatewayFixture(){
 const canonical=x=>String(x).normalize('NFKD').replace(/\p{M}/gu,'').trim().replace(/\s+/g,' ').toLowerCase();
 const data=new Map(),storage={get:async k=>data.get(k),set:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>data.delete(k)};
 const legacy=createV5QaSocialServer(storage),rows=new Map(),sessions=new Map(),released=new Set();let serial=0,guardStore=null;
 const sessionActive=(account,sessionId)=>!!account&&[...sessions.values()].some(session=>session.userId===account.auth_user_id&&session.sessionId===sessionId);
 const member=(value,actorId)=>value?.runtime?.members?.some(row=>row.id===actorId);
 const releaseKey=(actorId,roomId)=>JSON.stringify([actorId,roomId]);
 const backend={
  byActor:async id=>[...rows.values()].find(x=>x.actor_id===id)||null,
  byAuth:async id=>rows.get(id)||null,
  byUsername:async u=>[...rows.values()].find(x=>x.username===u)||null,
  nameStatus:async name=>({available:![...rows.values()].some(x=>canonical(x.name)===canonical(name)||canonical(x.username)===canonical(name)),key:canonical(name),displayName:name}),
  resolveLogin:async name=>{const list=[...rows.values()].filter(x=>canonical(x.name)===canonical(name)||canonical(x.username)===canonical(name));return list.length===1?list[0]:null;},
  async createIdentity(username,password){return {id:'auth-'+(++serial)};},
  async passwordSession(username,password){const row=await this.byUsername(username);if(!row||password!=='safe-test-password-123')throw Object.assign(Error('invalid credentials'),{status:401});
   const token='access-'+(++serial),sessionId='session-'+serial;sessions.set(token,{userId:row.auth_user_id,sessionId});return {access_token:token,refresh_token:'refresh-'+serial,expires_in:3600};},
  async validateSession(tokens){const s=sessions.get(tokens.access_token);if(!s)throw Object.assign(Error('expired'),{status:401});return {...s,tokens};},
  async logout(tokens){sessions.delete(tokens.access_token);},
  async insertAccount(row){if(await this.byActor(row.actor_id)||await this.byUsername(row.username)||!(await this.nameStatus(row.name)).available)throw Object.assign(Error('conflict'),{status:409});row.character_name_key=canonical(row.name);rows.set(row.auth_user_id,structuredClone(row));return row;},
  async updateAccount(id,change){const r=rows.get(id);Object.assign(r,change);return structuredClone(r);},
  async award(actorId){const r=await this.byActor(actorId);return {xp:r.xp,casesResolved:r.cases_resolved};},
  // Accounting is deliberately uncredited in this local transport fixture.
  // Real reward projection is verified separately against the deployed SQL RPC.
  creditedGuardRewards:async()=>[],creditedGuardReceipts:async()=>[],creditedRoomScores:async()=>[],
  async guardRecovery(actorId,sessionId,operation='inspect',roomId=null){
   const account=await this.byActor(actorId);
   if(!sessionActive(account,sessionId))throw Object.assign(Error('active account session required'),{status:401});
   const current=account.active_guard_id;
   if(current&&roomId&&roomId!==current)return {status:'changed',roomId:current};
   if(!current)return {status:'none',roomId:null};
   if(!guardStore)return {status:'unavailable',roomId:current};
   const record=await guardStore.read(current),runtime=record?.value?.runtime;
   const reason=!record?'missing':released.has(releaseKey(actorId,current))?'released':
    Array.isArray(runtime?.members)&&!member(record.value,actorId)?'not-member':null;
   if(reason){account.active_guard_id=null;account.controller_session_id=null;return {status:'none',roomId:null,reason};}
   if(!Array.isArray(runtime?.members))return {status:'unavailable',roomId:current};
   if(operation==='take-control')account.controller_session_id=sessionId;
   if(operation==='release'){
    if(!Array.isArray(runtime.turn?.participantIds)||runtime.turn.participantIds.includes(actorId))return {status:'participating',roomId:current};
    if(account.controller_session_id!==sessionId)return {status:'changed',roomId:current};
    released.add(releaseKey(actorId,current));account.active_guard_id=null;account.controller_session_id=null;
    return {status:'none',roomId:null,reason:'released'};
   }
   return {status:'available',roomId:current,mode:runtime.mode,
    turnEnded:runtime.shift?.elapsedSeconds>=runtime.shift?.durationSeconds,
    participating:runtime.turn?.participantIds?.includes(actorId)??true};
  },
  async rpc(name,{p_actor_id:actorId,p_room_id:roomId,p_session_id:sessionId}={}){
   const account=await this.byActor(actorId);
   if(!sessionActive(account,sessionId))return false;
   if(name==='atria_v5_can_control_guard')return account.active_guard_id===roomId&&account.controller_session_id===sessionId;
   if(name==='atria_v5_take_control'){
    if(!account.active_guard_id||!member((await guardStore?.read(account.active_guard_id))?.value,actorId))return false;
    account.controller_session_id=sessionId;return true;
   }
   if(name==='atria_v5_set_active_guard'){
    if(account.active_guard_id&&account.controller_session_id!==sessionId)return false;
    if(roomId){
     if(released.has(releaseKey(actorId,roomId))||!member((await guardStore?.read(roomId))?.value,actorId))return false;
    }else if(account.active_guard_id)released.add(releaseKey(actorId,account.active_guard_id));
    account.active_guard_id=roomId||null;account.controller_session_id=roomId?sessionId:null;return true;
   }
   throw Error('unsupported account fixture RPC: '+name);
  }
 };
 const gate=createAccountGateway({backend,legacy,storage});
 const request=(path,body,headers={})=>gate.route({method:body?'POST':'GET',path,body:body||{},headers});
 function bindGuardStore(store){guardStore=store;}
 function scopedGuardStore(identity){
  if(!guardStore)throw Error('account fixture requires the durable guard store');
  const forbidden=message=>Object.assign(Error(message),{status:403,code:'forbidden'});
  function canWrite(account,roomId){
   if(!sessionActive(account,identity.sessionId))throw forbidden('active account session required');
   if(account.active_guard_id&&(account.active_guard_id!==roomId||account.controller_session_id&&account.controller_session_id!==identity.sessionId))
    throw forbidden('guard controlled by another session or active guard');
   if(released.has(releaseKey(identity.actorId,roomId)))throw forbidden('guard participation has ended');
  }
  return {
   get requiresAdmission(){return !identity.account.active_guard_id||identity.account.controller_session_id!==identity.sessionId;},
   read:roomId=>guardStore.read(roomId),
   async observe(roomId){
    if(!await backend.rpc('atria_v5_can_control_guard',{p_actor_id:identity.actorId,p_room_id:roomId,p_session_id:identity.sessionId}))
     throw forbidden('No se pudo verificar el acceso a esta guardia.');
    return guardStore.read(roomId);
   },
   async compareAndSwap(roomId,etag,value){
    const account=await backend.byActor(identity.actorId),previous=await guardStore.read(roomId);
    canWrite(account,roomId);
    if(!member(value,identity.actorId)||previous&&!member(previous.value,identity.actorId))throw forbidden('account is not a guard member');
    const next=await guardStore.compareAndSwap(roomId,etag,value);
    if(next){account.active_guard_id=roomId;account.controller_session_id=identity.sessionId;}
    return next;
   }
  };
 }
 return {data,storage,legacy,rows,sessions,released,backend,gate,request,bindGuardStore,scopedGuardStore};
}
