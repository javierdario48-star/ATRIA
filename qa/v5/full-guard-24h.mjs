// Long-horizon server-only bots: 24 REAL minutes are advanced deterministically,
// equaling a continuous 24-hour guard with the original native case physiology.
// No clock mocking inside V5, no new clinical engine, no direct state writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from './sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from '../../src/v5/server/durable-guard-authority.js';
import {CLINICAL_EXECUTORS} from '../../src/v5/content/clinical-cases.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../../src/v5/content/'+n+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')};
const report=[];
for(const [mode,caseId] of [['coop','CIRR-001'],['competitive','APP-001']]){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-full-24h-'));
 const store=createSqliteGuardStore(path.join(dir,'clinical.sqlite'));
 let now=1700000000000,authority;
 const roomId='full-day-'+mode,members=[{id:'a',name:'One'},{id:'b',name:'Two'},{id:'c',name:'Three'}];
 const make=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:6000});
 authority=make();
 const call=(actorId,extra={})=>authority.transact({roomId,actorId,...extra});
 try{
  const start=await authority.bootstrap({roomId,caseId,members,hostId:'a',actorId:'a',mode});
  const first=start.clinical.shift.patients[0];
  const expectedDue=mode==='competitive'?[0,0,180,420,720,1020]:[0,180,420,720,1020,1260];
  let count=start.clinical.shift.patients.length;
  assert.equal(count,mode==='competitive'?2:1);
  const timings=[];
  for(let minute=1;minute<=24;minute++){
   now+=60_000;
   // Restart clinical authority every fourth hour. The same SQLite CAS
   // checkpoint must restore medical and nurse state without new admissions.
   if(minute%4===0)authority=make();
   const state=(await call(minute%2?'a':'b')).clinical;
   const seconds=minute*60;
   const should=expectedDue.filter(time=>time<=seconds).length;
   count=state.shift.patients.length;
   assert.equal(count,should,mode+' unexpected admission count at '+minute+' hours');
   assert(Math.abs(state.shift.elapsedSeconds-Math.min(1440,seconds))<0.15,
    'guard clock drift at hour '+minute+': '+state.shift.elapsedSeconds);
   assert.equal(new Set(state.shift.patients.map(p=>p.uid)).size,count);
   assert.equal(new Set(state.shift.patients.filter(p=>!p.departed).map(p=>p.bedId)).size,
    state.shift.patients.filter(p=>!p.departed).length);
   for(const record of state.shift.patients){
    assert(Object.hasOwn(CLINICAL_EXECUTORS,record.caseId));
    assert(['stable','warning','urgent','critical','unknown'].includes(record.triage.state),
     'invalid triage for '+record.uid);
   }
   assert.equal(state.shift.ended,minute===24);
   assert.equal(state.shift.remainingSeconds,1440-Math.min(1440,seconds));
   timings.push({hour:minute,patients:count,critical:state.shift.patients.filter(p=>p.triage.state==='critical').length});
  }
  const ended=await call('a');
  assert.equal(ended.clinical.shift.patients.length,6);
  assert(ended.clinical.shift.ended);
  assert.equal(ended.claims.length,0,'untreated guard cannot award made-up XP');
  const late=await call('a',{commands:[{id:'after-end',text:'Enfermera ceftriaxona 1 g'}]});
  assert.equal(late.acknowledgements[0].reason,'shift-ended');
  assert.equal(late.claims.length,0);
  authority=make();
  const restored=await call('b');
  assert.equal(restored.clinical.shift.patients.length,6);
  assert.equal(restored.clinical.shift.elapsedSeconds,1440);
  assert(restored.clinical.shift.ended);
  assert.equal(restored.claims.length,0);
  report.push({mode,caseId,doctors:3,simulatedHours:24,realMinutes:24,
   admissions:6,unchangedXP:true,restore:true,hourly:timings});
  console.log('ATRIA_REAL_24H_GUARD_PASS '+JSON.stringify(report.at(-1)));
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
}
assert.equal(report.length,2);
