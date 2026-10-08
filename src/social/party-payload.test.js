import assert from 'node:assert/strict';
import {csPartyEncode,csPartyDecode} from './party-payload.js';
const roomId='room-qa-test', host='host-user', client='guest-user';
let encoded=0,fragments=0;
for(let scenario=0;scenario<120;scenario++){
 const count=6+scenario%21, clinical=Array.from({length:count},(_,i)=>({
  index:i,uid:'guard-'+scenario+':P'+i,caseId:'PANC-001',
  clinical:{vitals:{hr:60+i,spo2:96},history:'Paciente con evolución y antecedentes. '.repeat(60),
  studies:['hemograma','lipasa','tomografía cerebral','resonancia'].map(x=>({name:x,result:'coherente '.repeat(25)}))},
  state:'not_arrived'
 }));
 const original={type:'cs_room_v411',kind:scenario%2?'snapshot':'start',peerId:host,
  room:{id:'CS_'+scenario,hostId:host,mode:scenario%2?'coop':'competitive',revision:1,queue:clinical.map(x=>x.caseId),patients:clinical}};
 const packets=await csPartyEncode(JSON.stringify(original),roomId,'pkt-'+scenario);
 assert(packets.length>1,'large state must be segmented');
 assert(packets.every(p=>JSON.stringify(p).length<6000),'each packet respects QA API cap');
 assert(packets.every(p=>p.roomId===roomId&&p.codec==='gzip'));
 const shuffled=[...packets].reverse();
 const parts=Array(packets.length).fill(null);
 for(const packet of shuffled){assert(packet.index>=0&&packet.index<packet.total);parts[packet.index]=packet.data}
 const restored=await csPartyDecode(parts);
 assert.deepEqual(restored,original,'lossless transfer preserves clinical state and room identity');
 assert.equal(restored.room.hostId,host);
 assert.notEqual(restored.room.hostId,client);
 encoded++;fragments+=packets.length;
}
const small={type:'chat',text:'hola'};
assert.deepEqual(await csPartyEncode(JSON.stringify(small),roomId,'small'),[small]);
await assert.rejects(()=>csPartyDecode(['not valid']),/inválidos/);
await assert.rejects(()=>csPartyDecode(['a'.repeat(3601)]),/inválidos/);
assert.equal(encoded,120);
console.log('ATRIA ROOM START/SNAPSHOT CODEC QA BOT PASS',JSON.stringify({scenarios:encoded,fragments,clients:2,transport:'simulated authenticated room API frames',clinical:'lossless',hardware:'not exercised'}));
