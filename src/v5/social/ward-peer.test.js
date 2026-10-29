import test from 'node:test';
import assert from 'node:assert/strict';
import {createWardPacketCodec,createWardPeer} from './ward-peer.js';
test('trickled SDP retries keep one answer per negotiation and never reapply an answer in stable state',async()=>{
 const peers=[],signals=[];class Peer{
  constructor(){peers.push(this);this.connectionState='new';this.remoteCalls=0;this.answers=0;}
  createDataChannel(){return {readyState:'connecting',close(){}};}
  async createOffer(){return {type:'offer',sdp:'a=ice-ufrag:host'};}
  async createAnswer(){this.answers++;return {type:'answer',sdp:'a=ice-ufrag:guest'};}
  async setLocalDescription(x){this.localDescription=x;}
  async setRemoteDescription(x){
   if(x.type==='answer'&&this.remoteDescription)throw Error('answer applied in stable state');
   this.remoteDescription=x;this.remoteCalls++;
  }
  close(){}
 }
 const host=createWardPeer({RTCPeerConnection:Peer,initiator:true,signal:async x=>signals.push(x),onMessage:()=>{}});
 const guest=createWardPeer({RTCPeerConnection:Peer,initiator:false,signal:async()=>{},onMessage:()=>{}});
 try{
  await host.start();await host.maintain();const offer=signals[0];
  await guest.receive(offer);await guest.receive({...offer,sdp:offer.sdp+'\r\na=candidate:later'});
  assert.equal(peers[1].answers,1,'candidate gathering cannot mint a second answer');
  await host.receive({type:'answer',sdp:'a=ice-ufrag:guest',negotiationId:offer.negotiationId});
  await assert.doesNotReject(host.receive({type:'answer',sdp:'a=ice-ufrag:guest\r\na=candidate:later',negotiationId:offer.negotiationId}));
  assert.equal(peers[0].remoteCalls,1);
 }finally{host.dispose();guest.dispose();}
});
test('ICE failure remains observable when the reliable channel still reports open',async()=>{
 let pc;class Peer{constructor(){pc=this;this.connectionState='connected';}createDataChannel(){return {readyState:'open',close(){}};}async createOffer(){return {type:'offer',sdp:'a=ice-ufrag:abc'};}async setLocalDescription(x){this.localDescription=x;}close(){}}
 const link=createWardPeer({RTCPeerConnection:Peer,initiator:true,signal:async()=>{},onMessage:()=>{}});await link.start();
 assert.equal(link.state(),'open');pc.connectionState='disconnected';assert.equal(link.state(),'disconnected');pc.connectionState='failed';assert.equal(link.state(),'failed');link.dispose();
});
test('large clinical snapshots reassemble once without mixing interrupted or malformed frames',()=>{
 const a=createWardPacketCodec(),b=createWardPacketCodec(),value={patientUid:'P',history:'á'.repeat(35000),vitals:{sys:82}},packets=a.encode(value);
 assert(packets.length>4);for(const item of packets.slice(0,-1))assert.equal(b.decode(item),null);
 assert.deepEqual(b.decode(packets.at(-1)),value);assert.equal(b.decode(packets.at(-1)),null);
 assert.equal(b.decode('{broken'),null);assert.equal(b.decode(JSON.stringify({id:999,total:900000,part:0,text:'bad'})),null);
 const interrupted=a.encode({text:'x'.repeat(20000)});b.decode(interrupted[0]);
 const next=a.encode({patientUid:'Q',value:2});assert.deepEqual(b.decode(next[0]),{patientUid:'Q',value:2});
});
test('a fresh connection rejects cached answers and ICE from the retired negotiation',async()=>{
 let pc;const signals=[];class Peer{
  constructor(){pc=this;this.connectionState='new';}createDataChannel(){return {readyState:'connecting',close(){}};}
  async createOffer(){return {type:'offer',sdp:'a=ice-ufrag:new'};}async setLocalDescription(x){this.localDescription=x;}
  async setRemoteDescription(x){this.remoteDescription=x;}async addIceCandidate(){throw Error('stale candidate must not reach RTC');}close(){}
 }
 const link=createWardPeer({RTCPeerConnection:Peer,initiator:true,signal:async x=>signals.push(x),onMessage:()=>{}});await link.start();await link.maintain();
 assert.equal(typeof signals[0].negotiationId,'string');
 await link.receive({type:'answer',sdp:'old answer',negotiationId:'retired'});assert.equal(pc.remoteDescription,undefined);
 await link.receive({type:'ice',candidates:[{candidate:'old'}],negotiationId:'retired'});
 await link.receive({type:'answer',sdp:'fresh answer',negotiationId:signals[0].negotiationId});assert.equal(pc.remoteDescription.sdp,'fresh answer');link.dispose();
});
test('a resumed guest replaces its provisional old offer instead of mixing two RTC negotiations',async()=>{
 const pcs=[],messages=[];class Peer{
  constructor(){pcs.push(this);this.connectionState='new';}async setRemoteDescription(x){this.remoteDescription=x;}
  async createAnswer(){return {type:'answer',sdp:'a=ice-ufrag:guest'};}async setLocalDescription(x){this.localDescription=x;}close(){this.closed=true;}
 }
 const link=createWardPeer({RTCPeerConnection:Peer,initiator:false,signal:async()=>{},onMessage:x=>messages.push(x)});
 await link.receive({type:'offer',sdp:'old offer',negotiationId:'previous'});
 const retired={close(){}};pcs[0].ondatachannel({channel:retired});
 await link.receive({type:'offer',sdp:'new offer',negotiationId:'current'});
 assert.equal(pcs.length,2);assert(pcs[0].closed);assert.equal(pcs[1].remoteDescription.sdp,'new offer');
 retired.onmessage({data:createWardPacketCodec().encode({text:'stale command'})[0]});assert.equal(messages.length,0);link.dispose();
});

test('new room RTC scope ignores previous room SDP and ICE before the guest may reset its peer',async()=>{
 const pcs=[],signals=[];
 class Peer{
  constructor(){pcs.push(this);this.connectionState='new';}
  createDataChannel(){return {readyState:'connecting',close(){}};}
  async createOffer(){return {type:'offer',sdp:'a=ice-ufrag:new'};}
  async createAnswer(){return {type:'answer',sdp:'a=ice-ufrag:accepted'};}
  async setRemoteDescription(v){this.remoteDescription=v;}
  async setLocalDescription(v){this.localDescription=v;}
  async addIceCandidate(v){this.ice=v;}
  close(){this.closed=true;}
 }
 const scope='ward-ccccaaaa-',old='ward-bbbbaaaa-';
 const host=createWardPeer({RTCPeerConnection:Peer,initiator:true,scope,
  signal:async v=>signals.push(v),onMessage:()=>{}});
 await host.start();await host.maintain();
 assert(signals[0].negotiationId.startsWith(scope));
 const guest=createWardPeer({RTCPeerConnection:Peer,initiator:false,scope,
  signal:async()=>{},onMessage:()=>{}});
 const current=pcs.at(-1),count=pcs.length;
 await guest.receive({type:'offer',sdp:'old-room-offer',negotiationId:old+'previous'});
 await guest.receive({type:'ice',candidates:[{candidate:'stale'}],negotiationId:old+'previous'});
 assert.equal(pcs.length,count,'stale room offer cannot create a replacement RTC connection');
 assert.equal(current.remoteDescription,undefined);
 await guest.receive({type:'offer',sdp:'new-room-offer',negotiationId:signals[0].negotiationId});
 assert.equal(current.remoteDescription.sdp,'new-room-offer');
 assert.equal(current.localDescription.type,'answer');
 await guest.receive({type:'offer',sdp:'old-room-late-retry',negotiationId:old+'retry'});
 assert.equal(pcs.length,count);
 assert.equal(current.remoteDescription.sdp,'new-room-offer');
 host.dispose();guest.dispose();
});
