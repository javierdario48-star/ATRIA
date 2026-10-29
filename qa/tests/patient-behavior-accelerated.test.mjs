import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBehaviorProfile,styleClinicalAnswer,TRAIT_KEYS} from '../../src/v5/content/patient-behavior.js';
import {generatePatientVariation,DEFAULT_PATIENT_VARIATION} from '../../src/v5/content/patient-variation.js';
test('finite pure behavior samples preserve facts and deterministic style (not native anamneses)',()=>{
 const signatures=new Set(),utterances=new Set();
 const fact='El dolor empezó hace seis horas y es ocho de diez.';
 for(let i=0;i<64;i++){
  const seed='accelerated-patient-'+i;
  const patient=generatePatientVariation(DEFAULT_PATIENT_VARIATION,seed);
  const behavior=patient.behavior;
  assert.equal(TRAIT_KEYS.length,11);
  assert.deepEqual(buildBehaviorProfile(seed,patient.personality),behavior);
  const answer=styleClinicalAnswer(fact,{behavior,seed,question:'¿Qué le pasa?',eventId:'question-1'});
  assert(answer.includes(fact),'authored clinical fact must survive unchanged');
  assert.equal(answer,styleClinicalAnswer(fact,{behavior,seed,question:'¿Qué le pasa?',eventId:'question-1'}));
  assert.equal(styleClinicalAnswer(fact,{behavior,seed,impaired:true}),fact);
  assert.equal(styleClinicalAnswer(fact,{behavior,seed,sensitive:true}),fact);
  signatures.add(TRAIT_KEYS.map(k=>behavior[k]).join(','));
  utterances.add(answer);
 }
 assert(signatures.size>50,'insufficient multidimensional variety');
 assert(utterances.size>=4,'insufficient outward expression variety');
});
