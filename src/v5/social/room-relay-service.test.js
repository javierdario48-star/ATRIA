import test from 'node:test';
import assert from 'node:assert/strict';
import {createRoomRelayService,createMemoryRoomRelayStore} from './room-relay-service.js';

const spec=(n,roomId='Q')=>({roomId,hostId:'doctor-0',
 members:Array.from({length:n},(_,i)=>'doctor-'+i)});
const item=(roomId,id,kind='chat.command',payload={id,text:'Enfermera ceftriaxona'})=>
 ({protocol:'atria.v5.room.1',roomId,id,kind,payload});
const testkit=async({n=4,maxRetained=512,pageSize=128,maxHistoryIds=10000}={})=>{
 const store=createMemoryRoomRelayStore(),members=spec(n);
 await store.create(members);
 const tokens=new Map(members.members.map(id=>['Bearer token-'+id,{id}]));
 const active=new Set(members.members);
 const service=createRoomRelayService({store,authenticate:header=>tokens.get(header)||null,
  mayAccess:actorId=>active.has(actorId),maxRetained,pageSize:Math.min(pageSize,maxRetained),maxHistoryIds});
 const call=(member,method='GET',body={},after=0,roomId='Q')=>
  service.handle({method,path:'/api/rooms/'+roomId+'/messages',
   query:{after},body,headers:{authorization:'Bearer token-'+member}});
 const send=(member,id,kind='chat.command',payload={id,text:'Enfermera ceftriaxona'})=>
  call(member,'POST',{message:item('Q',id,kind,payload)});
 return {service,call,send,store,tokens,active};
};

test('C21c room-scoped serialized transaction produces gapless strictly monotone 2/3/4 member streams',async()=>{
 for(const n of [2,3,4]){
  const f=await testkit({n});
  const ops=Array.from({length:180},(_,i)=>f.send('doctor-'+(i%n),'op-'+i,
   i%n===0?'room.snapshot':'chat.command',{id:'op-'+i,text:'hola'}));
  const received=await Promise.all(ops);
  assert(received.every(x=>x.status===200));
  assert.deepEqual(received.map(x=>x.body.sequence).sort((a,b)=>a-b),
   Array.from({length:180},(_,i)=>i+1));
  let cursor=0,seen=0;
  while(cursor<180){
   const result=await f.call('doctor-1','GET',{},cursor);
   assert.equal(result.status,200);
   assert(result.body.messages.length<=128);
   for(const packet of result.body.messages){assert.equal(packet.sequence,cursor+1);cursor++;seen++;}
  }
  assert.equal(seen,180);
 }
});

test('C21c missing response after committed write replays stable sequence with no second append',async()=>{
 const f=await testkit();
 const first=await f.send('doctor-1','rx-1');
 const retried=await f.send('doctor-1','rx-1');
 assert.equal(first.status,200);assert.equal(retried.body.replayed,true);
 assert.equal(first.body.sequence,retried.body.sequence);
 assert.equal((await f.call('doctor-0')).body.messages.length,1);
 const collision=await f.send('doctor-1','rx-1','chat.command',{id:'rx-1',text:'metronidazol'});
 assert.equal(collision.status,409);assert.equal(collision.body.error,'relay-message-id-collision');
});

test('C21c rejects forged authoritative packet, other-room access and revoked participants',async()=>{
 const f=await testkit({n:3});
 assert.equal((await f.send('doctor-1','fake','room.snapshot',{room:{revision:100}})).status,403);
 assert.equal((await f.send('doctor-2','fake-ack','chat.ack',{ack:{status:'received'}})).status,403);
 assert.equal((await f.send('doctor-0','invalid-host','chat.command',{text:'fake'})).status,403);
 assert.equal((await f.call('outsider')).status,401);
 assert.equal((await f.call('doctor-1','GET',{},0,'different')).status,404);
 f.active.delete('doctor-1');
 assert.equal((await f.send('doctor-1','late')).status,403);
 assert.equal((await f.call('doctor-1')).status,403);
 assert.equal((await f.send('doctor-2','valid')).status,200);
});

test('C21c pruned history rejects stale cursor rather than pretending that missing clinical actions do not exist',async()=>{
 const f=await testkit({maxRetained:3,pageSize:2});
 for(let i=0;i<7;i++)assert.equal((await f.send('doctor-1','e'+i)).status,200);
 const gap=await f.call('doctor-2');
 assert.deepEqual(gap,{status:409,body:{error:'relay-history-expired',
  cursor:0,firstRetained:5,latest:7}});
 const page=await f.call('doctor-2','GET',{},4);
 assert.deepEqual(page.body.messages.map(x=>x.sequence),[5,6]);
 const last=await f.call('doctor-2','GET',{},6);
 assert.deepEqual(last.body.messages.map(x=>x.sequence),[7]);
 // Old receipt identity remains for safe retry even when record is pruned.
 const replay=await f.send('doctor-1','e0');
 assert.equal(replay.body.replayed,true);assert.equal(replay.body.sequence,1);
});

test('C21c packet size, malformed cursors and identity capacity are explicit errors, never silent drops',async()=>{
 const f=await testkit({maxRetained:2,maxHistoryIds:2});
 assert.equal((await f.call('doctor-0','GET',{},-1)).status,400);
 assert.equal((await f.call('doctor-0','GET',{},4)).status,400);
 assert.equal((await f.send('doctor-1','large','chat.command',{text:'X'.repeat(100000)})).status,413);
 assert.equal((await f.send('doctor-1','bad','chat.command',null)).status,400);
 assert.equal((await f.send('doctor-1','a')).status,200);
 assert.equal((await f.send('doctor-2','b')).status,200);
 const blocked=await f.send('doctor-1','c');
 assert.equal(blocked.status,507);
 assert.equal((await f.send('doctor-1','a')).body.replayed,true);
});

test('C21c host checkpoints are read-only, sender-verified and permission scoped',async()=>{
 const f=await testkit({maxRetained:3,pageSize:2});
 assert.equal((await f.service.handle({method:'GET',path:'/api/rooms/Q/checkpoint',
  headers:{authorization:'Bearer token-doctor-2'}})).status,409);
 const approved=await f.send('doctor-0','state-1','room.snapshot',{
  room:{roomId:'Q',revision:1,patients:[{uid:'P1'}]}});
 assert.equal(approved.status,200);
 const info=await f.service.handle({method:'GET',path:'/api/rooms/Q/checkpoint',
  headers:{authorization:'Bearer token-doctor-2'}});
 assert.equal(info.status,200);
 assert.equal(info.body.checkpoint.userId,'doctor-0');
 assert.equal(info.body.checkpoint.sequence,approved.body.sequence);
 f.active.delete('doctor-2');
 assert.equal((await f.service.handle({method:'GET',path:'/api/rooms/Q/checkpoint',
  headers:{authorization:'Bearer token-doctor-2'}})).status,403);
 assert.equal((await f.service.handle({method:'POST',path:'/api/rooms/Q/checkpoint',
  headers:{authorization:'Bearer token-doctor-0'}})).status,404);
 assert.equal((await f.send('doctor-1','fake','room.snapshot',
  {room:{roomId:'Q',revision:900}})).status,403);
});
