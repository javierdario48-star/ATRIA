import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {criticalCareReview487} from './surgical-consultation.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(caseId='PERI-TER-001'){let id=0;const s=createGuardSession({roomId:'ter',mode:'solo',actorId:'doctor',actorName:'Doctor',patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
 return {s,send:text=>s.post({id:String(++id),text}),async advance(dt){s.advance(dt);await s.flush();}};}
async function assess(f){
 for(const text of ['¿Cuántas operaciones previas?','¿Evolución desde la cirugía?','¿Tiene defensas bajas?'])await f.send(text);
 await f.send('/signos');await f.send('/diagnostico peritonitis terciaria');
 for(const t of ['general','inspection','auscultation','percussion','palpation'])await f.send('/examen '+t);
}
async function support(f){await f.send('Enfermera una vía');await f.send('Enfermera Ringer 1000 ml y piperacilina tazobactam 4.5 g y noradrenalina 0.05 mcg/kg/min IV y oxigeno 4 L/min');}
test('critical-care reply refuses a stable bed while retaining the original urgency and recent-shock handoff',()=>{
 const v={sys:120,dia:75,hr:80,rr:18,spo2:98};
 assert.equal(criticalCareReview487(v).accepted,false);assert.match(criticalCareReview487(v).reason,/no requiere cama crítica/);
 assert.equal(criticalCareReview487({...v,spo2:92}).accepted,true);
 assert.equal(criticalCareReview487(v,{recentShock:true}).accepted,true);
});
test('natural ICU requests accept sentence punctuation, share one consultation, and never execute questions or negations',async()=>{
 const f=fixture();try{
  for(const text of ['Enfermera, interconsulta a UTI.','Enfermera consulta a terapia intensiva.'])
   assert.equal((await f.send(text)).clinical[0]?.status,'pending');
  assert.equal(f.s.read().patient.pendingConsults.length,1);
  await f.send('Enfermera, ¿consulta a UTI?');await f.send('Enfermera no interconsulta a UTI.');
  assert.equal(f.s.read().patient.pendingConsults.length,1);await f.advance(3.5);
  assert.equal(f.s.read().patient.consults.length,1);
 }finally{f.s.dispose();}
});
test('repeated real antibiotics retain the original achieved coverage ramp in both medical peritonitis cases',async()=>{
 for(const [caseId,drug] of [['PERI-TER-001','piperacilina tazobactam 4.5 g'],['PERI-PBE-001','ceftriaxona 1 g']]){
  const f=fixture(caseId);try{await f.send('Enfermera una vía');await f.send('Enfermera '+drug);await f.advance(30);
   assert.equal(f.s.read().patient.coverage.ramp,1);await f.send('Enfermera '+drug);await f.advance(1.51);
   assert.equal(f.s.read().patient.administrationLog.length,2);assert.equal(f.s.read().patient.coverage.ramp,1);
  }finally{f.s.dispose();}
 }
});
test('tertiary shares the original native owner and all three genuine interview facts',async()=>{
 const f=fixture();try{assert.equal(f.s.read().patient.phys?.renalReserve,.42);assert.equal(f.s.read().patient.phys.sourceControlled,false);
  await assess(f);assert.deepEqual(new Set(f.s.read().patient.intentHistory.map(x=>x.id)),new Set(['surgery_history','course','immuno']));
  assert.match(f.s.read().patient.exam.palpation.rows.find(x=>x.organ==='Abdomen').text,/sin colección focal/);
 }finally{f.s.dispose();}
});
test('a genuinely answered receiving consult enables urgent ICU handoff, never a pending culture or performed operation',async()=>{
 const f=fixture();try{
  await assess(f);await f.send('/estudio ter_culture');await support(f);
  const ask=await f.send('/consulta uti');assert.equal(ask.clinical[0]?.status,'pending');
  await f.advance(3.49);assert.deepEqual(f.s.read().eligibleDestinations,[]);
  await f.advance(.02);const ready=f.s.read();assert.equal(ready.patient.consults[0].accepted,true);assert.equal(ready.patient.consults[0].id,'uti');
  assert.deepEqual(ready.eligibleDestinations,['uti']);assert.equal(ready.patient.orders[0].status,'pending');
  assert.equal(ready.closure.procedurePerformed,false);assert.equal((await f.send('/disposicion sala')).clinical[0].status,'rejected');
  assert.equal((await f.send('/disposicion uti')).clinical[0].status,'executed');
  const closed=f.s.read();assert(closed.progress.xp>0);assert(!closed.patient.phys.sourceControlled);assert(!closed.patient.treatments.some(t=>t.id==='source_control'));
  await f.send('/disposicion uti');assert.equal(f.s.read().progress.receipts.length,1);
 }finally{f.s.dispose();}
});
test('tertiary surgery rejects an unsubstantiated request and accepts corrected documented clinical evidence',async()=>{
 const f=fixture();try{
  await f.send('/consulta cirugia');await f.advance(3.5);assert.equal(f.s.read().patient.consults[0].accepted,false);
  await assess(f);await support(f);await f.send('/consulta cirugia');await f.advance(3.5);
  assert.equal(f.s.read().patient.consults.at(-1).accepted,true);assert.deepEqual(f.s.read().eligibleDestinations,['uti']);
  assert.match(f.s.read().patient.consults.at(-1).advice,/mantener reanimación/i);
 }finally{f.s.dispose();}
});
test('real therapy improves perfusion without erasing persistent tertiary infection or initial shock',async()=>{
 const good=fixture(),control=fixture(),bad=fixture();try{
  await support(good);await assess(good);await good.send('/consulta uti');await good.send('/estudio ter_ct');await good.send('/estudio ter_cbc');
  await bad.send('Enfermera una vía');await bad.send('Enfermera furosemida 40 mg');
  await good.advance(30);await control.advance(30);await bad.advance(30);
  let p=good.s.read().patient;assert(p.liveVitals.sys>100);assert(p.coverage.score===1);assert(p.phys.inflammation>.9,'source not controlled: no fabricated cure');
  assert(bad.s.read().patient.phys.effectiveVolume<control.s.read().patient.phys.effectiveVolume-.05);
  await good.advance(90);p=good.s.read().patient;assert(p.orders.every(x=>x.status==='done'));assert.match(p.orders.find(x=>x.id==='ter_ct').result,/sin un absceso/);
  assert.deepEqual(good.s.read().eligibleDestinations,['uti'],'recent shock remains a critical-care handoff even after improvement');
  await good.send('/reevaluar');assert.equal((await good.send('/disposicion uti')).clinical[0].status,'executed');
 }finally{good.s.dispose();control.s.dispose();bad.s.dispose();}
});
test('tertiary abandonment causes death after grace, with late support still finite and no duplicated outcome',async()=>{
 const abandoned=fixture(),rescued=fixture();try{
  await abandoned.advance(179);assert(!abandoned.s.read().patient.patientDied);await abandoned.advance(301);assert(abandoned.s.read().patient.patientDied);
  assert.equal(abandoned.s.read().progress.xp,0);assert.equal(abandoned.s.read().room.events.filter(x=>x.type==='clinical.patient-died').length,1);
  await rescued.advance(30);const low=rescued.s.read().patient.liveVitals.sys;await support(rescued);await rescued.advance(30);
  assert(rescued.s.read().patient.liveVitals.sys>low+10);assert(!rescued.s.read().patient.patientDied);
  await rescued.advance(900);assert(rescued.s.read().patient.patientDied,'support never grants permanent immunity');
 }finally{abandoned.s.dispose();rescued.s.dispose();}
});
