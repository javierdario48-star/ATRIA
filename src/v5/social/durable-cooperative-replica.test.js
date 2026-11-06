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

test('every authenticated replica request carries the physician captured before a cookie change',async()=>{
 const sent=[],client=createDurableCooperativeReplica({roomId,clientKey,actorId:'doctor-a',window:{fetch:async(_url,options)=>{
  const body=JSON.parse(options.body);sent.push(body);
  return {ok:true,json:async()=>({epoch:1,clinical:{room:{roomId},patient:{uid:'P'}},
   ...(body.shiftRequest?{shiftRequestId:body.shiftRequest.requestId,
    shiftAcknowledgement:{requestId:body.shiftRequest.requestId,status:'accepted'}}:{})})};
 }}});
 await client.start('FECAL-001');await client.sync();await client.observe();
 await client.shift({op:'leave',turnId:'turn',requestId:'leave-1'});client.dispose();
 assert(sent.some(row=>row.shiftRequest));assert(sent.every(row=>row.expectedActorId==='doctor-a'));
});

for(const phase of ['headers','body'])test('a stall before the HTTP '+phase+' releases the lane and retains the original order',async()=>{
 const f=harness(), sent=[], errors=[];
 const storage={getItem:k=>f.store.get(k),setItem:(k,v)=>f.store.set(k,v)};
 const client=createDurableCooperativeReplica({roomId,clientKey,storage,requestTimeoutMs:25,
  window:{fetch:async(_url,options)=>{
   const request=JSON.parse(options.body);sent.push(request);
   const wait=()=>new Promise((_,reject)=>options.signal.addEventListener('abort',()=>reject(options.signal.reason),{once:true}));
   if(sent.length===1&&phase==='headers')await wait();
   if(sent.length===1&&phase==='body')return {ok:true,json:wait};
   return {ok:true,json:async()=>({epoch:1,clinical:{room:{roomId},patient:{uid:'P'}},
    acknowledgements:[{commandId:'stalled-order',status:'received'}]})};
  }},onError:e=>errors.push(e)});
 const order={id:'stalled-order',text:'Enfermera ceftriaxona 1 g',targetPatientUid:'P'};
 const posted=client.post(order);
 assert.deepEqual(client.pendingCommands(),[order]);
 const hold=setTimeout(()=>{},100);
 try{await assert.rejects(client.flush(),{name:'TimeoutError'});}finally{clearTimeout(hold);}
 assert.equal(errors.length,1);
 await client.sync();assert.equal((await posted).commandId,order.id);
 assert.deepEqual(sent.map(x=>x.commands),[[order],[order]]);
 assert.deepEqual(client.pendingCommands(),[]);
 client.dispose();
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

test('a delayed receipt lookup cannot replace confirmed XP for this encounter',async()=>{
 const closed={actorId:'doctor',eventId:'close-1',patientUid:'p',xp:140,creditStatus:'credited'};
 const settled={patientUid:'p',closed:true,xp:140,creditStatus:'credited'};
 const frames=[
  {caseReward:closed,shift:{outcomes:[settled]}},
  {caseReward:{...closed,xp:93,creditStatus:'pending'},shift:{outcomes:[{...settled,xp:0,creditStatus:'pending'}]}},
  {caseReward:{...closed,eventId:'new',patientUid:'q',xp:45,creditStatus:'pending'},shift:{outcomes:[settled]}}
 ];
 let epoch=0;
 const replica=createDurableCooperativeReplica({roomId,clientKey,window:{fetch:async()=>({ok:true,json:async()=>({
  epoch:epoch+1,clinical:{room:{roomId,revision:6},...frames[epoch++]}
 })})}});
 try{
  await replica.sync();await replica.sync();
  assert.deepEqual(replica.read().caseReward,closed);
  assert.deepEqual(replica.read().shift.outcomes,[settled]);
  await replica.sync();assert.equal(replica.read().caseReward.creditStatus,'pending');
 }finally{replica.dispose();}
});

test('a confirmed death debit survives a later failed lookup only for its exact account receipt',async()=>{
 const credited={actorId:'doctor',patientUid:'p',eventId:'death-p',creditStatus:'credited',loss:15};
 for(const change of [{},{actorId:'another-doctor'},{patientUid:'q'},{eventId:'another-death'}]){
  const pending={...credited,...change,creditStatus:'pending',loss:null},frames=[credited,pending];let epoch=0;
  const replica=createDurableCooperativeReplica({roomId,clientKey,window:{fetch:async()=>({ok:true,json:async()=>({
   epoch:++epoch,clinical:{room:{roomId,revision:7},patient:{uid:frames[epoch-1].patientUid,patientDied:true},deathReward:frames[epoch-1]}
  })})}});
  try{
   await replica.sync();await replica.sync();
   assert.deepEqual(replica.read().deathReward,Object.keys(change).length?pending:credited);
  }finally{replica.dispose();}
 }
});

const settle=()=>new Promise(resolve=>setImmediate(resolve));
function patientFrame(epoch,uid='A',confirmed='A',mode='coop',extra={}){
 return {epoch,clinical:{room:{roomId,revision:epoch},patient:{uid,caseId:'PERI-PBE-001',procedures:{},ecg:{},lastVitalsKnown:{},label:uid+'-'+epoch},
  hintBinding:{roomId,patientUid:uid,selectionRevision:epoch},
  shift:{mode,confirmedFocusPatientUid:confirmed,focusPatientUid:uid,patients:[{uid:'A',ownerId:null},{uid:'B',ownerId:null}],outcomes:[]},
  ...(mode==='competitive'?{competition:{mode,ownerId:confirmed?'doctor':null}}:{})},catalog:[uid+'-catalog'],
  spatial:{doctors:[],nurses:[]},...extra};
}
function observationHarness(options={}){
 const requests=[],data=new Map(),snapshots=[],commits=[],errors=[],storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const window={fetch:async(_url,options)=>new Promise(resolve=>requests.push({body:JSON.parse(options.body),signal:options.signal,
  reply(body,status=200){resolve({ok:status<400,status,json:async()=>body});}}))};
 const make=()=>createDurableCooperativeReplica({window,roomId,clientKey,storage,
  onSnapshot:x=>snapshots.push(x),onCommitted:x=>commits.push(x),onError:x=>errors.push(x),...options});
 const seed=async(client,mode='coop')=>{const started=client.start('PERI-PBE-001');requests.at(-1).reply(patientFrame(0,'A','A',mode));await started;};
 return {requests,data,snapshots,commits,errors,make,seed};
}

test('a commit event observes fresh authoritative activity while an older mutation response is held',async()=>{
 const f=observationHarness(),client=f.make();await f.seed(client);
 try{
  const posted=client.post({id:'held-order',text:'Hola',targetPatientUid:'A'}),mutation=f.requests.at(-1);
  assert.equal(typeof client.invalidate,'function','a committed event needs an independent read-only observation lane');
  const observed=client.invalidate(2),read=f.requests.at(-1);
  assert.equal(read.body.action,'observe');assert.notEqual(read,mutation);
  assert(!('commands' in read.body)&&!('claim' in read.body)&&!('hintRequest' in read.body));
  read.reply(patientFrame(2,'A','A','coop',{readOnly:true}));await observed;
  assert.equal(client.read().patient.label,'A-2');
  mutation.reply(patientFrame(1,'A','A','coop',{commitNotice:true,acknowledgements:[{commandId:'held-order',status:'received'}]}));
  assert.equal((await posted).status,'received');await client.flush();
  assert.equal(client.read().patient.label,'A-2','the older mutation settles its receipt without replacing the newer view');
  assert.deepEqual(client.pendingCommands(),[]);assert.deepEqual(f.commits,[1]);
 }finally{client.dispose();}
});

test('advisory epoch spam coalesces and cannot poison the next real commit wakeup',async()=>{
 const f=observationHarness(),client=f.make();await f.seed(client);
 try{
  assert.equal(typeof client.invalidate,'function');
  const first=client.invalidate(Number.MAX_SAFE_INTEGER);
  for(let i=0;i<25;i++)client.invalidate(Number.MAX_SAFE_INTEGER-i).catch(()=>{});
  assert.equal(f.requests.filter(x=>x.body.action==='observe').length,1);
  f.requests.at(-1).reply(patientFrame(1,'A','A','coop',{readOnly:true}));await first;await settle();
  const followup=f.requests.filter(x=>x.body.action==='observe').at(-1);
  if(followup!==f.requests[1])followup.reply(patientFrame(1,'A','A','coop',{readOnly:true}));
  await client.flush();assert.equal(client.read().patient.label,'A-1');
  assert(f.requests.filter(x=>x.body.action==='observe').length<=2,'a burst causes at most one coalesced follow-up read');
  const actual=client.invalidate(2);assert.equal(f.requests.at(-1).body.action,'observe');
  f.requests.at(-1).reply(patientFrame(2,'A','A','coop',{readOnly:true}));await actual;
  const count=f.requests.length;await client.invalidate(1);await client.invalidate(-1);await client.invalidate(Infinity);
  assert.equal(f.requests.length,count);assert.equal(client.read().patient.label,'A-2');
 }finally{client.dispose();}
});

test('quick cooperative A/B selection keeps the exact desired patient through cached and late views',async()=>{
 const f=observationHarness(),client=f.make();await f.seed(client);
 try{
  client.claim('B');
  const firstRead=f.requests.find(x=>x.body.action==='observe'),mutation=f.requests.find(x=>x.body.action==='sync');
  assert(firstRead,'selection must observe independently of its pending clinical claim');
  assert.equal(firstRead.body.targetPatientUid,'B');
  firstRead.reply(patientFrame(0,'B','A','coop',{readOnly:true}));await settle();
  assert.equal(client.read().patient.uid,'B');assert.equal(client.read().shift.confirmedFocusPatientUid,'A');
  client.claim('A');const stale=f.requests.at(-1);assert.equal(client.read().patient.uid,'A','a prior confirmed patient is immediately available from its cache');
  client.claim('B');const latest=f.requests.at(-1);
  assert.equal(client.read().patient.uid,'B');assert.deepEqual(client.catalog(),['B-catalog']);
  assert.equal(stale.signal.aborted,true,'a stale projection cannot hold the newly selected patient');
  const posted=client.post({id:'bound-to-b',text:'¿Desde cuándo?'});
  assert.equal(client.pendingCommands()[0].targetPatientUid,'B');
  latest.reply(patientFrame(2,'B','B','coop',{readOnly:true}));await settle();
  stale.reply(patientFrame(3,'A','A','coop',{readOnly:true}));await settle();
  assert.equal(client.read().patient.uid,'B');
  mutation.reply(patientFrame(1,'B','B'));await settle();
  const command=f.requests.filter(x=>x.body.action==='sync').at(-1);
  assert.equal(command.body.commands[0].targetPatientUid,'B');
  command.reply(patientFrame(3,'B','B','coop',{acknowledgements:[{commandId:'bound-to-b',status:'received'}]}));
  await posted;assert.equal(client.read().patient.uid,'B');
 }finally{client.dispose();}
});

test('competitive selection waits for the authoritative claim instead of projecting a cached patient',async()=>{
 const f=observationHarness(),client=f.make();await f.seed(client,'competitive');
 try{
  client.claim('B');assert.equal(client.read().patient.uid,'A');
  const read=f.requests.find(x=>x.body.action==='observe');assert(read);
  read.reply(patientFrame(0,'A','A','competitive',{readOnly:true}));await settle();
  assert.equal(client.read().patient.uid,'A');
  f.requests.find(x=>x.body.action==='sync').reply(patientFrame(1,'A','A','competitive'));await client.flush();
  assert.equal(client.read().patient.uid,'A');
 }finally{client.dispose();}
});

test('shift controls survive reconnect with the original idempotent request and resolve only from its receipt',async()=>{
 const f=observationHarness(),first=f.make(),control={op:'continue',requestId:'continue-turn-1',turnId:roomId+':turn-1'};
 assert.equal(typeof first.shift,'function','continuation decisions need the durable serialized command lane');
 const pending=first.shift(control);assert.deepEqual(f.requests.at(-1).body.shiftRequest,control);
 first.dispose();assert.equal((await pending).reason,'replica-disposed');
 const second=f.make();
 try{
  const sync=second.sync(),request=f.requests.at(-1);assert.deepEqual(request.body.shiftRequest,control);
  request.reply(patientFrame(1,'A','A','coop',{shiftRequestId:control.requestId,
   shiftAcknowledgement:{...control,status:'accepted',nextTurnId:roomId+':turn-2'}}));await sync;
  const again=second.sync();assert(!('shiftRequest' in f.requests.at(-1).body));
  f.requests.at(-1).reply(patientFrame(2));await again;
  assert.deepEqual(JSON.parse(f.data.get('atria.v5.durable.pending:'+roomId+':shift-controls')),[]);
 }finally{second.dispose();}
});

test('leaving waits until every previously queued command fits a confirmed batch',async()=>{
 const f=observationHarness(),client=f.make();await f.seed(client);
 const first=client.sync(),held=f.requests.at(-1),posts=[];
 try{
  for(let n=0;n<18;n++)posts.push(client.post({id:'save-order-'+n,text:'Hola',targetPatientUid:'A'}));
  const control={op:'leave',turnId:roomId+':turn-1',requestId:'save-after-orders'},leaving=client.shift(control);
  held.reply(patientFrame(1));await first;await settle();
  const batch=f.requests.at(-1);
  assert.equal(batch.body.commands.length,16);assert(!batch.body.shiftRequest,'cannot leave with unsent prior commands');
  batch.reply(patientFrame(2,'A','A','coop',{acknowledgements:batch.body.commands.map(c=>({commandId:c.id,status:'received'}))}));
  await client.flush();
  const lastSync=client.sync(),last=f.requests.at(-1);
  assert.equal(last.body.commands.length,2);assert.deepEqual(last.body.shiftRequest,control);
  last.reply(patientFrame(3,'A','A','coop',{acknowledgements:last.body.commands.map(c=>({commandId:c.id,status:'received'})),
   shiftRequestId:control.requestId,shiftAcknowledgement:{...control,status:'accepted'}}));
  await lastSync;await Promise.all(posts);assert.equal((await leaving).status,'accepted');
  assert.deepEqual(client.pendingCommands(),[]);
 }finally{client.dispose();}
});

test('unchanged typing and a repeated closure confirmation do not become new idle effects',async()=>{
 const f=observationHarness(),client=f.make();await f.seed(client);
 const sync=async()=>{const promise=client.sync(),request=f.requests.at(-1);request.reply(patientFrame(f.requests.length,'A','A','coop',{confirmationAccepted:true}));await promise;return request.body;};
 try{
  client.setTyping(false);assert.equal((await sync()).typing,false);
  client.setTyping(false);client.confirm(4,'closure-one');const confirmed=await sync();
  assert(!('typing' in confirmed));assert.deepEqual(confirmed.confirmation,{revision:4,outcomeId:'closure-one'});
  client.setTyping(false);client.confirm(4,'closure-one');const idle=await sync();
  assert(!('typing' in idle));assert(!('confirmation' in idle));
  client.setTyping(true);assert.equal((await sync()).typing,true);
 }finally{client.dispose();}
});

test('only an explicit committed mutation notice publishes a wakeup',async()=>{
 const f=observationHarness(),client=f.make();await f.seed(client);
 try{
  const idle=client.sync();f.requests.at(-1).reply(patientFrame(1));await idle;
  assert.deepEqual(f.commits,[]);
  assert.equal(typeof client.invalidate,'function');
  const observed=client.invalidate(2);f.requests.at(-1).reply(patientFrame(2,'A','A','coop',{readOnly:true,commitNotice:true}));await observed;
  assert.deepEqual(f.commits,[],'an observation cannot rebroadcast itself');
  const changed=client.sync();f.requests.at(-1).reply(patientFrame(3,'A','A','coop',{commitNotice:true}));await changed;
  assert.deepEqual(f.commits,[3]);
 }finally{client.dispose();}
});
