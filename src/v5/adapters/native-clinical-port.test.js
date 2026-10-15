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
