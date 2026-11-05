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
test('the dialogue oracle allows a change of speaker without accepting a change in dose, timing or denial',()=>{
 const canonical='Aspirina 100 mg diarios, atorvastatina y losartán; no tomó la aspirina hoy. No usa anticoagulantes ni inhibidores PDE5.';
 const natural='Tomo aspirina 100 mg diarios, atorvastatina y losartán; no tomé la aspirina hoy. No uso anticoagulantes ni inhibidores PDE5.';
 const failures=spoken=>interviewQuality({rows:[{answer:spoken,evidence:{facts:[{id:'meds',canonical,spoken,rules:['patient-voice']}]}}]}).failures;
 assert.deepEqual(failures(natural),[]);
 for(const changed of [natural.replace('100 mg','200 mg'),natural.replace('hoy','ayer'),natural.replace('no tomé','no tomo'),
  natural.replace('No uso','Uso'),natural.replace('anticoagulantes','warfarina')])
  assert(failures(changed).some(x=>x.startsWith('changed-clinical-content')),changed);
});
test('natural native-valve history preserves severity, anatomy, interval and both implant denials',()=>{
 const canonical='Valvulopatía aórtica nativa leve y procedimiento urinario hace 3 semanas; sin prótesis valvular ni dispositivo intracardíaco.';
 const spoken='Tengo un problema leve en mi propia válvula aórtica y me hicieron un procedimiento en las vías urinarias hace 3 semanas; no tengo una válvula artificial ni ningún dispositivo dentro del corazón.';
 const failures=text=>interviewQuality({rows:[{answer:text,evidence:{facts:[{id:'pmh',canonical,spoken:text,rules:['patient-voice']}]}}]}).failures;
 assert.deepEqual(failures(spoken),[]);
 for(const changed of [spoken.replace('leve','grave'),spoken.replace('aórtica','mitral'),
  spoken.replace('3 semanas','3 días'),spoken.replace('mi propia','una artificial'),
  spoken.replace(' ni ningún dispositivo dentro del corazón',''),spoken.replace('no tengo','tengo')])
  assert(failures(changed).some(x=>x.startsWith('changed-clinical-content')),changed);
});
test('partial medication evidence must be an actual authored clause rather than an invented related medicine',()=>{
 const c={id:'TEST',common:{meds:['Losartán 50 mg diarios. Suspendió aspirina hace 3 días.']},intents:[]};
 const p={liveVitals:{hr:70,sys:120,dia:80,rr:16,spo2:98,temp:37},treatments:[]};
 const validate=canonical=>validateDialogueSources({facts:[{id:'anamnesis:meds:stopped',source:'common.meds',canonical,spoken:canonical}]},c,p);
 assert.deepEqual(validate('Suspendió aspirina hace 3 días.').failures,[]);
 assert.equal(validate('Suspendió warfarina hace 3 días.').failures.length,1);
 assert.equal(validate('No recuerdo si suspendí algún medicamento.').failures.length,1);
});
test('an honest unavailable medication answer cannot inflate verified clinical disclosure totals',()=>{
 const canonical='No recuerdo qué medicamentos tomo habitualmente.';
 const evidence={facts:[{id:'interview:response:0',source:'native.history-detail-unavailable',canonical,spoken:canonical}]};
 const c={id:'TEST',common:{},intents:[]},p={liveVitals:{hr:70,sys:120,dia:80,rr:16,spo2:98,temp:37},treatments:[]};
 const checked=validateDialogueSources(evidence,c,p),quality=interviewQuality({rows:[{answer:canonical,evidence}]});
 assert.deepEqual(checked.failures,[]);assert.equal(checked.verified,0);assert.equal(checked.unavailable,1);
 assert.equal(quality.facts,0);assert.equal(quality.unavailable,1);
});
test('undelivered evidence and unknown-answer variants earn neither clinical facts nor substantive diversity',()=>{
 const canonical='Tomo warfarina 5 mg.';
 const evidence={facts:[{id:'meds',source:'common.meds',canonical,spoken:canonical}]};
 const c={id:'TEST',common:{meds:[canonical]},intents:[]},p={liveVitals:{hr:70,sys:120,dia:80,rr:16,spo2:98,temp:37},treatments:[]};
 const checked=validateDialogueSources(evidence,c,p,'No lo recuerdo con más detalle.');
 assert.equal(checked.verified,0);assert(checked.failures.includes('not-delivered-clinical-fact:meds'));
 const quality=interviewQuality({rows:[{answer:'No lo recuerdo con más detalle.',evidence}]});
 assert.equal(quality.facts,0);assert(quality.failures.includes('lost-spoken-fact:0:meds'));
 const rows=['No recuerdo qué medicamentos tomo habitualmente.','No me acuerdo de qué medicamentos tomo habitualmente.'].map(answer=>({
  caseId:'same',clinicalInvariant:'same',rows:[{answer,evidence:{facts:[{id:'interview:response:0',source:'native.history-detail-unavailable',canonical:answer,spoken:answer}]}}]}));
 assert.equal(compareConversations(rows).uniqueSubstantiveBodies,1);
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
