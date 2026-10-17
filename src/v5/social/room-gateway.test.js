import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardRelayHost,createGuardRelayGuest} from './room-gateway.js';
import {createRoomAuthority} from '../core/room-authority.js';
import {createNativeClinicalPort} from '../adapters/native-clinical-port.js';
import {createRoomRelayService,createMemoryRoomRelayStore} from './room-relay-service.js';
import {createHttpRoomTransport} from './room-mailbox.js';

function makeRoom(count,mode){
 const names=Array.from({length:count},(_,i)=>'player'+i),roomId=mode+'-'+count;
 const data=[],seen={};
 const wire=(userId)=>({
  async send(packet){
   const seq=data.length+1;
   data.push({sequence:seq,userId,data:structuredClone(packet)});
   return {sequence:seq};
  },
  async poll(after){return {messages:data.filter(m=>m.sequence>after)};}
 });
 const drugs=[];
 const port=createNativeClinicalPort({
  withPatient:(uid,fn)=>fn({uid}),
  invoke:r=>{drugs.push(r);return {status:'executed',eventId:r.eventId,patientUid:r.patientUid,
   receipt:{eventId:r.eventId,patientUid:r.patientUid}};}});
 const auth=token=>names.includes(token?.replace('credential:',''))?
  {id:token.slice('credential:'.length),roomId}:null;
 const authority=createRoomAuthority({roomId,mode,members:names.map(id=>({id})),
  patients:[{uid:'P1'}],authenticate:auth,clinicalPort:port,
  resolveSpeechContext:()=>({patientUid:'P1',studies:[],
   therapies:[{id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']}]})});
 const host=createGuardRelayHost({roomId,hostId:names[0],transport:wire(names[0]),
  authority,authenticateSender:async sender=>'credential:'+sender});
 const guests=names.slice(1).map(actorId=>createGuardRelayGuest({
  roomId,hostId:names[0],actorId,transport:wire(actorId)}));
 return {roomId,names,data,wire,drugs,authority,host,guests,
  dispose(){host.dispose();guests.forEach(g=>g.dispose());authority.dispose();}};
}
test('C21b 2/3/4 independent guests dispatch through a SINGLE authenticated clinical host',async()=>{
 for(const mode of ['coop','competitive'])for(const count of [2,3,4]){
  const f=makeRoom(count,mode);
  f.host.publish();await f.host.flush();
  await Promise.all(f.guests.map(g=>g.poll()));
  assert(f.guests.every(g=>g.snapshot()?.revision===0));
  for(let i=0;i<f.guests.length;i++)f.guests[i].post({
   id:'dose-'+i,text:'Enfermera ceftriaxona',actorId:'fake-host',patientUid:'not-P1'});
  await Promise.all(f.guests.map(g=>g.flush()));
  await f.host.poll();f.host.publish();await f.host.flush();
  await Promise.all(f.guests.map(g=>g.poll()));
  for(let i=0;i<f.guests.length;i++){
   const ack=f.guests[i].acknowledgement('dose-'+i);
   assert(ack&&ack.roomId===f.roomId,'host receipt shared to correct guest');
   assert.equal(ack.patientUid,'P1','client cannot forge target');
   assert.equal(ack.clinical[0].status,mode==='coop'||i===0?'executed':'rejected');
   assert.equal(f.guests[i].snapshot().transcript.length,count-1);
  }
  assert.equal(f.drugs.length,mode==='coop'?count-1:1);
  assert.equal(f.authority.snapshot().transcript.length,count-1);
  const old=f.guests[0].snapshot();
  old.transcript.length=0;
  assert.equal(f.guests[0].snapshot().transcript.length,count-1,'client replica immutable from UI');
  f.dispose();
 }
});
test('C21b malicious guest snapshots/acks never replace host state or impersonate owner',async()=>{
 const f=makeRoom(3,'coop');
 const malicious=f.wire(f.names[2]);
 await malicious.send({protocol:'atria.v5.room.1',id:'forged',roomId:f.roomId,
  kind:'room.snapshot',payload:{room:{roomId:f.roomId,revision:9000,transcript:[]}}});
 await malicious.send({protocol:'atria.v5.room.1',id:'fake-ack',roomId:f.roomId,
  kind:'chat.ack',payload:{to:f.names[1],ack:{roomId:f.roomId,commandId:'victim',status:'received'}}});
 await f.guests[0].poll();
 assert.equal(f.guests[0].snapshot(),null);
 assert.equal(f.guests[0].acknowledgement('victim'),null);
 assert.equal(f.drugs.length,0);
 f.dispose();
});
test('C21b explicit resync restores room snapshot without executing additional treatment',async()=>{
 const f=makeRoom(2,'coop');
 f.guests[0].post({id:'genuine',text:'Enfermera ceftriaxona'});
 await f.guests[0].flush();await f.host.poll();await f.host.flush();
 await f.guests[0].poll();
 assert.equal(f.drugs.length,1);
 f.guests[0].requestResync('reconnect-1');await f.guests[0].flush();
 await f.host.poll();await f.host.flush();await f.guests[0].poll();
 assert.equal(f.guests[0].snapshot().transcript.length,1,
  'resync must NEVER be represented as a clinician chat message');
 assert.equal(f.drugs.length,1);
 f.dispose();
});

test('C21b malformed peer command is rejected and does not poison the room mailbox',async()=>{
 const f=makeRoom(3,'coop');
 await f.wire('player1').send({protocol:'atria.v5.room.1',roomId:f.roomId,
  kind:'chat.command',id:'malformed',payload:{id:'bad',text:''}});
 f.guests[1].post({id:'valid',text:'Enfermera ceftriaxona'});
 await f.guests[1].flush();
 const received=await f.host.poll();
 assert.equal(received.applied,2,'host must consume invalid command without freezing shared sequence');
 await f.host.flush();
 await Promise.all(f.guests.map(g=>g.poll()));
 assert.equal(f.guests[0].acknowledgement('bad').status,'rejected');
 assert.equal(f.guests[1].acknowledgement('valid').clinical[0].status,'executed');
 assert.equal(f.drugs.length,1);
 assert.equal(f.authority.snapshot().transcript.length,1,
  'malformed packet must not enter global chat');
 f.dispose();
});

test('C21c guest recovers a real authenticated host checkpoint after truncated HTTP history, never repeats ambiguous medicine',async()=>{
 const roomId='recovery-room',store=createMemoryRoomRelayStore();
 await store.create({roomId,hostId:'host',members:['host','guest']});
 const service=createRoomRelayService({store,authenticate:header=>
  ({'Bearer host-token':{id:'host'},'Bearer guest-token':{id:'guest'}})[header]||null,
  maxRetained:4,pageSize:4});
 const request=async(uri,options)=>{
  const url=new URL(uri,'http://localhost');
  const response=await service.handle({method:options.method,path:url.pathname,
   headers:{authorization:options.headers.Authorization},
   query:Object.fromEntries(url.searchParams),
   body:options.body?JSON.parse(options.body):{}});
  return {ok:response.status>=200&&response.status<300,status:response.status,
   json:async()=>response.body};
 };
 const hostTransport=createHttpRoomTransport({roomId,token:'host-token',request});
 const guestTransport=createHttpRoomTransport({roomId,token:'guest-token',request});
 let executed=0;
 const port=createNativeClinicalPort({withPatient:(uid,fn)=>fn({uid}),
  invoke:({eventId,patientUid})=>{executed++;
   return {status:'executed',eventId,patientUid,receipt:{eventId,patientUid}};}});
 const authority=createRoomAuthority({roomId,mode:'coop',
  members:[{id:'host'},{id:'guest'}],patients:[{uid:'P'}],
  authenticate:credential=>['host','guest'].includes(credential)?{id:credential,roomId}:null,
  clinicalPort:port,resolveSpeechContext:()=>({patientUid:'P',studies:[],
   therapies:[{id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']}]})});
 const host=createGuardRelayHost({roomId,hostId:'host',authority,
  transport:hostTransport,authenticateSender:id=>id});
 const guest=createGuardRelayGuest({roomId,hostId:'host',actorId:'guest',transport:guestTransport});
 host.publish();await host.flush();
 guest.post({id:'drug-1',text:'Enfermera ceftriaxona'});
 await guest.flush();await host.poll();await host.flush();
 assert.equal(executed,1);
 // A compacted relay drops the old acknowledgement, but NOT its execution.
 for(let i=0;i<9;i++)await hostTransport.send({protocol:'atria.v5.room.1',roomId,
  id:'fresh-snapshot-'+i,kind:'room.snapshot',payload:{room:authority.snapshot()}});
 await assert.rejects(guest.poll(),/relay-history-expired/);
 assert.equal(guest.snapshot(),null,'no partial out-of-order view');
 const recovered=await guest.recover();
 assert.deepEqual(recovered.unconfirmedCommands,['drug-1']);
 assert.equal(recovered.requiresReceiptReview,true);
 assert.equal(guest.snapshot().transcript.length,1);
 assert.equal(guest.snapshot().transcript[0].actorId,'guest');
 assert.equal(executed,1,'restoring a clinical view is never another drug administration');
 assert.equal((await guest.poll()).applied,0);
 assert.equal(guest.acknowledgement('drug-1'),null,
  'lost ACK is never invented just because a snapshot contains a therapy');
 guest.dispose();host.dispose();authority.dispose();
});
