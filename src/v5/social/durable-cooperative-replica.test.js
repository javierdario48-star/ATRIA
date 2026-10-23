import test from 'node:test';
import assert from 'node:assert/strict';
import {createDurableCooperativeReplica} from './durable-cooperative-replica.js';
const roomId='r123',clientKey='a'.repeat(64);
function harness(){
 const store=new Map(),sent=[],messages=[];
 let revision=0,seq=0,ackedMotion=0,online=true,recovering=false,nextSyncGate=null;
 const state=()=>({epoch:revision,recovering,
  clinical:{room:{roomId},patient:{uid:'P',caseId:'PERI-PBE-001',procedures:{},ecg:{},lastVitalsKnown:{}}},catalog:['studies'],spatial:{nurses:[],doctors:[]},motionReceipts:ackedMotion?[['doctor',ackedMotion]]:[]});
 const window={fetch:async(_url,options)=>{
  const body=JSON.parse(options.body);sent.push(body);
  if(!online)throw Error('offline');
  if(body.action==='start'){return {ok:true,json:async()=>state()};}
  if(body.action==='sync'){
   const gate=nextSyncGate;nextSyncGate=null;if(gate)await gate;
   revision++;if(!recovering&&Number.isSafeInteger(body.motionSequence))ackedMotion=Math.max(ackedMotion,body.motionSequence);const acks=[];
   if(!recovering){
    for(const x of body.commands||[]){
     if(!messages.includes(x.id))messages.push(x.id);
     acks.push({roomId,commandId:x.id,status:'executed'});
    }
   }
   return {ok:true,json:async()=>({...state(),acknowledgements:acks})};
  }
  throw Error('unknown action');
 }};
 const storage={getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)};
 const client=(onSnapshot=()=>{})=>createDurableCooperativeReplica({window,roomId,clientKey,storage,onSnapshot});
 return {client,store,sent,messages,setOnline:x=>online=x,setRecovering:x=>recovering=x,blockNextSync:gate=>nextSyncGate=gate};
}
test('start/sync only use remote authority, no local medical runtime',async()=>{
 const f=harness(),seen=[],client=f.client(x=>seen.push(x.epoch));
 await client.start('PERI-PBE-001');
 assert.equal(client.read().patient.uid,'P');assert.deepEqual(client.catalog(),['studies']);
 assert.equal(client.monitorRead('P').uid,'P');
 const ack=await client.post({id:'cmd1',text:'Enfermera monitor'});
 assert.equal(ack.commandId,'cmd1');assert.deepEqual(f.messages,['cmd1']);
 assert.equal(f.sent[0].action,'start');assert.equal(f.sent[1].action,'sync');
 assert(!('members' in f.sent[0])&&!('actorId' in f.sent[1]));
 assert.deepEqual(seen,[0,1]);
 client.dispose();
});
test('outage retains commands and reload never executes a duplicate',async()=>{
 const f=harness(),a=f.client();f.setOnline(false);
 const unresolved=a.post({id:'cmd2',text:'Enfermera ceftriaxona 1 g'});
 await a.flush().catch(()=>{});
 assert.deepEqual(f.messages,[]);
 assert(f.store.get('atria.v5.durable.pending:'+roomId).includes('cmd2'));
 a.dispose();f.setOnline(true);
 const b=f.client();await b.sync();assert.deepEqual(f.messages,['cmd2']);
 await b.sync();assert.deepEqual(f.messages,['cmd2']);
 assert.deepEqual(JSON.parse(f.store.get('atria.v5.durable.pending:'+roomId)),[]);
 b.dispose();void unresolved;
});
test('catch-up does not discard pending commands, motion or confirmation',async()=>{
 const f=harness(),c=f.client();f.setRecovering(true);
 c.motion([33,44]);c.confirm(2,'closed-1');
 const waiting=c.post({id:'cmd3',text:'Hola'});
 await c.flush();
 assert.equal(f.messages.length,0);
 f.setRecovering(false);await c.sync();
 assert.equal((await waiting).commandId,'cmd3');
 assert.deepEqual(f.messages,['cmd3']);
 assert.deepEqual(f.sent.filter(x=>x.action==='sync').map(x=>x.motion),[[33,44],[33,44]]);
 c.dispose();
});
test('invalid credentials rejected before a clinical request',()=>{
 assert.throws(()=>createDurableCooperativeReplica({window:{},roomId:'../wrong',clientKey}),/invalid/);
});

test('a patient utterance arriving during a server read flushes immediately after it, without duplicate writes',async()=>{
 const f=harness(),client=f.client();let release;
 const gate=new Promise(resolve=>release=resolve);f.blockNextSync(gate);
 const inflight=client.sync();
 const speaking=client.post({id:'speech-during-sync',text:'¿Desde cuándo le duele?'});
 assert.equal(f.sent.filter(x=>x.action==='sync').length,1,'only one request is in flight');
 release();await inflight;const receipt=await speaking;
 assert.equal(receipt.commandId,'speech-during-sync');
 const requests=f.sent.filter(x=>x.action==='sync');
 assert.equal(requests.length,2,'speech does not wait for the 900ms idle poll');
 assert.deepEqual(requests[0].commands,[]);
 assert.deepEqual(requests[1].commands.map(x=>x.id),['speech-during-sync']);
 assert.deepEqual(f.messages,['speech-during-sync']);
 client.dispose();
});

test('movement sequences are monotonic while old HTTP requests are delayed',async()=>{
 const f=harness(),client=f.client();
 assert.equal(client.motion([11,22],4),true);
 let release;f.blockNextSync(new Promise(resolve=>release=resolve));
 const first=client.sync();
 assert.equal(f.sent.at(-1).motionSequence,4);
 assert.equal(client.motion([11,22],3),false,'old input cannot replace newest intent');
 assert.equal(client.motion([33,44],5),true);
 release();await first;
 assert.equal(client.lastAcknowledgedMotion('doctor'),4);
 await client.sync();
 assert.equal(client.lastAcknowledgedMotion('doctor'),5);
 assert.deepEqual(f.sent.filter(x=>x.action==='sync').map(x=>x.motionSequence),[4,5]);
 assert.equal(client.motion([1,2],4),false);
 client.dispose();
});
