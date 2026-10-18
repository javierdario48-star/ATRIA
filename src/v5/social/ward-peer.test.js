import test from 'node:test';
import assert from 'node:assert/strict';
import {createWardPacketCodec,createWardPeer} from './ward-peer.js';
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
