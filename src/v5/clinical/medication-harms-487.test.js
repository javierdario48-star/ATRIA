import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advanceLegacy}
 from '../../../qa/physiology-live/native-journey-487.mjs';
import {confirmedMedicationHarms487} from './medication-harms-487.js';
import {createGuardSession} from './guard-session.js';
const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const c=content.cases.find(x=>x.id==='APP-001');
function patient(){
 const row={id:'ceftriaxone',label:'Ceftriaxona',patientUid:'P',sourceEventId:'dose',
  dose:{amount:1000,unit:'mg'},administeredAtNativeMinute:.18};
 return {uid:'P',severeAllergies:['ceftriaxone'],administrationLog:[row],treatments:[{...row}]};
}
test('allergy offsets reproduce the actual generated 4.8.7 execution at the same elapsed native time',()=>{
 const original=createLiveNativeJourney487('APP-001');
 original.ctx.sim.clinicalFlags={drugAllergies:['ceftriaxone'],severeAllergies:['ceftriaxone']};
 assert.equal(original.ctx.addMonitorTherapy('ceftriaxona 1 g'),true);
 assert.equal(original.ctx.window.csCare487.allergy().active,false);
 advanceLegacy(original,2.5);
 const p=patient(),at=original.ctx.sim.csSevereDrugReaction487.minute;
 for(const seconds of [0,3,10,20,60,100,170]){
  if(seconds)advanceLegacy(original,seconds);
  const old=original.ctx.window.csCare487.allergy();
  const elapsed=original.ctx.sim.gameMinute-at;
  const actual=confirmedMedicationHarms487(p,c,.18+elapsed);
  assert.equal(actual.reactions.length,1);
  for(const [key,value] of Object.entries(old.offsets))
   assert(Math.abs(actual.offsets[key]-value)<1e-8,key+' original versus migrated');
 }
});
test('pending, unspecified-severity and nonmatching allergies never generate severe reaction',()=>{
 const p=patient();
 p.administrationLog=[];
 assert.equal(confirmedMedicationHarms487(p,c,3).reactions.length,0);
 p.administrationLog=p.treatments;
 p.severeAllergies=[];p.allergies=['ceftriaxone'];
 assert.equal(confirmedMedicationHarms487(p,c,3).reactions.length,0);
 p.severeAllergies=['penicillin'];
 assert.equal(confirmedMedicationHarms487(p,c,3).reactions.length,0);
 p.severeAllergies=['cephalosporin'];
 assert(confirmedMedicationHarms487(p,c,3).offsets.sys<0);
});
test('anticoagulant bleeding matches actual 4.8.7 offsets at identical exposure age',()=>{
 const original=createLiveNativeJourney487('APP-001');
 original.ctx.sim.clinicalFlags={activeBleeding:true};
 assert.equal(original.ctx.addMonitorTherapy('heparina IV'),true);
 advanceLegacy(original,2.5);
 const at=original.ctx.sim.csHeparinHarm487.firstMinute;
 const p=patient();p.severeAllergies=[];p.clinicalFlags={activeBleeding:true};
 for(const row of [...p.administrationLog,...p.treatments]){
  row.id='anticoagulation';row.dose={amount:1,unit:'protocolo'};
 }
 for(const seconds of [0,3,10,20,60]){
  if(seconds)advanceLegacy(original,seconds);
  const old=original.ctx.window.csCare487.heparinHarm();
  const actual=confirmedMedicationHarms487(p,c,.18+original.ctx.sim.gameMinute-at);
  for(const [key,value] of Object.entries(old.offsets))
   assert(Math.abs(actual.offsets[key]-value)<1e-8,key+' original anticoagulant harm');
 }
});
test('duplicate, future, wrong patient and unmatched therapy cannot manufacture a reaction',()=>{
 for(const mutate of [
  p=>p.administrationLog.push({...p.administrationLog[0]}),
  p=>p.administrationLog[0].administeredAtNativeMinute=30,
  p=>p.administrationLog[0].patientUid='other',
  p=>p.treatments=[],
  p=>p.treatments[0].dose={amount:500,unit:'mg'}
 ]){
  const p=patient();mutate(p);
  assert.throws(()=>confirmedMedicationHarms487(p,c,3),/unique confirmed/);
 }
});
test('physical nursing preserves travel and preparation before an unblocked allergenic IV order',async()=>{
 let arrived=[],accepted=[];
 const jobs=[],s=createGuardSession({roomId:'allergy-nurse',mode:'solo',actorId:'doc',actorName:'Doctor',
  patient:{uid:'P',caseId:'APP-001',allergies:[{drugId:'ceftriaxone',severity:'severe'}]},content,
  resolveContext:()=>({patientUid:'P'}),nursing:{
   enqueue:job=>{jobs.push(job);return {status:'travelling'};},
   takeArrivals:()=>{const x=arrived;arrived=[];return x;},
   accept:result=>{accepted.push(result);return {status:result.status==='executed'?'confirmed':'rejected'};}
  }});
 try{
  await s.post({id:'iv',text:'Enfermera una vía'});
  arrived.push(jobs[0]);s.finishNurseArrivals();await s.flush();
  const ack=await s.post({id:'pair',text:'Enfermera ceftriaxona 1 g y metronidazol 500 mg'});
  assert.deepEqual(ack.clinical.map(x=>x.status),['pending','pending']);
  s.advance(26);await s.flush();
  assert.equal(s.read().patient.administrationLog.length,0);
  assert.equal(s.read().patient.adverseEvents.length,0);
  arrived.push(...jobs.slice(1));s.finishNurseArrivals();
  s.advance(1.4);await s.flush();assert.equal(s.read().patient.administrationLog.length,0);
  s.advance(26);await s.flush();
  assert.equal(s.read().patient.administrationLog.length,2);
  assert.equal(s.read().patient.adverseEvents.length,1);
  assert.equal(accepted.length,3);
 }finally{s.dispose();}
});
