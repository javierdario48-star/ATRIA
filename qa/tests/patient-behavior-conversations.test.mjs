import test from 'node:test';
import assert from 'node:assert/strict';
import {buildBehaviorProfile,styleClinicalAnswer,TRAIT_KEYS} from '../../src/v5/content/patient-behavior.js';

const facts=[
 'El dolor empezó hace seis horas.','Me duele debajo de las costillas a la derecha.',
 'Es un dolor continuo.','Lo siento como ocho de diez.',
 'No se corre hacia otro lugar.','Empeora cuando camino.',
 'No encuentro una posición que lo alivie.','Tengo náuseas desde esta mañana.',
 'No tuve fiebre.','No tengo antecedentes de cirugías.',
 'No tomo medicamentos todos los días.','Me duele más que al llegar.'
];
const archetypes=['calm','anxious','reserved','talkative','irritable','scared','uncooperative'];
test('finite pure wrapper samples retain authored facts (not complete native anamneses)',()=>{
 const profiles=new Set(),conversations=new Set(),responses=new Set();
 let turns=0,remarks=0;
 for(let i=0;i<64;i++){
  const seed='conversation-'+i,archetype=archetypes[i%archetypes.length];
  const behavior=buildBehaviorProfile(seed,archetype);
  const transcript=[];
  for(let j=0;j<facts.length;j++){
   const answer=styleClinicalAnswer(facts[j],{behavior,seed,question:'clinical-question-'+j,eventId:'event-'+j});
   assert(answer.includes(facts[j]),'clinical fact lost');
   assert.equal(answer,styleClinicalAnswer(facts[j],{behavior,seed,question:'clinical-question-'+j,eventId:'event-'+j}));
   assert.equal(styleClinicalAnswer(facts[j],{behavior,seed,impaired:true}),facts[j]);
   assert.equal(styleClinicalAnswer(facts[j],{behavior,seed,sensitive:true}),facts[j]);
   assert(!/^(?:Mire|Bueno|A ver|Le cuento|Doctor): (?:Mire|Bueno|A ver|Le cuento|Doctor):/.test(answer),'duplicated discourse marker');
   if(answer.includes('¿Me explica qué puede ser?')||answer.includes('Estoy un poco preocupado.')||answer.includes('Gracias por escucharme.'))remarks++;
   transcript.push(answer);responses.add(answer);turns++;
  }
  profiles.add(TRAIT_KEYS.map(k=>behavior[k]).join(','));
  conversations.add(transcript.join(' | '));
 }
 assert(profiles.size>50,'insufficient behavioral diversity');
 assert(conversations.size>20,'insufficient conversational diversity');
 assert(remarks<turns/3,'excessive emotional repetition');
});
