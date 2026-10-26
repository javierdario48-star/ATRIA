import test from 'node:test';
import assert from 'node:assert/strict';
import {confirmedClinicalMissteps} from './clinical-risk.js';

// A no-medication patient and a completed medication are separate states.
// None of these checks can invent administration, change vitals, or mint XP.
function sample(id,drug=null){
 const patient={uid:'patient-1',liveVitals:{spo2:97,rr:18},adverseEvents:[],
  administrationLog:drug?[{id:drug,sourceEventId:'dose-1',patientUid:'patient-1',
   label:drug,dose:{amount:1,unit:'mg'}}]:[]};
 return {patient,c:{id,vitals:{spo2:97},pharmacology:{traits:['hemorrhage']}}};
}
test('risk evaluation is pure and safe without administration (all clinical cases)',()=>{
 for(const id of ['CIRR-001','APP-001','VARIX-001','CDI-001','COLON-001']){
  const {patient,c}=sample(id);
  const before=structuredClone(patient);
  assert.deepEqual(confirmedClinicalMissteps(patient,c),
   {adverseCount:0,flags:[],confirmedFluidMl:0});
  assert.deepEqual(patient,before,'risk check cannot execute a clinical action');
 }
});
test('confirmed prophylactic ceftriaxone is not a false variceal adverse event',()=>{
 const {patient,c}=sample('VARIX-001','ceftriaxone');
 assert.deepEqual(confirmedClinicalMissteps(patient,c).flags,[]);
 const untreated=sample('COLON-001','ceftriaxone');
 assert(confirmedClinicalMissteps(untreated.patient,untreated.c).flags
  .some(x=>x.includes('sin foco infeccioso')));
});
test('unrelated confirmed IV administration never escapes medicine loop',()=>{
 const {patient,c}=sample('CROHN-001','ppi');
 assert.deepEqual(confirmedClinicalMissteps(patient,c).flags,[]);
});
