import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {executePatientDialogue} from './patient-dialogue.js';
import {createClinicalContent} from '../content/clinical-content.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function setup(caseId='APP-001',uid='P1'){
 let n=0,near=uid,focus=null;
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Javier',patient:{uid,caseId},content,
  resolveContext:()=>({patientUid:near,focusedNpc:focus})});
 return {s,send:text=>s.post({id:'d'+(++n),text}),near:x=>near=x,focus:x=>focus=x};
}
const answer=ack=>ack.clinical.map(x=>x.receipt?.answer||'').join(' ');
test('an unconscious patient retains impaired speech while an authored companion supplies indirect history',async()=>{
 const c=neurologyPack.cases.find(x=>x.id==='NEUR-06'),uid='witness-history',
  extended=createClinicalContent(content,{additionalCases:[c]});
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid,caseId:c.id},content:extended,resolveContext:()=>({patientUid:uid})});
 try{
  const reply=await s.post({id:'witness-onset',text:'¿Desde cuándo?'});
  assert.match(answer(reply),/Familiar acompañante/);assert.match(answer(reply),/12 minutos/);
  assert.equal(s.read().patient.neurology.verbal,1);
  const fact=s.read().patient.intentHistory.find(x=>x.id==='onset');
  assert.equal(fact.historySource.kind,'companion');assert.equal(fact.patientUid,uid);
 }finally{s.dispose();}
});
test('authored specialty patients answer real history through the public session without executing care',async()=>{
 const caseData=respiratoryPack.cases.find(c=>c.id==='RESP-01');
 const uid='specialty-history',clinicalContent=createClinicalContent(content,{additionalCases:[caseData]});
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid,caseId:caseData.id},content:clinicalContent,
  resolveContext:()=>({patientUid:uid,focusedNpc:null})});
 try{
  const before=s.read();
  const questions=[['Hola, ¿qué le pasó?',/Tengo fiebre.*costado/],
   ['¿Desde cuándo?',/tres días/],['¿Alergias?',/alergias.*medicamentos/],
   ['¿Antecedentes?',/enfermedad cardíaca, pulmonar, renal ni diabetes/],
   ['¿Support?',/Vivo con mi familia/],['¿Medicamentos?',/paracetamol/]];
  for(const [i,[text,want]] of questions.entries()){
   const result=await s.post({id:'specialty-history-'+i,text});
   assert.equal(result.clinical[0].status,'executed',text);
   assert.match(answer(result),want,text);
  }
  const after=s.read();
  for(const id of ['onset','pmh','support','meds'])assert(after.patient.intentHistory.some(x=>x.id===id||x.id==='anamnesis:'+id),id);
  assert.deepEqual(after.patient.liveVitals,before.patient.liveVitals);
  assert.deepEqual(after.clock,before.clock);
  assert.deepEqual(after.patient.treatments,[]);
  assert.equal(after.patient.examDone,false);
 }finally{s.dispose();}
});
test('seeded identity and background stay identical across modes and survive public-session checkpoint restore',async()=>{
 const c=respiratoryPack.cases.find(c=>c.id==='RESP-01');
 const clinicalContent=createClinicalContent(content,{additionalCases:[c]}),uid='shared-variation:patient';
 const options={roomId:'shared-variation',actorId:'doctor',actorName:'Doctor',patient:{uid,caseId:c.id},
  content:clinicalContent,resolveContext:()=>({patientUid:uid,focusedNpc:null})};
 const solo=createGuardSession({...options,mode:'solo'}),members=[{id:'doctor',name:'Doctor'},{id:'other',name:'Other'}];
 const coop=createGuardSession({...options,mode:'coop',members});
 let restored;
 try{
  const initial=solo.read().patient,shared=coop.read().patient;
  assert(initial.backgroundHistory?.history?.pmh,'authored background must reach the single owned patient');
  for(const key of ['name','age','personality','variation','backgroundHistory','allergyHistory'])assert.deepEqual(shared[key],initial[key],key);
  assert.equal(initial.variation.backgroundHistory,undefined,'factual history is stored once on the owner');
  const greeting=await coop.post({id:'greeting',text:'Hola ¿Qué le pasó?'});
  assert.doesNotMatch(answer(greeting),/fractura|apendicectomía|infección de oído/i);
  const asked=await coop.post({id:'background',text:'¿Antecedentes personales?'});
  assert( coop.read().patient.intentHistory.some(x=>x.source==='patient.backgroundHistory'&&x.answer===initial.backgroundHistory.history.pmh));
  const checkpoint=await coop.checkpoint();
  const changed={...c,variation:{...c.variation,backgroundHistory:[{id:'changed',history:{pmh:'Una historia diferente.'}}]}};
  restored=createGuardSession({...options,mode:'coop',members,checkpoint,
   content:{...clinicalContent,cases:clinicalContent.cases.map(row=>row.id===c.id?changed:row)}});
  assert.deepEqual(restored.read().patient.backgroundHistory,initial.backgroundHistory);
  const again=await restored.post({id:'background-again',text:'¿Antecedentes personales?'});
  assert.equal(answer(again),answer(asked),'restored patient speaks the same persisted facts');
 }finally{solo.dispose();coop.dispose();restored?.dispose();}
});
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

test('variation identity and personality affect speech without changing clinical facts',async()=>{
 const base=content.cases.find(c=>c.id==='CIRR-001');
 const modified={...content,cases:content.cases.map(c=>c.id!==base.id?c:{...c,variation:{
  ageRange:[55,65],firstNames:['Amalia'],lastNames:['Ríos'],personalities:['ansiosa'],
  openings:['Me siento cansada'],allergies:[],complications:[]}})};
 const s=createGuardSession({roomId:'variation-dialogue',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'patient-variation',caseId:'CIRR-001'},content:modified,resolveContext:()=>({patientUid:'patient-variation',focusedNpc:null})});
 const p=s.read().patient;
 assert.equal(p.name,'Amalia Ríos');assert.equal(p.personality,'ansiosa');
 const a=await s.post({id:'name',text:'¿Cómo te llamas?'});
 assert.match(answer(a),/Amalia Ríos/);
 const b=await s.post({id:'symptoms',text:'¿Qué te pasa?'});
 assert.match(answer(b),/Estoy preocupado/);
 assert.match(answer(b),/hinchando/);
 assert.equal(s.read().patient.treatments.length,0);
 s.dispose();
});

function variedDialoguePatient(personality){
 return {uid:'dialogue-personality',caseId:'CIRR-001',name:'Ana Ríos',personality,intentHistory:[],treatments:[],
  liveVitals:{hr:94,rr:20,sys:108,dia:68,spo2:96,temp:37.2},
  variation:{seed:'fixed-history',allergies:[
   {id:'intolerance',drugId:'morphine',type:'intolerance',historyDisclosure:'La morfina me da náuseas, sin ronchas.'},
   {id:'severe',drugId:'ceftriaxone',type:'hypersensitivity',severity:'severe',historyDisclosure:'Con ceftriaxona se me cerró la garganta.'}
  ]}};
}
function directHistory(p,text,id='test-history'){
 return executePatientDialogue(p,content.cases.find(c=>c.id===p.caseId),
  {eventId:id,actorId:'doctor',intent:{kind:'history.ask',id:'history',sourceText:text}},{nativeMinute:0});
}

test('all seven personality types change only conversational style and never orientation or clinical facts',()=>{
 const fixtures=[['calm',/^Se me viene/],['anxious',/^Estoy preocupado/],['reserved',/^Bueno…/],
  ['talkative',/^Le cuento, doctor/],['irritable',/^Esto me tiene molesto/],
  ['scared',/^Tengo miedo/],['uncooperative',/^No tengo muchas ganas de hablar/]];
 for(const [personality,style] of fixtures){
  const p=variedDialoguePatient(personality),before=structuredClone(p.liveVitals);
  const result=directHistory(p,'¿Qué te pasa?');
  assert.match(result.receipt.answer,style,personality);
  assert.match(result.receipt.answer,/Se me viene hinchando la panza/);
  assert.doesNotMatch(result.receipt.answer,/morfina|ceftriaxona|garganta|ronchas|mi casa|no sé dónde/i);
  assert.equal(p.intentHistory.length,1);assert.equal(p.intentHistory[0].answer,'Se me viene hinchando la panza, estoy cansado y me dijeron que me ven algo amarillo.');
  assert.match(directHistory(p,'¿Dónde estás?','orientation').receipt.answer,/Estoy en la guardia del hospital/);
  assert.deepEqual(p.liveVitals,before);assert.deepEqual(p.treatments,[]);
 }
});

test('typed variation disclosures are spoken verbatim only after asking reaction history',()=>{
 const p=variedDialoguePatient('anxious');
 p.allergies=['ceftriaxone'];p.severeAllergies=['ceftriaxone'];
 p.allergyHistoryAnswer='Tengo alergia a ceftriaxona (reacción grave).';
 const greeting=directHistory(p,'Hola ¿Qué te pasa?');
 assert.doesNotMatch(greeting.receipt.answer,/morfina|ceftriaxona|garganta|ronchas/);
 assert(!p.intentHistory.some(x=>x.source==='patient.allergies'));
 const asked=directHistory(p,'¿Tenés alergias a medicamentos?','asked-allergies');
 assert.equal(asked.receipt.answer,'La morfina me da náuseas, sin ronchas. Con ceftriaxona se me cerró la garganta.');
 const history=p.intentHistory.find(x=>x.source==='patient.allergies');assert(history);
 assert.equal(history.eventId,'asked-allergies');
 assert.equal(p.variation.allergies[0].type,'intolerance');assert.equal(p.variation.allergies[1].severity,'severe');
});

test('a generated intolerance disclosure cannot hide an existing severe allergy from history',()=>{
 const p=variedDialoguePatient('calm');p.variation.allergies=p.variation.allergies.slice(0,1);
 p.allergies=['ceftriaxone'];p.severeAllergies=['ceftriaxone'];
 p.allergyHistoryAnswer='Tengo alergia a ceftriaxona (reacción grave).';
 const result=directHistory(p,'¿Tiene alergias?');
 assert.match(result.receipt.answer,/La morfina me da náuseas, sin ronchas/);
 assert.match(result.receipt.answer,/ceftriaxona \(reacción grave\)/);
});

test('intolerance or mild history of the same drug cannot cover a documented severe hypersensitivity',()=>{
 for(const reaction of [{type:'intolerance'},{type:'hypersensitivity',severity:'mild'}]){
  const p=variedDialoguePatient('calm');p.variation.allergies=[{id:'new-history',drugId:'ceftriaxone',
   ...reaction,historyDisclosure:'Con ceftriaxona tuve una molestia.'}];
  p.allergies=['ceftriaxone'];p.severeAllergies=['ceftriaxone'];
  p.allergyHistoryAnswer='Tengo alergia a ceftriaxona (reacción grave).';
  const result=directHistory(p,'¿Tiene alergias?');
  assert.match(result.receipt.answer,/Con ceftriaxona tuve una molestia/);
  assert.match(result.receipt.answer,/ceftriaxona \(reacción grave\)/);
 }
});

test('age history uses the persisted patient identity instead of the case demonstration age',()=>{
 const p=variedDialoguePatient('calm');p.age=25;
 const result=directHistory(p,'¿Cuántos años tiene?','patient-age');
 assert.match(result.receipt.answer,/25/);assert.doesNotMatch(result.receipt.answer,/58/);
 assert.equal(p.age,25);
});

test('personality never adds speech or acquired history when the clinical owner reports impaired verbal response',()=>{
 const p=variedDialoguePatient('ansiosa');p.neurology={eye:4,verbal:4,motor:6};
 assert.equal(directHistory(p,'¿Dónde estás?').receipt.answer,'No sé bien… ¿estoy en mi casa? ¿Dónde estamos?');
 p.neurology.verbal=3;
 assert.equal(directHistory(p,'¿Tenés alergias?').receipt.answer,'Dolor… panza…');
 assert.deepEqual(p.intentHistory,[]);
});

test('persisted authored background replaces only asked personal history and stays out of greetings and symptoms',()=>{
 const p=variedDialoguePatient('calm');
 p.backgroundHistory={id:'resolved-fracture',history:{pmh:'Tengo presión alta y tuve una fractura de brazo que ya curó.'}};
 const before=structuredClone(p.liveVitals);
 assert.doesNotMatch(directHistory(p,'Hola ¿Qué te pasa?').receipt.answer,/fractura/);
 assert(!p.intentHistory.some(x=>x.source==='patient.backgroundHistory'));
 const asked=directHistory(p,'¿Tiene enfermedades previas?','asked-background');
 assert.equal(asked.receipt.answer,'Tengo presión alta y tuve una fractura de brazo que ya curó.');
 assert.equal(p.intentHistory.find(x=>x.source==='patient.backgroundHistory')?.eventId,'asked-background');
 assert.doesNotMatch(directHistory(p,'¿Qué medicación toma?','asked-meds').receipt.answer,/fractura/);
 assert.deepEqual(p.liveVitals,before);assert.deepEqual(p.treatments,[]);
});

test('medication reaction questions acquire allergy history instead of being swallowed by medication history',()=>{
 for(const text of ['¿Tuvo alguna reacción con antibióticos?','¿Tiene reacciones a medicamentos?']){
  const p=variedDialoguePatient('anxious');
  p.allergyHistory=p.variation.allergies;delete p.variation.allergies;
  const result=directHistory(p,text);
  assert.equal(result.status,'executed',text);
  assert.equal(result.receipt.answer,'La morfina me da náuseas, sin ronchas. Con ceftriaxona se me cerró la garganta.');
  assert(p.intentHistory.some(x=>x.source==='patient.allergies'));
  assert(!p.intentHistory.some(x=>x.id==='meds'));
 }
});

test('documented reaction facts cannot fall back to a case denial when the patient lacks a detailed disclosure',()=>{
 const p=variedDialoguePatient('calm');p.allergyHistory=[];delete p.variation.allergies;
 p.allergies=['ceftriaxone'];p.severeAllergies=['ceftriaxone'];
 const result=directHistory(p,'¿Tiene alergias?');
 assert.equal(result.status,'executed');
 assert.doesNotMatch(result.receipt.answer,/no (?:tengo|conozco)|sin (?:alergias|reacciones)/i);
 assert.match(result.receipt.answer,/reacci|alergia/i);
});

test('asking how the patient was before acquires authored baseline rather than current subjective status',()=>{
 const c=respiratoryPack.cases.find(c=>c.history.baseline),p=variedDialoguePatient('calm');p.caseId=c.id;
 const result=executePatientDialogue(p,c,{eventId:'baseline',actorId:'doctor',
  intent:{kind:'history.ask',id:'history',sourceText:'¿Cómo estaba antes?'}},{nativeMinute:0});
 assert.equal(result.status,'executed');
 assert.equal(result.receipt.answer,c.history.baseline);
 assert(p.intentHistory.some(x=>x.id==='baseline'));
 assert.equal(p.interview.subjective,null);
});
