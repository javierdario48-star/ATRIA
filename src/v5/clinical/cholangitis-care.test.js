import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createGuardSession} from './guard-session.js';
import {createCholangitisCare,cholangitisClosureSnapshot} from './cholangitis-care.js';
import {routeWardSpeech} from '../core/speech-router.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
const read=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const diagnosis='colangitis aguda';
function fixture(roomId='chol',properties={}){
 let serial=0;
 const session=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Guardia',
  patient:{uid:'patient',caseId:'CHOLANG-001',...properties},content,
  resolveContext:()=>({patientUid:'patient'})});
 return {session,post:text=>session.post({id:'c'+(++serial),text}),
  async advance(seconds){session.advance(seconds);await session.flush();}};
}
async function examine(f){
 await f.post('/signos');
 for(const technique of ['general','inspection','auscultation','percussion','palpation'])
  await f.post('/examen '+technique);
}
test('CHOLANG is the sixth certified executor with sepsis source and no fictitious drainage',()=>{
 assert.equal(CLINICAL_EXECUTORS['CHOLANG-001'],'cholangitis');
 const f=fixture('chol-entry');
 try{
  const p=f.session.read().patient;
  assert.equal(p.phys.sourceControlled,false);
  assert.equal(p.liveVitals.sys,86);
  assert.equal(p.liveVitals.hr,132);
  assert.deepEqual(p.administrationLog,[]);
  assert.equal(p.closure.ready,false);
  assert.deepEqual(f.session.read().eligibleDestinations,[]);
 }finally{f.session.dispose();}
});
test('explicit Gastroenterology consultation is patient-bound and cannot perform CPRE or grant XP',async()=>{
 const f=fixture('chol-gastro');
 try{
  assert.equal(routeWardSpeech('/consulta gastro',{clinicalEvaluation:true,patientUid:'patient'}).intents[0].id,'gastro');
  await f.post('/consulta gastro');await f.advance(3.5);
  assert.equal(f.session.read().patient.consults.at(-1).accepted,false);
  await examine(f);await f.post('/diagnostico '+diagnosis);
  await f.post('/consulta gastro');await f.advance(3.5);
  const p=f.session.read().patient;
  assert.equal(p.consults.at(-1).accepted,true);
  assert.equal(p.phys.sourceControlled,false);
  assert(!p.treatments.some(t=>t.id==='source_control'));
  assert.equal(f.session.read().progress.xp,0);
  assert.deepEqual(f.session.read().eligibleDestinations,[]);
 }finally{f.session.dispose();}
});
test('source-sepsis progresses before IV administration and fluid is effective only after a verified dose',async()=>{
 const untreated=fixture('chol-untreated'),treated=fixture('chol-treated');
 try{
  await treated.post('Enfermera una vía');
  const order=await treated.post('Enfermera Ringer 500 ml');
  assert.equal(order.clinical[0].status,'pending');
  await treated.advance(.79);await untreated.advance(.79);
  assert.equal(treated.session.read().patient.administrationLog.length,0);
  await treated.advance(.02);await untreated.advance(.02);
  const good=treated.session.read().patient,bad=untreated.session.read().patient;
  assert.equal(good.administrationLog.filter(x=>x.id==='fluid').length,1);
  assert(good.phys.effectiveVolume>bad.phys.effectiveVolume+.04);
  assert.equal(good.phys.sourceControlled,false);
 }finally{untreated.session.dispose();treated.session.dispose();}
});
test('CHOLANG diagnostic evidence, antimicrobial treatment, specialist handoff and unique XP close the case',async()=>{
 const f=fixture('chol-care');
 try{
  await examine(f);await f.post('¿Desde cuándo empezó el dolor?');
  await f.post('/diagnostico '+diagnosis);
  await f.post('/estudio cholang_liver');
  await f.post('/consulta gastro');
  await f.post('Enfermera una vía');
  const drugs=await f.post('Enfermera Ringer 500 ml y ceftriaxona 1 g y metronidazol 500 mg');
  assert.equal(drugs.clinical.length,3);
  assert(drugs.clinical.every(x=>x.status==='pending'));
  assert.deepEqual(f.session.read().eligibleDestinations,[]);
  await f.advance(70);
  await f.post('/reevaluar');
  const prepared=f.session.read();
  assert.equal(prepared.patient.consults.at(-1).accepted,true);
  assert(prepared.patient.orders.some(x=>x.id==='cholang_liver'&&x.status==='done'));
  assert.equal(prepared.patient.administrationLog.filter(x=>['fluid','ceftriaxone','metronidazole'].includes(x.id)).length,3);
  assert.deepEqual(prepared.eligibleDestinations,['procedimiento']);
  const premature=await f.post('/disposicion alta');
  assert.equal(premature.clinical[0].status,'rejected');
  const closure=await f.post('/disposicion procedimiento');
  assert.equal(closure.clinical[0].status,'executed');
  const end=f.session.read();
  assert(end.patient.closure?.closed);
  assert.equal(end.patient.phys.sourceControlled,false);
  assert.equal(end.patient.closure.destination,'procedimiento');
  assert.equal(end.progress.receipts.length,1);
  assert(end.progress.xp>0);
  const xp=end.progress.xp;
  await f.post('/disposicion procedimiento');
  assert.equal(f.session.read().progress.xp,xp);
 }finally{f.session.dispose();}
});
