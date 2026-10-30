import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {createWorld} from '../app/world.js';
const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(traits={}){let seq=0;const s=createGuardSession({roomId:'secondary',mode:'solo',actorId:'doctor',actorName:'Doctor',
 patient:{uid:'P',caseId:'PERI-SEC-001',...traits},content,resolveContext:()=>({patientUid:'P'})});
 return {s,send:text=>s.post({id:String(++seq),text}),async advance(dt){s.advance(dt);await s.flush();}};}
test('PERI-SEC owns the original longitudinal state; a pending crystalloid is not volume already delivered',async()=>{
 const f=fixture();try{
  const initial=f.s.read().patient;
  assert.equal(initial.phys?.effectiveVolume,.6);
  assert.equal(initial.phys.sourceControlled,false);
  await f.send('Enfermera una vía');
  const order=await f.send('Enfermera Ringer 500 ml');assert.equal(order.clinical[0].status,'pending');
  await f.advance(.79);const waiting=f.s.read().patient;
  assert.equal(waiting.administrationLog.length,0);assert(waiting.phys.effectiveVolume<.6,'disease continues while medicine prepares');
  await f.advance(.02);const given=f.s.read().patient;
  assert.equal(given.administrationLog.length,1);assert(given.phys.effectiveVolume>waiting.phys.effectiveVolume+.05);
  assert.equal(given.phys.sourceControlled,false);
 }finally{f.s.dispose();}
});
test('secondary peritonitis transfers to the accepted surgeon with original case-specific evidence and one XP award',async()=>{
 const f=fixture();try{
  await f.send('¿Dónde empezó el dolor?');await f.send('/signos');
  for(const technique of ['general','inspection','auscultation','percussion','palpation'])await f.send('/examen '+technique);
  await f.send('/diagnostico peritonitis secundaria');
  const consult=await f.send('Enfermera cirugía');assert.equal(consult.clinical[0].status,'pending');
  await f.send('Enfermera una vía');
  await f.send('Enfermera Ringer 500 ml y ceftriaxona 1 g y metronidazol 500 mg');
  assert.deepEqual(f.s.read().eligibleDestinations,[]);
  await f.advance(3.51);await f.send('/reevaluar');
  const ready=f.s.read();assert.equal(ready.patient.consults.at(-1).accepted,true);
  assert.deepEqual(ready.eligibleDestinations,['quirofano'],'documented initial shock does not require elective CT first');
  const wrong=await f.send('/disposicion alta');assert.equal(wrong.clinical[0].status,'rejected');
  const closure=await f.send('/disposicion quirofano');assert.equal(closure.clinical[0].status,'executed');
  const final=f.s.read();assert(final.patient.caseEnded);assert.equal(final.patient.phys.sourceControlled,false);
  assert(final.patient.closure.quality.score>=70&&final.patient.closure.quality.score<=100);
  assert(final.progress.xp>0);assert.equal(final.progress.receipts.length,1);
  const xp=final.progress.xp;await f.send('/disposicion quirofano');assert.equal(f.s.read().progress.xp,xp);
 }finally{f.s.dispose();}
});
test('urgent surgical acceptance does not fabricate the abdominal exam, drugs or operation',async()=>{
 const f=fixture();try{
  await f.send('Enfermera cirugía');await f.advance(3.5);
  assert.equal(f.s.read().patient.consults.at(-1).accepted,false);
  await f.send('/diagnostico peritonitis secundaria');await f.send('/signos');
  await f.send('Enfermera cirugía');await f.advance(3.5);
  assert.equal(f.s.read().patient.consults.at(-1).accepted,false,'a diagnosis cannot fabricate the directed examination');
  assert.equal(f.s.read().patient.consults.at(-1).reasonCode,'examination-incomplete');
  assert(f.s.read().closure.missing.some(x=>/examen físico abdominal/.test(x)));
  assert.deepEqual(f.s.read().eligibleDestinations,[]);
  const surgery=await f.send('Enfermera control de foco');
  assert(surgery.clinical.every(x=>x.receipt?.therapyId!=='source_control'));
  assert(!f.s.read().patient.treatments.some(x=>x.id==='source_control'));
  assert.equal(f.s.read().patient.phys.sourceControlled,false);
  assert.equal(f.s.read().progress.xp,0);
 }finally{f.s.dispose();}
});
test('untreated secondary shock dies after original grace, identically with a long frame, and cannot award XP',async()=>{
 const a=fixture(),b=fixture();try{
  await a.advance(179);assert(!a.s.read().patient.patientDied);
  await a.advance(41);
  for(let t=0;t<220;t+=.25)await b.advance(.25);
  const first=a.s.read(),second=b.s.read();
  assert.equal(first.patient.patientDied,true);assert.equal(second.patient.patientDied,true);
  assert.equal(first.patient.deathReason,'circulatory-collapse');
  assert(Math.abs(first.patient.survival.atRealSecond-second.patient.survival.atRealSecond)<=.25);
  assert.equal(first.progress.xp,0);assert.equal(first.room.events.filter(x=>x.type==='clinical.patient-died').length,1);
  const late=await a.send('Enfermera Ringer 500 ml');assert(late.clinical.every(x=>x.status!=='executed'));
  assert.deepEqual(a.s.read().eligibleDestinations,[]);assert.equal(a.s.read().progress.xp,0);
 }finally{a.s.dispose();b.s.dispose();}
});
test('a real diuretic worsens hypovolemic secondary physiology and appropriate support remains free to execute',async()=>{
 const bad=fixture(),control=fixture();try{
  await bad.send('Enfermera una vía');await control.send('Enfermera una vía');
  await bad.send('Enfermera furosemida 40 mg');await bad.advance(.56);await control.advance(.56);
  assert.equal(bad.s.read().patient.administrationLog[0].id,'furosemide');
  await bad.advance(15);await control.advance(15);
  const harmed=bad.s.read().patient,untreated=control.s.read().patient;
  assert(harmed.liveVitals.sys<untreated.liveVitals.sys-3);
  assert(harmed.phys.renalReserve<untreated.phys.renalReserve);
  assert(bad.s.read().closure.quality.penalty>=5,'the existing quality deduction also records the proven clinical misstep');
  await bad.send('Enfermera Ringer 1000 ml y noradrenalina 0.05 mcg/kg/min IV');await bad.advance(5);
  assert(bad.s.read().patient.liveVitals.sys>harmed.liveVitals.sys);
 }finally{bad.s.dispose();control.s.dispose();}
});
test('the physical PERI guard shares IV access, five genuine support doses, surgeon response and the same handoff authority',async()=>{
 const data={...content,map:load('hospital'),beds:load('beds')},world=createWorld(data,{name:'PERI physical',scrubColor:'navy'});
 world.enterLobby();world.enterGuard({mode:'solo',caseId:'PERI-SEC-001'});const patient=world.snapshot().patients[0];let sequence=0;
 const s=createGuardSession({roomId:'peri-physical',mode:'solo',actorId:'doctor',actorName:'Doctor',patient,content:data,
  resolveContext:()=>({patientUid:patient.uid}),nursing:{enqueue:x=>world.enqueueNurseJourney(x),
   takeArrivals:()=>world.takeNurseArrivals(),accept:x=>world.acceptNurseClinicalResult(x)}});
 const send=text=>s.post({id:String(++sequence),text});
 try{
  await send('¿Dónde empezó el dolor?');await send('/signos');await send('/diagnostico peritonitis secundaria');
  for(const technique of ['general','inspection','auscultation','percussion','palpation'])await send('/examen '+technique);
  await send('Enfermera cirugía');
  const prescribed=await send('Enfermera monitor y Ringer 1000 ml y ceftriaxona 1 g y metronidazol 500 mg y noradrenalina 0.05 mcg/kg/min IV y oxigeno 4 L/min');
  assert.equal(prescribed.clinical.length,7);assert(prescribed.clinical.every(x=>x.status==='pending'));
  s.advance(5);await s.flush();assert.equal(s.read().patient.administrationLog.length,0);
  assert.deepEqual(s.read().eligibleDestinations,[]);
  for(let i=0;i<3600&&world.nurseJourneySnapshot().some(x=>x.stage!=='confirmed');i++){
   world.step(1/60);s.finishNurseArrivals();s.advance(1/60);
  }
  await s.flush();const given=s.read().patient;
  assert.equal(given.administrationLog.length,5);assert.equal(given.venousAccessCount,1);
  assert(given.procedures.monitor.connected);assert.equal(given.procedures.vasopressor.dose.amount,.05);
  assert(world.nurseJourneySnapshot().every(x=>x.stage==='confirmed'));
  assert.equal(s.read().patient.consults.at(-1).accepted,false,'early request preceded administered preparation');
  await send('/consulta cirugia');s.advance(3.5);await s.flush();
  assert.equal(s.read().patient.consults.at(-1).accepted,true);
  await send('/reevaluar');assert.deepEqual(s.read().eligibleDestinations,['quirofano']);
  const closed=await send('/disposicion quirofano');assert.equal(closed.clinical[0].status,'executed');
  assert.equal(s.read().patient.phys.sourceControlled,false);assert.equal(s.read().patient.closure.quality.score,87);
  assert(s.read().patient.closure.debrief.missing.some(text=>/foco.*diferido.*receptor/.test(text)),
   'the handoff report must not imply that operating in the ED was required');
  assert.equal(s.read().progress.xp,118);
 }finally{s.dispose();world.enterLobby();}
});
test('clinical freedom survives the migration: severe allergy is learned on asking and harms only after actual secondary-case administration',async()=>{
 const bad=fixture({severeAllergies:['ceftriaxone']}),control=fixture();try{
  assert(!bad.s.read().messages.some(x=>/alergia/i.test(x.text)),'no gratuitous disclosure');
  const answer=await bad.send('¿Tiene alergias?');assert.match(answer.clinical[0].receipt.answer,/Ceftriaxona.*grave/i);
  for(const f of [bad,control]){await f.send('Enfermera una vía');await f.send('Enfermera ceftriaxona 1 g y metronidazol 500 mg');await f.advance(1.49);}
  assert.equal(bad.s.read().patient.administrationLog.length,0);assert.deepEqual(bad.s.read().patient.adverseEvents,[]);
  // The inherited C1 reaction develops over native time; use its validated
  // ~26 real-second observation window rather than assuming instant hypoxemia.
  for(const f of [bad,control])await f.advance(25);
  const harmed=bad.s.read(),good=control.s.read();
  assert.equal(harmed.patient.administrationLog.filter(x=>x.id==='ceftriaxone').length,1,'known allergy never prevents execution');
  assert(harmed.patient.liveVitals.sys<good.patient.liveVitals.sys-3);
  assert(harmed.patient.liveVitals.spo2<good.patient.liveVitals.spo2-3);
  assert(harmed.patient.adverseEvents.some(x=>x.kind==='severe-drug-allergy'));
  assert(harmed.patient.coverage.score<1);assert.equal(good.patient.coverage.score,1);
  assert(harmed.closure.quality.penalty>=5);
 }finally{bad.s.dispose();control.s.dispose();}
});
