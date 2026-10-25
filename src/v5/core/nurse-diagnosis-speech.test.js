import test from 'node:test';
import assert from 'node:assert/strict';
import {routeWardSpeech} from './speech-router.js';
const opts={patientUid:'P1',clinicalEvaluation:true,studies:[],therapies:[],interventions:[]};
test('diagnosis said aloud to nurse uses the native diagnosis.record intent',()=>{
 for(const text of ['Enfermera, mi diagnóstico presuntivo es apendicitis aguda',
  'Enfermera, mi impresión diagnóstica es peritonitis secundaria',
  'Enfermera, creo que tiene colecistitis aguda',
  'Enfermera, la enfermedad es PBE']){
  const x=routeWardSpeech(text,opts);
  assert.equal(x.recipient,'nurse');
  assert.equal(x.intents.length,1);
  assert.equal(x.intents[0].kind,'diagnosis.record');
  assert.equal(x.patientUid,'P1');
  assert(x.intents[0].value.length>2);
 }
 const focused=routeWardSpeech('Mi diagnóstico presuntivo es colangitis aguda',{...opts,focusedNpc:'nurse'});
 assert.equal(focused.intents[0].value,'colangitis aguda');
});
test('ordinary questions, nursing doses and missing patient never become diagnosis',()=>{
 for(const text of ['Enfermera, ¿cuál es el diagnóstico?',
  'Enfermera ceftriaxona 1 g','Enfermera, no creo que sea PBE']){
  const x=routeWardSpeech(text,opts);
  assert(!x.intents.some(i=>i.kind==='diagnosis.record'));
 }
 assert.equal(routeWardSpeech('Enfermera, creo que tiene colecistitis',{...opts,patientUid:null}).error,'no-patient-target');
});
