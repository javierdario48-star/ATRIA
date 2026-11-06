import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {createClinicalContent} from '../content/clinical-content.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
import {buildBehaviorProfile} from '../content/patient-behavior.js';
import {interviewQuality} from '../../../qa/v5/personality-conversation-metrics.mjs';
import {validateDialogueSources} from '../../../qa/v5/personality-fact-oracle.mjs';

const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const base={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const archetypes=['calm','anxious','reserved','talkative','irritable','scared','uncooperative'];
function fixture(c,{archetype='calm',checkpoint=null,roomId='natural-'+c.id,coop=false}={}){
 const uid=roomId+':patient',token={},other={id:'other',roomId};
 const options={roomId,mode:coop?'coop':'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid,caseId:c.id,personality:archetype,behavior:buildBehaviorProfile('natural-'+archetype,archetype)},
  content:createClinicalContent({...base,cases:base.cases.filter(row=>row.id!==c.id)},{additionalCases:[c]}),resolveContext:()=>({patientUid:uid}),
  ...(coop?{members:[{id:'doctor',name:'Doctor'},{id:'other',name:'Other'}],authenticate:x=>x===token?other:null}:{})};
 return {s:createGuardSession({...options,checkpoint}),options,token};
}
const receipt=x=>x.clinical.find(x=>x.kind==='history.ask')?.receipt;
const speak=async(s,id,text,token)=>receipt(await s.post({id,text},token));

test('directed anticoagulation history remains distinct from the habitual medication list',async()=>{
 for(const question of ['¿Anticoagulantes?','¿Tomás algún anticoagulante?']){
  const {s}=fixture(cardiologyPack.cases.find(c=>c.id==='CARD-04'));
  try{
   const habitual=await speak(s,'habitual','¿Qué medicamentos tomás?');
   assert.match(habitual.answer,/losartán.*metformina/i);
   const directed=await speak(s,'directed',question);
   assert.match(directed.answer,/Nunca.*anticoagulaci[oó]n/i);
   assert.match(directed.answer,/hemorragia|sangrado/i);
   assert.doesNotMatch(directed.answer,/duración de FA|Nunca recibió/i);
   assert.match(directed.answer,/24 horas/);
   assert(s.read().patient.intentHistory.some(row=>row.id==='anticoagulation'));
   assert(s.read().patient.intentHistory.some(row=>row.id==='meds'));
  }finally{s.dispose();}
 }
});

test('CARD-09 personal history is natural speech with all four valve/procedure facts and canonical evidence',async()=>{
 const c=cardiologyPack.cases.find(c=>c.id==='CARD-09');
 for(const archetype of archetypes){
  const {s}=fixture(c,{archetype});
  try{
   const before=s.read().patient,r=await speak(s,'natural-valve','¿Qué antecedentes personales tenés?');
   assert.match(r.answer,/problema leve.*(?:propia válvula aórtica|válvula aórtica.*propia)/i,archetype);
   assert.match(r.answer,/me hicieron.*(?:vías urinarias|urinario).*hace 3 semanas/i,archetype);
   assert.match(r.answer,/no tengo.*(?:válvula artificial|prótesis valvular).*ni.*(?:dispositivo dentro del corazón|dispositivo intracardíaco)/i,archetype);
   assert.doesNotMatch(r.answer,/Valvulopatía aórtica nativa|; sin prótesis/i);
   assert.equal(r.dialogue.facts[0].canonical,before.backgroundHistory.history.pmh);
   assert.equal(s.read().patient.intentHistory.find(x=>x.id==='anamnesis:pmh'||x.id==='pmh').answer,before.backgroundHistory.history.pmh);
   assert.deepEqual(validateDialogueSources(r.dialogue,c,before).failures,[]);
   assert.deepEqual(interviewQuality({rows:[{answer:r.answer,evidence:r.dialogue}]}).failures,[]);
   assert.deepEqual(s.read().patient.liveVitals,before.liveVitals);
   assert.deepEqual(s.read().patient.administrationLog,[]);
  }finally{s.dispose();}
 }
});

test('routine medication paraphrases never substitute the HEPAT hepatotoxic exposure denial or earn its fact',async()=>{
 const c=base.cases.find(c=>c.id==='HEPAT-001');
 for(const text of ['¿Tomás alguna medicación?','¿Qué tomás?','¿Alguna medicación?',
  '¿Tomás algo todos los días?','¿Qué remedios usás?','¿Qué medcamentos tomás?']){
  const {s}=fixture(c);
  try{
   const r=await speak(s,'routine',text);
   assert(r?.answer,text);assert.match(r.answer,/no (?:recuerdo|me acuerdo de).*medicamentos.*habitual/i,text);
   assert.doesNotMatch(r.answer,/paracetamol en exceso|fármacos nuevos/i,text);
   assert.deepEqual(s.read().patient.intentHistory,[],text);
   assert.match((await speak(s,'routine-which','¿Cuáles?')).answer,/no (?:recuerdo|me acuerdo de).*medicamentos/i);
   assert.deepEqual(s.read().patient.intentHistory,[]);
  }finally{s.dispose();}
 }
});
test('a recent-only medication history cannot become a habitual regimen in another case',async()=>{
 const c=respiratoryPack.cases.find(c=>c.id==='RESP-01'),{s}=fixture(c);
 try{
  assert.match((await speak(s,'habitual','¿Tomás algo todos los días?')).answer,/no (?:recuerdo|me acuerdo de).*medicamentos.*habitual/i);
  assert(!s.read().patient.intentHistory.some(x=>x.id==='meds'));
  const r=await speak(s,'recent','¿Tomaste alguna medicación recientemente?');
  assert.match(r.answer,/Solo tomé paracetamol; no usé antibióticos en los últimos tres meses/);
  assert(s.read().patient.intentHistory.some(x=>x.id==='meds'));
 }finally{s.dispose();}
});
test('an authored unavailable medication answer cannot be acquired as a known regimen',async()=>{
 const original=cardiologyPack.cases.find(c=>c.id==='CARD-01'),unknown='No recuerdo qué medicamentos tomo.';
 const c={...original,common:{...original.common,meds:[unknown]},history:{...original.history,meds:unknown}}, {s}=fixture(c);
 try{
  const r=await speak(s,'authored-unknown','¿Qué remedios usás?');
  assert.match(r.answer,/No recuerdo qué medicamentos tomo/);
  assert.deepEqual(s.read().patient.intentHistory,[]);
  assert.equal(r.dialogue.facts[0].source,'native.history-detail-unavailable');
 }finally{s.dispose();}
});

test('a habitual medication question answers its current regimen before last-dose details',async()=>{
 const c=neurologyPack.cases.find(c=>c.id==='NEUR-04'),{s}=fixture(c);
 try{
  const before=s.read().patient,r=await speak(s,'habitual-first','¿Qué remedios usás?');
  assert.match(r.answer,/^Tomo losartán de forma irregular\./i);
  assert.match(r.answer,/La última dosis de warfarina la tomé anoche\./i);
  assert.equal(r.dialogue.facts[0].canonical,c.history.meds);
  assert.deepEqual(validateDialogueSources(r.dialogue,c,before,r.answer).failures,[]);
  assert.deepEqual(interviewQuality({rows:[{answer:r.answer,evidence:r.dialogue}]}).failures,[]);
 }finally{s.dispose();}
});

test('an explicit paracetamol overdose question discloses the real denial and preserves routine uncertainty on recovery',async()=>{
 const c=base.cases.find(c=>c.id==='HEPAT-001'),{s,options,token}=fixture(c,{coop:true});let restored;
 try{
  await speak(s,'routine','¿Qué tomás?');
  const r=await speak(s,'overdose','¿Tomaste mucho paracetamol?',token);
  assert.match(r.answer,/^No tomé paracetamol en exceso ni otros fármacos nuevos\.$/);
  assert.equal(s.read().patient.intentHistory.filter(x=>x.id==='meds').length,1);
  assert.equal(s.read().patient.intentHistory[0].eventId,r.eventId);
  restored=createGuardSession({...options,checkpoint:JSON.parse(JSON.stringify(await s.checkpoint()))});
  assert.match((await speak(restored,'routine-follow','¿Cuáles?')).answer,/no (?:recuerdo|me acuerdo de).*medicamentos/i);
  assert.match((await speak(restored,'overdose-follow','¿Cuáles?',token)).answer,/paracetamol en exceso/);
  assert.equal(restored.read().patient.intentHistory.filter(x=>x.id==='meds').length,1);
 }finally{s.dispose();restored?.dispose();}
});

test('medication subintents select authored recent, stopped, self-medication and adherence statements',async()=>{
 const c0=cardiologyPack.cases.find(c=>c.id==='CARD-01');
 const full='Losartán 50 mg diarios. Tomó paracetamol ayer por su cuenta. Suspendió aspirina hace 3 días. Toma losartán de forma irregular.';
 const c={...c0,common:{...c0.common,meds:[full]},history:{...c0.history,meds:full}};
 for(const [question,want,absent] of [
  ['¿Tomaste alguna medicación recientemente?',/Tomé paracetamol ayer por mi cuenta\./,/Tomo losartán 50 mg/],
  ['¿Dejaste alguna medicación?',/Suspendí aspirina hace 3 días\./,/paracetamol|losartán/],
  ['¿Tomaste algo por tu cuenta?',/Tomé paracetamol ayer por mi cuenta\./,/aspirina|losartán/],
  ['¿Tomás los medicamentos como te indicaron?',/Tomo losartán de forma irregular\./,/paracetamol/]
 ]){
  const {s}=fixture(c);
  try{
   const before=s.read().patient,r=await speak(s,'subintent',question);
   assert.match(r.answer,want,question);assert.doesNotMatch(r.answer,absent,question);
   assert(!s.read().patient.intentHistory.some(x=>x.id==='meds'),'partial disclosure cannot award the complete medication fact');
   assert.deepEqual(validateDialogueSources(r.dialogue,c,before).failures,[]);
   assert.deepEqual(interviewQuality({rows:[{answer:r.answer,evidence:r.dialogue}]}).failures,[]);
   if(/Dejaste/.test(question)){
    assert.match((await speak(s,'stopped-when','¿Desde cuándo?')).answer,/3 días/);
    assert.equal(s.read().patient.intentHistory.length,1,'a follow-up cannot reacquire history');
   }
  }finally{s.dispose();}
 }
});

test('medication context stays with each patient and allergies/substances keep their principal history domains',async()=>{
 const c=cardiologyPack.cases.find(c=>c.id==='CARD-01'),one=fixture(c),two=fixture(base.cases.find(c=>c.id==='HEPAT-001'));
 try{
  assert.match((await speak(one.s,'routine','¿Qué tomás?')).answer,/Tomo losartán y metformina/);
  const unknown=await speak(two.s,'unknown','¿Cuáles?');
  assert.match(unknown.answer??unknown.message,/No entendí|No lo recuerdo|No recuerdo/);
  const allergy=await speak(one.s,'allergy','¿Algún medicamento te dio alergia?');
  assert.match(allergy.answer,/no conozco alergias/i);
  assert.equal(one.s.read().patient.interview.speakers.doctor.topic,'allergies');
  const substance=await speak(one.s,'substance','¿Usás drogas o cocaína?');
  assert.doesNotMatch(substance.answer,/Tomo losartán|metformina/i);
  assert.equal(one.s.read().patient.interview.speakers.doctor.topic,'drugs');
 }finally{one.s.dispose();two.s.dispose();}
});
