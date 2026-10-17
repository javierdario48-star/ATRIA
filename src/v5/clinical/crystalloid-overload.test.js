import test from 'node:test';
import assert from 'node:assert/strict';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {initialAppVitals,advanceAppVitals} from './native-app.js';
import {initialCirrVitals,advanceCirrVitals} from './native-cirr.js';
const patient=(caseId,ml=0)=>({uid:'p-'+caseId,caseId,
 treatments:ml?[{id:'fluid'}]:[],
 administrationLog:Array.from({length:ml/500},(_,i)=>({
  id:'fluid',patientUid:'p-'+caseId,sourceEventId:'dose-'+i,
  dose:{unit:'ml',amount:500},administeredAtRealSecond:i*2.7
 }))});
const config=(id,overloadThresholdMl)=>({id,vitals:id==='APP-001'?
 {bp:'118/72',temp:38.1,hr:108,rr:20,spo2:98}:
 {bp:'108/68',temp:37.2,hr:94,rr:20,spo2:96},
 ...(overloadThresholdMl===undefined?{}:{physiology:{fluidOverloadThresholdMl:overloadThresholdMl}})});
test('C12b doses 500-2500 ml preserve existing native physiology; first overload dose causes modest harm',()=>{
 for(const id of ['APP-001','CIRR-001']){
  const c=config(id);
  for(const ml of [0,500,1000,2500]){
   const p=patient(id,ml);assert.deepEqual(crystalloidOverloadOffsets(p,c),{rr:0,spo2:0});
  }
  const offsets=crystalloidOverloadOffsets(patient(id,3000),c);
  assert(Math.abs(offsets.rr-.88)<1e-9);
  assert(Math.abs(offsets.spo2+.72)<1e-9);
 }
});
test('C12b dose-response at 4 liters reproduces the LEGACY respiratory target without copying legacy circulation errors',()=>{
 for(const id of ['APP-001','CIRR-001']){
  const c=config(id),p=patient(id,4000),baseline=id==='APP-001'?initialAppVitals(c):initialCirrVitals(c);
  p.liveVitals={...baseline};
  assert.deepEqual(crystalloidOverloadOffsets(p,c),{rr:5.28,spo2:-4.32});
  (id==='APP-001'?advanceAppVitals:advanceCirrVitals)(p,c,45.6);
  const rrTarget=(id==='APP-001'?19:20)+5.28;
  assert(Math.abs(p.liveVitals.rr-rrTarget)<.00001,id+' respiratory rate');
  assert(Math.abs(p.liveVitals.spo2-(baseline.spo2-4.32))<.00001,id+' oxygenation');
  assert.equal(id==='CIRR-001'?p.liveVitals.sys:initialCirrVitals(config('CIRR-001')).sys,108,
   'stable cirrhosis must NOT acquire unsupported 14mmHg fluid pressure benefit');
  assert(p.liveVitals.spo2<baseline.spo2,'confirmed excess fluid can harm, not be blocked');
 }
});
test('C12b pending, fabricated treatment flag, other patient and drug-only administrations do not change acute vitals',()=>{
 const c=config('APP-001'),p=patient('APP-001');
 p.liveVitals=initialAppVitals(c);
 p.treatments=[{id:'ceftriaxone'},{id:'metronidazole'}];
 p.pendingTreatments=[{id:'fluid',dose:{amount:500,unit:'ml'}}];
 p.administrationLog=[{id:'ceftriaxone',sourceEventId:'abx',patientUid:p.uid,dose:{unit:'mg',amount:1000}}];
 assert.deepEqual(crystalloidOverloadOffsets(p,c),{rr:0,spo2:0});
 advanceAppVitals(p,c,60);
 assert.deepEqual(p.liveVitals,initialAppVitals(c),'antibiotics remain case fulfillment, no immediate hemodynamic miracle');
 p.administrationLog.push({id:'fluid',sourceEventId:'wrong',patientUid:'other',dose:{unit:'ml',amount:4000}});
 assert.throws(()=>crystalloidOverloadOffsets(p,c),/unconfirmed or duplicate IV exposure record/);
});
test('C12b case threshold may be explicitly declared but invalid values fail closed',()=>{
 const p=patient('CIRR-001',2000);
 const offsets=crystalloidOverloadOffsets(p,config('CIRR-001',1800));
 assert(Math.abs(offsets.rr-.88)<1e-9);
 assert(Math.abs(offsets.spo2+.72)<1e-9);
 for(const threshold of [0,-1,NaN,Infinity,30000])
  assert.throws(()=>crystalloidOverloadOffsets(p,config('CIRR-001',threshold)),/threshold/);
});
test('C12b 24h simulation and time-step independence do not allocate new physiology state',()=>{
 const c=config('CIRR-001');
 const a=patient('CIRR-001',4000),b=structuredClone(a);
 a.liveVitals=initialCirrVitals(c);b.liveVitals=initialCirrVitals(c);
 for(let n=0;n<60*15;n++)advanceCirrVitals(a,c,1/60);
 advanceCirrVitals(b,c,15);
 for(const key of Object.keys(a.liveVitals))
  assert(Math.abs(a.liveVitals[key]-b.liveVitals[key])<1e-9,key);
 advanceCirrVitals(b,c,1440);
 assert(Number.isFinite(b.liveVitals.rr)&&Number.isFinite(b.liveVitals.spo2));
 assert(b.liveVitals.rr<=42&&b.liveVitals.spo2>=72);
});
