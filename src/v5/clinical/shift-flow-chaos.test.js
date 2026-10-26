import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createShiftFlow,receptionAcuity,SHIFT_DURATION_SECONDS} from './shift-flow.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:load('cases'),beds:load('beds')};
const cases=Object.keys(CLINICAL_EXECUTORS);
const modes=['apprentice','solo','coop','competitive'];
const schedules=['intelligent','chaotic','abandoned'];
const reports=[];
for(const mode of modes)for(const caseId of cases)for(const strategy of schedules){
 test('24-hour guard '+mode+' '+caseId+' '+strategy+' - arrivals, triage, bed ownership and durable resume',()=>{
  const roomId=['matrix',mode,caseId,strategy].join(':');
  let shift=createShiftFlow({content,mode,firstCaseId:caseId,roomId});
  const opening=shift.advance(0);
  assert.equal(opening.length,mode==='competitive'?2:1);
  assert.equal(shift.elapsed(),0);
  const first=opening[0];
  assert.equal(first.caseId,caseId);
  assert(first.bedId);
  assert.equal(new Set(opening.map(x=>x.bedId)).size,opening.length);
  if(strategy==='intelligent'){
   assert(shift.owner(first.uid,'doctor-A'));
   assert(!shift.owner(first.uid,'doctor-B'));
   assert(shift.close(first.uid,'doctor-A','sala'));
   assert(!shift.close(first.uid,'doctor-A','sala'),'closure must be exactly once');
   assert.equal(shift.record(first.uid).destination,'sala');
   assert(shift.record(first.uid).departed);
  }else if(strategy==='chaotic'){
   assert(!shift.close('fake-patient','doctor-B','alta'));
   assert(!shift.owner('fake-patient','doctor-A'));
   assert(shift.owner(first.uid,'doctor-B'));
   assert(!shift.owner(first.uid,'doctor-A'));
  }
  // Every mode uses one continuous 24-minute shift clock, never a per-case
  // restart. Check a checkpoint immediately before and after every admission.
  const due=mode==='competitive'?[180,420,720,1020]:[180,420,720,1020,1260];
  // index 1 is admitted immediately in competitive; next index is due at 180.
  let last=0;
  for(const time of due){
   if(time-1>last){
    const pre=shift.advance(time-1-last);
    assert.equal(pre.length,0,'no early patient before '+time);
    last=time-1;
   }
   const arrived=shift.advance(1);last=time;
   assert.equal(arrived.length,1,'one new arrival at '+time);
   const ids=shift.records().map(x=>x.uid);
   assert.equal(new Set(ids).size,ids.length);
   assert.equal(new Set(shift.records().filter(x=>!x.departed).map(x=>x.bedId)).size,
    shift.records().filter(x=>!x.departed).length,'two active cases cannot share a box');
   const prior=shift.checkpoint();
   shift=createShiftFlow({content,mode,firstCaseId:caseId,roomId,snapshot:prior});
   assert.deepEqual(shift.checkpoint(),prior,'restart must preserve admissions, closure and ownership');
  }
  const remaining=SHIFT_DURATION_SECONDS-last;
  assert.equal(shift.advance(remaining).length,0);
  assert(shift.ended());assert.equal(shift.remaining(),0);
  assert.equal(shift.advance(100).length,0,'ended guards must not admit new patients');
  assert.equal(shift.records().length,6);
  for(const p of shift.records()){
   const diagnosis=content.cases.find(c=>c.id===p.caseId);
   assert(diagnosis&&Object.hasOwn(CLINICAL_EXECUTORS,p.caseId));
   const acuity=receptionAcuity({caseData:diagnosis,waitingSeconds:200});
   assert(['critical','urgent','warning','stable','unknown'].includes(acuity.state));
  }
  const restored=createShiftFlow({content,mode,firstCaseId:caseId,roomId,snapshot:shift.checkpoint()});
  assert(restored.ended());assert.equal(restored.records().length,6);
  if(strategy==='intelligent')assert.equal(restored.record(first.uid).destination,'sala');
  if(strategy==='chaotic')assert.equal(restored.record(first.uid).ownerId,'doctor-B');
  reports.push({mode,caseId,strategy,admitted:shift.records().length,ended:true});
 });
}
test('all 156 cross-mode continuous-guard matrix scenarios are executed',()=>{
 assert.equal(cases.length,13);assert.equal(reports.length,156);
 assert.equal(new Set(reports.map(x=>x.mode)).size,4);
 console.log('ATRIA_SHIFT_84_BOT_MATRIX='+JSON.stringify({
  scenarios:reports.length,modeCounts:Object.fromEntries(modes.map(m=>[m,reports.filter(x=>x.mode===m).length])),
  strategies:schedules,caseIds:cases,allDurable:true}));
});
