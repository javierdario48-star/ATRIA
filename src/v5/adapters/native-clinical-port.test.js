import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeClinicalPort} from './native-clinical-port.js';

test('native clinical port invokes exactly once and confirms same patient',async()=>{
 let calls=0;
 const p=createNativeClinicalPort({withPatient:(id,fn)=>fn({uid:id}),
  invoke:({patientUid,eventId})=>{calls++;return {status:'executed',patientUid,
   receipt:{eventId,patientUid}};}});
 const e={eventId:'room:doctor:request:0',patientUid:'p',actorId:'doctor',
  intent:{kind:'therapy.request',id:'ceftriaxone'}};
 const a=await p.execute(e),b=await p.execute(e);
 assert.deepEqual(a,b);
 assert.equal(a.status,'executed');
 assert.equal(calls,1);
 assert.deepEqual(p.receipt(e.eventId),a);
});

test('foreign patient context is rejected before any native medication',async()=>{
 let calls=0;
 const p=createNativeClinicalPort({withPatient:(id,fn)=>fn({uid:'other'}),
  invoke:()=>{calls++;return {status:'executed',patientUid:'other'}}});
 await assert.rejects(p.execute({eventId:'1',patientUid:'p',actorId:'a',intent:{kind:'therapy.request'}}),
  /patient context mismatch/);
 assert.equal(calls,0);
});

test('native receipt for wrong patient cannot be reported as success',async()=>{
 const p=createNativeClinicalPort({withPatient:(id,fn)=>fn({uid:id}),
  invoke:()=>({status:'executed',patientUid:'someone-else'})});
 await assert.rejects(p.execute({eventId:'x',patientUid:'p',actorId:'a',intent:{kind:'study.request'}}),
  /receipt patient mismatch/);
});

test('unconfirmed execution stays unconfirmed on retries',async()=>{
 let attempts=0;
 const p=createNativeClinicalPort({withPatient:(id,fn)=>fn({uid:id}),invoke:({patientUid})=>{
  attempts++;return {status:'unconfirmed',patientUid,reason:'native receipt absent'};
 }});
 const request={eventId:'e',patientUid:'p',actorId:'a',intent:{kind:'therapy.request',id:'albumin'}};
 const a=await p.execute(request),b=await p.execute(request);
 assert.equal(a.status,'unconfirmed');
 assert.equal(b.status,'unconfirmed');
 assert.equal(attempts,1);
});


test('never claim administration without the exact native receipt',async()=>{
 const p=createNativeClinicalPort({withPatient:(id,fn)=>fn({uid:id}),
  invoke:({patientUid})=>({status:'executed',patientUid})});
 await assert.rejects(p.execute({eventId:'no-receipt',patientUid:'p',
  actorId:'a',intent:{kind:'therapy.request',id:'ceftriaxone'}}),
  /exact patient\/event receipt/);
});

test('same native event identity cannot authorize a different treatment',async()=>{
 const p=createNativeClinicalPort({withPatient:(id,fn)=>fn({uid:id}),
  invoke:({patientUid,eventId})=>({status:'executed',patientUid,receipt:{patientUid,eventId}})});
 const base={eventId:'one-event',patientUid:'p',actorId:'a',
  intent:{kind:'therapy.request',id:'ceftriaxone'}};
 await p.execute(base);
 await assert.rejects(p.execute({...base,intent:{kind:'therapy.request',id:'albumin'}}),
  /event identity collision/);
});

test('native exception after dispatch is not automatically repeated',async()=>{
 let calls=0;
 const p=createNativeClinicalPort({withPatient:(id,fn)=>fn({uid:id}),invoke:()=>{
  calls++;throw Error('lost response after native mutation');
 }});
 const req={eventId:'lost',patientUid:'p',actorId:'doctor',
  intent:{kind:'therapy.request',id:'ceftriaxone'}};
 assert.equal((await p.execute(req)).status,'unconfirmed');
 assert.equal((await p.execute(req)).status,'unconfirmed');
 assert.equal(calls,1);
});

const pendingRequest={eventId:'pending-1',patientUid:'p',actorId:'doctor',
 intent:{kind:'study.request',id:'hemograma'}};
const finished=(status='executed')=>({eventId:'pending-1',patientUid:'p',status,
 ...(status==='executed'?{receipt:{eventId:'pending-1',patientUid:'p',studyId:'hemograma'}}:
  {reason:'native '+status})});
function pendingPort(){
 let calls=0;
 const port=createNativeClinicalPort({withPatient:(uid,fn)=>fn({uid}),
  invoke:({patientUid})=>{calls++;return {status:'pending',patientUid};}});
 return {port,calls:()=>calls};
}

test('pending native execution completes once and retries read the terminal receipt',async()=>{
 const f=pendingPort(),notifications=[];
 const unsubscribe=f.port.subscribeCompletion(result=>notifications.push(result));
 assert.equal((await f.port.execute(pendingRequest)).status,'pending');
 const result=f.port.complete(finished());
 assert.equal(result.status,'executed');
 assert.deepEqual(await f.port.execute(pendingRequest),result);
 assert.deepEqual(f.port.receipt(pendingRequest.eventId),result);
 assert.deepEqual(f.port.complete(finished()),result);
 assert.deepEqual(f.port.complete({status:'executed',patientUid:'p',eventId:'pending-1',
  receipt:{studyId:'hemograma',patientUid:'p',eventId:'pending-1'}}),result);
 assert.equal(notifications.length,1);
 assert.equal(f.calls(),1);
 unsubscribe();
});

test('rejected and unconfirmed native completions are terminal without another invocation',async()=>{
 for(const status of ['rejected','unconfirmed']){
  const f=pendingPort(),notifications=[];
  f.port.subscribeCompletion(result=>notifications.push(result));
  await f.port.execute(pendingRequest);
  const result=f.port.complete(finished(status));
  assert.equal(result.status,status);
  assert.equal((await f.port.execute(pendingRequest)).status,status);
  assert.deepEqual(f.port.complete(finished(status)),result);
  assert.equal(notifications.length,1);
  assert.equal(f.calls(),1);
 }
});

test('invalid completion identities and receipts cannot change a pending native execution',async()=>{
 const f=pendingPort(),notifications=[];
 f.port.subscribeCompletion(result=>notifications.push(result));
 const pending=await f.port.execute(pendingRequest);
 const invalid=[null,{...finished(),eventId:'unknown'},
  {...finished(),patientUid:'other'}, {...finished(),status:'pending'},
  {...finished(),receipt:null},
  {...finished(),receipt:{eventId:'different',patientUid:'p'}},
  {...finished(),receipt:{eventId:'pending-1',patientUid:'other'}}];
 for(const result of invalid){
  assert.throws(()=>f.port.complete(result),/completion|receipt|patient|pending|event/i);
  assert.deepEqual(f.port.receipt(pendingRequest.eventId),pending);
 }
 assert.equal(notifications.length,0);
 assert.equal(f.port.complete(finished()).status,'executed');
});

test('a stale or conflicting completion cannot replace a completed native effect',async()=>{
 const f=pendingPort();
 await f.port.execute(pendingRequest);
 const done=f.port.complete(finished());
 for(const result of [finished('rejected'),finished('unconfirmed'),
  {...finished(),receipt:{...finished().receipt,studyId:'eco'}}]){
  assert.throws(()=>f.port.complete(result),/completion|collision|terminal/i);
  assert.deepEqual(f.port.receipt(pendingRequest.eventId),done);
 }
});

test('completion requires an originally pending action rather than another executed event',async()=>{
 const port=createNativeClinicalPort({withPatient:(uid,fn)=>fn({uid}),
  invoke:({eventId,patientUid})=>({status:'executed',patientUid,receipt:{eventId,patientUid}})});
 await port.execute(pendingRequest);
 assert.throws(()=>port.complete(finished()),/pending|completion/i);
});

test('native completion subscribers are isolated and unsubscribe without changing the receipt',async()=>{
 const f=pendingPort(),observed=[];
 assert.throws(()=>f.port.subscribeCompletion(null),/callback|subscriber|function/i);
 const stop=f.port.subscribeCompletion(()=>{throw Error('view failed');});
 const stopView=f.port.subscribeCompletion(value=>{observed.push(value);value.receipt.studyId='view mutation';});
 const stopped=[];
 const stopOther=f.port.subscribeCompletion(value=>stopped.push(value));
 stopOther();stopOther();
 await f.port.execute(pendingRequest);
 const result=f.port.complete(finished());
 assert.equal(observed.length,1);
 assert.equal(stopped.length,0);
 assert.equal(result.receipt.studyId,'hemograma');
 assert.equal(f.port.receipt(pendingRequest.eventId).receipt.studyId,'hemograma');
 stop();stopView();
});
