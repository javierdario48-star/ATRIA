import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalMeaning,interviewQuality,compareConversations} from '../v5/personality-conversation-metrics.mjs';
import {realizeClinicalFact} from '../../src/v5/content/patient-language.js';
import {buildBehaviorProfile} from '../../src/v5/content/patient-behavior.js';
import {validateDialogueSources} from '../v5/personality-fact-oracle.mjs';

test('greetings, emotional suffixes and punctuation earn no substantive conversational diversity',()=>{
 const rows=['Doctor: El dolor empezó hace seis horas. Estoy un poco preocupado.','Mire: El dolor empezó hace seis horas.'].map(answer=>({caseId:'same',clinicalInvariant:'same',rows:[{answer}]}));
 const metric=compareConversations(rows);assert.equal(metric.exactBodyPairs,1);assert.equal(metric.uniqueSubstantiveBodies,1);
});
test('independent semantic checks detect an added drug, a lost negation and altered quantities',()=>{
 for(const spoken of ['Tengo fiebre.','No tengo fiebre. Tomo warfarina.','No tengo fiebre desde hace 9 horas.']){
  const row={rows:[{answer:spoken,evidence:{facts:[{id:'test',canonical:'No tengo fiebre desde hace 6 horas.',spoken}]}}]};
  assert(interviewQuality(row).failures.some(x=>x.startsWith('changed-clinical-content')));
 }
});
test('negations and quantities cannot be reassigned between clinical propositions',()=>{
 for(const [canonical,spoken] of [
  ['No tomo warfarina. Tomo aspirina.','Tomo warfarina. No tomo aspirina.'],
  ['Tomo warfarina 5 mg. Tomo aspirina 100 mg.','Tomo warfarina 100 mg. Tomo aspirina 5 mg.']
 ])assert.notEqual(clinicalMeaning(canonical),clinicalMeaning(spoken));
});
test('canonical/source metadata cannot certify a fabricated bank fact',()=>{
 const c={id:'APP-001',intents:[{id:'fever',answers:['No tuve fiebre.']}]};
 const p={caseId:c.id,liveVitals:{hr:70,sys:120,dia:80,rr:16,spo2:98,temp:37},treatments:[]};
 const r=validateDialogueSources({facts:[{id:'fever',source:'case.intents.fever',canonical:'Tuve fiebre de 40 grados.',spoken:'Tuve fiebre de 40 grados.'}]},c,p);
 assert.deepEqual(r.failures,['non-authored-clinical-fact:fever:case.intents.fever']);
});
test('an emotional remark cannot hide a treatment assertion',()=>{
 const r=interviewQuality({rows:[{answer:'No tengo fiebre. Ya recibí ceftriaxona.',evidence:{
  facts:[{canonical:'No tengo fiebre.',spoken:'No tengo fiebre.'}],remark:'Ya recibí ceftriaxona.'}}]});
 assert(r.failures.includes('non-conversational-remark:0'));
});
test('an extra medical assertion outside the declared realizations cannot pass verification',()=>{
 const result=interviewQuality({rows:[{answer:'No tengo fiebre. Ya me administraron ceftriaxona.',
  evidence:{facts:[{id:'fever',canonical:'No tengo fiebre.',spoken:'No tengo fiebre.'}],remark:null}}]});
 assert(result.failures.includes('untracked-answer-content:0'));
});
test('bounded realizations conserve clinical meaning, numbers and grammatical word order',()=>{
 const facts=['Empezó hace unas ocho horas.','Tengo náuseas y vomité una vez.',
  'Me duele abajo a la derecha de la panza.','No tengo nada de hambre desde que empezó.',
  'No tengo enfermedad cardíaca ni renal. Nunca me internaron por una infección.',
  'Estoy muy cansada y no recuerdo cuándo empezó.','No tengo claro qué lo empeora.',
  'Me duele toda la panza.','No puedo precisar si se me corre.',
  'Vomité varias veces y empeora cuando camino.'];
 for(let i=0;i<64;i++)for(const canonical of facts){
  const behavior=buildBehaviorProfile('language-'+i,['calm','talkative','reserved'][i%3]);
  const {spoken}=realizeClinicalFact(canonical,{behavior,seed:'language-'+i,topic:'test',repeat:i%3});
  assert.equal(clinicalMeaning(spoken),clinicalMeaning(canonical),canonical+' → '+spoken);
  assert.equal(realizeClinicalFact(canonical,{behavior,sensitive:true}).spoken,canonical);
 }
});
