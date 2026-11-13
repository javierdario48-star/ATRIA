import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {createProgressionLedger} from './progression.js';
import {clinicalContent} from '../server/content.js';
import {routeWardSpeech} from '../core/speech-router.js';
const data=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:data('cases'),therapies:data('therapies'),defaultDoses:data('default-doses')};
function fixture(caseId,roomId,options={}){
 let seq=0;
 const s=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Medica',
  patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'}),...options});
 return {s,caseId,post:text=>s.post({id:'t'+(++seq),text}),async advance(seconds){s.advance(seconds);await s.flush();}};
}

test('zero interview answers affect quality but never prevent an otherwise valid disposition',async t=>{
 const scenarios=[
  {id:'DIVERT-001',dx:'diverticulitis aguda',destination:'alta',studies:['g_divert_ct'],meds:[],wait:125},
  {id:'CIRR-001',dx:'cirrosis descompensada',destination:'sala',studies:['renal'],meds:['Enfermera espironolactona 100 mg'],wait:125},
  {id:'APP-001',dx:'apendicitis aguda',destination:'quirofano',studies:['app_us'],meds:['Enfermera ceftriaxona 1 g y metronidazol 500 mg'],wait:100},
  {id:'PERI-PBE-001',dx:'peritonitis bacteriana espontánea',destination:'sala',studies:['pbe_paracentesis'],meds:['Enfermera ceftriaxona 1 g y albumina 1.5 g/kg'],wait:70},
  {id:'RESP-01',dx:'neumonía adquirida en la comunidad',destination:'alta',studies:['g_resp01_cxr'],meds:['/tratamiento amoxicillin'],wait:130}
 ];
 for(const plan of scenarios)await t.test(plan.id,async()=>{
  const f=fixture(plan.id,'no-history-'+plan.id,{content:clinicalContent});
  try{
   const c=clinicalContent.cases.find(c=>c.id===plan.id);
   await f.post('/diagnostico '+plan.dx);await f.post('/signos');await f.post('Enfermera una vía');
   for(const technique of ['general','inspection','auscultation','percussion','palpation'])
    await f.post('/examen '+technique);
   for(const id of plan.studies)await f.post('/estudio '+id);
   for(const text of plan.meds)await f.post(text);
   await f.advance(plan.wait);await f.post('/reevaluar');
   assert.equal(f.s.read().patient.intentHistory.length,0);
   const command={id:'close',text:'/disposicion '+plan.destination};
   const result=await f.s.post(command);
   if(result.clinical[0]?.status==='pending')await f.advance(3.5);
   const after=f.s.read();
   assert.equal(after.patient.closure?.destination,plan.destination,JSON.stringify({caseId:c.id,missing:after.closure?.missing,reply:result.clinical}));
   assert.equal(after.patient.closure.quality.history,0);
   assert.equal(after.progress.receipts.length,1);
   assert.equal((await f.s.post(command)).clinical[0].status,'executed');
   assert.equal(f.s.read().progress.receipts.length,1);
  }finally{f.s.dispose();}
 });
});
test('an unsafe discharge changes the doctor record, without changing patient state anywhere in the catalogue',async t=>{
 for(const c of clinicalContent.cases)await t.test(c.id,async()=>{
  const f=fixture(c.id,'unsafe-'+c.id,{content:clinicalContent});
  try{
   await f.post('/signos');
   const before=f.s.read();
   const decision=(await f.post('/disposicion alta')).clinical[0];
   const after=f.s.read();
   assert.equal(decision.receipt.disposition.kind,'clinical.unsafe-discharge');
   assert.deepEqual(after.patient,before.patient);
   assert.deepEqual(after.progress.receipts,before.progress.receipts);
   assert.equal(after.progress.penalties.length,1);
   assert(after.messages.some(row=>row.name==='Dr. Vega'&&row.role==='mentor'&&
    /cómo vas a darle el alta/i.test(row.text)));
  }finally{f.s.dispose();}
 });
});

test('an unsafe discharge is recorded once and the same patient can later earn a valid closure',async()=>{
 const roomId='discharge-continuity',attempt={id:'unsafe',text:'/disposicion alta'};
 const progress=createProgressionLedger({receipts:[{kind:'clinical.closure',closed:true,
  patientUid:'previous',eventId:'previous-closure',actorId:'doctor',xp:30}]});
 const f=fixture('DIVERT-001',roomId,{progress,content:clinicalContent});let resumed;
 try{
  const unsafe=(await f.s.post(attempt)).clinical[0];
  assert.equal(unsafe.status,'executed');
  assert.equal(unsafe.receipt.disposition.kind,'clinical.unsafe-discharge');
  assert.equal(unsafe.receipt.disposition.closed,false);
  assert.equal(f.s.read().progress.xp,15);
  assert.equal(f.s.read().progress.receipts.length,1);
  assert.equal(f.s.read().room.patients[0].closed,false);
  assert.equal(f.s.read().patient.caseEnded,false);

  resumed=fixture(f.caseId,roomId,{checkpoint:await f.s.checkpoint(),content:clinicalContent});
  assert.deepEqual((await resumed.s.post(attempt)).clinical[0],unsafe);
  await resumed.s.post({id:'unsafe-again',text:'/cierre-parcial alta'});
  assert.equal(resumed.s.read().progress.penalties.length,1);
  assert.equal(resumed.s.read().progress.xp,15);
  await bedsideWorkup(resumed,'diverticulitis aguda');
  await resumed.post('¿Dónde le duele?');
  await resumed.post('/estudio g_divert_ct');await resumed.advance(125);
  await resumed.post('/reevaluar');
  assert.equal(resumed.s.read().patient.uid,'P');
  assert(resumed.s.read().clock.clinicalMinute>0);
  assert(resumed.s.read().eligibleDestinations.includes('alta'),resumed.s.auditClosureRequirements('alta').missing.join(' / '));
  const safe=(await resumed.post('/disposicion alta')).clinical[0];
  assert.equal(safe.receipt.closure.closed,true);
  assert.equal(resumed.s.read().progress.receipts.length,2);
  assert.equal(resumed.s.read().progress.xp,15+safe.receipt.closure.xp);
 }finally{f.s.dispose();resumed?.s.dispose();}
});
test('active observation records the clinical assessment without closing or changing the disease course',async()=>{
 const roomId='active-observation',options={content:clinicalContent};
 const f=fixture('PERI-SEC-001',roomId,options),control=fixture('PERI-SEC-001',roomId,options);
 try{
  const before=f.s.read();
  const command={id:'observe',text:'Enfermera, dejalo en observación'};
  const observed=(await f.s.post(command)).clinical[0];
  assert.equal(observed.status,'executed');
  assert.equal(observed.kind,'case.observe');
  assert.equal(observed.receipt.assessment.readyForHandoff,false);
  assert(observed.receipt.assessment.missing.length);
  assert.deepEqual(f.s.read().patient,before.patient);
  assert.equal(f.s.read().room.patients[0].closed,false);
  assert.deepEqual(f.s.read().progress,before.progress);
  assert.deepEqual((await f.s.post(command)).clinical[0],observed);
  await f.advance(20);await control.advance(20);
  assert.deepEqual(f.s.read().patient,control.s.read().patient);
  const next=(await f.post('/reevaluar')).clinical[0];
  assert.equal(next.status,'executed');
  assert.equal(f.s.read().patient.reassessments,1);
 }finally{f.s.dispose();control.s.dispose();}
});
async function bedsideWorkup(f,diagnosis){
 await f.post('/diagnostico '+diagnosis);await f.post('/signos');
 for(const technique of ['general','inspection','auscultation','percussion','palpation'])
  await f.post('/examen '+technique);
 await f.post('¿Qué antecedentes tiene?');await f.post('Enfermera una vía');
}
async function basicWorkup(f,diagnosis){
 await bedsideWorkup(f,diagnosis);
 await f.post('/estudio '+({'APP-001':'app_us','CHOLE-001':'chole_us','CHOLANG-001':'cholang_liver'}[f.caseId]));
 if(f.caseId==='CHOLE-001')await f.post('Enfermera nada por boca');
 if(f.caseId!=='APP-001')await f.post('Enfermera Ringer 500 ml');
 await f.post('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
 await f.advance(95);await f.post('/reevaluar');
}
test('APP direct OR transfer is pending before surgical acceptance, closes automatically after 3.5s and awards XP only once',async()=>{
 const f=fixture('APP-001','transfer-app');
 try{
  await basicWorkup(f,'apendicitis aguda');
  const requested=await f.post('/disposicion quirofano');
  assert.equal(requested.clinical[0].status,'pending');
  assert.equal(f.s.read().patient.caseEnded,false);
  assert.equal(f.s.read().patient.pendingConsults.length,1);
  await f.advance(3.49);assert.equal(f.s.read().patient.caseEnded,false);
  await f.advance(.01);
  const state=f.s.read();
  assert.equal(state.patient.consults[0].accepted,true);
  assert.equal(state.patient.caseEnded,true);
  assert.equal(state.room.patients[0].closed,true,'authority is closed by async receipt');
  assert.equal(state.patient.closure.destination,'quirofano');
  assert.equal(state.progress.receipts.length,1);
  assert(state.progress.xp>0&&state.patient.closure.quality.score<100);
  assert(!state.patient.treatments.some(x=>x.id==='surgery'||x.id==='source_control'));
  const retry=await f.post('/disposicion quirofano');
  assert.equal(retry.clinical[0].status,'rejected');
  assert.equal(f.s.read().progress.receipts.length,1);
  const event=state.room.events.find(e=>e.type==='clinical.completed'&&e.clinical?.some(x=>x.kind==='case.close'));
  assert.equal(event.clinical[0].status,'executed');
  assert.equal(event.clinical[0].receipt.closure.eventId,state.patient.closure.eventId);
 }finally{f.s.dispose();}
});
test('asking surgery for an opinion is distinct from asking to transfer',async()=>{
 const f=fixture('CHOLE-001','transfer-chole');
 try{
  await basicWorkup(f,'colecistitis aguda');
  const consult=await f.post('/consulta cirugia');
  assert.equal(consult.clinical[0].status,'pending');
  await f.advance(3.5);
  const before=f.s.read();
  assert.equal(before.patient.consults.at(-1).accepted,true);
  assert.equal(before.patient.caseEnded,false);
  assert.equal(before.progress.receipts.length,0);
  const transfer=await f.post('/disposicion quirofano');
  assert.equal(transfer.clinical[0].status,'executed','prior acceptance applies to requested transfer');
  const after=f.s.read();
  assert.equal(after.patient.caseEnded,true);
  assert.equal(after.progress.receipts.length,1);
  assert(after.patient.closure.quality.score<100,'omitted care lowers score rather than blocks accepted transfer');
 }finally{f.s.dispose();}
});
test('an unsubstantiated transfer never queues and diagnosis correction permits subsequent acceptance',async()=>{
 const f=fixture('APP-001','transfer-reject');
 try{
  await f.post('/diagnostico resfriado');
  const initial=await f.post('/disposicion quirofano');
  assert.equal(initial.clinical[0].status,'rejected');
  assert.equal(initial.clinical[0].reason,'transfer-not-accepted');
  assert.equal(f.s.read().patient.consults.length,0);
  assert.equal(f.s.read().patient.caseEnded,false);
  assert.equal(f.s.read().progress.receipts.length,0);
  await basicWorkup(f,'apendicitis aguda');
  const next=await f.post('/disposicion quirofano');
  assert.equal(next.clinical[0].status,'pending');
  await f.advance(3.5);
  assert.equal(f.s.read().patient.caseEnded,true);
  assert.equal(f.s.read().progress.receipts.length,1);
 }finally{f.s.dispose();}
});
test('one consultation may serve distinct requested transfers but cannot award duplicated XP',async()=>{
 const f=fixture('CHOLE-001','transfer-duplicate');
 try{
  await basicWorkup(f,'colecistitis aguda');
  const first=await f.post('/disposicion quirofano');
  const second=await f.post('/disposicion quirofano');
  assert.equal(first.clinical[0].status,'pending');
  assert.equal(second.clinical[0].status,'pending');
  assert.equal(f.s.read().patient.pendingConsults.length,1);
  await f.advance(3.5);
  const state=f.s.read();
  assert.equal(state.progress.receipts.length,1);
  assert.equal(state.room.patients[0].closed,true);
  const outcomes=state.room.events.filter(x=>x.type==='clinical.completed'&&x.clinical.some(c=>c.kind==='case.close'));
  assert.equal(outcomes.length,2);
  assert.deepEqual(outcomes.map(e=>e.clinical[0].status).sort(),['executed','rejected']);
 }finally{f.s.dispose();}
});
test('accepted Gastro transfer closes CHOLANG; the CPRE remains unperformed',async()=>{
 const f=fixture('CHOLANG-001','transfer-cholang');
 try{
  await basicWorkup(f,'colangitis aguda');
  const q=await f.post('/disposicion procedimiento');
  assert.equal(q.clinical[0].status,'pending');
  await f.advance(3.5);
  const state=f.s.read();
  assert.equal(state.patient.caseEnded,true);
  assert.equal(state.patient.consults[0].id,'gastro');
  assert.equal(state.patient.closure.destination,'procedimiento');
  assert.equal(state.progress.receipts.length,1);
  assert.equal(state.patient.phys.sourceControlled,false);
 }finally{f.s.dispose();}
});
test('accepted UTI transfer closes a critical CHOLANG with one receipt',async()=>{
 const f=fixture('CHOLANG-001','transfer-uti');
 try{
  await basicWorkup(f,'colangitis aguda');
  const q=await f.post('/disposicion uti');
  assert.equal(q.clinical[0].status,'pending');
  await f.advance(3.5);
  const state=f.s.read();
  assert.equal(state.patient.caseEnded,true);
  assert.equal(state.patient.consults[0].id,'uti');
  assert.equal(state.patient.closure.destination,'uti');
  assert.equal(state.progress.receipts.length,1);
 }finally{f.s.dispose();}
});
test('pancreatitis transfers to UTI with confirmed resuscitation and without a fasting order',async()=>{
 const f=fixture('PANC-001','transfer-panc');
 try{
  await f.post('/diagnostico pancreatitis aguda');
  await f.post('/signos');
  for(const technique of ['general','inspection','auscultation','percussion','palpation'])
   await f.post('/examen '+technique);
  await f.post('/estudio lipasa');
  await f.advance(80);
  const premature=await f.post('/disposicion uti');
  assert.equal(premature.clinical[0].status,'rejected');
  assert.equal(premature.clinical[0].receipt.reasonCode,'stabilization-insufficient');

  await f.post('Enfermera una vía');
  await f.post('Enfermera Ringer 1000 ml');
  await f.advance(80);
  const prepared=f.s.read();
  assert(prepared.patient.treatments.some(row=>row.id==='fluid'));
  assert(prepared.patient.orders.some(row=>row.id==='lipasa'&&row.status==='done'));
  assert(!prepared.patient.treatments.some(row=>row.id==='npo'));
  assert.equal(f.s.clinicalHint().action?.id,'uti');
  const transfer=await f.post('/disposicion uti');
  assert.equal(transfer.clinical[0].status,'pending');
  assert.equal(f.s.clinicalHint().action?.id,'receiver');
  await f.advance(3.5);
  const closed=f.s.read();
  assert.equal(closed.patient.closure?.destination,'uti');
  assert.equal(closed.patient.consults[0].accepted,true);
  assert.equal(closed.progress.receipts.length,1);
  assert.equal(f.s.clinicalHint(),null);
 }finally{f.s.dispose();}
});
test('CHOLE moves from a pending ultrasound to an accepted surgical handoff with confirmed antibiotics',async()=>{
 const f=fixture('CHOLE-001','transfer-chole-fasting');
 try{
  await bedsideWorkup(f,'colecistitis aguda');
  await f.post('Enfermera ecografía');
  await f.post('Enfermera Ringer 500 ml');
  await f.post('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
  assert.equal(f.s.read().patient.orders[0].status,'pending');
  assert.notEqual(f.s.clinicalHint()?.action?.id,'chole_us','pending ultrasound must not be ordered again');
  await f.advance(95);await f.post('/reevaluar');
  const p=f.s.read().patient;
  assert.deepEqual(p.orders.map(row=>[row.id,row.status]),[['chole_us','done']]);
  assert(!p.treatments.some(row=>row.id==='npo'));
  assert.equal(f.s.clinicalHint().action?.id,'quirofano');
  assert.equal((await f.post('/disposicion quirofano')).clinical[0].status,'pending');
  assert.equal(f.s.clinicalHint().action?.id,'receiver');
  await f.advance(3.5);
  const closed=f.s.read();
  assert.equal(closed.patient.closure?.destination,'quirofano');
  assert(closed.patient.consults.some(row=>row.id==='cirugia'&&row.accepted));
  assert(!closed.patient.treatments.some(row=>row.id==='source_control'));
  assert.equal(closed.progress.receipts.length,1);
 }finally{f.s.dispose();}
});
async function obstructionWorkup(f,volume,wait){
 await bedsideWorkup(f,'obstrucción intestinal');
 await f.post('Enfermera TC abdomen');
 await f.post('Enfermera Ringer '+volume+' ml');
 await f.post('Enfermera sonda nasogástrica');
 assert.notEqual(f.s.clinicalHint()?.action?.id,'ileo_ct','pending CT must not be ordered again');
 await f.advance(wait);await f.post('/reevaluar');
 const p=f.s.read().patient;
 assert.deepEqual(p.orders.map(row=>[row.id,row.status]),[['ileo_ct','done']]);
 assert.match(p.orders[0].result,/sin signos de perforación ni isquemia/i);
 assert(p.treatments.some(row=>row.id==='fluid')&&p.treatments.some(row=>row.id==='ngt'));
}
test('ILEO with documented improvement and uncomplicated CT can continue on the ward with or without a recorded fasting order',async()=>{
 const f=fixture('ILEO-001','transfer-ileo-stable');
 const withFasting=fixture('ILEO-001','transfer-ileo-fasting');
 const resumedOral=fixture('ILEO-001','transfer-ileo-resumed-oral');
 try{
  await obstructionWorkup(f,1000,115);
  await obstructionWorkup(withFasting,1000,115);
  assert.equal((await withFasting.post('Enfermera dejar en ayuno')).clinical[0].status,'executed');
  await withFasting.post('/reevaluar');
  assert.equal((await f.post('/consulta cirugia')).clinical[0].status,'pending');
  await f.advance(3.5);
  assert(f.s.read().patient.consults.some(row=>row.id==='cirugia'&&row.accepted));
  for(const destination of ['quirofano','uti']){
   const refusal=(await f.post('/disposicion '+destination)).clinical[0];
   assert.equal(refusal.status,'rejected');
   assert.equal(refusal.receipt.reasonCode,'destination-not-indicated');
  }
  assert.equal(f.s.clinicalHint().action?.id,'sala');
  assert.equal((await f.post('/disposicion sala')).clinical[0].status,'executed');
  const without=f.s.read().patient.closure;
  assert.equal(without?.destination,'sala');
  assert.match(without.debrief.missing.join(' '),/nada por boca/i);
  assert.equal(f.s.read().progress.receipts.length,1);
  assert.equal((await withFasting.post('/disposicion sala')).clinical[0].status,'executed');
  assert(withFasting.s.read().patient.closure.quality.treatment>without.quality.treatment);
  await obstructionWorkup(resumedOral,1000,115);
  await resumedOral.post('Enfermera dejar en ayuno');
  assert.equal((await resumedOral.post('Enfermera levantar el ayuno')).clinical[0].status,'executed');
  assert.equal((await resumedOral.post('/disposicion sala')).clinical[0].status,'executed');
  assert.equal(resumedOral.s.read().patient.closure.quality.treatment,without.quality.treatment);
  assert.match(resumedOral.s.read().patient.closure.debrief.missing.join(' '),/nada por boca/i);
 }finally{f.s.dispose();withFasting.s.dispose();resumedOral.s.dispose();}
});
for(const destination of ['uti','quirofano']){
 test('ILEO with evolving instability can transfer to '+destination+' after confirmed support without a separate fasting order',async()=>{
  const f=fixture('ILEO-001','transfer-ileo-'+destination);
  try{
   await obstructionWorkup(f,500,600);
   const p=f.s.read().patient;
   assert(p.liveVitals.sys<95,'physiology must deteriorate despite the initial treatment');
   assert(!p.treatments.some(row=>row.id==='npo'));
   assert.equal((await f.post('/disposicion '+destination)).clinical[0].status,'pending');
   await f.advance(3.5);
   const closed=f.s.read();
   assert.equal(closed.patient.closure?.destination,destination);
   assert(closed.patient.consults.some(row=>row.id===(destination==='uti'?'uti':'cirugia')&&row.accepted));
   assert(!closed.patient.treatments.some(row=>row.id==='surgery'));
   assert.equal(closed.progress.receipts.length,1);
  }finally{f.s.dispose();}
 });
}
test('no synchronous authorization without consultation; partial route stays explicit',async()=>{
 const f=fixture('CHOLE-001','transfer-partial');
 try{
  assert.equal(routeWardSpeech('Enfermera derivar a cirugia',{clinicalEvaluation:true,patientUid:'P'}).intents[0].id,'quirofano');
  const refused=await f.post('/cierre-parcial quirofano');
  assert.equal(refused.clinical[0].status,'rejected');
  assert.equal(f.s.read().patient.pendingConsults.length,0);
  assert.equal(f.s.read().progress.receipts.length,0);
 }finally{f.s.dispose();}
});
