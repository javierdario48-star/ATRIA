import test from 'node:test';
import assert from 'node:assert/strict';
import {ECG_RHYTHMS,ecgAmplitude,ecgBeatAt,ecgPath,ecgPresentation} from './ecg-morphology.js';

const specimen=(hr=90)=>({caseId:'APP-001',procedures:{monitor:{connected:true}},
 lastVitalsKnown:{vitals:{hr,sys:118,dia:72,rr:20,spo2:98,temp:38.1}},caseEnded:false});
test('C05.d rhythm catalog has explicit IDs for sinus, ST elevation, AF, VT, VF and asystole',()=>{
 for(const id of ['sinus','sinus_tachycardia','sinus_bradycardia','atrial_fibrillation',
  'ventricular_tachycardia','ventricular_fibrillation','asystole','st_elevation'])
  assert.equal(ECG_RHYTHMS[id].id,id);
 assert.equal(Object.keys(ECG_RHYTHMS).length,8);
});
test('C05.d R-R interval follows the observed HR after a native treatment changes it',()=>{
 const rFast=ecgBeatAt(2,120),rSlow=ecgBeatAt(2,60);
 assert.equal(rFast.index,4);
 assert.equal(rSlow.index,2);
 assert.equal(ecgBeatAt(60/120,120).index,1);
 assert.equal(ecgBeatAt(60/60,60).index,1);
 assert.notEqual(ecgPath({seconds:5,hr:108}),ecgPath({seconds:5,hr:96}));
 assert.notEqual(ecgPath({seconds:5,hr:90}),ecgPath({seconds:5.1,hr:90}));
});
test('C05.d no pathological label can be inferred from fever, shock or tachycardia alone',()=>{
 const patient=specimen(160);
 assert.equal(ecgPresentation(patient).rhythm,'sinus');
 assert.equal(ecgPresentation({...patient,lastVitalsKnown:{vitals:{hr:38}}}).rhythm,'sinus');
 assert.equal(ecgPresentation({...patient,ecg:{rhythm:'st_elevation'}}).rhythm,'st_elevation');
 assert.equal(ecgPresentation({...patient,ecg:{rhythm:'not-recognized'}}).rhythm,'sinus');
 assert.equal(ecgPresentation({...patient,procedures:{}}).connected,false);
});
test('C05.d ST morphology elevates ST segment only under an explicit case rhythm',()=>{
 const at=.385*60/90;
 const raised=ecgAmplitude(at,{hr:90,rhythm:'st_elevation'});
 const ordinary=ecgAmplitude(at,{hr:90,rhythm:'sinus'});
 assert(raised-ordinary>.15, 'ST segment elevation is specific to the declared morphology');
});
test('C05.d AF is irregular, asystole flat and VF not organized into QRS complexes',()=>{
 const intervals=[];
 for(let i=0;i<8;i++){
  let low=i*.4,high=low+.4;
  // Sequence is deterministic, not regular (test time-to-beat by pattern).
  intervals.push(ecgBeatAt((i+.2)*60/90,90,'atrial_fibrillation').phase);
 }
 assert(new Set(intervals.map(x=>x.toFixed(3))).size>4);
 for(let t=0;t<10;t+=.113)assert.equal(ecgAmplitude(t,{hr:0,rhythm:'asystole'}),0);
 assert.notEqual(ecgAmplitude(.123,{hr:95,rhythm:'ventricular_fibrillation'}),0);
 const flat=ecgPath({seconds:5,hr:90,rhythm:'asystole'});
 assert(flat.length>500);
 assert.equal(new Set([...flat.matchAll(/[ML]\d+\.\d+ (\d+\.\d+)/g)].map(x=>x[1])).size,1);
});
test('C05.d model path is deterministic, bounded and read-only',()=>{
 const input={seconds:5,hr:94,rhythm:'sinus'};
 const path=ecgPath(input);
 assert.equal(path,ecgPath(input));
 assert.equal((path.match(/[ML]/g)||[]).length,225);
 assert.equal(input.hr,94);
 assert.equal(ecgPath({seconds:5,hr:80,rhythm:'unknown'}),'');
});

test('C05.d optional case ECG seed is explicit, validated and remains absent in current cases',async()=>{
 const {initialCaseEcg}=await import('./ecg-morphology.js');
 assert.equal(initialCaseEcg({id:'APP-001'}),null);
 assert.deepEqual(initialCaseEcg({id:'APP-001',ecg:{rhythm:'st_elevation'}}),{rhythm:'st_elevation'});
 assert.deepEqual(initialCaseEcg({id:'CIRR-001',ecg:{rhythm:'asystole'}}),{rhythm:'asystole'});
 assert.throws(()=>initialCaseEcg({id:'APP-001',ecg:{rhythm:'unknown'}}),/invalid case ECG/);
 assert.notEqual(ecgPath({seconds:6,hr:0,rhythm:'asystole'}),'');
 assert.notEqual(ecgPath({seconds:6,hr:0,rhythm:'ventricular_fibrillation'}),'');
});
