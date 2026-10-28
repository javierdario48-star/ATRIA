import test from 'node:test';
import assert from 'node:assert/strict';
import {summarizeIVExposures} from './medication-exposure.js';
const event=(uid,id,sourceEventId,amount,unit)=>({
 patientUid:uid,id,sourceEventId,dose:{amount,unit},
 administeredAtNativeMinute:1,administeredAtRealSecond:1
});
test('one source of dose truth, distinct sourceEventIds and drug units',()=>{
 const a={uid:'A',administrationLog:[
  event('A','fluid','e1',500,'ml'),
  event('A','fluid','e2',500,'ml'),
  event('A','ceftriaxone','e3',1000,'mg'),
  event('A','metronidazole','e4',500,'mg'),
  {id:'oxygen',patientUid:'A',sourceEventId:'oxygen-1',dose:{amount:4,unit:'L/min'}}
 ]};
 const r=summarizeIVExposures(a);
 assert.equal(r.confirmedCrystalloidMl,1000);
 assert.equal(r.confirmedIvEventCount,4);
 assert.deepEqual(r.byDrug.fluid,{unit:'ml',totalAmount:1000,administrations:2,sourceEventIds:['e1','e2']});
 assert.equal(r.byDrug.ceftriaxone.totalAmount,1000);
 assert.equal(r.byDrug.metronidazole.totalAmount,500);
 assert(!Object.hasOwn(r.byDrug,'oxygen'),'oxygen cannot be summed as a bolus');
});
test('unconfirmed requests and imaginary treatment flags never become exposure',()=>{
 assert.deepEqual(summarizeIVExposures({uid:'P',treatments:[{id:'fluid'}],
  pendingTreatments:[{id:'fluid'}],administrationLog:[]}),{
   patientUid:'P',confirmedIvEventCount:0,confirmedCrystalloidMl:0,byDrug:{}});
});
test('corrupt, repeated or cross-patient IV events fail closed instead of fabricating dose',()=>{
 const good=event('P','fluid','e1',500,'ml');
 for(const bad of [event('other','fluid','e2',500,'ml'),event('P','fluid','e2',0,'ml'),
   event('P','fluid','e2',500,'mg'),{...good,sourceEventId:null}]){
  assert.throws(()=>summarizeIVExposures({uid:'P',administrationLog:[good,bad]}),
   /exposure record/);
 }
 assert.throws(()=>summarizeIVExposures({uid:'P',administrationLog:[good,good]}),/exposure record/);
});
test('a continuous regimen keeps its bolus and infusion in their own dimensions',()=>{
 const bolus={...event('P','heparin_therapeutic','start',80,'U/kg'),action:'start',route:'iv',
  infusionDose:{amount:18,unit:'U/kg/h'}};
 const rate={...event('P','heparin_therapeutic','rate',12,'U/kg/h'),action:'setRate',route:'iv',
  infusionDose:{amount:12,unit:'U/kg/h'}};
 const p={uid:'P',administrationLog:[bolus]};
 let exposure=summarizeIVExposures(p).byDrug.heparin_therapeutic;
 assert.equal(exposure.currentRate,18);assert.equal(exposure.unit,'U/kg/h');
 assert.equal(exposure.bolusAmount,80);assert.equal(exposure.bolusUnit,'U/kg');
 p.administrationLog.push(rate);exposure=summarizeIVExposures(p).byDrug.heparin_therapeutic;
 assert.equal(exposure.currentRate,12);assert.equal(exposure.bolusAmount,80);
 p.administrationLog.push({id:'heparin_therapeutic',patientUid:'P',sourceEventId:'stop',
  action:'stop',previousDose:{amount:12,unit:'U/kg/h'}});
 assert.equal(summarizeIVExposures(p).byDrug.heparin_therapeutic.currentRate,0);
 assert.throws(()=>summarizeIVExposures({uid:'P',administrationLog:[{...bolus,infusionDose:undefined}]}),/exposure record/);
});
