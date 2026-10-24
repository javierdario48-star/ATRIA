import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createShiftFlow,SHIFT_DURATION_SECONDS,receptionAcuity} from './shift-flow.js';

const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:load('cases'),beds:load('beds')};
const shift=(mode,snapshot)=>createShiftFlow({content,mode,roomId:'qa-shift',
 firstCaseId:'PERI-PBE-001',snapshot});

test('the game has 24 real minutes, no extra minute after exhaustion',()=>{
 const s=shift('solo');
 assert.equal(s.advance(0).length,1);
 assert.equal(s.advance(179).length,0);
 assert.equal(s.advance(1).length,1);
 assert.equal(s.advance(1260).length,4);
 assert.equal(s.elapsed(),SHIFT_DURATION_SECONDS);
 assert(s.ended());
 assert.equal(s.advance(5000).length,0);
 assert.equal(s.records().length,6);
});

test('competitive has two independent patient identities and distant beds at minute zero',()=>{
 const s=shift('competitive'),two=s.advance(0);
 assert.equal(two.length,2);
 assert.notEqual(two[0].uid,two[1].uid);
 assert.notEqual(two[0].bedId,two[1].bedId);
 const a=content.beds.find(b=>b.id===two[0].bedId);
 const b=content.beds.find(b=>b.id===two[1].bedId);
 assert(Math.abs(a.patient[0]-b.patient[0])>=500);
 assert(s.claim(two[0].uid,'doctor-a'));
 assert(!s.claim(two[0].uid,'doctor-b'));
 assert(s.claim(two[1].uid,'doctor-b'));
 assert.equal(s.get(two[0].uid).ownerId,'doctor-a');
 assert.equal(s.get(two[1].uid).ownerId,'doctor-b');
});

test('all four modes admit over the same 24-minute shift without reusing an occupied bed',()=>{
 for(const mode of ['solo','apprentice','coop','competitive']){
  const s=shift(mode),initial=s.advance(0);
  assert.equal(initial.length,mode==='competitive'?2:1);
  s.advance(760);
  const open=s.reception();
  assert.equal(new Set(open.map(p=>p.bedId)).size,open.length);
  assert(open.every(p=>p.acuity&&p.waitingSeconds>=0));
 }
});

test('snapshot recovery never duplicates an admission or loses a competitive owner',()=>{
 const s=shift('competitive'),[first]=s.advance(0);
 assert(s.claim(first.uid,'doctor-a'));
 s.advance(250);
 const copy=shift('competitive',s.checkpoint());
 assert.equal(copy.advance(0).length,0);
 assert.equal(copy.get(first.uid).ownerId,'doctor-a');
 assert(!copy.claim(first.uid,'doctor-b'));
 assert.equal(copy.advance(200).length,1);
 assert.equal(copy.records().length,4);
});

test('full beds queue rather than overlap; closing a patient frees the physical bed',()=>{
 const s=shift('competitive');
 const first=s.advance(0);
 assert.equal(first.length,2);
 s.advance(1439);
 assert.equal(new Set(s.records().map(p=>p.bedId)).size,s.records().length);
 assert(s.close(first[0].uid,'doctor-a'));
 assert(!s.close(first[0].uid,'doctor-a'));
 assert(!s.claim(first[0].uid,'doctor-b'));
 assert(s.reception().every(p=>p.uid!==first[0].uid));
});

test('reception derives acuity from triage evidence without forging monitor connection',()=>{
 assert.equal(receptionAcuity({vitals:{bp:'70/40',hr:140,rr:32,spo2:88,temp:38}},null).state,'critical');
 assert.equal(receptionAcuity({risk:'peritonitis',vitals:{bp:'118/72',hr:85,rr:17,spo2:97,temp:37}}).state,'urgent');
 assert.equal(receptionAcuity({vitals:{bp:'120/75',hr:79,rr:16,spo2:98,temp:37}}).state,'stable');
 assert.equal(receptionAcuity({vitals:{}}).state,'unknown');
});

test('the only eligible case pool remains the five certified medical executors',()=>{
 const s=shift('solo');s.advance(1439);
 const eligible=new Set(['APP-001','CIRR-001','PERI-PBE-001','PERI-SEC-001','PERI-TER-001']);
 assert(s.records().every(p=>eligible.has(p.caseId)));
});
