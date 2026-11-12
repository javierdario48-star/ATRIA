import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {executePatientDialogue} from './patient-dialogue.js';
import {createClinicalContent} from '../content/clinical-content.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';
import {cardiologyPack} from '../content/packs/cardiology-pack.js';
import {neurologyPack} from '../content/packs/neurology-pack.js';
const read=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function setup(caseId='APP-001',uid='P1',clinicalContent=content){
 let n=0,near=uid,focus=null;
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Javier',patient:{uid,caseId},content:clinicalContent,
  resolveContext:()=>({patientUid:near,focusedNpc:focus})});
 return {s,send:text=>s.post({id:'d'+(++n),text}),near:x=>near=x,focus:x=>focus=x};
}
const answer=ack=>ack.clinical.map(x=>x.receipt?.answer||'').join(' ');
test('specific blood-vomit history is not replaced by a generic uncertain vomiting answer',async()=>{
 const f=setup('HDA-001');
 try{
  const response=await f.send('¿Vomitó sangre?');
  assert.match(answer(response),/sangre/i);
  assert(f.s.read().patient.intentHistory.some(x=>x.id==='bleeding'&&x.source==='case.intents.bleeding'));
  assert.equal(f.s.read().patient.administrationLog.length,0);
 }finally{f.s.dispose();}
});
test('an unconscious patient retains impaired speech while an authored companion supplies indirect history',async()=>{
 const c=neurologyPack.cases.find(x=>x.id==='NEUR-06'),uid='witness-history',
  extended=createClinicalContent(content,{additionalCases:[c]});
 const s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid,caseId:c.id},content:extended,resolveContext:()=>({patientUid:uid})});
 try{
  const reply=await s.post({id:'witness-onset',text:'¿Desde cuándo?'});
  assert.match(answer(reply),/Familiar acompañante/);assert.match(answer(reply),/12 minutos/);
  const row=s.read().messages.at(-1);
  assert.equal(row.name,'Familiar acompañante');
  assert.equal(row.role,'system');
  assert.equal(row.actorId,'doctor');
  assert.match(row.text,/12 minutos/);
  assert.equal(s.read().patient.neurology.verbal,1);
  const fact=s.read().patient.intentHistory.find(x=>x.id==='onset');
  assert.equal(fact.historySource.kind,'companion');assert.equal(fact.patientUid,uid);
  const meds=await s.post({id:'witness-meds',text:'¿Medicación?'});
  assert.match(answer(meds),/^Familiar acompañante \(anamnesis indirecta\): Levetiracetam domiciliario suspendido por tres días por falta de medicación\. No benzodiacepinas administradas antes de llegar\.$/);
  assert.equal(s.read().patient.intentHistory.find(x=>x.id==='meds').historySource.kind,'companion');
  const orientation=await s.post({id:'witness-orientation',text:'Acompañante, ¿Sabe dónde está?'});
  assert.match(answer(orientation),/No puedo precisar ese dato/);
  assert.doesNotMatch(answer(orientation),/Estoy en la guardia/);
 }finally{s.dispose();}
});
test('a named companion responds only with authored indirect facts even when the patient is alert',async()=>{
 const c=neurologyPack.cases.find(x=>x.id==='NEUR-03'),historySource={kind:'companion',label:'Familiar acompañante'},
  caseData={...c,clinicalPolicy:{...c.clinicalPolicy,historySource}},s=voiceSession(caseData);
 let restored;
 try{
  const request={id:'companion-meds',text:'Acompañante, ¿Qué medicamentos toma?'};
  const reply=await s.post(request);
  assert.deepEqual(reply.clinical[0]?.receipt?.responseSource,historySource);
  assert.match(answer(reply),/losart[aá]n y metformina/i);
  assert.equal(s.read().messages.at(-1).name,historySource.label);
  assert.equal(s.read().messages.at(-1).role,'system');
  assert.equal((await s.post({id:'patient-history',text:'¿Qué antecedentes personales tiene?'})).clinical[0].receipt.responseSource.kind,'patient');
  restored=voiceSession(caseData,JSON.parse(JSON.stringify(await s.checkpoint())));
  assert.deepEqual(await restored.post(request),reply);
  const follow=await restored.post({id:'companion-which',text:'Acompañante, ¿Cuáles?'});
  assert.match(answer(follow),/losart[aá]n y metformina/i);
  const unknown=await restored.post({id:'companion-dose',text:'Acompañante, ¿Qué dosis?'});
  assert.match(answer(unknown),/No puedo precisar ese dato/);
  assert.doesNotMatch(answer(unknown),/\b(?:tomo|tomé|mg)\b/i);
  assert.equal(restored.read().patient.intentHistory.filter(row=>row.id==='meds').length,1);
 }finally{s.dispose();restored?.dispose();}
});
test('explicit companion address cannot reveal history if the bedside has no declared witness',async()=>{
 const s=voiceSession(neurologyPack.cases.find(c=>c.id==='NEUR-03'));
 try{
  const reply=await s.post({id:'absent-witness',text:'Acompañante, ¿Qué medicamentos toma?'});
  assert.equal(reply.clinical[0]?.reason,'companion-not-available');
  assert.equal(s.read().messages.at(-1).name,'ATRIA');
  assert.match(s.read().messages.at(-1).text,/No hay un acompañante disponible/);
  assert.deepEqual(s.read().patient.intentHistory,[]);
 }finally{s.dispose();}
});
test('a companion question requires proximity and cannot execute a clinical order',async()=>{
 const c=neurologyPack.cases.find(x=>x.id==='NEUR-06'),uid='witness-bedside',
  f=setup(c.id,uid,createClinicalContent(content,{additionalCases:[c]}));
 try{
  f.near(null);
  const distant=await f.send('Familiar: ¿Qué medicamentos toma?');
  assert.equal(distant.routeError,'no-patient-target');
  assert.equal(distant.clinical.length,0);
  f.near(uid);
  const order=await f.send('Acompañante, Enfermera, morfina 10 mg IV');
  assert.deepEqual(order.clinical.map(row=>row.kind),['history.ask']);
  assert.deepEqual(f.s.read().patient.intentHistory,[]);
  assert.deepEqual(f.s.read().patient.administrationLog,[]);
 }finally{f.s.dispose();}
});
test('cooperative physicians share indirect findings without sharing the witness follow-up topic',async()=>{
 const c=neurologyPack.cases.find(x=>x.id==='NEUR-06'),uid='shared-witness',otherToken={};
 const members=[{id:'doctor',name:'Doctor'},{id:'other',name:'Other'}];
 const s=createGuardSession({roomId:uid,mode:'coop',actorId:'doctor',actorName:'Doctor',members,
  patient:{uid,caseId:c.id},content:createClinicalContent(content,{additionalCases:[c]}),
  resolveContext:()=>({patientUid:uid}),authenticate:token=>token===otherToken?{id:'other',roomId:uid}:null});
 try{
  await s.post({id:'first',text:'Acompañante, ¿Qué medicamentos toma?'});
  const other=await s.post({id:'which',text:'Acompañante, ¿Cuáles?'},otherToken);
  assert.match(answer(other),/No puedo precisar ese dato/);
  assert.doesNotMatch(answer(other),/Levetiracetam/);
  assert.match(answer(await s.post({id:'which',text:'Acompañante, ¿Cuáles?'})),/Levetiracetam/);
  assert.equal(s.read().patient.intentHistory.filter(row=>row.id==='meds').length,1);
 }finally{s.dispose();}
});
test('a patient without a verbal response or a witness produces one automatic clinical observation in chat',async()=>{
 const c=neurologyPack.cases.find(x=>x.id==='NEUR-06'),clinicalPolicy={...c.clinicalPolicy};
 delete clinicalPolicy.historySource;
 const caseData={...c,clinicalPolicy},s=voiceSession(caseData);
 let restored;
 try{
  const question={id:'without-witness',text:'¿Desde cuándo?'};
  const reply=await s.post(question);
  assert.equal(answer(reply),'(No responde.)');
  await s.post(question);
  const rows=s.read().messages;
  assert.deepEqual(rows.map(({role})=>role),['player','system']);
  assert.equal(rows[1].text,answer(reply));
  assert.deepEqual(s.read().patient.intentHistory,[]);

  const checkpoint=await s.checkpoint();
  delete checkpoint.authority.events[0].clinical[0].receipt.responseSource;
  restored=voiceSession(caseData,checkpoint);
  assert.deepEqual(restored.read().messages,rows);
 }finally{s.dispose();restored?.dispose();}
});
function voiceSession(c,checkpoint=null){
 const uid='voice-'+c.id;
 return createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid,caseId:c.id},content:createClinicalContent(content,{additionalCases:[c]}),
  resolveContext:()=>({patientUid:uid}),checkpoint});
}
test('medication history speaks in first person through the guard and after checkpoint recovery',async()=>{
 const c=cardiologyPack.cases.find(c=>c.id==='CARD-01'),s=voiceSession(c);
 const clinicalNote='Losartán y metformina. No toma anticoagulantes ni antiagregantes. Niega sildenafil, vardenafil, tadalafil o avanafil recientes.';
 const spoken=/^Tomo losartán y metformina\. No tomo anticoagulantes ni antiagregantes\. No tomé sildenafil, vardenafil, tadalafil ni avanafil recientemente\.$/i;
 let restored;
 try{
  const initial=await s.post({id:'voice-meds',text:'¿Qué medicamentos toma?'});
  assert.match(answer(initial),spoken);
  assert.equal(s.read().messages.at(-1).text,answer(initial));
  assert.equal(initial.clinical[0].receipt.dialogue.facts[0].canonical,clinicalNote);
  assert.equal(s.read().patient.intentHistory.find(x=>x.id==='meds').answer,clinicalNote);
  restored=voiceSession(c,JSON.parse(JSON.stringify(await s.checkpoint())));
  assert.deepEqual(restored.read().patient.behavior,s.read().patient.behavior);
  assert.match(answer(await restored.post({id:'voice-which',text:'¿Cuáles?'})),spoken);
  assert.match(answer(await restored.post({id:'voice-unknown-dose',text:'¿Qué dosis?'})),/No puedo precisar la dosis que tomo/);
  assert.equal(restored.read().patient.intentHistory.filter(x=>x.id==='meds').length,1);
  assert.deepEqual(restored.read().patient.administrationLog,[]);
 }finally{s.dispose();restored?.dispose();}
});
test('a second medication history and its dose follow-up keep the drug, amount and omitted dose distinct',async()=>{
 const s=voiceSession(cardiologyPack.cases.find(c=>c.id==='CARD-02'));
 try{
  const initial=await s.post({id:'voice-meds',text:'¿Qué medicamentos toma?'});
  assert.match(answer(initial),/^Tomo aspirina 100 mg diarios, atorvastatina y losartán; no tomé la aspirina hoy\. No uso anticoagulantes ni inhibidores PDE5\.$/i);
  const detail=await s.post({id:'voice-dose',text:'¿Qué dosis?'});
  assert.match(answer(detail),/^Tomo aspirina 100 mg diarios, atorvastatina y losartán[.;]$/i);
  assert.equal(s.read().patient.intentHistory.filter(x=>x.id==='meds').length,1);
 }finally{s.dispose();}
});
test('first-person medication history does not present a suspended drug as currently taken',async()=>{
 const s=voiceSession(cardiologyPack.cases.find(c=>c.id==='CARD-03'));
 try{
  const reply=await s.post({id:'voice-suspended-med',text:'¿Qué medicamentos toma?'});
  assert.match(answer(reply),/Mi medicación habitual es furosemida oral 20 mg\/día, enalapril y carvedilol; suspendí el diurético hace 3 días\./i);
  assert.doesNotMatch(answer(reply),/Tomo furosemida/i);
  const detail=await s.post({id:'voice-suspended-dose',text:'¿Qué dosis?'});
  assert.match(answer(detail),/^Mi medicación habitual es furosemida oral 20 mg\/día, enalapril y carvedilol\.$/i);
 }finally{s.dispose();}
});
test('neurology medication denials share direct speech while a named informant keeps their own attribution',async()=>{
 const c=neurologyPack.cases.find(c=>c.id==='NEUR-03'),s=voiceSession(c);
 const external='Familiar: toma warfarina. No toma aspirina.';
 const reported=voiceSession({...c,common:{...c.common,meds:[external]}});
 try{
  assert.match(answer(await s.post({id:'voice-meds',text:'¿Qué medicamentos toma?'})),
   /^Tomo losartán y metformina\. No tomo antiagregantes ni anticoagulantes\.$/i);
  const attribution=await reported.post({id:'voice-reported-meds',text:'¿Qué medicamentos toma?'});
  assert.equal(answer(attribution),external);
 }finally{s.dispose();reported.dispose();}
});
test('medication list modifiers remain attached to the right drug',async()=>{
 const s=voiceSession(cardiologyPack.cases.find(c=>c.id==='CARD-10'));
 try{
  const reply=await s.post({id:'voice-irregular-meds',text:'¿Qué medicamentos toma?'});
  assert.match(answer(reply),/Tomo metformina y losartán, y tomo aspirina de forma irregular;/i);
  assert.match(answer(reply),/hoy no tomé anticoagulantes, inhibidores PDE5 o betabloqueantes\./i);
 }finally{s.dispose();}
});
test('a mixed medication denial keeps present anticoagulants separate from earlier antibiotics',async()=>{
 const s=voiceSession(neurologyPack.cases.find(c=>c.id==='NEUR-08'));
 try{
  const reply=await s.post({id:'voice-mixed-negatives',text:'¿Qué medicamentos toma?'});
  assert.match(answer(reply),/Tomo paracetamol de vez en cuando\. No tomo anticoagulantes y no tomé antibióticos antes\./i);
 }finally{s.dispose();}
});
test('verbal confusion does not change the speaker of a disclosed last dose or add personality styling',async()=>{
 const s=voiceSession(neurologyPack.cases.find(c=>c.id==='NEUR-04'));
 try{
  assert.equal(s.read().patient.neurology.verbal,4);
  const reply=await s.post({id:'voice-dose-recall',text:'¿Qué medicamentos toma?'});
  assert.match(answer(reply),/^Tomo losartán de forma irregular\. La última dosis de warfarina la tomé anoche\. No tomo antiagregantes\.$/i);
  assert.equal(reply.clinical[0].receipt.dialogue.styleApplied,false);
  const last=await s.post({id:'voice-last-dose',text:'¿Cuándo fue la última dosis?'});
  assert.match(answer(last),/^La última dosis de warfarina la tomé anoche\.$/i);
  assert.match(answer(await s.post({id:'voice-no-allergies',text:'¿Alergias?'})),
   /^No tengo alergias conocidas; no tengo antecedentes de trombocitopenia inducida por heparina\.$/i);
  assert.equal(s.read().patient.neurology.verbal,4);
 }finally{s.dispose();}
});
test('direct patient history speaks symptoms and denials while retaining authored background',async()=>{
 const s=voiceSession(cardiologyPack.cases.find(c=>c.id==='CARD-01'));
 try{
  const initial=s.read().patient;
  const personal=answer(await s.post({id:'voice-personal',text:'¿Antecedentes personales?'}));
  assert.match(personal,/Tengo hipertensión, dislipidemia y diabetes tipo 2; no tengo antecedentes de ACV, hemorragia digestiva ni enfermedad renal conocida\./i);
  assert(personal.includes(initial.backgroundHistory.history.pmh.split('. ').slice(1).join('. ')));
  const symptoms=answer(await s.post({id:'voice-symptoms',text:'¿Otros síntomas?'}));
  assert.match(symptoms,/Tengo sudor frío, náuseas y sensación de falta de aire\. No tuve dolor máximo instantáneo hacia espalda, síncope ni déficit focal\./i);
  assert.match(answer(await s.post({id:'voice-bleeding',text:'¿Tiene sangrado?'})),/No tengo sangrado activo, no me operaron recientemente ni tengo antecedentes de hemorragia intracraneal\./i);
  assert.deepEqual(s.read().patient.liveVitals,initial.liveVitals);
 }finally{s.dispose();}
});
test('allergies and prior treatment are spoken as the patient’s history, without adding clinical care',async()=>{
 const allergy=voiceSession(cardiologyPack.cases.find(c=>c.id==='CARD-01'));
 const treatment=voiceSession(cardiologyPack.cases.find(c=>c.id==='CARD-09'));
 const surgery=setup('PERI-TER-001','voice-peri-ter',createClinicalContent(content));
 try{
  assert.match(answer(await allergy.post({id:'voice-allergy',text:'¿Alergias?'})),/^No conozco alergias a medicamentos, aspirina ni contraste\.$/i);
  assert.match(answer(await treatment.post({id:'voice-prior-treatment',text:'¿Qué medicamentos toma?'})),
   /Tomo losartán y paracetamol\. Aún no recibí antibióticos; me llamaron por hemocultivos externos positivos obtenidos hace 48 horas\./i);
  assert.match(answer(await surgery.send('¿Antecedentes personales?')),
   /Tengo inmunosupresión crónica y me hicieron varias cirugías recientes por peritonitis secundaria, y ya había recibido antibióticos de amplio espectro\./i);
  assert.match(answer(await surgery.send('¿Cuántas veces te operaron?')),/Me operaron.*en estos días por la infección abdominal/);
  assert.match(answer(await surgery.send('¿Y qué pasó después?')),/Nunca terminé de mejorar: sigo con fiebre/);
  assert.deepEqual(treatment.read().patient.administrationLog,[]);
  assert.deepEqual(surgery.s.read().patient.administrationLog,[]);
 }finally{allergy.dispose();treatment.dispose();surgery.s.dispose();}
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
   ['¿Support?',/Vivo con mi familia/],['¿Tomaste alguna medicación recientemente?',/paracetamol/]];
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
  assert(answer(again).includes(initial.backgroundHistory.history.pmh),'restored patient speaks the same persisted facts');
  assert.deepEqual(restored.read().patient.behavior,initial.behavior);
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
 assert.equal(answer(reply),'(Pronuncia palabras sueltas, sin poder precisar lo que siente.)');
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
 assert(p.behavior.anxiety>=3,'Spanish personality alias must retain anxious traits');
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
 assert.equal(directHistory(p,'¿Tenés alergias?').receipt.answer,'(Pronuncia palabras sueltas, sin poder precisar lo que siente.)');
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

test('explicit exposure questions resolve to the HEPAT fact and preserve its clinical history ID',async()=>{
 const f=setup('HEPAT-001');
 try{
  for(const text of ['¿Tomaste mucho paracetamol?','¿Tomaste medicamentos en exceso?',
   '¿Qué medicamentos nuevos tomaste?','¿Qué medicamento?','¿Cuáles tomás?','¿Cuáles recordás?']){
   const result=await f.send(text);
   assert.equal(result.clinical[0].status,'executed',text);
   assert.match(answer(result),/No tomé paracetamol en exceso ni otros fármacos nuevos/,text);
  }
  const facts=f.s.read().patient.intentHistory.filter(x=>x.id==='meds');
  assert.equal(facts.length,1);
  assert.equal(facts[0].source,'case.intents.meds');
 }finally{f.s.dispose();}
});

test('medication details stay within the authored record and unknown answers earn no history',async()=>{
 const known=setup('CIRR-001'),unknown=setup('ENCEF-001');
 try{
  assert.match(answer(await known.send('¿Tomás algo para la presión?')),/presión/);
  assert.match(answer(await known.send('¿Cuáles?')),/no recuerdo (?:el nombre|cómo se llama)/i);
  assert.match(answer(await known.send('¿Cuánto tomás?')),/no.*dosis/i);
  assert.match(answer(await known.send('¿Y qué dosis de esa pastilla?')),/no.*dosis/i);
  assert.match(answer(await known.send('¿Desde cuándo toma esa pastilla?')),/no.*cuándo/i);
  assert.match(answer(await known.send('¿Cuánto toma esa pastilla?')),/no.*dosis/i);
  assert.match(answer(await known.send('¿Toma medicación para la fiebre?')),/no recuerdo si tomé algo por mi cuenta/i);
  assert(!known.s.read().patient.intentHistory.some(x=>x.id==='fever'));
  assert.match(answer(await known.send('¿Qué remedios usás?')),/presión/);
  assert.match(answer(await known.send('¿Desde cuándo?')),/no.*cuándo/i);
  assert.match(answer(await known.send('¿Y antes?')),/no.*antes/i);
  assert.match(answer(await known.send('¿Por qué?')),/presión/i);
  assert(!known.s.read().patient.intentHistory.some(x=>x.id==='onset'));
  assert.match(answer(await unknown.send('¿Qué remedios usás?')),/no recuerdo/i);
  assert.match(answer(await unknown.send('¿Cuáles?')),/no recuerdo/i);
  assert.deepEqual(unknown.s.read().patient.intentHistory,[]);
 }finally{known.s.dispose();unknown.s.dispose();}
});

test('only the asking doctor retains a patient topic through checkpoint recovery',async()=>{
 const uid='conversation-context',members=[{id:'doctor',name:'Doctor'},{id:'other',name:'Other'}];
 const identity={id:'other',roomId:uid},otherToken={};
 const options={roomId:uid,mode:'coop',actorId:'doctor',actorName:'Doctor',members,patient:{uid,caseId:'CIRR-001'},content,
  authenticate:token=>token===otherToken?identity:null,resolveContext:()=>({patientUid:uid})};
 const first=createGuardSession(options);let restored;
 try{
  assert.match(answer(await first.post({id:'history-1',text:'¿Qué remedios usás?'})),/presión/);
  assert.match(answer(await first.post({id:'history-2',text:'¿Tuvo fiebre?'},otherToken)),/No tuve fiebre/);
  restored=createGuardSession({...options,checkpoint:await first.checkpoint()});
  const a=await restored.post({id:'history-3',text:'¿Cuáles?'});
  const b=await restored.post({id:'history-4',text:'¿Desde cuándo?'},otherToken);
  assert.match(answer(a),/no recuerdo (?:el nombre|cómo se llama)/i);
  assert.match(answer(b),/No tuve fiebre/);
  assert(!restored.read().patient.intentHistory.some(x=>x.id==='onset'));
 }finally{first.dispose();restored?.dispose();}
});

test('follow-ups disclose an authored dose, surgical course or known negative allergy without inventing details',async()=>{
 const cardio=setup('CIRR-001'),surgical=setup('PERI-TER-001');
 const uid='known-dose',s=createGuardSession({roomId:uid,mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid,caseId:'CARD-02'},content:createClinicalContent(content,{additionalCases:
   cardiologyPack.cases.filter(c=>c.id==='CARD-02')}),
  resolveContext:()=>({patientUid:uid})});
 try{
  await s.post({id:'dose-1',text:'¿Qué medicamentos tomás?'});
  const dose=await s.post({id:'dose-2',text:'¿Cuánto tomás?'});
  assert.match(answer(dose),/aspirina 100 mg diarios/i);
  assert.equal(s.read().patient.intentHistory.filter(x=>x.id==='meds').length,1);
  assert.match(answer(await cardio.send('¿Tuvo alguna reacción a medicamentos?')),/no tengo alergias/i);
  assert.match(answer(await cardio.send('¿Cuáles?')),/no tengo alergias/i);
  assert.match(answer(await surgical.send('¿Cuántas cirugías tuvo?')),/operaron varias veces/i);
  assert.match(answer(await surgical.send('¿Y después?')),/nunca terminé de mejorar/i);
  assert(surgical.s.read().patient.intentHistory.some(x=>x.id==='course'));
  assert.match(answer(await surgical.send('¿Cuáles?')),/operaron varias veces/i);
 }finally{cardio.s.dispose();surgical.s.dispose();s.dispose();}
});
