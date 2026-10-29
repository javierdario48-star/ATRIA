// Ordered reliable WebRTC transport only. No clinical state or timers.
export function createWardPacketCodec(){
 let sequence=0,received=0,current=null;
 return Object.freeze({
  encode(value){const text=JSON.stringify(value);if(text.length>1024000)throw Error('ward-packet-too-large');
   const id=++sequence,total=Math.max(1,Math.ceil(text.length/8000));return Array.from({length:total},(_,part)=>JSON.stringify({id,total,part,text:text.slice(part*8000,(part+1)*8000)}));},
  decode(raw){
   let p;try{p=JSON.parse(raw);}catch{return null;}
   if(!Number.isSafeInteger(p?.id)||p.id<=received||!Number.isSafeInteger(p.total)||p.total<1||p.total>128||
    !Number.isSafeInteger(p.part)||p.part<0||p.part>=p.total||typeof p.text!=='string'||p.text.length>8000)return null;
   if(p.part===0)current={id:p.id,total:p.total,parts:[]};
   if(!current||current.id!==p.id||current.total!==p.total||current.parts.length!==p.part)return null;
   current.parts.push(p.text);if(current.parts.length!==p.total)return null;
   const text=current.parts.join('');current=null;received=p.id;try{return JSON.parse(text);}catch{return null;}
  }
 });
}
/** Signaling is supplied by the existing authenticated social API. SDP uses
 * the same STUN configuration as V4. Polling is driven by the application RAF.
 */
export function createWardPeer({RTCPeerConnection,initiator,signal,onMessage,onState=()=>{},scope=''}) {
 if(typeof scope!=='string'||scope.length>50)throw Error('invalid ward SDP scope');
 // SDP mailboxes are addressed by peer, not room. Fence stale offers/ICE
 // from a previous guard before touching the *new* peer connection.
 let pc,codec=createWardPacketCodec(),negotiationId=initiator?scope+crypto.randomUUID():null;
 let channel=null,disposed=false,started=false,lastDescription='',sending=false,lastCandidates='';
 const candidates=[],remoteCandidates=new Map(),acceptedCandidates=new Set();
 function reset(){
  channel?.close();pc?.close();channel=null;codec=createWardPacketCodec();lastDescription='';lastCandidates='';candidates.length=0;remoteCandidates.clear();acceptedCandidates.clear();
  const owner=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});pc=owner;
  owner.onicecandidate=event=>{if(!disposed&&pc===owner&&event.candidate&&candidates.length<24)candidates.push(event.candidate.toJSON());};
  owner.ondatachannel=e=>{if(!disposed&&pc===owner)attach(e.channel,owner);};
  owner.onconnectionstatechange=()=>{if(!disposed&&pc===owner)onState(owner.connectionState);};
 }
 async function applyCandidates(){
  if(!pc.remoteDescription)return;
  for(const [key,candidate] of remoteCandidates)if(!acceptedCandidates.has(key)){
   try{await pc.addIceCandidate(candidate);acceptedCandidates.add(key);}catch{/* candidate from a retired SDP; a new authenticated poll replaces it */}
  }
 }
 function attach(value,owner=pc){channel=value;channel.onopen=()=>onState('open');channel.onclose=()=>onState('closed');
  channel.onmessage=e=>{if(disposed||pc!==owner)return;const value=typeof e.data==='string'?codec.decode(e.data):null;if(value)onMessage(value);};}
 reset();
 return Object.freeze({
  async start(){if(started||disposed||!initiator)return;started=true;attach(pc.createDataChannel('atria-v5-coop',{ordered:true}));await pc.setLocalDescription(await pc.createOffer());},
  async receive(description){
   if(disposed||typeof description?.negotiationId!=='string'||description.negotiationId.length>100)return;
   if(scope&&!description.negotiationId.startsWith(scope))return;
   if(description.type==='offer'&&!initiator){
    if(negotiationId&&negotiationId!==description.negotiationId)reset();negotiationId=description.negotiationId;
   }else if(description.negotiationId!==negotiationId)return;
   if(description?.type==='ice'){
    if(!disposed&&Array.isArray(description.candidates)&&description.candidates.length<=24){
     remoteCandidates.clear();for(const candidate of description.candidates)if(typeof candidate?.candidate==='string'&&candidate.candidate.length<2000)remoteCandidates.set(JSON.stringify(candidate),candidate);
     await applyCandidates();
    }return;
   }
   if(disposed||!description||!['offer','answer'].includes(description.type)||typeof description.sdp!=='string'||description.sdp.length>12000)return;
   // The authenticated mailbox republishes this negotiation while ICE gathers.
   // Candidates have their own slot; an SDP retry must not generate a second
   // answer or apply an updated answer after the connection returned to stable.
   if(pc.remoteDescription?.type===description.type)return;
   await pc.setRemoteDescription(description);
   if(description.type==='offer')await pc.setLocalDescription(await pc.createAnswer());
   await applyCandidates();
  },
  async maintain(){
   if(disposed||sending||!pc.localDescription)return;
   const description={type:pc.localDescription.type,sdp:pc.localDescription.sdp,negotiationId};
   // Publish SDP promptly; aggregate trickled candidates in the existing
   // authenticated ICE slot instead of waiting for an unreachable STUN host.
   const key=description.type+':'+/a=ice-ufrag:([^\r\n]+)/.exec(description.sdp)?.[1];
   sending=true;try{
    if(key!==lastDescription||channel?.readyState!=='open'){await signal(description);lastDescription=key;}
    const encoded=JSON.stringify(candidates);if(candidates.length&&encoded!==lastCandidates){await signal({type:'ice',candidates:[...candidates],negotiationId});lastCandidates=encoded;}
   }finally{sending=false;}
  },
  send(value){if(disposed||channel?.readyState!=='open'||channel.bufferedAmount>1048576)return false;
   try{for(const part of codec.encode(value))channel.send(part);return true;}catch{return false;}},
  state:()=>['failed','disconnected','closed'].includes(pc.connectionState)?pc.connectionState:channel?.readyState||pc.connectionState,
  dispose(){if(disposed)return;disposed=true;channel?.close();pc.close();}
 });
}
