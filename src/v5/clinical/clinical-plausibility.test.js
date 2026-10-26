// Regression checks exercise the production speech/bedside executor. Clinical
// effects are compared at the same clock time; no patient state is fabricated.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {additionalCaseTargets} from './native-additional-cases.js';
import {CLINICAL_BOT_PLAYBOOK as book} from './clinical-bot-playbooks.js';

const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
let serial=0;
function doctor(caseId){
 const uid='plausibility-'+(++serial),s=createGuardSession({roomId:uid,mode:'solo',
  actorId:'doctor',actorName:'QA',patient:{uid,caseId},content,
  resolveContext:()=>({patientUid:uid})});
 let event=0;
 return {s,post:text=>s.post({id:'step-'+(++event),text}),
  async advance(seconds){s.advance(seconds);await s.flush();}};
}
async function assessed(f,caseId,studies=book[caseId].studies,meds=[]){
 const plan=book[caseId];
 for(const text of plan.history)await f.post(text);
 await f.post('/signos');
 for(const region of ['general','inspection','auscultation','percussion','palpation'])
  await f.post('/examen '+region);
 await f.post('/diagnostico '+plan.dx);
 for(const id of studies)await f.post('/estudio '+id);
 for(const text of meds)await f.post(text);
 await f.advance(Math.max(plan.wait,240));
 await f.post('/reevaluar');
}

// These therapies are not volume resuscitation. Inflammatory treatment may
// gradually reduce fever/tachycardia; it cannot directly repair BP or SpO2.
for(const [caseId,order,therapy] of [
 ['ENCEF-001','Enfermera lactulosa 30 ml','lactulose'],
 ['CROHN-001','Enfermera corticoides','steroid'],
 ['UC-AS-001','Enfermera metilprednisolona 60 mg','methylprednisolone'],
 ['CDI-001','Enfermera fidaxomicina 200 mg','fidaxomicin'],
 ['CDI-001','Enfermera vancomicina oral 125 mg','vancomycin_po'],
 ['ILEO-001','Enfermera sonda nasogastrica','ngt'],
 ['FECAL-001','Enfermera desimpactacion','disimpaction'],
 ['MESI-001','Enfermera heparina','anticoagulation']
])test(caseId+' '+therapy+' cannot manufacture a perfusion or oxygenation cure',async()=>{
 const treated=doctor(caseId),control=doctor(caseId),c=content.cases.find(x=>x.id===caseId);
 try{
  await treated.post('Enfermera una vía');
  const ordered=await treated.post(order);
  assert.equal(ordered.clinical[0]?.status,'pending');
  assert(!treated.s.read().patient.treatments.some(t=>t.id===therapy));
  await treated.advance(600);await control.advance(600);
  const received=treated.s.read(),untreated=control.s.read();
  assert(received.patient.treatments.some(t=>t.id===therapy&&t.patientUid===received.patient.uid));
  assert.equal(received.clock.nativeMinute,untreated.clock.nativeMinute);
  const after=additionalCaseTargets(received.patient,c,received.clock.nativeMinute),
   before=additionalCaseTargets(untreated.patient,c,untreated.clock.nativeMinute);
  const inflammatory=['steroid','methylprednisolone','fidaxomicin','vancomycin_po'].includes(therapy);
  for(const axis of inflammatory?['sys','dia','rr','spo2']:Object.keys(before))
   assert.equal(after[axis],before[axis],axis+' is not directly treated');
  if(inflammatory){
   assert(after.hr<before.hr&&after.temp<before.temp,'delayed inflammatory response should reduce fever/tachycardia modestly');
   assert(before.hr-after.hr<2,'early inflammatory response is not instant recovery');
   assert.deepEqual(additionalCaseTargets(received.patient,c,30),additionalCaseTargets(untreated.patient,c,30),
    'no inflammatory vital response immediately after the first administration');
  }
  assert.equal(received.progress.xp,0);
 }finally{treated.s.dispose();control.s.dispose();}
});

for(const [caseId,order] of [
 ['VARIX-001','Enfermera terlipresina 2 mg'],
 ['DIARR-001','Enfermera sales de rehidratacion oral']
])test(caseId+' circulatory support does not invent a direct respiratory or temperature response',async()=>{
 const treated=doctor(caseId),control=doctor(caseId),c=content.cases.find(x=>x.id===caseId);
 try{
  await treated.post('Enfermera una vía');await treated.post(order);
  await treated.advance(600);await control.advance(600);
  const a=treated.s.read(),b=control.s.read();
  const after=additionalCaseTargets(a.patient,c,a.clock.nativeMinute),before=additionalCaseTargets(b.patient,c,b.clock.nativeMinute);
  assert(after.hr<before.hr&&after.sys>before.sys,'confirmed circulatory support should attenuate hypoperfusion');
  for(const axis of ['temp','rr','spo2'])assert.equal(after[axis],before[axis],axis+' is not directly treated');
 }finally{treated.s.dispose();control.s.dispose();}
});

for(const caseId of ['CROHN-001','DIVERT-001'])test(caseId+' normovolemia receives no free IV pressure or pulse bonus',async()=>{
 const treated=doctor(caseId),control=doctor(caseId),c=content.cases.find(x=>x.id===caseId);
 try{
  await treated.post('Enfermera una vía');await treated.post('Enfermera Ringer 500 ml');
  await treated.advance(120);await control.advance(120);
  const a=treated.s.read(),b=control.s.read();
  assert.equal(a.exposure.confirmedCrystalloidMl,500);
  const after=additionalCaseTargets(a.patient,c,a.clock.nativeMinute),before=additionalCaseTargets(b.patient,c,b.clock.nativeMinute);
  assert.equal(after.sys,before.sys);assert.equal(after.hr,before.hr);
 }finally{treated.s.dispose();control.s.dispose();}
});

test('achalasia discharge requires manometry and exclusion of pseudoachalasia by upper endoscopy',async()=>{
 const f=doctor('ACAL-001');
 try{
  await assessed(f,'ACAL-001',['g_achal_manometry'],['Enfermera seguimiento']);
  assert.equal((await f.post('/disposicion alta')).clinical[0]?.status,'rejected');
  assert.equal(f.s.read().progress.receipts.length,0);
  await f.post('/estudio g_achal_egd');await f.advance(240);await f.post('/reevaluar');
  assert.equal((await f.post('/disposicion alta')).clinical[0]?.status,'executed');
  assert.equal(f.s.read().progress.receipts.length,1);
 }finally{f.s.dispose();}
});

for(const caseId of ['DIVERT-001','HEPAT-001','PUD-001'])
 test(caseId+' discharge requires a documented follow-up and safety-net plan',async()=>{
  const f=doctor(caseId);
  try{
   await assessed(f,caseId,book[caseId].studies,
    caseId==='PUD-001'?['Enfermera omeprazol oral 20 mg']:[]);
   assert.equal((await f.post('/disposicion alta')).clinical[0]?.status,'rejected');
   assert.equal(f.s.read().progress.receipts.length,0);
   await f.post('Enfermera plan de seguimiento y signos de alarma');
   await f.advance(2);await f.post('/reevaluar');
   assert.equal((await f.post('/disposicion alta')).clinical[0]?.status,'executed');
   const state=f.s.read();assert.equal(state.progress.receipts.length,1);
   await f.post('/disposicion alta');assert.equal(f.s.read().progress.xp,state.progress.xp);
  }finally{f.s.dispose();}
 });

// A chronic diagnosis is not a countdown to death. A complete guard with no
// therapy must not fabricate collapse in these initially stable case seeds.
for(const caseId of ['CIRR-001','CROHN-001','COLON-001','DIVERT-001','HEPAT-001',
 'FECAL-001','PUD-001','CELIAC-001','ACAL-001'])
 test(caseId+' remains alive through an untreated 24-hour game shift without automatic XP',async()=>{
  const f=doctor(caseId);
  try{
   await f.advance(1439);
   const state=f.s.read();
   assert.equal(state.clock.gameMinute,1439);
   assert.equal(!!state.patient.patientDied,false);
   assert.equal(state.patient.caseEnded,false);
   assert.equal(state.patient.treatments.length,0);
   assert.equal(state.progress.xp,0);
   assert.equal(state.progress.receipts.length,0);
   assert(state.patient.liveVitals.sys>=90&&state.patient.liveVitals.spo2>=92);
  }finally{f.s.dispose();}
 });
