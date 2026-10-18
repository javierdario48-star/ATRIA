import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {confirmedClinicalMissteps} from './clinical-risk.js';
const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(){let id=0;const s=createGuardSession({roomId:'pbe',mode:'solo',actorId:'doctor',actorName:'Doctor',
 patient:{uid:'P',caseId:'PERI-PBE-001'},content,resolveContext:()=>({patientUid:'P'})});
 return {s,send:text=>s.post({id:String(++id),text}),async advance(dt){s.advance(dt);await s.flush();}};}
async function assess(f){
 for(const text of ['¿Tiene cirrosis?','¿Tiene ascitis?','¿Tuvo fiebre?','¿Notó confusión?'])await f.send(text);
 await f.send('/signos');await f.send('/diagnostico PBE');
 for(const technique of ['general','inspection','auscultation','percussion','palpation'])await f.send('/examen '+technique);
}
async function treat(f,{albumin=true,fluid=false}={}){
 await f.send('Enfermera una vía');
 return f.send('Enfermera ceftriaxona 1 g'+(albumin?' y albumina 1.5 g/kg':'')+(fluid?' y Ringer 500 ml':''));
}
test('PBE begins with reversible confusion and a medical source state, without disclosing unmeasured Glasgow',async()=>{
 const f=fixture();try{
  const p=f.s.read().patient;
  assert.equal(p.phys?.effectiveVolume,.72,'PBE must use its original active physiology');
  assert.equal(p.phys.sourceControlled,true,'medical seed, never an operation receipt');
  assert.equal(f.s.read().closure.procedurePerformed,false,'a medical focus state cannot claim a performed operation');
  assert.equal(p.glasgow,null);
  const measured=await f.send('/glasgow all');assert.equal(measured.clinical[0].status,'executed');
  assert.equal(f.s.read().patient.glasgow.total,14);
  const answer=await f.send('¿Dónde te duele?');assert.match(answer.clinical[0].receipt.answer,/panza/);
  assert.equal(f.s.read().patient.administrationLog.length,0);
 }finally{f.s.dispose();}
});
test('only administered albumin plus appropriate coverage enables original PBE convalescence and neurological recovery',async()=>{
 const good=fixture(),incomplete=fixture(),untreated=fixture();try{
  await treat(good);await treat(incomplete,{albumin:false});
  await good.advance(.79);assert.equal(good.s.read().patient.administrationLog.length,0);
  await good.advance(.02);const albumin=good.s.read().patient;
  assert.equal(albumin.administrationLog.length,1);assert.equal(albumin.administrationLog[0].id,'albumin');
  assert(albumin.phys.effectiveVolume>.77);assert.equal(albumin.coverage.score,0);
  await good.advance(59.19);await incomplete.advance(60);await untreated.advance(60);
  const a=good.s.read().patient,b=incomplete.s.read().patient,c=untreated.s.read().patient;
  assert(a.phys.inflammation<.62*.7,'convalescence has a real inflammation threshold');
  assert(a.phys.effectiveVolume>b.phys.effectiveVolume+.05);
  assert(a.phys.renalReserve>b.phys.renalReserve+.04);
  assert(a.liveVitals.sys>c.liveVitals.sys+15);
  await good.send('/glasgow all');assert.equal(good.s.read().patient.glasgow.total,15);
  assert.equal(a.phys.sourceControlled,true);assert(!a.treatments.some(x=>x.id==='source_control'));
  assert.equal(good.s.read().progress.xp,0);
 }finally{good.s.dispose();incomplete.s.dispose();untreated.s.dispose();}
});
test('PBE diagnostic paracentesis has its real deadline and full original care closes to the ward with unique XP',async()=>{
 const f=fixture();try{
  await assess(f);await f.send('/estudio pbe_paracentesis');await f.send('/estudio pbe_renal');await treat(f);
  await f.advance(39.99);assert.equal(f.s.read().patient.orders.find(x=>x.id==='pbe_paracentesis').status,'pending');
  assert.deepEqual(f.s.read().eligibleDestinations,[]);
  await f.advance(.02);const ready=f.s.read();
  assert.equal(ready.patient.orders.find(x=>x.id==='pbe_paracentesis').status,'done');
  assert.match(ready.patient.orders.find(x=>x.id==='pbe_paracentesis').result,/780 PMN/);
  assert.deepEqual(ready.eligibleDestinations,['sala'],'renal results improve quality, but are not another minimum gate');
  await f.advance(5);await f.send('/reevaluar');
  assert.equal((await f.send('/disposicion quirofano')).clinical[0].status,'rejected');
  const closed=await f.send('/disposicion sala');assert.equal(closed.clinical[0].status,'executed');
  const final=f.s.read();assert.equal(final.patient.closure.quality.score,100);assert.equal(final.progress.xp,133);
  assert.equal(final.progress.receipts.length,1);assert.equal(final.patient.phys.sourceControlled,true);
  assert.match(closed.clinical[0].receipt.message,/sala/i);assert(!final.patient.treatments.some(x=>x.id==='source_control'));
  await f.send('/disposicion sala');assert.equal(f.s.read().progress.xp,133);
 }finally{f.s.dispose();}
});
test('a critical PBE handoff offers ICU after real support, without requiring pressure normalization or surgery',async()=>{
 const f=fixture();try{
  await assess(f);await f.send('/estudio pbe_paracentesis');await f.send('/estudio pbe_culture');
  await f.advance(60);assert(f.s.read().patient.liveVitals.sys<90);
  await treat(f,{fluid:true});await f.advance(2);
  const ready=f.s.read();assert(ready.patient.liveVitals.sys<90);
  assert.equal(ready.patient.orders.find(x=>x.id==='pbe_culture').status,'pending');
  assert.deepEqual(ready.eligibleDestinations,['uti']);assert.equal(ready.closure.ready,true);
  assert.equal((await f.send('/disposicion sala')).clinical[0].status,'rejected');
  assert.equal((await f.send('/disposicion uti')).clinical[0].status,'executed');
  assert.equal(f.s.read().patient.closure.destination,'uti');assert(f.s.read().progress.xp>0);
  assert.equal(f.s.read().patient.consults.length,0,'the original PBE evaluator does not invent a surgical gate');
 }finally{f.s.dispose();}
});
test('a harmful PBE aminoglycoside remains executable and reduces renal reserve before later appropriate support',async()=>{
 const bad=fixture(),control=fixture();try{
  await bad.send('Enfermera una vía');await bad.send('Enfermera amikacina 500 mg');
  await bad.advance(1.49);assert.equal(bad.s.read().patient.administrationLog.length,0);
  await bad.advance(58.51);await control.advance(60);
  const p=bad.s.read().patient,c=control.s.read().patient;
  assert.equal(p.administrationLog[0].id,'amikacin');assert(p.phys.renalReserve<c.phys.renalReserve-.01);
  assert(p.phys.renalStress>0);assert.equal(p.coverage.score,0);
  const missteps=confirmedClinicalMissteps(p,content.cases.find(c=>c.id===p.caseId));
  assert(missteps.flags.some(x=>/Amikacina.*renal/i.test(x)),'native renal contraindication must affect safety scoring');
  await treat(bad,{fluid:true});await bad.advance(60);
  assert(bad.s.read().patient.liveVitals.sys>p.liveVitals.sys);
  assert(!bad.s.read().patient.patientDied);
  await assess(bad);await bad.send('/estudio pbe_paracentesis');await bad.send('/estudio pbe_renal');await bad.advance(45);await bad.send('/reevaluar');
  assert.equal((await bad.send('/disposicion sala')).clinical[0].status,'executed');
  assert.equal(bad.s.read().patient.closure.quality.penalty,5);assert.equal(bad.s.read().patient.closure.quality.score,95);
 }finally{bad.s.dispose();control.s.dispose();}
});
test('abandoned PBE reaches sustained fatal physiology with the same outcome for long and short frames',async()=>{
 const a=fixture(),b=fixture();try{
  await a.advance(179);assert(!a.s.read().patient.patientDied);
  await a.advance(301);for(let t=0;t<480;t+=.25)await b.advance(.25);
  const p=a.s.read().patient,q=b.s.read().patient;
  assert(p.patientDied&&q.patientDied);assert.equal(p.deathReason,q.deathReason);
  assert(Math.abs(p.survival.atRealSecond-q.survival.atRealSecond)<=.25);
  assert.equal(a.s.read().progress.xp,0);assert.deepEqual(a.s.read().eligibleDestinations,[]);
  assert.equal(a.s.read().room.events.filter(x=>x.type==='clinical.patient-died').length,1);
  assert.equal((await a.send('Enfermera ceftriaxona')).clinical[0].status,'rejected');
 }finally{a.s.dispose();b.s.dispose();}
});
