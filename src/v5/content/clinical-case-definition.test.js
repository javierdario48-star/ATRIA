import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {defineClinicalCase} from './clinical-case-definition.js';
import {generatePatientVariation} from './patient-variation.js';
test('authored specialty patients carry reproducible optional typed drug allergies',()=>{
 const c=defineClinicalCase(input),facts=Array.from({length:100},(_,i)=>generatePatientVariation(c.variation,'allergy-seed-'+i));
 assert(facts.some(x=>x.allergies.length===0));
 assert(facts.some(x=>x.allergies.some(a=>a.severity==='severe')));
 assert(facts.some(x=>x.allergies.some(a=>a.severity==='mild')));
 assert.deepEqual(facts[42],generatePatientVariation(c.variation,'allergy-seed-42'));
});
import {createGuardSession} from '../clinical/guard-session.js';
const input={id:'RESP-101',specialty:'Respiratorio',title:'Neumonía',chief:'Tos y fiebre',opening:'Me cuesta respirar.',ageRange:[20,40],history:{onset:'Desde ayer.',pmh:'Asma en la infancia.',meds:'No tomo medicación.',allergies:'Sin reacciones conocidas.',risk:'No fumé.'},vitals:{temp:38,hr:110,rr:28,bp:'110/70',spo2:90},examFindings:{appearance:'Taquipnea.',lungs:'Crepitantes derechos.'},studies:[{id:'g_rx',label:'Rx tórax',aliases:['rx'],type:'imaging',delay:5,result:'Condensación.'}],dx:['neumonía'],differential:['TEP'],interventionIds:['oxygen'],keyStudies:['g_rx'],keyInterventions:['oxygen'],clinicalPolicy:{schemaVersion:1,traits:['infection'],trajectory:{early:[0,0,0,0,0,0],late:[0,0,0,0,0,0],earlyEnd:10,lateEnd:60},complications:[],responses:[],closure:{destinations:['sala'],treatment:[['oxygen']]}}};
test('case definition preserves authored facts while supplying the existing clinical content contract',()=>{const c=defineClinicalCase(input);assert.equal(c.common.pmh[0],'Asma en la infancia.');assert.equal(c.intents.find(x=>x.id==='risk').answers[0],'No fumé.');assert.equal(c.physicalExam.lungs,'Crepitantes derechos.');assert.equal(c.clinicalExecutorId,'acute-policy-v1');const p=generatePatientVariation(c.variation,'patient');assert(p.age>=20&&p.age<=40);assert.equal(c.clinicalPolicy.traits[0],'infection');});
test('definition rejects incomplete authored clinical identity instead of inventing medical history',()=>{assert.throws(()=>defineClinicalCase({...input,history:{onset:'ayer'}}),/history/);});

test('authored history domains answer natural Spanish questions through the public session', async () => {
 const history = {...input.history,
  support: 'Vivo con mi hermana y puede acompañarme al control.',
  baseline: 'Antes caminaba varias cuadras sin detenerme.',
  response: 'El inhalador ayudó durante pocos minutos.',
  exposure: 'No tuve contacto con tuberculosis ni hice viajes recientes.',
  aspiration: 'A veces me atraganto cuando como.',
  associated: 'También noté cansancio desde esta mañana.',
  function: 'Necesito ayuda para vestirme desde ayer.',
  pain: 'Siento una presión leve en el pecho.'};
 const c = defineClinicalCase({...input, history, pharmacology: {coverageSets: [['ceftriaxone']]}});
 const uid = 'natural-authored-history';
 const contentFile = name => JSON.parse(readFileSync(new URL('./' + name + '.json', import.meta.url)));
 const session = createGuardSession({roomId: uid, mode: 'solo', actorId: 'doctor', actorName: 'Doctor',
  patient: {uid, caseId: c.id}, content: {cases: [c], therapies: contentFile('therapies'), defaultDoses: contentFile('default-doses')},
  resolveContext: () => ({patientUid: uid, focusedNpc: null})});
 try {
  for (const [index, [id, text]] of [
   ['support', '¿Con quién vive?'], ['baseline', '¿Cómo era su estado habitual?'],
   ['response', '¿Le sirvió el inhalador?'], ['exposure', '¿Tuvo contacto con tuberculosis?'],
   ['aspiration', '¿Se atraganta al comer?'], ['associated', '¿Tiene síntomas asociados?'],
   ['function', '¿Puede hacer sus actividades?'], ['pain', '¿Tiene dolor?']
  ].entries()) {
   const result = await session.post({id: 'history-' + index, text});
   assert.equal(result.clinical[0].status, 'executed', text);
   assert(result.clinical[0].receipt.answer.includes(history[id]), text);
   assert(session.read().patient.intentHistory.some(item => item.id === id && item.answer === history[id]), id);
  }
 } finally { session.dispose(); }
});
