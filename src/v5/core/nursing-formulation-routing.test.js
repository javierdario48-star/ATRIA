import test from 'node:test';
import assert from 'node:assert/strict';
import {routeWardSpeech} from './speech-router.js';
import {CLINICAL_TREATMENTS} from '../content/clinical-treatment-definitions.js';
const context={patientUid:'P',clinicalEvaluation:true,venousAccessCount:1,
 studies:[{id:'serum_magnesium',label:'Magnesio',aliases:['magnesio','magnesio serico']},
  {id:'sodium',label:'Sodio',aliases:['sodio']}],therapies:Object.values(CLINICAL_TREATMENTS)};
test('an explicit magnesium medication formulation uses the therapy owner and leaves bare serum magnesium as a study',()=>{
 const medicine=routeWardSpeech('Enfermera magnesio 2 g IV',context);
 assert.deepEqual(medicine.intents.map(x=>[x.kind,x.id]),[['therapy.request','magnesium']]);
 const lab=routeWardSpeech('Enfermera magnesio',context);
 assert.deepEqual(lab.intents.map(x=>[x.kind,x.id]),[['study.request','serum_magnesium']]);
 const compound=routeWardSpeech('Enfermera magnesio 2 g IV y sodio',context);
 assert.deepEqual(compound.intents.map(x=>[x.kind,x.id]),[['therapy.request','magnesium'],['study.request','sodium']]);
});
