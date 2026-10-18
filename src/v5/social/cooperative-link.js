import {createWardPeer} from './ward-peer.js';
const SESSION_KEY='atria.v5.social.client',ROOM_KEY='atria.v5.coop.room';
/** Existing authenticated social registration/invitations and V4 SDP relay.
 * Clinical commands/snapshots travel on one reliable ordered ward channel.
 * Only the caller's existing RAF invokes maintain(); there is no timer here.
 */
export function createCooperativeLink({window,profile,onSocial=()=>{},onRoom=()=>{},onPacket=()=>{},onClose=()=>{}}){
 const peers=new Map();let token=null,user=null,room=null,roster=[],invites=[],busy=null,nextPoll=0,disposed=false,roomEpoch=0;
 const temporary=new Map();let storage;try{storage=window.localStorage;storage.getItem(SESSION_KEY);}catch{storage={getItem:k=>temporary.get(k),setItem:(k,v)=>temporary.set(k,v),removeItem:k=>temporary.delete(k)};}
 let clientKey=storage.getItem(SESSION_KEY);if(!clientKey||clientKey.length<20){clientKey=window.crypto.randomUUID()+window.crypto.randomUUID();try{storage.setItem(SESSION_KEY,clientKey);}catch{}}
 const peerId='v5-'+clientKey.slice(0,32);
 const motionSession=window.crypto.randomUUID(),motionEpoch=Math.max(Date.now(),Number(storage.getItem('atria.v5.motionEpoch')||0)+1);
 try{storage.setItem('atria.v5.motionEpoch',String(motionEpoch));}catch{}
 let savedRoom=storage.getItem(ROOM_KEY),presenceSequence=0;
 async function api(path,body,signalEndpoint=false){
  const response=await window.fetch((signalEndpoint?'/api/lobby-sync':'/api/')+path,{method:body?'POST':'GET',cache:'no-store',keepalive:!!body,
   headers:{...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
  let value;try{value=await response.json();}catch{value={};}
  if(!response.ok){if(response.status===401)token=null;const error=Error(value.error||'social-'+response.status);error.status=response.status;throw error;}return value;
 }
 async function connect(){
  if(user&&token)return user;
  const result=await api('resume',{clientKey,name:profile.name.length<2?'Dr. '+profile.name:profile.name});token=result.token;user=result.user;return user;
 }
 function setRoom(value){
  if(disposed)return;
  if(value.mode!=='coop')throw Error('competitive-mode-not-enabled');
  room=value;savedRoom=room.id;try{storage.setItem(ROOM_KEY,room.id);}catch{}onRoom(structuredClone(room),user);
 }
 function peer(member,initiator){
  const entry={id:member.userId,roomId:room.id,peerId:member.peerId,lastAttempt:window.performance.now(),link:null};
  entry.link=createWardPeer({RTCPeerConnection:window.RTCPeerConnection,initiator,
   signal:description=>api('',{signal:{type:description.type,fromUserId:user.id,fromPeerId:peerId,toPeerId:member.peerId,description}},true),
   onMessage:packet=>{if(!disposed&&peers.get(entry.id)===entry&&room?.id===entry.roomId&&packet.roomId===entry.roomId&&room.members.some(x=>x.userId===entry.id))onPacket(entry.id,packet);}});
  peers.set(member.userId,entry);return entry;
 }
 async function poll(now,pose){
  const epoch=roomEpoch,active=()=>!disposed&&roomEpoch===epoch;
  await connect();
  if(!active())return;
  await api('',{presence:{peerId,motionSession,motionEpoch,x:pose.x,y:pose.y,dir:pose.dir,moving:pose.moving,walkPhase:pose.walkPhase,level:pose.level,color:profile.scrubColor,seq:++presenceSequence}},true);
  if(!active())return;
  const social=await api('lobby?after=0');roster=social.players;
  if(!active())return;
  if(!room&&!savedRoom){const me=await api('me');if(!active())return;invites=me.invites.filter(x=>x.mode==='coop');onSocial();return;}
  const id=room?.id||savedRoom;
  let latest;try{latest=await api('rooms/'+id+'/messages?after=0');}
  catch(error){if(!active())return;if(![403,404].includes(error.status))return;
   const wasActive=!!room;room=null;savedRoom=null;try{storage.removeItem(ROOM_KEY);}catch{}for(const p of peers.values())p.link.dispose();peers.clear();if(wasActive)onClose();return;}
  if(!active())return;
  setRoom(latest.room);
  if(!active()||!room)return;
  const host=room.hostUserId===user.id;
  const remotes=host?room.members.filter(x=>x.userId!==user.id):room.members.filter(x=>x.userId===room.hostUserId);
  for(const member of remotes){
   if(!member.peerId)continue;
   let p=peers.get(member.userId);
   if(p&&(['closed','failed','disconnected'].includes(p.link.state()))&&now-p.lastAttempt>6000){p.link.dispose();peers.delete(member.userId);p=null;}
   p??=peer(member,host);
   if(host)await p.link.start();
   const result=await api('?signal='+(host?'answer':'offer')+'&toPeer='+encodeURIComponent(peerId)+'&fromPeer='+encodeURIComponent(member.peerId),undefined,true);
   const value=result.signal;
   if(!active())return;
   if(value?.fromUserId===member.userId&&value.fromPeerId===member.peerId&&value.toPeerId===peerId){
    try{await p.link.receive(value.description);}catch{/* stale SDP from the previous connection; next poll/reoffer reconciles */}
   }
   const ice=await api('?signal=ice&toPeer='+encodeURIComponent(peerId)+'&fromPeer='+encodeURIComponent(member.peerId),undefined,true);
   if(!active())return;
   if(ice.signal?.fromUserId===member.userId&&ice.signal.fromPeerId===member.peerId&&ice.signal.toPeerId===peerId)await p.link.receive(ice.signal.description);
   await p.link.maintain();
  }
  for(const [id,p] of peers)if(!remotes.some(x=>x.userId===id)){p.link.dispose();peers.delete(id);}
  if(!disposed)onSocial();
 }
 return Object.freeze({
  connect,
  flush:()=>busy||Promise.resolve(),
  setProfile(value){profile={...value};},
  async invite(ids){const epoch=++roomEpoch;await connect();if(ids.length<1||ids.length>3)throw Error('Elegí de uno a tres colegas.');
   const result=await api('rooms',{mode:'coop',invitees:ids,peerId});if(disposed||epoch!==roomEpoch)throw Error('Invitación cancelada.');setRoom(result.room);return structuredClone(room);},
  async join(id){const epoch=++roomEpoch;await connect();const result=await api('rooms/join',{roomId:id,peerId});if(disposed||epoch!==roomEpoch)throw Error('Entrada cancelada.');setRoom(result.room);return structuredClone(room);},
  async leave(){
   roomEpoch++;const previous=room;room=null;savedRoom=null;try{storage.removeItem(ROOM_KEY);}catch{}
   for(const p of peers.values())p.link.dispose();peers.clear();
   if(previous)try{await api('rooms/'+previous.id+'/'+(previous.hostUserId===user.id?'cancel':'leave'),{});}catch{}
  },
  maintain(now,pose){if(disposed||busy||now<nextPoll)return;nextPoll=now+1000;
   busy=poll(now,pose).catch(()=>{}).finally(()=>busy=null);},
  send(id,packet){return !!room&&(peers.get(id)?.link.send({...packet,roomId:room.id})??false);},
  broadcast(packet){if(room)for(const p of peers.values())p.link.send({...packet,roomId:room.id});},
  isMember:id=>!!room?.members.some(x=>x.userId===id),
  isHost:()=>!!user&&room?.hostUserId===user.id,
  state:()=>structuredClone({user,room,roster,invites,recovering:!!savedRoom,connections:[...peers.values()].map(p=>({id:p.id,state:p.link.state()}))}),
  dispose(){disposed=true;roomEpoch++;for(const p of peers.values())p.link.dispose();peers.clear();}
 });
}
