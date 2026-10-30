import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {routeWardSpeech} from '../core/speech-router.js';
const data=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={cases:data('cases'),therapies:data('therapies'),defaultDoses:data('default-doses')};
function fixture(caseId,roomId){
 let seq=0;
 const s=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Medica',
  patient:{uid:'P',caseId},content,resolveContext:()=>({patientUid:'P'})});
 return {s,caseId,post:text=>s.post({id:'t'+(++seq),text}),async advance(seconds){s.advance(seconds);await s.flush();}};
}
async function basicWorkup(f,diagnosis){
 await f.post('/diagnostico '+diagnosis);await f.post('/signos');
 for(const technique of ['general','inspection','auscultation','percussion','palpation'])
  await f.post('/examen '+technique);
 await f.post('¿Qué antecedentes tiene?');await f.post('Enfermera una vía');
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
