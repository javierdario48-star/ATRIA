import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {readPatientObservations} from './patient-observations.js';
const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
let serial=0;
function doctor(caseId){
 const uid='observation-'+(++serial),s=createGuardSession({roomId:uid,mode:'solo',
  actorId:'doctor',actorName:'QA',patient:{uid,caseId},content,resolveContext:()=>({patientUid:uid})});
 let event=0;
 return {s,post:text=>s.post({id:'step-'+(++event),text}),
  async advance(seconds){s.advance(seconds);await s.flush();},
  read(){const state=s.read();return readPatientObservations(state.patient,caseId,state.clock.nativeMinute);}};
}
test('lactulose improves hepatic orientation after real administration and observation time, rather than BP',async()=>{
 const treated=doctor('ENCEF-001'),control=doctor('ENCEF-001');
 try{
  assert.equal(treated.read().neuro.verbal,4);
  const pending=await treated.post('Enfermera lactulosa 30 ml');
  assert.equal(pending.clinical[0]?.status,'pending');assert.equal(treated.read().neuro.verbal,4);
  await treated.advance(2);assert.equal(treated.read().neuro.verbal,4,'not an immediate reversal');
  await treated.advance(760);await control.advance(762);
  assert.equal(treated.read().neuro.verbal,5);assert.equal(control.read().neuro.verbal,4);
  const state=treated.s.read(),p=state.patient,t=p.treatments.find(x=>x.id==='lactulose');
  assert.equal(readPatientObservations(p,'ENCEF-001',t.administeredAtNativeMinute-.01).neuro.verbal,4,
   'future administrations do not act in the past');
  assert.equal(readPatientObservations({...p,uid:'another-patient'},'ENCEF-001',state.clock.nativeMinute).neuro.verbal,4);
  const reply=await treated.post('¿Sabe dónde está?');
  assert(!reply.clinical.some(x=>x.status==='rejected'));
  assert.equal(treated.s.read().progress.xp,0);
 }finally{treated.s.dispose();control.s.dispose();}
});
for(const [caseId,order,therapy,flag] of [
 ['FECAL-001','Enfermera desimpactacion','disimpaction','bowelImpactionResolved'],
 ['ILEO-001','Enfermera sonda nasogastrica','ngt','bowelDecompressed']
])test(caseId+' local treatment relieves the modeled bowel complaint only after confirmed completion',async()=>{
 const f=doctor(caseId);
 try{
  const original=f.read();assert.equal(original[flag],false);
  const pending=await f.post(order);assert.equal(pending.clinical[0]?.status,'pending');
  assert.equal(f.read()[flag],false);await f.advance(2);
  assert.equal(f.read()[flag],false,'completion is followed by an observation delay');
  await f.advance(50);const after=f.read();
  assert.equal(after[flag],true);assert(after.pain<original.pain);
  const state=f.s.read(),p=state.patient,t=p.treatments.find(x=>x.id===therapy);
  assert.equal(readPatientObservations(p,caseId,t.administeredAtNativeMinute-.01)[flag],false);
  assert.equal(readPatientObservations({...p,uid:'another-patient'},caseId,state.clock.nativeMinute)[flag],false);
  const answer=await f.post('¿Cómo se siente ahora?');
  assert.match(answer.clinical.map(x=>x.receipt?.answer||'').join(' '),caseId==='FECAL-001'?/evacuar|evacuación/:/sonda|distensión/);
  assert.equal(f.s.read().progress.receipts.length,0);
 }finally{f.s.dispose();}
});
