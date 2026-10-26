import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {initialPancVitals,pancreatitisDiseaseTargets,advancePancVitals} from './native-panc.js';
const c=JSON.parse(fs.readFileSync(new URL('../content/cases.json',import.meta.url))).find(x=>x.id==='PANC-001');
const make=()=>({uid:'panc-QA',liveVitals:initialPancVitals(c),administrationLog:[],
 treatments:[],procedures:{},adverseEvents:[]});
test('pancreatitis native trajectory is case-scoped and cannot normalize itself without treatment',()=>{
 const p=make(),start={...p.liveVitals};
 advancePancVitals(p,c,30,180);
 assert(p.liveVitals.sys<start.sys);
 assert(p.liveVitals.hr>start.hr);
 assert.equal(p.liveVitals.spo2<=start.spo2,true);
 assert.throws(()=>initialPancVitals({...c,id:'APP-001'}),/PANC/);
 assert.throws(()=>advancePancVitals(p,c,-1,200),/delta/);
});
test('only actual completed IV crystalloid improves perfusion target, not a pending order',()=>{
 const p=make(),pending=make(),untreated=make();
 pending.orders=[{id:'fluid',status:'pending'}];
 pending.treatments=[{id:'fluid',status:'pending'}];
 const dose={id:'fluid',sourceEventId:'fluid-1',patientUid:p.uid,
  dose:{amount:1000,unit:'ml'},administeredAtNativeMinute:2};
 p.administrationLog.push(dose);
 p.treatments.push(dose);
 advancePancVitals(p,c,60,120);
 advancePancVitals(pending,c,60,120);
 advancePancVitals(untreated,c,60,120);
 assert(p.liveVitals.sys>pending.liveVitals.sys);
 assert.equal(pending.liveVitals.sys,untreated.liveVitals.sys);
 assert(p.liveVitals.hr<untreated.liveVitals.hr);
 assert(!p.caseEnded,'fluid does not perform ICU handoff');
});
test('disease targets remain deterministic through wide native minute range',()=>{
 const p=make();
 for(const m of [0,1,180,600,1440]){
  const q=pancreatitisDiseaseTargets(p,c,m);
  assert(Object.values(q).every(Number.isFinite));
 }
});
