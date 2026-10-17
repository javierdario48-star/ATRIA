import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {historyHTML} from '../ui/clinical-panels.js';
const load=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
function fixture(mode='solo',caseId='CIRR-001'){
 const uid='freedom-'+mode+'-'+caseId;
 const s=createGuardSession({roomId:uid,mode,actorId:'doctor',actorName:'Doctor',
  patient:{uid,caseId,allergies:[{drugId:'ceftriaxone',severity:'severe'}]},content,
  resolveContext:()=>({patientUid:uid})});
 let i=0;
 return {s,post:text=>s.post({id:'m'+(++i),text}),
  async advance(seconds){for(let t=0;t<seconds-1e-9;t+=.25)s.advance(Math.min(.25,seconds-t));await s.flush();}};
}
for(const mode of ['solo','apprentice']){
 test(mode+': asking reveals the actual allergy; avoidance produces no exposure or adverse effect',async()=>{
  const {s,post,advance}=fixture(mode,'APP-001');
  try{
   await post('Hola');
   assert(!/ceftriaxona|alergia grave/i.test(historyHTML(s.read().patient)));
   assert(!s.read().messages.some(x=>/ceftriaxona|alergia grave/i.test(x.text)));
   const answer=await post('¿Tiene alergias a medicamentos?');
   assert.match(answer.clinical[0].receipt.answer,/ceftriaxona/i);
   assert.match(answer.clinical[0].receipt.answer,/grave/i);
   assert.match(historyHTML(s.read().patient),/ceftriaxona/i);
   await post('Enfermera una vía');await post('Enfermera metronidazol 500 mg');
   await advance(26);
   assert.deepEqual(s.read().patient.administrationLog.map(x=>x.id),['metronidazole']);
   assert.equal(s.read().patient.adverseEvents?.length??0,0);
  }finally{s.dispose();}
 });
 test(mode+': an unasked severe allergy harms only after actual administration and is documented once',async()=>{
  const {s,post,advance}=fixture(mode,'APP-001');
  try{
   await post('Enfermera una vía');
   const ack=await post('Enfermera ceftriaxona 1 g');
   assert.equal(ack.clinical[0].status,'pending');
   await advance(1.4);
   assert.equal(s.read().patient.administrationLog.length,0);
   assert.equal(s.read().patient.adverseEvents?.length??0,0);
   assert.equal(s.read().patient.liveVitals.sys,118);
   await advance(24.6);
   const state=s.read();
   assert.equal(state.patient.administrationLog.length,1);
   assert(state.patient.liveVitals.sys<95);
   assert(state.patient.liveVitals.spo2<91);
   assert.equal(state.patient.adverseEvents.length,1);
   assert.match(historyHTML(state.patient),/Reacción alérgica grave/i);
   assert(state.messages.some(x=>x.role==='nurse'&&/Reacción alérgica grave/i.test(x.text)));
   assert(state.closure.quality.penalty>=5);
   await s.post({id:'m2',text:'Enfermera ceftriaxona 1 g'});
   await advance(1);
   assert.equal(s.read().patient.administrationLog.length,1,'transport retry is not another dose');
   assert.equal(s.read().patient.adverseEvents.length,1);
  }finally{s.dispose();}
 });
}
test('a later new exposure can cause another reaction after the first resolves',async()=>{
 const {s,post,advance}=fixture();
 try{
  await post('Enfermera una vía');await post('Enfermera ceftriaxona 1 g');
  await advance(170);
  assert(s.read().patient.liveVitals.sys>107);
  await post('Enfermera ceftriaxona 1 g');await advance(26);
  assert(s.read().patient.liveVitals.sys<85);
  assert.equal(s.read().patient.adverseEvents.length,2);
 }finally{s.dispose();}
});
test('an allergenic antibiotic is delivered but never earns appropriate coverage or closure credit',async()=>{
 const {s,post,advance}=fixture('solo','APP-001');
 try{
  await post('Enfermera una vía');
  await post('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
  await advance(26);
  assert.equal(s.read().exposure.byDrug.ceftriaxone.administrations,1);
  assert.equal(s.pharmacologyRead().outcomes.coverageComplete,false);
  assert(s.read().closure.missing.some(x=>/imprescindibles/i.test(x)));
 }finally{s.dispose();}
});
test('one delayed frame cannot skip an administered allergic episode or its history',async()=>{
 const {s,post}=fixture('solo','APP-001');
 try{
  await post('Enfermera una vía');await post('Enfermera ceftriaxona 1 g');
  s.advance(170);await s.flush();
  assert.equal(s.read().patient.adverseEvents.length,1);
  assert.equal(s.read().patient.adverseEvents[0].status,'resolved');
  assert(s.read().closure.quality.penalty>=5);
 }finally{s.dispose();}
});
test('complications retain valid long source IDs and follow administration in the authoritative transcript',async()=>{
 for(const id of ['short','x'.repeat(160)]){
  const {s,post}=fixture('solo','APP-001');
  try{
   await post('Enfermera una vía');
   await s.post({id,text:'Enfermera ceftriaxona 1 g'});
   s.advance(26);await s.flush();
   const events=s.read().room.events;
   const admin=events.findIndex(e=>e.type==='clinical.completed'&&e.clinical[0].id==='ceftriaxone');
   const complication=events.findIndex(e=>e.type==='clinical.complication');
   assert(complication>admin&&admin>=0,'receipt must precede complication, including a delayed frame');
   assert(s.read().messages.some(x=>x.role==='nurse'&&/Reacción alérgica grave/i.test(x.text)));
  }finally{s.dispose();}
 }
});
test('the same real allergy is survivable with early support but can be fatal after sustained critical hypoxemia',async()=>{
 const summaries=[];
 for(const strategy of ['rescue','neglect','late']){
  const {s,post,advance}=fixture();
  try{
   await post('Enfermera una vía');await post('Enfermera Ringer 6 l');
   await advance(500); // beyond maximum legacy grace; overload alone remains nonfatal
   assert.equal(s.read().patient.patientDied,undefined);
   assert(s.read().patient.liveVitals.spo2>80);
   await post('Enfermera ceftriaxona 1 g');
   await advance(10);
   assert.equal(s.read().patient.patientDied,undefined,'no instantaneous fatal reaction');
   if(strategy==='rescue')await post('Enfermera oxígeno 4 L/min');
   await advance(40);
   if(strategy==='late'){
    const late=await post('Enfermera oxígeno 4 L/min');
    assert.equal(late.clinical[0].reason,'patient-not-active');
   }
   await advance(120);
   const state=s.read();summaries.push({strategy,died:!!state.patient.patientDied,spo2:state.patient.liveVitals.spo2});
   assert.equal(!!state.patient.patientDied,strategy!=='rescue');
   assert.equal(state.progress.xp,0);
   if(strategy==='rescue')assert(state.patient.liveVitals.spo2>80);
   else{
    assert.equal(state.room.patients[0].died,true);
    assert.equal(state.patient.deathReason,'critical-hypoxemia');
    const close=await post('/cerrar sala');assert.equal(close.clinical[0].reason,'patient-not-active');
   }
  }finally{s.dispose();}
 }
 assert.equal(summaries.length,3);
});
