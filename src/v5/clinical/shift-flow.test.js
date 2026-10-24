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
