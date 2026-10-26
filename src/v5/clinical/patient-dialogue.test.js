import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function setup(caseId='APP-001',uid='P1'){
 let n=0,near=uid,focus=null;
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Javier',patient:{uid,caseId},content,
  resolveContext:()=>({patientUid:near,focusedNpc:focus})});
 return {s,send:text=>s.post({id:'d'+(++n),text}),near:x=>near=x,focus:x=>focus=x};
}
const answer=ack=>ack.clinical.map(x=>x.receipt?.answer||'').join(' ');
test('natural compound pain questions acquire each actual dimension and the correct APP history facts',async()=>{
 const f=setup(),before=f.s.read();
 const a=await f.send('¿Dónde te duele y desde cuándo empezó?');
 assert.match(answer(a),/abajo a la derecha/);assert.match(answer(a),/ocho horas/);
 const p=f.s.read().patient;
 assert(p.intentHistory.some(x=>x.id==='migration'));assert(p.intentHistory.some(x=>x.id==='onset'));
 assert(p.interview.dimensions.place);assert(p.interview.dimensions.onset);
 assert.equal(p.interview.dimensions.place.patientUid,'P1');
 assert.equal(p.lastVitalsKnown,null);assert.equal(p.reassessments,0);
 assert.deepEqual(p.liveVitals,before.patient.liveVitals);assert.deepEqual(f.s.read().clock,before.clock);assert.deepEqual(p.treatments,[]);
 f.s.dispose();
});
test('follow-up duration remains tied to fever instead of granting the pain onset history',async()=>{
 const f=setup('CIRR-001');
 assert.match(answer(await f.send('¿Tuvo fiebre?')),/No tuve fiebre/);
 assert.match(answer(await f.send('¿Y desde cuándo?')),/No tuve fiebre/);
 const p=f.s.read().patient;assert.equal(p.interview.lastSymptom,'fever');
 assert(!p.intentHistory.some(x=>x.id==='onset'));
 assert.match(answer(await f.send('¿Desde cuándo empezó la hinchazón?')),/varias semanas/);
 assert(f.s.read().patient.intentHistory.some(x=>x.id==='onset'));f.s.dispose();
});
test('short pain follow-ups reuse patient context and preserve the original effective pain rating',async()=>{
 for(const [caseId,pain] of [['CIRR-001',3],['APP-001',7]]){
  const f=setup(caseId);await f.send('¿Dónde te duele?');
  assert.match(answer(await f.send('¿Y cómo es?')),/presión|continuo/);
  assert.match(answer(await f.send('¿Y qué tan fuerte?')),new RegExp(pain+' de 10'));
  assert(!f.s.read().patient.intentHistory.some(x=>x.id==='onset'),'pain intensity/character cannot grant duration');
  f.s.dispose();
 }
});
test('greeting, symptom summary and subjective response never fabricate completed assessment or therapy',async()=>{
 const f=setup('CIRR-001');
 assert.match(answer(await f.send('Hola, soy el doctor. ¿Qué le pasa?')),/Hola, doctor.*hinchando/);
 assert(f.s.read().patient.intentHistory.some(x=>x.id==='interview:symptoms'&&/hinchando/.test(x.answer)),'the actual symptom summary must enter acquired history');
 assert(!f.s.read().patient.intentHistory.some(x=>x.id==='onset'));
 const a=await f.send('¿Cómo te sentís ahora?');assert.match(answer(a),/Sigo como cuando llegué/);
 let p=f.s.read().patient;assert.equal(p.reassessments,0);assert.equal(p.lastVitalsKnown,null);assert.equal(p.examDone,false);
 await f.send('Enfermera espironolactona');f.s.advance(1);await f.s.flush();
 assert.match(answer(await f.send('¿Te sentís mejor?')),/parecido.*mejoría clara/);
 p=f.s.read().patient;assert.equal(p.liveVitals.hr,94);assert.equal(p.reassessments,0);f.s.dispose();
});
test('multiple history domains, technical vocabulary and unknown questions produce one patient reply without executing orders',async()=>{
 const f=setup('CIRR-001');
 const a=await f.send('¿Toma alcohol y qué medicación usa?');
 assert.match(answer(a),/alcohol.*años/);assert.match(answer(a),/presión/);
 assert.equal(f.s.read().messages.filter(m=>m.id.startsWith('ack:')).length,1);
 assert.match(answer(await f.send('¿Tuvo hematemesis o melena?')),/sangre|sangrado/);
 const unknown=await f.send('¿Cuál es su planeta favorito?');assert.equal(unknown.clinical[0].status,'rejected');
 const last=f.s.read().messages.at(-1);assert.equal(last.role,'patient');assert.doesNotMatch(last.text,/No ejecutado/);
 assert.deepEqual(f.s.read().patient.treatments,[]);f.s.dispose();
});
test('context is isolated by patient and explicit NPC names override a previously focused NPC',async()=>{
 const a=setup('APP-001','A'),b=setup('CIRR-001','B');
 await a.send('¿Tuvo vómitos?');assert.equal(b.s.read().patient.interview?.lastSymptom??null,null);
 assert.match(answer(await b.send('¿Desde cuándo?')),/varias semanas/);
 a.focus('nurse');assert.equal((await a.send('Vega, dame una pista')).recipient,'vega');
 a.focus('vega');assert.equal((await a.send('Enfermera, hemograma')).recipient,'nurse');
 a.near(null);const before=a.s.read().patient.intentHistory.length;await a.send('¿Desde cuándo empezó?');assert.equal(a.s.read().patient.intentHistory.length,before);
 a.s.dispose();b.s.dispose();
});
test('duration follow-ups with verbs retain the named symptom and never acquire abdominal onset',async()=>{
 for(const [caseId,question,symptom,expected] of [
  ['CIRR-001','¿Tuvo fiebre?','fever',/No tuve fiebre/],
  ['APP-001','¿Tuvo vómitos?','vomit',/No recuerdo exactamente/]
 ]){
  const f=setup(caseId);await f.send(question);
  for(const text of ['¿Y desde cuándo empezó?','¿Cuándo comenzó?']){
   assert.match(answer(await f.send(text)),expected);
   assert.equal(f.s.read().patient.interview.lastSymptom,symptom);
   assert(!f.s.read().patient.intentHistory.some(x=>x.id==='onset'));
  }
  assert.match(answer(await f.send('¿Desde cuándo empezó el dolor?')),caseId==='APP-001'?/ocho horas/:/varias semanas/);
  assert(f.s.read().patient.intentHistory.some(x=>x.id==='onset'));f.s.dispose();
 }
});
test('greetings and subjective questions preserve substantive factual and pain questions in the same message',async()=>{
 const f=setup('CIRR-001');
 assert.match(answer(await f.send('Hola doctor, ¿toma alcohol?')),/Hola, doctor.*alcohol.*años/);
 assert(f.s.read().patient.intentHistory.some(x=>x.id==='alcohol'));
 assert(!f.s.read().patient.intentHistory.some(x=>x.id==='onset'));
 assert.match(answer(await f.send('Hola doctor, ¿desde cuándo empezó el dolor?')),/Hola, doctor.*varias semanas/);
 const a=await f.send('¿Cómo se siente? ¿Qué medicación usa?');
 assert.match(answer(a),/Sigo como cuando llegué.*presión/);
 assert(f.s.read().patient.intentHistory.some(x=>x.id==='meds'&&/presión/.test(x.answer)));
 assert.equal(f.s.read().patient.reassessments,0);assert.equal(f.s.read().patient.lastVitalsKnown,null);f.s.dispose();
});
test('pain dimensions take precedence over broad appetite keywords without granting unrelated history',async()=>{
 const f=setup();
 for(const [text,dimension,expected] of [
  ['¿Dónde le duele al comer?','place',/abajo a la derecha/],
  ['¿Cuánto le duele al comer?','intensity',/7 de 10/],
  ['¿Comer le empeora el dolor?','worse',/caminar|mover|toser/]
 ]){
  assert.match(answer(await f.send(text)),expected);assert(f.s.read().patient.interview.dimensions[dimension]);
  assert(!f.s.read().patient.intentHistory.some(x=>x.id==='anorexia'));
 }
 assert.match(answer(await f.send('¿Tiene apetito?')),/hambre/);
 assert(f.s.read().patient.intentHistory.some(x=>x.id==='anorexia'));f.s.dispose();
});


test('five migrated patients understand common open questions without exposing other case facts',async()=>{
 for(const [caseId,expected] of [
  ['APP-001',/ombligo.*derecha/],
  ['CIRR-001',/hinchando/],
  ['PERI-PBE-001',/hinchada.*fiebre/],
  ['PERI-SEC-001',/duele muchísimo.*vomité/],
  ['PERI-TER-001',/operaciones.*fiebre/]
 ]){
  const f=setup(caseId);
  for(const question of ['¿Por qué estás acá?','¿Qué sientes?','¿Qué te pasó?',
   '¿Síntomas?','¿Qué te pasa?','¿Qué te trae por acá?']){
   const a=await f.send(question);
   assert.equal(a.clinical[0].status,'executed',caseId+': '+question);
   assert.match(answer(a),expected,caseId+': '+question);
  }
  const patient=f.s.read().patient;
  assert(patient.intentHistory.some(x=>x.id==='interview:symptoms'));
  assert.equal(patient.examDone,false);
  assert.equal(patient.lastVitalsKnown,null);
  assert.deepEqual(patient.treatments,[]);
  f.s.dispose();
 }
});
test('broad status, compound context and specific followups remain separate intents',async()=>{
 const f=setup('APP-001');
 assert.match(answer(await f.send('¿Cómo estás?')),/Sigo como cuando llegué/);
 const both=await f.send('¿Qué te pasó? ¿Desde cuándo empezó el dolor?');
 assert.match(answer(both),/ombligo.*ocho horas/);
 assert(f.s.read().patient.intentHistory.some(x=>x.id==='onset'));
 assert.match(answer(await f.send('¿Dónde te duele?')),/abajo a la derecha/);
 assert.match(answer(await f.send('¿Cuánto te duele?')),/7 de 10/);
 const unknown=await f.send('¿De qué color es tu planeta favorito?');
 assert.equal(unknown.clinical[0].status,'rejected');
 f.s.dispose();
});

test('colloquial symptom requests remain patient-specific across additional phrasings',async()=>{
 const f=setup('CIRR-001');
 for(const question of ['¿Qué síntomas tenés?','¿Cuáles son tus síntomas?','¿Qué molestias tienes?',
  'Contame qué te pasa','¿Me podés decir qué te pasó?','¿En qué puedo ayudarte?']){
  const result=await f.send(question);
  assert.equal(result.clinical[0].status,'executed',question);
  assert.match(answer(result),/hinchando.*cansado/,question);
 }
 assert.equal(f.s.read().patient.reassessments,0);
 assert.deepEqual(f.s.read().patient.treatments,[]);
 f.s.dispose();
});

test('real untreated shock limits speech instead of fabricating acquired history after a delayed greeting',async()=>{
 const f=setup('PERI-SEC-001');
 f.s.advance(45);
 const before=f.s.read().patient;
 assert(before.liveVitals.sys<70,'native untreated deterioration must cause the impairment');
 assert(before.hypoperfusionNativeMinutes>=2);
 const reply=await f.send('Hola ¿Qué te pasó?');
 assert.equal(reply.clinical[0].status,'executed','a limited verbal reply is still delivered');
 assert.equal(answer(reply),'Dolor… panza…');
 const after=f.s.read().patient;
 assert.deepEqual(after.intentHistory,[],'incoherent speech cannot grant a complete symptom history');
 assert.equal(after.examDone,false);
 assert.deepEqual(after.treatments,[]);
 assert.deepEqual(after.liveVitals,before.liveVitals,'chat cannot stabilize shock');
 f.s.dispose();
});

test('stable PUD and celiac patients retain factual dialogue after browser setup delays',async()=>{
 for(const [caseId,expected] of [['PUD-001',/ardor/],['CELIAC-001',/meses con diarrea/]]){
  const f=setup(caseId);
  f.s.advance(180);
  const reply=await f.send('Hola ¿Qué te pasó?');
  assert.equal(reply.clinical[0].status,'executed');
  assert.match(answer(reply),expected);
  const p=f.s.read().patient;
  assert(p.intentHistory.some(x=>x.id==='interview:symptoms'&&x.patientUid==='P1'));
  assert.equal(p.caseEnded,false);
  assert.equal(p.examDone,false);
  assert.deepEqual(p.treatments,[]);
  f.s.dispose();
 }
});
