import test from 'node:test';
import assert from 'node:assert/strict';
import {respiratoryPack} from './respiratory-pack.js';
import {cardiologyPack} from './cardiology-pack.js';
import {neurologyPack} from './neurology-pack.js';
import {CLINICAL_TREATMENTS} from '../clinical-treatment-definitions.js';
import {compileClinicalCasePack} from '../compile-clinical-case-pack.js';
import {CLINICAL_POLICY_REGISTRIES} from '../../clinical/clinical-policy-registry.js';
const packs=[respiratoryPack,cardiologyPack,neurologyPack];
const cases=packs.flatMap(pack=>pack.cases);

test('all thirty authored cases compile against actual shared executable policies',()=>{
 assert.equal(cases.length,30);
 assert.equal(new Set(cases.map(c=>c.id)).size,30);
 for(const pack of packs){
  const compiled=compileClinicalCasePack(pack,CLINICAL_POLICY_REGISTRIES);
  assert.equal(compiled.ok,true,compiled.errors.join('\n'));
  assert.equal(compiled.cases.length,10);
 }
});
test('case-specific evidence, receiver and complication references survive normalization',()=>{
 const studies=new Set();
 for(const c of cases){
  assert(c.requiredHistory.includes('onset')&&c.requiredHistory.includes('allergies'),c.id);
  assert(c.clinicalPolicy.closure.requiredExams.length>0,c.id);
  for(const study of c.studies){
   assert(!studies.has(study.id),`distinct result source ${study.id}`);studies.add(study.id);
   assert(study.delay>=5,study.id);
  }
  for(const complication of c.clinicalPolicy.complications??[]){
   assert.equal(complication.progressionId,'offset-ramp-v1');
   assert.equal(complication.rescueId,'confirmed-rescue-v1');
   assert(complication.riseMinutes>0&&complication.recoveryMinutes>0,c.id);
   assert.equal(complication.offsets.length,6);
   for(const id of [...complication.rescueAllOf??[],...complication.rescueAnyOf??[]])
    assert(Object.hasOwn(CLINICAL_POLICY_REGISTRIES.drugs,id),`${c.id}: real rescue ${id}`);
  }
  for(const destination of c.clinicalPolicy.closure.destinations.filter(d=>['sala','uti','quirofano','procedimiento'].includes(d)))
   assert(c.clinicalPolicy.closure.consult?.[destination]?.length,`${c.id}: receiver for ${destination}`);
 }
});
test('severe asthma can fatigue despite initial correct care and its rescue includes ventilation',()=>{
 const asthma=respiratoryPack.cases[3],copd=respiratoryPack.cases[2];
 assert.deepEqual(asthma.clinicalPolicy.oxygenTarget,[92,95]);
 assert.deepEqual(copd.clinicalPolicy.oxygenTarget,[88,92]);
 const fatigue=asthma.clinicalPolicy.complications[0];
 assert.equal(fatigue.type,'respiratory-fatigue');
 assert(fatigue.offsets[2]<0);
 assert.deepEqual(fatigue.rescueAllOf,['intubation']);
 assert.equal(fatigue.requiredState,undefined,'initial bronchodilator response does not preclude the seeded fatigue event');
 assert(!asthma.interventionIds.includes('lung_protective_ventilation'));
 assert.match(CLINICAL_TREATMENTS.intubation.regimen.protocol,/Incluye ventilación/);
});
test('cardiac regimens distinguish endocarditis dosing, observation and actual procedures',()=>{
 const endocarditis=cardiologyPack.cases[8],svt=cardiologyPack.cases[4];
 for(const id of ['ampicillin','ceftriaxone'])assert.equal(endocarditis.clinicalPolicy.regimens[id].dose.amount,2000);
 assert.equal(endocarditis.clinicalPolicy.regimens.ampicillin.intervalMinutes,240);
 assert.equal(endocarditis.clinicalPolicy.regimens.ceftriaxone.intervalMinutes,720);
 assert.equal(svt.clinicalPolicy.closure.minimumObservationMinutes,30);
 assert.deepEqual(svt.clinicalPolicy.closure.destinations,['observacion']);
 for(const t of Object.values(CLINICAL_TREATMENTS)){
  assert.equal(typeof t.classId,'string',t.id);
  assert(t.dose.amount>=t.min&&t.dose.amount<=t.max,t.id);
  if(t.kind==='procedure'){
   assert(t.regimen.executionMinutes>=1,`${t.id}: procedure duration`);
   assert.equal(t.regimen.requiresCompletedReceipt,true,t.id);
  }
 }
});
test('hypoperfusion kidney injury is slow and its rescue follows the type of shock',()=>{
 for(const c of [respiratoryPack.cases[1],neurologyPack.cases[6],cardiologyPack.cases[9]]){
  const aki=c.clinicalPolicy.complications.find(item=>item.type==='acute-kidney-injury');
  assert(aki.minMinute>=30&&aki.riseMinutes>=20&&aki.recoveryMinutes>=60,c.id);
  assert.deepEqual(aki.requiredState,{sys:{lt:90}});
  assert(aki.renalStress>0&&aki.renalStress<.3,c.id);
  assert(!aki.rescueAllOf.includes('furosemide'));
  if(c.id==='CARD-10')assert.deepEqual(aki.rescueAllOf,['vasopressor','coronary_reperfusion']);
 }
});
