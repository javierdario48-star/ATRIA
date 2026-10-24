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
