import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createWorld} from '../app/world.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
test('competitive patient records persist separately and reject stale medication targeted to another bed',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-shift-')),store=createSqliteGuardStore(path.join(dir,'shift.sqlite'));
 let now=1700000000000,server=()=>createDurableGuardAuthority({store,content,now:()=>now}),authority=server();
 const call=(actorId,extra={})=>authority.transact({roomId:'ward',actorId,...extra});
 try{
  const opened=await authority.bootstrap({roomId:'ward',caseId:'PERI-PBE-001',members:[{id:'a',name:'A'},{id:'b',name:'B'}],hostId:'a',actorId:'a',mode:'competitive'});
  const rows=opened.clinical.shift.patients;
  assert.equal(rows.length,2);assert.notEqual(rows[0].bedId,rows[1].bedId);
  const target=createWorld(content,{id:'a',name:'A'}).navigation.center(...content.beds.find(b=>b.id===rows[1].bedId).approach);
  await call('b',{motion:[target.x,target.y],motionSequence:1});now+=20000;
  const claimed=await call('b',{claim:rows[1].uid});
  assert.equal(claimed.clinical.patient.uid,rows[1].uid);
  assert.equal(claimed.clinical.competition.ownerId,'b');
  const treated=await call('b',{commands:[{id:'signs-second',text:'/signos'}]});
  assert(treated.clinical.room.transcript.some(x=>x.text==='/signos'));
  const first=await call('a');
  assert.equal(first.clinical.room.transcript.length,0);
  authority=server();
  const restored=await call('b');
  assert.equal(restored.clinical.patient.uid,rows[1].uid);
  assert.equal(restored.clinical.shift.patients.length,2);
  assert.equal(restored.clinical.competition.ownerId,'b');
  const wrong=await call('b',{commands:[{id:'wrong-bed',text:'Enfermera ceftriaxona 1 g',targetPatientUid:rows[0].uid}]});
  assert.equal(wrong.acknowledgements[0].reason,'patient-selection-changed');
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
test('cooperative admits second different native case after three real minutes on one clock',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-shift-')),store=createSqliteGuardStore(path.join(dir,'shift.sqlite'));
 let now=100000;const authority=createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11400});
 try{
  const start=await authority.bootstrap({roomId:'w2',caseId:'CIRR-001',members:[{id:'a',name:'A'},{id:'b',name:'B'}],hostId:'a',actorId:'a'});
  assert.equal(start.clinical.shift.patients.length,1);
  now+=180000;
  const next=await authority.transact({roomId:'w2',actorId:'a'});
  assert.equal(next.recovering,false);
  assert.equal(next.clinical.shift.patients.length,2);
  assert.notEqual(next.clinical.shift.patients[0].bedId,next.clinical.shift.patients[1].bedId);
  assert(Math.abs(next.clinical.shift.elapsedSeconds-180)<.01);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('accepted surgical handoff is reflected in durable reception, vacates the real box and survives a later admission and restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-handoff-'));
 const store=createSqliteGuardStore(path.join(dir,'handoff.sqlite'));
 let now=1700000000000;
 const server=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11400});
 let authority=server();
 const call=extra=>authority.transact({roomId:'handoff',actorId:'a',...extra});
 try{
  const first=await authority.bootstrap({roomId:'handoff',caseId:'APP-001',
   members:[{id:'a',name:'A'},{id:'b',name:'B'}],hostId:'a',actorId:'a'});
  const original=first.clinical.shift.patients[0];
  const nav=createWorld(content,{id:'a',name:'A'}).navigation;
  const at=nav.center(...content.beds.find(b=>b.id===original.bedId).approach);
  await call({motion:[at.x,at.y],motionSequence:1});
  now+=20000;await call();
  for(const text of ['/diagnostico apendicitis aguda','/signos',
    '/examen general','/examen inspection','/examen auscultation',
    '/examen percussion','/examen palpation'])
   await call({commands:[{id:'e'+text,text}]});
  const preparation=['¿Desde cuándo empezó el dolor?','/estudio app_us','Enfermera una vía',
   'Enfermera ceftriaxona 1 g y metronidazol 500 mg'];
  for(const [i,text] of preparation.entries())await call({commands:[{id:'preparation-'+i,text}]});
  now+=95000;await call();await call({commands:[{id:'prepared-reassessment',text:'/reevaluar'}]});
  const request=await call({commands:[{id:'handoff-transfer',text:'/disposicion quirofano'}]});
  assert.equal(request.acknowledgements[0].clinical[0].status,'pending');
  assert.equal(request.clinical.shift.patients[0].closed,false);
  now+=4000;
  const accepted=await call();
  const concluded=accepted.clinical.shift.patients[0];
  assert.equal(concluded.closed,true);
  assert.equal(concluded.departed,true);
  assert.equal(concluded.destination,'quirofano');
  assert.equal(accepted.clinical.shift.outcomes.length,1);
  assert.equal(accepted.claims.length,2,'the cooperative XP receipt is still unique per doctor');
  const snapshot=(await store.read('handoff')).value;
  assert.equal(snapshot.runtime.world.state.patients.find(p=>p.uid===original.uid).departed,true);
  now+=180000;
  const admitted=await call();
  assert.equal(admitted.clinical.shift.patients.length,2);
  const next=admitted.clinical.shift.patients[1];
  assert.equal(next.bedId,original.bedId,'a later patient can occupy the vacated box');
  assert.equal(next.closed,false);
  assert.equal(admitted.clinical.shift.patients[0].departed,true);
  const selected=await call({claim:next.uid});
  assert.equal(selected.clinical.patient.uid,next.uid);
  assert.equal(selected.clinical.shift.outcomes.length,1);
  authority=server();
  const restored=await call();
  assert.equal(restored.clinical.patient.uid,next.uid);
  assert.equal(restored.clinical.shift.patients[0].destination,'quirofano');
  assert.equal(restored.claims.length,2,'reloading cannot award the transfer twice');
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
