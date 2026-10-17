// C20.a — authoritative, transport-agnostic lobby directory.
// Every identity comes from authenticate(credentials). There is NO socket,
// clinical executor, second clock, DOM, peer-to-peer channel or persistent user DB.
// The next network adapter must call these methods on a trusted server.
const copy=x=>structuredClone(x);
const COLORS=new Set(['navy','green','gray','pink','teal']);
const MODES=new Set(['coop','competitive']);
const DIRECTIONS=new Set(['N','NE','E','SE','S','SW','W','NW']);
const identity=x=>typeof x==='string'&&x.length>0&&x.length<=160;
const clamp=(x,min,max)=>Number.isFinite(x)&&x>=min&&x<=max;
const cellSize=160;
const coord=(x,y)=>Math.floor(x/cellSize)+':'+Math.floor(y/cellSize);
const publicPlayer=p=>({id:p.id,name:p.name,color:p.color,level:p.level,
 x:p.x,y:p.y,dir:p.dir,moving:p.moving,seq:p.seq});
const publicParty=p=>({id:p.id,hostId:p.hostId,mode:p.mode,caseId:p.caseId,
 phase:p.phase,members:[...p.members],pending:[...p.pending]});

/** Create only inside one authoritative service process. For multi-instance
 * deployment the service must be backed by a transactional shared owner.
 */
export function createLobbyCoordinator({
 authenticate,clock=()=>Date.now(),newId=()=>crypto.randomUUID(),
 idleMs=45000,maxUsers=10000,maxParties=2500
}={}){
 if(typeof authenticate!=='function'||typeof clock!=='function'||typeof newId!=='function'||
  !Number.isSafeInteger(idleMs)||idleMs<1000||!Number.isSafeInteger(maxUsers)||maxUsers<1||
  !Number.isSafeInteger(maxParties)||maxParties<1)throw Error('invalid lobby owner');
 const players=new Map(),grid=new Map(),parties=new Map(),subscriptions=new Set();
 let serial=Promise.resolve(),disposed=false,lastSweep=clock();
 const enqueue=task=>{const run=serial.then(task);serial=run.catch(()=>{});return run;};
 const auth=async credentials=>{
  const actor=await authenticate(credentials);
  if(!identity(actor?.id))throw Error('lobby-not-authenticated');
  return actor.id;
 };
 function cellRemove(p){const key=coord(p.x,p.y),s=grid.get(key);s?.delete(p.id);if(s?.size===0)grid.delete(key);}
 function cellAdd(p){const key=coord(p.x,p.y);if(!grid.has(key))grid.set(key,new Set());grid.get(key).add(p.id);}
 function notify(type,detail){
  for(const fn of subscriptions)try{fn(copy({type,...detail}));}catch{/* a subscriber cannot roll back a transition */}
 }
 function leaveParty(id){
  const p=players.get(id);if(!p?.partyId)return;
  const party=parties.get(p.partyId);p.partyId=null;
  if(!party)return;
  party.members.delete(id);party.pending.delete(id);
  if(id===party.hostId||party.members.size===0){
   for(const uid of [...party.members,...party.pending]){const other=players.get(uid);if(other?.partyId===party.id)other.partyId=null;}
   parties.delete(party.id);notify('party.disbanded',{partyId:party.id});
  }else if(party.phase==='active'&&party.members.size<2){
   party.phase='ended';
   notify('party.ended',{partyId:party.id});
  }else notify('party.left',{partyId:party.id,userId:id});
 }
 function remove(id){
  const p=players.get(id);if(!p)return;
  cellRemove(p);leaveParty(id);players.delete(id);notify('presence.left',{userId:id});
 }
 function expire(force=false){
  const now=clock();
  if(!force&&now-lastSweep<5000)return;
  lastSweep=now;
  for(const p of players.values())if(now-p.lastSeen>=idleMs)remove(p.id);
  for(const party of parties.values())if(party.phase==='inviting'){
   for(const [uid,t] of party.pending)if(now-t>=90000)party.pending.delete(uid);
  }
 }
 function session(userId,sessionId,{mustBeLobby=false}={}){
  const p=players.get(userId);
  if(!p||!identity(sessionId)||p.sessionId!==sessionId)throw Error('stale-or-unknown-lobby-session');
  if(clock()-p.lastSeen>=idleMs){remove(userId);throw Error('lobby-session-expired');}
  if(mustBeLobby&&p.partyId)throw Error('already-in-party');
  return p;
 }
 function ownedParty(userId,sessionId,partyId,{hostOnly=false}={}){
  const p=session(userId,sessionId),party=parties.get(partyId);
  if(!party||p.partyId!==partyId||!party.members.has(userId))throw Error('not-party-member');
  if(hostOnly&&party.hostId!==userId)throw Error('party-host-required');
  return party;
 }
 async function mutation(credentials,fn){
  return enqueue(async()=>{
   if(disposed)throw Error('lobby-disposed');
   expire();return fn(await auth(credentials));
  });
 }
 return Object.freeze({
  join(credentials,{name,color='navy',x=0,y=0,level=1}={}){
   return mutation(credentials,userId=>{
    if(typeof name!=='string'||!name.trim()||name.length>32||!COLORS.has(color)||
     !clamp(x,0,10000)||!clamp(y,0,10000)||!Number.isSafeInteger(level)||level<1||level>1000)
     throw Error('invalid-lobby-avatar');
    let p=players.get(userId);
    if(!p&&players.size>=maxUsers)throw Error('lobby-capacity');
    if(p){cellRemove(p);Object.assign(p,{name:name.trim(),color,x,y,level,seq:0,lastSeen:clock(),sessionId:newId()});}
    else{p={id:userId,name:name.trim(),color,x,y,level,dir:'S',moving:false,seq:0,
     partyId:null,lastSeen:clock(),sessionId:newId()};players.set(userId,p);}
    cellAdd(p);notify('presence.joined',{userId});
    return {sessionId:p.sessionId,player:publicPlayer(p)};
   });
  },
  move(credentials,{sessionId,seq,x,y,dir='S',moving=false}={}){
   return mutation(credentials,userId=>{
    const p=session(userId,sessionId);
    if(!Number.isSafeInteger(seq)||seq<1||!clamp(x,0,10000)||!clamp(y,0,10000)||
       !DIRECTIONS.has(dir)||typeof moving!=='boolean')throw Error('invalid-lobby-motion');
    if(seq<=p.seq)return {applied:false,reason:'stale-motion',seq:p.seq};
    cellRemove(p);Object.assign(p,{seq,x,y,dir,moving,lastSeen:clock()});cellAdd(p);
    return {applied:true,seq:p.seq};
   });
  },
  heartbeat(credentials,{sessionId}={}){
   return mutation(credentials,userId=>{const p=session(userId,sessionId);
    p.lastSeen=clock();return {ok:true};});
  },
  disconnect(credentials,{sessionId}={}){
   return mutation(credentials,userId=>{const p=players.get(userId);
    if(!p||p.sessionId!==sessionId)return {disconnected:false};
    remove(userId);return {disconnected:true};});
  },
  async nearby(credentials,{sessionId,radius=360,limit=48}={}){
   if(disposed)throw Error('lobby-disposed');
   const id=await auth(credentials);
   const p=session(id,sessionId);
   if(!clamp(radius,1,2000)||!Number.isSafeInteger(limit)||limit<1||limit>64)
    throw Error('invalid-visibility-window');
   const out=[],r2=radius*radius;
   const minX=Math.floor((p.x-radius)/cellSize),maxX=Math.floor((p.x+radius)/cellSize);
   const minY=Math.floor((p.y-radius)/cellSize),maxY=Math.floor((p.y+radius)/cellSize);
   for(let ix=minX;ix<=maxX;ix++)for(let iy=minY;iy<=maxY;iy++)
    for(const uid of grid.get(ix+':'+iy)||[]){
     const other=players.get(uid);
     if(!other||uid===id||clock()-other.lastSeen>=idleMs)continue;
     const dist2=(p.x-other.x)**2+(p.y-other.y)**2;
     if(dist2<=r2)out.push({dist2,other});
    }
   out.sort((a,b)=>a.dist2-b.dist2||a.other.id.localeCompare(b.other.id));
   return out.slice(0,limit).map(x=>publicPlayer(x.other));
  },
  createParty(credentials,{sessionId,mode,caseId}={}){
   return mutation(credentials,userId=>{
    session(userId,sessionId,{mustBeLobby:true});
    if(!MODES.has(mode)||!identity(caseId))throw Error('invalid-party-configuration');
    if(parties.size>=maxParties)throw Error('party-capacity');
    const id='party-'+newId();if(parties.has(id))throw Error('duplicate-party-identity');
    const party={id,hostId:userId,mode,caseId,phase:'inviting',
     members:new Set([userId]),pending:new Map()};
    parties.set(id,party);players.get(userId).partyId=id;
    notify('party.created',{partyId:id});return publicParty(party);
   });
  },
  invite(credentials,{sessionId,partyId,targetId}={}){
   return mutation(credentials,userId=>{
    const p=ownedParty(userId,sessionId,partyId,{hostOnly:true});
    if(p.phase!=='inviting')throw Error('party-not-inviting');
    const target=players.get(targetId);
    if(!target||clock()-target.lastSeen>=idleMs||target.partyId||
       target.id===userId)throw Error('target-unavailable');
    if(p.members.has(targetId)||p.pending.has(targetId))throw Error('duplicate-invitation');
    if(p.members.size+p.pending.size>=4)throw Error('party-full');
    p.pending.set(targetId,clock());notify('party.invited',{partyId,targetId});
    return publicParty(p);
   });
  },
  accept(credentials,{sessionId,partyId}={}){
   return mutation(credentials,userId=>{
    const user=session(userId,sessionId,{mustBeLobby:true});
    const p=parties.get(partyId),invitedAt=p?.pending.get(userId);
    if(!p||p.phase!=='inviting'||invitedAt===undefined||clock()-invitedAt>=90000)
     throw Error('invitation-missing-or-expired');
    if(p.members.size>=4)throw Error('party-full');
    p.pending.delete(userId);p.members.add(userId);user.partyId=partyId;
    notify('party.joined',{partyId,userId});return publicParty(p);
   });
  },
  start(credentials,{sessionId,partyId}={}){
   return mutation(credentials,userId=>{
    const p=ownedParty(userId,sessionId,partyId,{hostOnly:true});
    if(p.phase!=='inviting'||p.members.size<2||p.members.size>4||p.pending.size)
     throw Error('party-not-ready');
    if([...p.members].some(id=>!players.has(id)||clock()-players.get(id).lastSeen>=idleMs))
     throw Error('party-member-offline');
    p.phase='active';
    notify('party.started',{partyId});
    // This is a trusted ROOM SPEC, not yet a networked guard nor a simulated
    // clinical session. The room owner must create the one clinical executor.
    return {roomId:p.id,mode:p.mode,caseId:p.caseId,members:[...p.members],status:'ready-for-guard-owner'};
   });
  },
  leave(credentials,{sessionId}={}){
   return mutation(credentials,userId=>{const p=session(userId,sessionId);
    if(!p.partyId)return {left:false};
    leaveParty(userId);return {left:true};
   });
  },
  party(credentials,{sessionId,partyId}={}){
   return mutation(credentials,userId=>publicParty(ownedParty(userId,sessionId,partyId)));
  },
  subscribe(fn){if(typeof fn!=='function')throw Error('invalid subscription');
   if(disposed)throw Error('lobby-disposed');
   subscriptions.add(fn);return ()=>subscriptions.delete(fn);},
  diagnostics(){return {players:players.size,parties:parties.size,spatialCells:grid.size,disposed};},
  dispose(){disposed=true;players.clear();grid.clear();parties.clear();subscriptions.clear();}
 });
}
