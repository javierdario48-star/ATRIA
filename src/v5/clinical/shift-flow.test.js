import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createShiftFlow,receptionAcuity} from './shift-flow.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={cases:load('cases'),beds:load('beds')};
test('24 minute shift has spaced arrivals and uniquely assigned beds',()=>{
 const s=createShiftFlow({content,mode:'coop',firstCaseId:'CIRR-001',roomId:'r'});
 assert.equal(s.advance(0).length,1);assert.equal(s.advance(179).length,0);
 assert.equal(s.advance(1).length,1);assert.equal(s.advance(1260).length,4);
 assert.equal(s.elapsed(),1440);assert(s.ended());assert.equal(new Set(s.records().map(p=>p.bedId)).size,6);
});
test('solo and apprentice keep six independent admissions across exactly 24 minutes',()=>{
 for(const mode of ['solo','apprentice']){
  const roomId='local-'+mode;
  const shift=createShiftFlow({content,mode,firstCaseId:'CIRR-001',roomId});
  const first=shift.advance(0);
  assert.equal(first.length,1);
  assert.equal(shift.advance(179).length,0,'no premature second admission');
  const second=shift.advance(1);
  assert.equal(second.length,1);
  assert.notEqual(first[0].uid,second[0].uid);
  assert.notEqual(first[0].bedId,second[0].bedId);
  assert.equal(shift.advance(1260).length,4);
  assert.equal(shift.elapsed(),1440);
  assert.equal(shift.remaining(),0);
  assert(shift.ended());
  assert.equal(new Set(shift.records().map(r=>r.uid)).size,6);
  assert.equal(new Set(shift.records().map(r=>r.bedId)).size,6);
  assert.equal(shift.advance(60).length,0,'no arrivals after the shift ends');
  const restored=createShiftFlow({content,mode,firstCaseId:'CIRR-001',roomId,snapshot:shift.checkpoint()});
  assert.equal(restored.records().length,6);
  assert.equal(restored.advance(1).length,0);
  assert(restored.ended());
 }
});

test('competitive begins with two patients on different sides; restores ownership',()=>{
 const s=createShiftFlow({content,mode:'competitive',firstCaseId:'CIRR-001',roomId:'r'});
 const a=s.advance(0);assert.equal(a.length,2);assert.notEqual(a[0].bedId,a[1].bedId);
 assert(content.beds.find(b=>b.id===a[1].bedId).patient[0]>600);
 assert(s.owner(a[0].uid,'doctor-a'));assert.equal(s.owner(a[0].uid,'doctor-b'),false);
 const r=createShiftFlow({content,mode:'competitive',firstCaseId:'CIRR-001',roomId:'r',snapshot:s.checkpoint()});
 assert.equal(r.records()[0].ownerId,'doctor-a');assert.equal(r.advance(180).length,1);
});
test('reception uses baseline facts without fabricating monitoring',()=>{
 assert.equal(receptionAcuity({caseData:{vitals:{bp:'120/80',hr:78,spo2:98,rr:16,temp:36.8}}}).state,'stable');
 assert.equal(receptionAcuity({caseData:{risk:'peritonitis',vitals:{bp:'105/60',hr:100,spo2:96,rr:21}}}).state,'urgent');
 assert.equal(receptionAcuity({caseData:{vitals:{bp:'76/45',hr:145,spo2:88,rr:35}}}).state,'critical');
});

test('reception derives changes from patient measurements and never fabricates delay vitals',()=>{
 const c={risk:'peritonitis',vitals:{bp:'110/70',hr:110,spo2:96,rr:19,temp:37}};
 assert.equal(receptionAcuity({caseData:c,waitingSeconds:999}).state,'urgent');
 const monitored={lastVitalsKnown:{vitals:{sys:121,dia:75,hr:80,spo2:98,rr:16,temp:37}}};
 assert.equal(receptionAcuity({caseData:c,patient:monitored}).state,'stable');
 monitored.lastVitalsKnown.vitals.hr=123;
 assert.equal(receptionAcuity({caseData:c,patient:monitored}).state,'urgent');
 assert.equal(receptionAcuity({caseData:{vitals:{}}}).state,'unknown');
});

test('accepted handoff frees a box, preserves its destination and admits another case',()=>{
 const s=createShiftFlow({content,mode:'solo',firstCaseId:'APP-001',roomId:'handoff-bed'});
 const [first]=s.advance(0);
 assert(s.close(first.uid,'doctor','quirofano'));
 assert.equal(s.close(first.uid,'doctor','quirofano'),false);
 assert.deepEqual(s.record(first.uid),{...first,closed:true,departed:true,ownerId:'doctor',destination:'quirofano'});
 const [next]=s.advance(180);
 assert(next);
 assert.equal(next.bedId,first.bedId,'released box is available to later admissions');
 assert.notEqual(next.uid,first.uid);
 const restored=createShiftFlow({content,mode:'solo',firstCaseId:'APP-001',
  roomId:'handoff-bed',snapshot:s.checkpoint()});
 assert.equal(restored.record(first.uid).destination,'quirofano');
 assert.equal(restored.record(first.uid).departed,true);
 assert.equal(restored.records().length,2);
});


test('reception triage follows current native deterioration and recovery, not stale measured vitals',()=>{
 const caseData={risk:null,vitals:{bp:'120/80',hr:80,spo2:99,rr:16,temp:37}};
 const previous={sys:120,dia:80,hr:80,spo2:99,rr:16,temp:37};
 const patient={baselineVitals:{...previous},lastVitalsKnown:{vitals:{...previous}},liveVitals:{...previous}};
 assert.equal(receptionAcuity({caseData,patient}).state,'stable');
 patient.liveVitals={...previous,sys:75,dia:42,hr:145,spo2:87,rr:37};
 assert.equal(receptionAcuity({caseData,patient,waitingSeconds:600}).state,'critical',
  'deterioration must change real reception priority even without a new monitor measurement');
 assert.equal(patient.lastVitalsKnown.vitals.sys,120,'triage is read-only');
 patient.lastVitalsKnown.vitals={...patient.liveVitals};
 patient.liveVitals={...previous,hr:112,spo2:96,rr:20};
 assert.equal(receptionAcuity({caseData,patient}).state,'warning',
  'recovery must be reflected immediately, even if the last documented measurement was critical');
 assert.equal(receptionAcuity({caseData:{vitals:{}},patient:null}).state,'unknown');
});

test('1/60-frame accumulation still admits on exact 7h and ends at 24h without clock drift',()=>{
 for(const mode of ['solo','apprentice','coop','competitive']){
  const roomId='frames-'+mode,s=createShiftFlow({content,mode,firstCaseId:'CIRR-001',roomId});
  s.advance(0);
  // 420 simulated seconds, one renderer-sized step at a time, the actual
  // server runtime cadence. It must never wait a spurious extra frame.
  for(let i=0;i<420*60;i++)s.advance(1/60);
  assert.equal(s.records().length,mode==='competitive'?4:3,
   mode+' missed exactly scheduled admissions after accumulated float additions');
  for(let i=420*60;i<1440*60;i++)s.advance(1/60);
  assert.equal(s.elapsed(),1440,'shift end must snap to exact 24 simulated hours');
  assert.equal(s.remaining(),0);assert(s.ended());
  assert.equal(s.records().length,6);
  assert.equal(s.advance(1/60).length,0);
 }
});
