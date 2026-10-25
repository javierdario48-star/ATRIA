import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createWorld} from '../app/world.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')};
const cases=Object.keys(CLINICAL_EXECUTORS),rosterSizes=[2,3,4],modes=['coop','competitive'];
const reports=[];
for(const mode of modes)for(const count of rosterSizes)for(const caseId of cases){
 test('spatial/chat/replay bot '+mode+' '+count+' doctors '+caseId,async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-spatial-matrix-'));
  const store=createSqliteGuardStore(path.join(dir,'clinical.sqlite'));
  let now=1700000000000,serial=0;
  const roomId=['clinical-routing',mode,count,caseId].join(':');
  const members=Array.from({length:count},(_,i)=>({id:String.fromCharCode(97+i),name:'QA '+i}));
  const server=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11400});
  let authority=server();
  const call=(actorId,extra={})=>authority.transact({roomId,actorId,...extra});
  const cmd=(actorId,text,targetPatientUid=null,id=null)=>call(actorId,{commands:[{
   id:id||'matrix-'+(++serial),text,...(targetPatientUid?{targetPatientUid}:{})}]});
  try{
   const started=await authority.bootstrap({roomId,caseId,members,hostId:'a',actorId:'a',mode});
   const [first,second]=started.clinical.shift.patients;
   assert(first&&(!second||mode==='competitive'));
   assert.equal(started.clinical.shift.confirmedFocusPatientUid,null,
    'default patient is not an authenticated bedside claim');
   const distant=await call('b',{claim:first.uid});
   assert.equal(distant.clinical.shift.confirmedFocusPatientUid,null,
    'a claim from another ward must not change clinical focus');
   assert.equal(distant.clinical.shift.patients[0].ownerId,null);
   const nav=createWorld(content,{id:'a',name:'QA'}).navigation;
   const destination=nav.center(...content.beds.find(b=>b.id===first.bedId).approach);
   await call('b',{motion:[destination.x,destination.y],motionSequence:1});
   now+=20000;
   const near=await call('b',{claim:first.uid});
   assert.equal(near.clinical.shift.confirmedFocusPatientUid,first.uid);
   assert.equal(near.clinical.patient.uid,first.uid);
   assert.equal(near.clinical.shift.patients[0].ownerId,mode==='competitive'?'b':null);
   // Genuine conversational engine, not an optimistic bubble or a queued
   // client-only render. Clinical transcript has a patient turn.
   const messageId='first-interview';
   const answered=await cmd('b','Hola ¿Qué te pasó?',first.uid,messageId);
   assert.equal(answered.acknowledgements[0].status,'received');
   assert(answered.clinical.room.transcript.some(x=>x.id===messageId&&x.patientUid===first.uid));
   assert(answered.clinical.messages.some(x=>x.role==='patient'),
    'the real patient dialogue engine must reply');
   const duplicate=await cmd('b','Hola ¿Qué te pasó?',first.uid,messageId);
   assert.equal(duplicate.clinical.room.transcript.filter(x=>x.id===messageId).length,1,
    'resending the same command id must not repeat anamnesis');
   assert.equal(duplicate.claims.length,0,'conversation never creates XP');
   // A doctor must not mutate this bed merely by remaining in the corridor.
   const far=await cmd('a','/signos',first.uid);
   assert.equal(far.acknowledgements[0].status==='received'&&
    far.acknowledgements[0].clinical?.some(x=>x.status==='executed'),false,
    'out-of-range doctor cannot execute an examination');
   if(mode==='competitive'){
    const rival=await call('a',{claim:first.uid});
    assert.equal(rival.clinical.shift.patients[0].ownerId,'b');
    assert.equal(rival.clinical.shift.confirmedFocusPatientUid,null);
    const explicitOther=await cmd('b','/signos',second.uid);
    assert.equal(explicitOther.acknowledgements[0].reason,'patient-selection-changed');
    assert.equal(explicitOther.claims.length,0);
   }
   authority=server();
   const resumed=await call('b');
   assert.equal(resumed.clinical.shift.confirmedFocusPatientUid,first.uid);
   assert(resumed.clinical.room.transcript.some(x=>x.id===messageId));
   assert.equal(resumed.claims.length,0);
   assert(resumed.clinical.shift.patients.length>=1);
   reports.push({mode,count,caseId,owned:mode==='competitive',recovery:true});
  }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
 });
}
test('42 multiplayer routing combinations cover all native cases',()=>{
 assert.equal(cases.length,7);assert.equal(reports.length,42);
 console.log('ATRIA_ROUTING_42_BOT_MATRIX='+JSON.stringify({
  scenarios:reports.length,caseIds:cases,
  modeCounts:Object.fromEntries(modes.map(m=>[m,reports.filter(x=>x.mode===m).length])),
  doctorCounts:rosterSizes}));
});
