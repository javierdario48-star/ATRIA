import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomMailbox,createHttpRoomTransport} from './room-mailbox.js';
import {createRoomAuthority} from '../core/room-authority.js';
import {createRoomReplica} from '../core/replica.js';
import {createNativeClinicalPort} from '../adapters/native-clinical-port.js';

function testRelay(roomId,members){
 const storage=[],users=new Set(members),fail=new Set();
 const request=async(url,options)=>{
  const parsed=new URL(url,'http://localhost');
  const token=options.headers.Authorization.replace('Bearer ','');
  const actor=token.replace(/^token-/,'');
  const match=/\/rooms\/([^/]+)\/messages$/.exec(parsed.pathname);
  if(!users.has(actor)||!match||decodeURIComponent(match[1])!==roomId)
   return {ok:false,status:403,json:async()=>({error:'not-room-member'})};
  if(options.method==='POST'){
   const data=JSON.parse(options.body).message;
   const sequence=storage.length+1;
   storage.push({sequence,userId:actor,data});
   if(fail.delete(actor))throw Error('network dropped after commit');
   return {ok:true,status:200,json:async()=>({ok:true,sequence})};
  }
  const after=Number(parsed.searchParams.get('after'));
  return {ok:true,status:200,json:async()=>({messages:storage.filter(x=>x.sequence>after)})};
 };
 const transport=actor=>createHttpRoomTransport({roomId,token:'token-'+actor,request});
 return {storage,request,transport,fail};
}
function sharedRoom(count,mode){
 const names=Array.from({length:count},(_,i)=>'doctor-'+i),roomId='case-room-'+mode+'-'+count;
 const relay=testRelay(roomId,names),portCalls=[];
 const port=createNativeClinicalPort({
  withPatient:(uid,fn)=>fn({uid}),
  invoke:({eventId,patientUid,actorId,intent})=>{
   portCalls.push({eventId,patientUid,actorId,intent});
   return {status:'executed',eventId,patientUid,receipt:{eventId,patientUid}};
  }});
 const authority=createRoomAuthority({roomId,mode,members:names.map(id=>({id})),
  patients:[{uid:'B1'}],authenticate:credential=>names.includes(credential)?
   {id:credential,roomId}:null,clinicalPort:port,
  resolveSpeechContext:()=>({patientUid:'B1',studies:[],
   therapies:[{id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']} ]})});
 const seen=names.map(()=>[]),replicas=names.map(()=>createRoomReplica(roomId)),acks=names.map(()=>new Map());
 const channels=names.map((id,index)=>createRoomMailbox({
  roomId,transport:relay.transport(id),
  onMessage:async envelope=>{
   if(index===0&&envelope.kind==='chat.command'){
    const a=await authority.dispatch(envelope.payload,envelope.senderId);
    channels[0].queue('chat.ack',{to:envelope.senderId,ack:a},
     'ack:'+envelope.senderId+':'+envelope.id);
    channels[0].queue('room.snapshot',{room:authority.snapshot()},
     'snapshot:'+authority.readRevision());
   }
   if(envelope.kind==='chat.ack'&&envelope.senderId===names[0]&&
     envelope.payload.to===id)acks[index].set(envelope.payload.ack.commandId,envelope.payload.ack);
   if(envelope.kind==='room.snapshot'&&envelope.senderId===names[0])
    replicas[index].apply(envelope.payload.room);
   seen[index].push(envelope);
  }
 }));
 return {names,roomId,relay,authority,channels,seen,replicas,acks,portCalls};
}
test('C21a 2/3/4 clients share one AUTHENTIC room authority, global transcript, and mode-specific ownership',async()=>{
 for(const count of [2,3,4])for(const mode of ['coop','competitive']){
  const r=sharedRoom(count,mode);
  const guest=r.channels.slice(1);
  guest.forEach((channel,i)=>channel.queue('chat.command',{
   id:'order-'+(i+1),kind:'chat.post',text:'Enfermera ceftriaxona'
  },'command-'+(i+1)));
  await Promise.all(guest.map(c=>c.flush()));
  await r.channels[0].poll();
  await r.channels[0].flush();
  await Promise.all(guest.map(c=>c.poll()));
  const statuses=r.acks.slice(1).map((a,i)=>a.get('order-'+(i+1))?.clinical[0]?.status);
  if(mode==='coop')assert(statuses.every(x=>x==='executed'));
  else assert.deepEqual(statuses,['executed',...Array.from({length:count-2},()=> 'rejected')]);
  assert.equal(r.portCalls.length,mode==='coop'?count-1:1);
  for(let i=1;i<count;i++){
   const snap=r.replicas[i].snapshot();
   assert.equal(snap.transcript.length,count-1);
   assert.equal(snap.mode,mode);
   if(mode==='competitive')assert.equal(snap.patients[0].ownerId,'doctor-1');
  }
  r.channels.forEach(c=>c.dispose());r.authority.dispose();
 }
});
test('C21a transport ambiguity may redeliver but native clinical action executes only once',async()=>{
 const r=sharedRoom(2,'coop');
 const guest=r.channels[1];
 guest.queue('chat.command',{id:'rx',kind:'chat.post',text:'Enfermera ceftriaxona'},'msg-rx');
 r.relay.fail.add('doctor-1');
 await assert.rejects(guest.flush(),/network dropped/);
 assert.equal(guest.status().pending,1,'an ambiguous send cannot be treated as confirmed');
 await guest.flush();
 await r.channels[0].poll();
 assert.equal(r.portCalls.length,1,'duplicate transport packet is not duplicate treatment');
 assert.equal(r.authority.snapshot().transcript.length,1);
 await r.channels[0].flush();await guest.poll();
 assert.equal(r.acks[1].get('rx').clinical[0].status,'executed');
 assert.equal(guest.status().cursor,r.relay.storage.length);
 r.channels.forEach(c=>c.dispose());r.authority.dispose();
});
test('C21a foreign rooms, stale snapshots and forged non-host state cannot execute or replace a replica',async()=>{
 const r=sharedRoom(3,'competitive'),third=r.channels[2];
 await assert.rejects(r.relay.transport('outsider').send({protocol:'atria.v5.room.1',
  roomId:r.roomId,id:'bad',kind:'chat.command',payload:{text:'ceftriaxona'}}),
 /room-http-403/);
 third.queue('room.snapshot',{room:{roomId:r.roomId,revision:999,patients:[],events:[]}},'forgery');
 await third.flush();await r.channels[1].poll();
 assert.equal(r.replicas[1].snapshot(),null,
  'a peer cannot impersonate the server-selected room host');
 assert.equal(r.portCalls.length,0);
 third.queue('chat.command',{id:'good',kind:'chat.post',text:'hola'},'valid');
 await third.flush();await r.channels[0].poll();await r.channels[0].flush();
 await third.poll();
 assert.equal(r.replicas[2].snapshot().revision,1);
 assert.equal(r.portCalls.length,0);
 r.channels.forEach(c=>c.dispose());r.authority.dispose();
});
test('C21a sequence gaps stop cursor and callback exceptions remain retryable',async()=>{
 let fail=true;
 const t={send:async()=>({sequence:1}),poll:async after=>({messages:after?[]:[
  {sequence:1,userId:'server',data:{protocol:'atria.v5.room.1',roomId:'R',
   id:'m',kind:'room.snapshot',payload:{a:1}}}]})};
 const c=createRoomMailbox({roomId:'R',transport:t,onMessage:()=>{if(fail)throw Error('render not ready');}});
 await assert.rejects(c.poll(),/render not ready/);
 assert.equal(c.status().cursor,0);
 fail=false;assert.equal((await c.poll()).applied,1);
 const gap=createRoomMailbox({roomId:'R',transport:{send:t.send,poll:async()=>({
  messages:[{sequence:2,userId:'host',data:{protocol:'atria.v5.room.1',
   roomId:'R',id:'second',kind:'chat.ack',payload:{}}}]})},onMessage:()=>{}});
 await assert.rejects(gap.poll(),/relay-sequence-gap:1:2/);
 assert.equal(gap.status().cursor,0);
 c.dispose();gap.dispose();
});
test('C21a queue refuses conflicting IDs, overflowing capacity and invalid trust envelopes',async()=>{
 const c=createRoomMailbox({roomId:'R',transport:{send:async()=>({sequence:1}),poll:async()=>({messages:[]})},
  onMessage:()=>{},maxPending:1,maxSeen:2});
 c.queue('chat.command',{id:'a'},'one');
 assert.throws(()=>c.queue('chat.ack',{id:'b'},'two'),/mailbox-outbox-full/);
 assert.throws(()=>c.queue('chat.command',{id:'different'},'one'),/mailbox-message-id-collision/);
 assert.throws(()=>c.queue('arbitrary',{id:'a'},'unknown'),/invalid-room-packet/);
 await c.flush();assert.equal(c.status().pending,0);
 c.dispose();assert.throws(()=>c.queue('chat.command',{id:'x'},'x'),/disposed/);
});
