import {createWardPeer} from './ward-peer.js';
import {socialAppearance} from '../app/avatar-appearance.js';
import {privateRoomMotionPrefix} from './room-motion-scope.js';
import {createPeerRecoveryPolicy} from './peer-recovery-policy.js';
const SESSION_KEY='atria.v5.social.client',ROOM_KEY='atria.v5.coop.room',ROOM_ACTOR_KEY='atria.v5.coop.actor';
/** Existing authenticated social registration/invitations and V4 SDP relay.
 * Clinical commands/snapshots travel on one reliable ordered ward channel.
 * Only the caller's existing RAF invokes maintain(); there is no timer here.
 */
export function createCooperativeLink({window,profile,onAccount=()=>{},onSocial=()=>{},onRoom=()=>{},onPacket=()=>{},onRoomSpeech=()=>{},onClose=()=>{},requestTimeoutMs=12000}){
 if(!Number.isSafeInteger(requestTimeoutMs)||requestTimeoutMs<1)throw Error('invalid social request timeout');
 const peers=new Map(),recovery=createPeerRecoveryPolicy();let cookieIdentity=false,token=null,user=null,connecting=null,room=null,roster=[],lobbyMessages=[],friends=[],requests={incoming:[],outgoing:[]},invites=[],busy=null,busyRoster=null,busyRoom=null,busySpeech=null,nextPoll=0,nextRosterPoll=0,nextRoomPoll=0,nextSpeechPoll=0,roomSpeechCursor=0,roomSpeechRoom=null,lastContactsAt=-Infinity,disposed=false,roomEpoch=0,desiredRoomId=null;
 const backgroundRequests=new Set(),identityRequests=new Set();let identityEpoch=0;
 const receivedCommitEpochs=new Set();
 let publishedCommitEpoch=-1,persistedCommitEpoch=-1,queuedCommitEpoch=-1,commitWrite=null;
 const temporary=new Map();let storage;try{storage=window.localStorage;storage.getItem(SESSION_KEY);}catch{storage={getItem:k=>temporary.get(k),setItem:(k,v)=>temporary.set(k,v),removeItem:k=>temporary.delete(k)};}
 let clientKey=storage.getItem(SESSION_KEY);if(!clientKey||clientKey.length<20){clientKey=window.crypto.randomUUID()+window.crypto.randomUUID();try{storage.setItem(SESSION_KEY,clientKey);}catch{}}
 const peerId='v5-'+clientKey.slice(0,32);
 let motionSession=window.crypto.randomUUID(),motionEpoch=Math.max(Date.now(),Number(storage.getItem('atria.v5.motionEpoch')||0)+1),motionScope='';
 try{storage.setItem('atria.v5.motionEpoch',String(motionEpoch));}catch{}
 let savedRoom=storage.getItem(ROOM_KEY),presenceSequence=0;
 let presenceFailures=0,rosterFailures=0,connectionIssue=false;
 function markTransport(kind,ok){
  const before=connectionIssue;
  if(kind==='presence')presenceFailures=ok?0:Math.min(10,presenceFailures+1);
  if(kind==='roster')rosterFailures=ok?0:Math.min(10,rosterFailures+1);
  connectionIssue=presenceFailures>=2||rosterFailures>=2;
  if(connectionIssue!==before)onSocial();
 }
 function nextRoomEpoch(){
  roomEpoch++;
  for(const controller of backgroundRequests)controller.abort();
  backgroundRequests.clear();busy=busyRoster=busyRoom=busySpeech=null;
  nextPoll=nextRosterPoll=nextRoomPoll=nextSpeechPoll=0;
  return roomEpoch;
 }
 function resetCommitDelivery(){
  receivedCommitEpochs.clear();publishedCommitEpoch=persistedCommitEpoch=queuedCommitEpoch=-1;commitWrite=null;
 }
 function rememberCommit(epoch){
  if(receivedCommitEpochs.has(epoch))return false;
  receivedCommitEpochs.add(epoch);
  if(receivedCommitEpochs.size>256)receivedCommitEpochs.delete(receivedCommitEpochs.values().next().value);
  return true;
 }
 function untilAborted(operation,signal){
  signal.throwIfAborted();
  return new Promise((resolve,reject)=>{
   const abort=()=>reject(signal.reason);
   signal.addEventListener('abort',abort,{once:true});
   Promise.resolve(operation).then(resolve,reject).finally(()=>signal.removeEventListener('abort',abort));
  });
 }
 async function api(path,body,signalEndpoint=false,{background=false,identity=false}={}){
  const controller=new AbortController(),epoch=identityEpoch,
   signal=AbortSignal.any([controller.signal,AbortSignal.timeout(requestTimeoutMs)]);
  if(background)backgroundRequests.add(controller);
  if(identity)identityRequests.add(controller);
  try{
   const response=await untilAborted(window.fetch((signalEndpoint?'/api/lobby-sync':'/api/')+path,{method:body?'POST':'GET',cache:'no-store',keepalive:!!body,signal,
    headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),signal);
   let value;try{value=await untilAborted(response.json(),signal);}catch(error){signal.throwIfAborted();value={};}
   signal.throwIfAborted();
   if(!response.ok){if(response.status===401&&epoch===identityEpoch)token=null;const error=Error(value.error||'social-'+response.status);error.status=response.status;throw error;}return value;
  }finally{backgroundRequests.delete(controller);identityRequests.delete(controller);}
 }
 async function connect(){
  if(user&&(token||cookieIdentity))return user;
  // Presence, roster and room requests share one authenticated identity,
  // even if the first animation frame launches their network lanes together.
  if(!connecting){
   const epoch=identityEpoch,pending=api('resume',{clientKey,name:profile.name.length<2?'Dr. '+profile.name:profile.name},false,{identity:true})
    .then(result=>{if(disposed||epoch!==identityEpoch)throw Error('social-identity-retired');token=result.token;cookieIdentity=!!result.account;user=result.user;if(result.account)onAccount(result.account);return user;})
    .finally(()=>{if(connecting===pending)connecting=null;});
   connecting=pending;
  }
  return connecting;
 }
 function setRoom(value){
  if(disposed)return;
  if(!['coop','competitive'].includes(value.mode))throw Error('unsupported-room-mode');
  if(room?.id&&room.id!==value.id){for(const peer of peers.values())peer.link.dispose();peers.clear();recovery.reset();}
  if(roomSpeechRoom!==value.id){roomSpeechCursor=0;roomSpeechRoom=value.id;resetCommitDelivery();}
  room=value;desiredRoomId=room.id;savedRoom=room.id;invites=invites.filter(x=>x.roomId!==room.id);
  try{storage.setItem(ROOM_KEY,room.id);storage.setItem(ROOM_ACTOR_KEY,user.id);}catch{}onRoom(structuredClone(room),user);
 }
 function remoteMotionSession(userId){return roster.find(x=>x.userId===userId)?.motionSession||null;}
 const commitPacket=epoch=>({kind:'clinical.committed',id:'clinical-commit-'+epoch,roomId:room.id,epoch});
 function receivePacket(sender,packet){
  if(packet.kind!=='clinical.committed'){onPacket(sender,packet);return;}
  if(!room||packet.roomId!==room.id||!room.members.some(m=>m.userId===sender)||
   !Number.isSafeInteger(packet.epoch)||packet.epoch<0||packet.id!=='clinical-commit-'+packet.epoch)return;
  // Peer epochs are advisory IDs, never a verified revision watermark. An
  // implausibly large notice cannot suppress later real commits. The replica
  // compares each notice with its own authenticated server epoch.
  if(!rememberCommit(packet.epoch))return;
  const wakeup=commitPacket(packet.epoch);
  // The existing ward transport is a host star. Forward only a wakeup;
  // recipients still fetch their own authenticated authoritative view.
  if(room.hostUserId===user?.id)for(const [id,p] of peers)if(id!==sender)p.link.send(wakeup);
  onPacket(sender,wakeup);
 }
 function peer(member,initiator){
  const entry={id:member.userId,roomId:room.id,peerId:member.peerId,motionSession:remoteMotionSession(member.userId),link:null};
  entry.link=createWardPeer({RTCPeerConnection:window.RTCPeerConnection,initiator,
   scope:privateRoomMotionPrefix(room.id),
   signal:description=>api('',{signal:{type:description.type,fromUserId:user.id,fromPeerId:peerId,toPeerId:member.peerId,description}},true,{background:true}),
   onMessage:packet=>{if(!disposed&&peers.get(entry.id)===entry&&room?.id===entry.roomId&&packet.roomId===entry.roomId&&room.members.some(x=>x.userId===entry.id))receivePacket(entry.id,packet);}});
  peers.set(member.userId,entry);return entry;
 }
 async function pollPresence(now,pose){
  const epoch=roomEpoch,active=()=>!disposed&&roomEpoch===epoch;
  await connect();if(!active())return;
  const scope=pose.phase==='guard'?privateRoomMotionPrefix(pose.roomId):'';
  if(scope!==motionScope){
   motionScope=scope;motionSession=scope+window.crypto.randomUUID();
   motionEpoch=Math.max(Date.now(),motionEpoch+1);presenceSequence=0;
   try{storage.setItem('atria.v5.motionEpoch',String(motionEpoch));}catch{}
  }
  // Never hold the next spatial packet behind directory reads or invitations.
  // Both lanes use the original authenticated API and existing RAF; no new timer.
  await api('',{presence:{peerId,motionSession,motionEpoch,motionAt:window.performance.now(),sentAt:Date.now(),
   motionCadence:260,x:pose.x,y:pose.y,dir:pose.dir,moving:pose.moving,
   walkPhase:pose.walkPhase,level:pose.level,color:socialAppearance(profile.scrubColor,profile.sex),
   phase:pose.phase,roomId:pose.roomId||'',seq:++presenceSequence}},true,{background:true});
 }
 async function pollRoster(now){
  const epoch=roomEpoch,active=()=>!disposed&&roomEpoch===epoch;
  await connect();if(!active())return;
  const social=await api('lobby?after=0',undefined,false,{background:true});if(!active())return;
  roster=social.players;lobbyMessages=social.messages||[];
  if(!room&&!savedRoom&&now-lastContactsAt>=780){
   const me=await api('me',undefined,false,{background:true});if(!active())return;
   if(me.account)onAccount(me.account);
   lastContactsAt=now;
   invites=me.invites.filter(x=>['coop','competitive'].includes(x.mode)&&x.roomId!==room?.id&&x.roomId!==savedRoom);
   friends=me.friends||[];requests=me.requests||{incoming:[],outgoing:[]};
  }
  onSocial();
 }
 async function pollRoom(now){
  const epoch=roomEpoch,active=()=>!disposed&&roomEpoch===epoch;
  await connect();if(!active()||!(room||savedRoom))return;
  const id=room?.id||savedRoom;
  let latest;try{latest=await api('rooms/'+id+'/messages?after=0',undefined,false,{background:true});}
  catch(error){if(!active())return;if(![403,404].includes(error.status))return;
   const wasActive=!!room;nextRoomEpoch();room=null;desiredRoomId=null;savedRoom=null;resetCommitDelivery();try{storage.removeItem(ROOM_KEY);}catch{}for(const p of peers.values())p.link.dispose();peers.clear();recovery.reset();if(wasActive)onClose();return;}
  if(!active())return;
  setRoom(latest.room);
  if(!active()||!room)return;
  const host=room.hostUserId===user.id;
  const remotes=host?room.members.filter(x=>x.userId!==user.id):room.members.filter(x=>x.userId===room.hostUserId);
  for(const member of remotes){
   if(!member.peerId)continue;
   let p=peers.get(member.userId);
   const motionSession=remoteMotionSession(member.userId),scope=privateRoomMotionPrefix(room.id);
   const enteringWard=motionSession?.startsWith(scope)&&!p?.motionSession?.startsWith(scope);
   // Only the host initiates a replacement negotiation. A guest follows its
   // new offer, which may arrive before that host's new presence. Recreating
   // the guest again on presence would answer the same offer from another PC.
   // A reloaded guest can still announce its new lobby session while waiting
   // for clinical state; its later lobby-to-ward transition is not a reload.
   if(host&&p&&motionSession&&p.motionSession&&p.motionSession!==motionSession&&!enteringWard){
    p.link.dispose();peers.delete(member.userId);recovery.forget(member.userId);p=null;
   }
   // Track the observed pose session without replacing a guest negotiation.
   if(p&&motionSession)p.motionSession=motionSession;
   // A single tested recovery policy owns state transitions, backoff, and
   // cooldown. No timer, per-view retry or duplicate signaling channel.
   if(p&&recovery.shouldRestart(member.userId,p.link.state(),now)){
    p.link.dispose();peers.delete(member.userId);p=null;
   }
   p??=peer(member,host);
   if(host)await p.link.start();
   if(!active())return;
   const result=await api('?signal='+(host?'answer':'offer')+'&toPeer='+encodeURIComponent(peerId)+'&fromPeer='+encodeURIComponent(member.peerId),undefined,true,{background:true});
   const value=result.signal;
   if(!active())return;
   if(value?.fromUserId===member.userId&&value.fromPeerId===member.peerId&&value.toPeerId===peerId){
    try{await p.link.receive(value.description);}catch{/* stale SDP from the previous connection; next poll/reoffer reconciles */}
   }
   if(!active())return;
   const ice=await api('?signal=ice&toPeer='+encodeURIComponent(peerId)+'&fromPeer='+encodeURIComponent(member.peerId),undefined,true,{background:true});
   if(!active())return;
   if(ice.signal?.fromUserId===member.userId&&ice.signal.fromPeerId===member.peerId&&ice.signal.toPeerId===peerId)await p.link.receive(ice.signal.description);
   if(!active())return;
   await p.link.maintain();
   if(!active())return;
  }
  for(const [id,p] of peers)if(!remotes.some(x=>x.userId===id)){p.link.dispose();peers.delete(id);recovery.forget(id);}
  if(!disposed)onSocial();
 }
 async function pollRoomSpeech(){
  const epoch=roomEpoch,id=room?.id;
  if(disposed||!id)return;
  const value=await api('rooms/'+id+'/messages?after='+roomSpeechCursor,undefined,false,{background:true});
  if(disposed||roomEpoch!==epoch||room?.id!==id)return;
  for(const entry of value.messages||[]){
   if(!Number.isSafeInteger(entry.sequence)||entry.sequence<=roomSpeechCursor)continue;
   roomSpeechCursor=entry.sequence;
   const msg=entry.data;
   if(msg?.kind==='clinical.committed'){
    if(entry.userId!==user?.id)receivePacket(entry.userId,msg);
    continue;
   }
   if(msg?.kind!=='physician.speech'||typeof msg.id!=='string'||
      typeof msg.text!=='string'||msg.text.length>280||entry.userId===user?.id)continue;
   if(!room.members.some(m=>m.userId===entry.userId))continue;
   onRoomSpeech({roomId:id,userId:entry.userId,id:msg.id,text:msg.text,
    createdAt:entry.createdAt,transport:'http'});
  }
  // The endpoint may paginate. The next RAF poll continues from the cursor.
 }
 return Object.freeze({
  connect,
  flush:()=>Promise.all([busy,busyRoster,busyRoom,busySpeech].filter(Boolean)),
  setProfile(value){profile={...value};},
  useAccount(value,{restore=false}={}){
   if(room)throw Error('Volvé al lobby antes de cambiar de cuenta.');
   const sameActor=restore&&value&&storage.getItem(ROOM_ACTOR_KEY)===value.actorId;
   if(!sameActor){savedRoom=null;desiredRoomId=null;try{storage.removeItem(ROOM_KEY);storage.removeItem(ROOM_ACTOR_KEY);}catch{}}
   identityEpoch++;for(const controller of identityRequests)controller.abort();identityRequests.clear();connecting=null;
   cookieIdentity=!!value;token=null;user=value?{id:value.actorId,name:value.name,handle:value.username}:null;
   nextRoomEpoch();resetCommitDelivery();roster=[];friends=[];requests={incoming:[],outgoing:[]};invites=[];lastContactsAt=-Infinity;
  },
  async readPlayerProfile(id){await connect();return (await api('profiles/'+encodeURIComponent(id))).profile;},
  async removeFriend(userId){await connect();await api('friends/remove',{userId});const me=await api('me');
   friends=me.friends||[];requests=me.requests||{incoming:[],outgoing:[]};onSocial();},
  async postRoomSpeech({id,text}){
   if(!room||!user||typeof id!=='string'||!id||typeof text!=='string'||!text.trim())return false;
   const activeRoom=room.id;
   if(text.length>280)return false;
   // Fast social preview, never a clinical command or bedside receipt.
   for(const p of peers.values())p.link.send({kind:'physician.preview',roomId:activeRoom,id,text});
   try{
    await api('rooms/'+activeRoom+'/messages',{message:{kind:'physician.speech',id,text}});
    return true;
   }catch{return false;}
  },
  publishClinicalCommit(epoch){
   if(disposed||!room||!user||!Number.isSafeInteger(epoch)||epoch<0||epoch<=persistedCommitEpoch)return Promise.resolve(false);
   if(epoch>publishedCommitEpoch){
    publishedCommitEpoch=epoch;rememberCommit(epoch);
    const wakeup=commitPacket(epoch);for(const p of peers.values())p.link.send(wakeup);
   }
   queuedCommitEpoch=Math.max(queuedCommitEpoch,epoch);
   if(commitWrite)return commitWrite;
   const activeRoom=room.id,generation=roomEpoch;
   const pending=(async()=>{
    try{
     while(!disposed&&roomEpoch===generation&&room?.id===activeRoom&&queuedCommitEpoch>persistedCommitEpoch){
      const next=queuedCommitEpoch;
      await api('rooms/'+activeRoom+'/messages',{message:commitPacket(next)});
      if(roomEpoch!==generation||room?.id!==activeRoom)return false;
      persistedCommitEpoch=next;
     }
     return !disposed&&roomEpoch===generation&&room?.id===activeRoom;
    }catch{return false;}
    finally{if(commitWrite===pending)commitWrite=null;}
   })();
   commitWrite=pending;return pending;
  },
  async postLobbyMessage(text,messageId){await connect();const result=await api('lobby/chat',{text,messageId});
   lobbyMessages=[...lobbyMessages.filter(x=>x.messageId!==result.message.messageId),result.message].slice(-90);
   onSocial();return result.message;},
  async addFriend(userId){await connect();await api('friends',{userId});const me=await api('me');
   friends=me.friends||[];requests=me.requests||{incoming:[],outgoing:[]};onSocial();},
  async acceptFriend(userId){await connect();await api('friends/accept',{userId});const me=await api('me');
   friends=me.friends||[];requests=me.requests||{incoming:[],outgoing:[]};onSocial();},
  async declineFriend(userId){await connect();await api('friends/decline',{userId});const me=await api('me');
   friends=me.friends||[];requests=me.requests||{incoming:[],outgoing:[]};onSocial();},
  async declineInvitation(roomId){await connect();await api('rooms/'+roomId+'/invite/decline',{});
   invites=invites.filter(x=>x.roomId!==roomId);onSocial();},
  async invite(ids,mode='coop',guardSelection=null){const epoch=nextRoomEpoch();desiredRoomId=null;await connect();if(ids.length<1||ids.length>3)throw Error('Elegí de uno a tres colegas.');
   if(!['coop','competitive'].includes(mode))throw Error('Modalidad de guardia inválida');
   const result=await api('rooms',{mode,invitees:ids,peerId,...(guardSelection?{guardSelection}:{})});if(disposed||epoch!==roomEpoch){try{await api('rooms/'+result.room.id+'/cancel',{});}catch{}throw Error('Invitación cancelada.');}setRoom(result.room);return structuredClone(room);},
  async join(id,{preserveRoom=false}={}){const epoch=nextRoomEpoch();desiredRoomId=id;await connect();
   if(disposed||epoch!==roomEpoch)throw Error('Entrada cancelada.');
   let result;try{result=await api('rooms/join',{roomId:id,peerId},false,{background:preserveRoom});}
   catch(error){if(epoch===roomEpoch){desiredRoomId=null;if(!preserveRoom&&room?.id!==id)try{await api('rooms/'+id+'/leave',{});}catch{}}throw error;}
   if(disposed||epoch!==roomEpoch){if(!preserveRoom&&desiredRoomId!==id&&room?.id!==id)try{await api('rooms/'+id+'/leave',{});}catch{}throw Error('Entrada cancelada.');}
   setRoom(result.room);return structuredClone(room);},
  async leave({preserveRoom=false}={}){
   nextRoomEpoch();resetCommitDelivery();desiredRoomId=null;const previous=room;room=null;savedRoom=null;roomSpeechCursor=0;roomSpeechRoom=null;try{storage.removeItem(ROOM_KEY);}catch{}
   for(const p of peers.values())p.link.dispose();peers.clear();recovery.reset();
   // Saving a durable guard detaches this browser. The server-owned roster
   // and room must remain recoverable for this doctor and their colleagues.
   if(previous&&!preserveRoom)try{await api('rooms/'+previous.id+'/'+(previous.hostUserId===user.id?'cancel':'leave'),{});}catch{}
  },
  maintain(now,pose){
   if(disposed)return;
   const epoch=roomEpoch;
   // Same 260ms social presence as the working lobby, even inside a ward.
   // Signaling retains its separate slower, serialized room lane. Both are
   // driven by the existing RAF (no added timers or transport stack).
   if(!busy&&now>=nextPoll){
    nextPoll=now+260;
    const pending=pollPresence(now,pose).then(()=>{if(epoch===roomEpoch)markTransport('presence',true);},
     ()=>{if(epoch===roomEpoch)markTransport('presence',false);}).finally(()=>{if(busy===pending)busy=null;});busy=pending;
   }
   if(!busyRoster&&now>=nextRosterPoll){
    nextRosterPoll=now+260;
    const pending=pollRoster(now).then(()=>{if(epoch===roomEpoch)markTransport('roster',true);},
     ()=>{if(epoch===roomEpoch)markTransport('roster',false);}).finally(()=>{if(busyRoster===pending)busyRoster=null;});busyRoster=pending;
   }
   if(room&&!busySpeech&&now>=nextSpeechPoll){
    nextSpeechPoll=now+320;
    const pending=pollRoomSpeech().catch(()=>{}).finally(()=>{if(busySpeech===pending)busySpeech=null;});busySpeech=pending;
   }
   if((room||savedRoom)&&!busyRoom&&now>=nextRoomPoll){
    nextRoomPoll=now+1000;
    const pending=pollRoom(now).catch(()=>{}).finally(()=>{if(busyRoom===pending)busyRoom=null;});busyRoom=pending;
   }
  },
  send(id,packet){return !!room&&(peers.get(id)?.link.send({...packet,roomId:room.id})??false);},
  broadcast(packet){if(room)for(const p of peers.values())p.link.send({...packet,roomId:room.id});},
  isMember:id=>!!room?.members.some(x=>x.userId===id),
  isHost:()=>!!user&&room?.hostUserId===user.id,
  credentials:()=>({clientKey,authorization:token?'Bearer '+token:null}),
  state:()=>structuredClone({user,room,roster,lobbyMessages,friends,requests,invites,connectionIssue,recovering:!!savedRoom,connections:[...peers.values()].map(p=>({id:p.id,state:p.link.state()}))}),
  dispose(){disposed=true;identityEpoch++;nextRoomEpoch();for(const controller of identityRequests)controller.abort();identityRequests.clear();resetCommitDelivery();desiredRoomId=null;for(const p of peers.values())p.link.dispose();peers.clear();recovery.reset();}
 });
}
