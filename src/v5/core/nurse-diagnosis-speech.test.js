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

test('nurse allergy questions are information requests, never medication orders',()=>{
 for(const text of ['Enfermera, alergias','Enfermera, ¿qué alergias tiene?',
  'Enfermera, ¿tiene alergias?','Enfermera, antecedentes de alergias',
  '¿Qué alergias presenta?']){
  const x=routeWardSpeech(text,text.startsWith('¿')?{...opts,focusedNpc:'nurse'}:opts);
  assert.equal(x.error,undefined,text);
  assert.deepEqual(x.intents.map(i=>[i.kind,i.id]),[['nurse.inquire','allergies']],text);
 }
 const missing=routeWardSpeech('Enfermera, alergias',{...opts,patientUid:null});
 assert.equal(missing.error,'no-patient-target');
 assert.deepEqual(missing.intents,[]);
 const negated=routeWardSpeech('Enfermera, no alergias',opts);
 assert(!negated.intents.some(i=>i.kind==='nurse.inquire'));
});

test('natural follow-up and red flags register one existing conduct without secret phrases',()=>{
 const withFollowup={...opts,therapies:[{id:'followup',label:'Plan escrito de seguimiento y signos de alarma'}]};
 const positive=routeWardSpeech('Enfermera, alta con control en 48 horas y regresar si aparece fiebre',withFollowup);
 assert.deepEqual(positive.intents.map(x=>[x.kind,x.id]),[['therapy.request','followup']]);
 for(const text of ['Enfermera, alta','Enfermera, control en 48 horas',
  'Enfermera, volver si aparece fiebre']){
  const x=routeWardSpeech(text,withFollowup);
  assert(!x.intents.some(i=>i.id==='followup'),text);
 }
});

test('natural NPO orders reuse the existing case intervention',()=>{
 const withNpo={...opts,interventions:[{id:'npo',label:'Nada por boca',aliases:['nada por boca','npo','ayuno']}]};
 for(const text of ['Enfermera nada por boca','Enfermera dejalo en ayunas',
  'Enfermera NPO','Enfermera no le des agua','Enfermera no dar nada por boca',
  'Enfermera no le des agua ni comida']){
  const x=routeWardSpeech(text,withNpo);
  assert.equal(x.error,undefined,text);
  assert.deepEqual(x.intents.map(i=>[i.kind,i.id]),[['therapy.request','npo']],text);
 }
 assert.equal(routeWardSpeech('Enfermera no le des agua',{...opts,interventions:[]}).intents.length,0,
  'do not invent an intervention that the case does not provide');
});
