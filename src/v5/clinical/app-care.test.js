import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
const load=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
const c=content.cases.find(x=>x.id==='APP-001');
function fixture(){
 let near='APP-P1',sequence=0;
 const s=createGuardSession({roomId:'APP-ROOM',mode:'solo',actorId:'doctor',actorName:'Doctor',
  patient:{uid:'APP-P1',caseId:'APP-001'},content,resolveContext:()=>({patientUid:near})});
 return {s,send:(text,id='a'+(++sequence),extra={})=>s.post({id,text,...extra}),near:v=>near=v};
}
async function evaluate(f){
 for(const id of ['onset','migration','anorexia']){
  const sample=c.intents.find(x=>x.id===id);
  await f.send('¿'+sample.keys[0]+'?');
 }
 await f.send('/signos');
 for(const id of ['general','inspection','auscultation','percussion','palpation'])await f.send('/examen '+id);
}
test('APP inherited original anamnesis, directed exam and vitals via room authority',async()=>{
 const f=fixture();await evaluate(f);const p=f.s.read().patient;
 assert.deepEqual(['onset','migration','anorexia'].every(id=>p.intentHistory.some(x=>x.id===id)),true);
 assert.equal(p.examDone,true);
 assert.match(JSON.stringify(p.exam),/McBurney|Blumberg/);
 assert.equal(p.liveVitals.hr,108);assert.equal(p.liveVitals.sys,118);
 f.s.dispose();
});
test('APP does not administer either IV antibiotic without real confirmed access',async()=>{
 const f=fixture();
 const rejected=await f.send('Enfermera ceftriaxona y metronidazol','no-iv');
 assert.equal(rejected.clinical.length,2);
 assert(rejected.clinical.every(x=>x.status==='rejected'&&x.reason==='venous-access-required'));
 f.s.advance(3);await f.s.flush();
 assert.deepEqual(f.s.read().patient.administrationLog,[]);
 assert.deepEqual(f.s.read().patient.pendingTreatments,[]);
 f.s.dispose();
});
test('one venous access plus two independent dual prescriptions gives four native doses; one retry gives none',async()=>{
 const f=fixture(),iv=await f.send('Enfermera una vía');
 assert.equal(iv.clinical[0].status,'executed');
 assert.equal(f.s.read().patient.venousAccessCount,1);
 const first=await f.send('Enfermera ceftriaxona 1 g y metronidazol 500 mg','dual');
 assert.deepEqual(first.clinical.map(x=>[x.id,x.status]),[['ceftriaxone','pending'],['metronidazole','pending']]);
 await f.send('Enfermera ceftriaxona 1 g y metronidazol 500 mg','dual');
 await f.send('Enfermera ceftriaxona y metronidazol','duplicate-other');
 f.s.advance(1.49);await f.s.flush();
 assert.equal(f.s.read().patient.administrationLog.length,0);
 f.s.advance(.02);await f.s.flush();
 const p=f.s.read().patient;
 assert.deepEqual(p.administrationLog.map(x=>x.id),
  ['ceftriaxone','metronidazole','ceftriaxone','metronidazole']);
 assert.deepEqual(p.administrationLog.map(x=>x.dose.amount),[1000,500,1000,500]);
 assert.deepEqual(p.administrationLog.map(x=>x.sourceEventId),[
  'APP-ROOM:doctor:dual:0','APP-ROOM:doctor:dual:1',
  'APP-ROOM:doctor:duplicate-other:0','APP-ROOM:doctor:duplicate-other:1']);
 for(let i=0;i<2;i++){
  const a=await f.send('Enfermera ceftriaxona 1 g y metronidazol 500 mg','dual');
  assert.equal(a.clinical[i].status,'executed');
  assert.equal(a.clinical[i].receipt.therapyId,p.administrationLog[i].id);
  assert.equal(a.clinical[i].receipt.sourceEventId,'APP-ROOM:doctor:dual:'+i);
 }
 assert.equal(p.administrationLog.length,4);
 f.s.dispose();
});
test('real Ringer action changes APP physiology only after native 800ms delay',async()=>{
 const f=fixture();await f.send('Enfermera una vía');
 const a=await f.send('Enfermera Ringer 500 ml');assert.equal(a.clinical[0].status,'pending');
 f.s.advance(.79);await f.s.flush();assert.equal(f.s.read().patient.liveVitals.hr,108);
 assert.equal(f.s.read().patient.administrationLog.length,0);
 f.s.advance(1.51);await f.s.flush();
 const p=f.s.read().patient;assert.equal(p.administrationLog.length,1);
 assert.equal(p.administrationLog[0].dose.amount,500);
 assert(p.liveVitals.hr<108);assert(p.liveVitals.sys>118);
 f.s.dispose();
});
test('invalid dose, invented surgery and hemogram cannot administer medication',async()=>{
 const f=fixture();await f.send('Enfermera una vía');
 for(const text of ['Enfermera ceftriaxona 2 g','Enfermera metronidazol 100 mg','Enfermera ceftriaxona 1 g oral','Enfermera no ceftriaxona'])
  await f.send(text);
 await f.send('Enfermera hemograma');
 f.s.advance(45);await f.s.flush();
 assert.equal(f.s.read().patient.administrationLog.length,0);
 assert.equal(f.s.read().patient.orders.length,1);
 assert(!f.s.read().patient.treatments.some(t=>t.id==='source_control'));
 f.s.dispose();
});
test('APP surgical referral requires completed studies, both IV drugs and confirmed consultation; closure and XP once',async()=>{
 const f=fixture();const premature=await f.send('/disposicion quirofano');assert.equal(premature.clinical[0].status,'rejected');
 assert.equal(premature.clinical[0].reason,'transfer-not-accepted');
 assert.equal(f.s.read().patient.caseEnded,false,'unsubstantiated surgical request cannot leave ED');
 await evaluate(f);
 await f.send('/estudio app_cbc');await f.send('/estudio app_us');
 await f.send('Enfermera una vía');
 await f.send('Enfermera ceftriaxona 1 g y metronidazol 500 mg','dual');
 const consult=await f.send('/consulta cirugia','consult');
 assert.equal(consult.clinical[0].status,'pending');
 await f.send('/diagnostico apendicitis aguda');
 assert.equal((await f.send('/disposicion quirofano')).clinical[0].status,'rejected');
 f.s.advance(120);await f.s.flush();
 assert.equal(f.s.read().patient.consults[0].accepted,false,'the first request lacked completed preparation');
 await f.send('/consulta cirugia','prepared-consult');f.s.advance(3.5);await f.s.flush();
 const p=f.s.read().patient;
 assert.equal(p.pendingTreatments.length,0);
 assert.equal(p.administrationLog.length,2);
 assert.equal(p.consults.length,2);
 assert.equal(p.consults.at(-1).accepted,true);
 assert(p.orders.every(o=>o.status==='done'));
 const settled=await f.send('/consulta cirugia','consult');assert.equal(settled.clinical[0].status,'executed');
 assert.deepEqual(f.s.read().eligibleDestinations,[],'full-care readiness still needs reassessment');
 await f.send('/reevaluar');
 const closed=await f.send('/disposicion quirofano','close');
 assert.equal(closed.clinical[0].status,'executed');
 const state=f.s.read();assert.equal(state.patient.caseEnded,true);
 assert.equal(state.patient.closure.destination,'quirofano');
 assert.equal(state.patient.closure.quality.score,100);
 assert.equal(state.progress.xp,133);
 assert.equal(state.progress.receipts.length,1);
 assert.deepEqual(await f.send('/disposicion quirofano','close'),closed);
 assert.equal((await f.send('/disposicion quirofano','again')).clinical[0].status,'rejected');
 assert.equal(f.s.read().progress.receipts.length,1);
 assert.equal(f.s.read().patient.administrationLog.length,2);
 assert.equal(f.s.read().patient.treatments.some(x=>x.id==='source_control'),false,'ED handoff is not performed surgery');
 f.s.dispose();
});
test('no wrong-patient action or later work after disposal',async()=>{
 const f=fixture();f.near(null);
 const result=await f.send('Enfermera una vía','out-of-range',{patientUid:'APP-P1'});
 assert.equal(result.status,'received-not-executed');
 assert.equal(f.s.read().patient.venousAccessCount,0);
 f.near('APP-P1');await f.send('Enfermera una vía');await f.send('Enfermera ceftriaxona');
 f.s.dispose();assert.throws(()=>f.s.advance(3),/disposed/);
 assert.equal(f.s.read().patient.administrationLog.length,0);
});

test('C07 invalid repeat doses and routes cannot attach to an APP nursing job already preparing',async()=>{
 const f=fixture();
 await f.send('Enfermera una vía');
 const initial=await f.send('Enfermera ceftriaxona 1 g','correct');
 assert.equal(initial.clinical[0].status,'pending');
 for(const [text,reason] of [
  ['Enfermera ceftriaxona 2 g','unsupported-dose'],
  ['Enfermera ceftriaxona 1 g oral','unsupported-dose-route']
 ]){
  const r=await f.send(text);
  assert.equal(r.clinical.length,1,text+' must be parsed as a real nursing order');
  assert.equal(r.clinical[0].status,'rejected',text+' must not join the pending administration');
  assert.equal(r.clinical[0].reason,reason);
 }
 assert.equal(f.s.read().patient.pendingTreatments.length,1,'only original preparation remains');
 f.s.advance(1.6);await f.s.flush();
 const p=f.s.read().patient;
 assert.equal(p.administrationLog.length,1);
 assert.equal(p.administrationLog[0].dose.amount,1000);
 assert.equal(p.administrationLog[0].sourceEventId,'APP-ROOM:doctor:correct:0');
 assert.equal(f.s.read().messages.filter(x=>x.id.startsWith('completion:')).length,1,
  'exactly one successful nursing completion');
 f.s.dispose();
});
test('C07 post-administration wrong-dose repeat never claims the existing APP receipt',async()=>{
 const f=fixture();
 await f.send('Enfermera una vía');
 await f.send('Enfermera ceftriaxona 1 g','correct');
 f.s.advance(1.6);await f.s.flush();
 const p=f.s.read().patient;
 assert.equal(p.administrationLog.length,1);
 for(const text of ['Enfermera ceftriaxona 2 g','Enfermera ceftriaxona 1 g oral']){
  const r=await f.send(text);
  assert.equal(r.clinical.length,1);
  assert.equal(r.clinical[0].status,'rejected',text);
  assert.equal(r.clinical[0].receipt?.therapyId,undefined,'invalid dose cannot be reused');
 }
 const valid=await f.send('Enfermera ceftriaxona 1 g','valid-repeat');
 assert.equal(valid.clinical[0].status,'pending','new clinical intent prepares another administration');
 assert.equal(f.s.read().patient.administrationLog.length,1,'pending order is not yet a dose');
 f.s.advance(1.51);await f.s.flush();
 const repeated=f.s.read().patient.administrationLog;
 assert.equal(repeated.length,2);
 assert.equal(repeated[1].sourceEventId,'APP-ROOM:doctor:valid-repeat:0');
 assert.equal(repeated[1].dose.amount,1000);
 const onceMore=await f.send('Enfermera ceftriaxona 1 g','valid-repeat');
 assert.equal(onceMore.clinical[0].status,'executed','transport retry reads original receipt');
 assert.equal(onceMore.clinical[0].receipt.reused,false);
 assert.equal(f.s.read().patient.administrationLog.length,2);
 f.s.dispose();
});

test('C07 a combined nurse instruction preserves IV-first dependency and drug-specific receipts',async()=>{
 const f=fixture();
 const ack=await f.send('Enfermera dos vías, ceftriaxona 1 g y metronidazol 500 mg','combined');
 assert.deepEqual(ack.clinical.map(x=>[x.kind,x.id,x.status]),[
  ['procedure.request','iv','executed'],
  ['therapy.request','ceftriaxone','pending'],
  ['therapy.request','metronidazole','pending']
 ]);
 assert.equal(f.s.read().patient.venousAccessCount,2);
 assert.equal(f.s.read().patient.administrationLog.length,0,
  'acknowledging a compound order cannot prematurely administer');
 f.s.advance(1.49);await f.s.flush();
 assert.equal(f.s.read().patient.administrationLog.length,0);
 f.s.advance(.02);await f.s.flush();
 const p=f.s.read().patient;
 assert.deepEqual(p.administrationLog.map(x=>[x.id,x.dose.amount,x.sourceEventId]),[
  ['ceftriaxone',1000,'APP-ROOM:doctor:combined:1'],
  ['metronidazole',500,'APP-ROOM:doctor:combined:2']
 ]);
 const retry=await f.send('Enfermera dos vías, ceftriaxona 1 g y metronidazol 500 mg','combined');
 assert.deepEqual(retry.clinical.map(x=>x.status),['executed','executed','executed']);
 assert.equal(f.s.read().patient.administrationLog.length,2);
 assert.equal(f.s.read().messages.filter(x=>x.id.startsWith('completion:')).length,2);
 f.s.dispose();
});

test('C07 six clinical effects in one nurse message share native patient and preserve distinct waiting times',async()=>{
 const f=fixture();
 const order='Enfermera dos vías, monitor, Ringer 500 ml, ceftriaxona 1 g y metronidazol 500 mg';
 const reply=await f.send(order,'nursing-shift');
 assert.deepEqual(reply.clinical.map(x=>[x.id,x.status]),[
  ['iv','executed'],['monitor','executed'],
  ['fluid','pending'],['ceftriaxone','pending'],['metronidazole','pending']
 ]);
 let p=f.s.read().patient;
 assert.equal(p.venousAccessCount,2);
 assert.equal(p.procedures.monitor.connected,true);
 assert.equal(p.lastVitalsKnown.patientUid,p.uid);
 assert.equal(p.administrationLog.length,0);
 f.s.advance(.79);await f.s.flush();
 assert.equal(f.s.read().patient.administrationLog.length,0,'Ringer not given early');
 f.s.advance(.02);await f.s.flush();
 p=f.s.read().patient;
 assert.deepEqual(p.administrationLog.map(x=>x.id),['fluid']);
 assert(p.liveVitals.sys>p.baselineVitals.sys,'only executed fluid can affect APP pressure');
 f.s.advance(.69);await f.s.flush();
 p=f.s.read().patient;
 assert.deepEqual(p.administrationLog.map(x=>x.id),['fluid','ceftriaxone','metronidazole']);
 assert.deepEqual(p.administrationLog.map(x=>x.sourceEventId),[
  'APP-ROOM:doctor:nursing-shift:2','APP-ROOM:doctor:nursing-shift:3','APP-ROOM:doctor:nursing-shift:4'
 ]);
 await f.send(order,'nursing-shift');
 assert.equal(f.s.read().patient.administrationLog.length,3);
 assert.equal(f.s.read().messages.filter(x=>x.id.startsWith('completion:')).length,3);
 f.s.dispose();
});
