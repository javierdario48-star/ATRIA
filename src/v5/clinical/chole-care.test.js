import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';
import {createGuardSession} from './guard-session.js';
import {initialCholeVitals,choleDiseaseTargetOffsets} from './native-chole.js';
const read=x=>JSON.parse(fs.readFileSync(new URL('../content/'+x+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const caseData=content.cases.find(x=>x.id==='CHOLE-001');
function fixture(roomId,extra={}){
 let seq=0;
 const s=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Médica',
  patient:{uid:'P',caseId:'CHOLE-001',...extra},content,resolveContext:()=>({patientUid:'P'})});
 return {s,post:text=>s.post({id:'c'+(++seq),text}),
  async advance(seconds){s.advance(seconds);await s.flush();}};
}
const examine=async f=>{
 await f.post('/signos');
 for(const technique of ['general','inspection','auscultation','percussion','palpation'])
  await f.post('/examen '+technique);
};
test('the seventh executor belongs exclusively to CHOLE and initially has no surgery or fluids',()=>{
 assert.equal(CLINICAL_EXECUTORS['CHOLE-001'],'chole');
 assert.equal(initialCholeVitals(caseData).sys,108);
 const f=fixture('chole-init');
 try{
  const state=f.s.read(),p=state.patient;
  assert.equal(p.liveVitals.sys,108);
  assert.deepEqual(p.administrationLog,[]);
  assert.equal(state.closure.ready,false);
  assert.deepEqual(state.eligibleDestinations,[]);
  assert(!p.treatments.some(t=>t.id==='source_control'));
 }finally{f.s.dispose();}
});
test('CHOLE natural history is bounded and verified antibiotics slow only later progression',async()=>{
 const f=fixture('chole-progress'),treated=fixture('chole-treated');
 try{
  assert(choleDiseaseTargetOffsets(f.s.read().patient,caseData,200).sys<0);
  await treated.post('Enfermera una vía');
  const drugs=await treated.post('Enfermera ceftriaxona 1 g y metronidazol 500 mg');
  assert(drugs.clinical.every(x=>x.status==='pending'));
  assert.equal(treated.s.read().patient.administrationLog.length,0);
  await treated.advance(2);await f.advance(2);
  assert.equal(treated.s.read().patient.administrationLog.length,2);
  const untreatedOffset=choleDiseaseTargetOffsets(f.s.read().patient,caseData,200);
  const treatedOffset=choleDiseaseTargetOffsets(treated.s.read().patient,caseData,200);
  assert(treatedOffset.sys>untreatedOffset.sys,'confirmed coverage slows worsening');
  assert(treatedOffset.sys<0,'antibiotics do not cure an unoperated gallbladder');
  assert.equal(treated.s.read().progress.xp,0);
 }finally{f.s.dispose();treated.s.dispose();}
});
test('surgery does not accept a diagnosis-free request and accepted review cannot fabricate source control',async()=>{
 const f=fixture('chole-consult');
 try{
  await f.post('/consulta cirugia');await f.advance(3.5);
  assert.equal(f.s.read().patient.consults.at(-1).accepted,false);
  await examine(f);await f.post('/diagnostico colecistitis aguda');
  await f.post('/consulta cirugia');await f.advance(3.5);
  const p=f.s.read().patient;
  assert.equal(p.consults.at(-1).accepted,true);
  assert(!p.treatments.some(x=>x.id==='source_control'));
  assert.equal(f.s.read().progress.xp,0);
  assert.deepEqual(f.s.read().eligibleDestinations,[]);
 }finally{f.s.dispose();}
});
test('confirmed NPO and antibiotics with actual ultrasound, surgical acceptance and reassessment permit exactly one surgical handoff',async()=>{
 const f=fixture('chole-full');
 try{
  await examine(f);await f.post('¿Desde cuándo comenzó el dolor?');
  await f.post('/diagnostico colecistitis aguda');
  await f.post('/estudio chole_us');await f.post('/consulta cirugia');
  const npo=await f.post('Enfermera nada por boca');
  assert(npo.clinical.some(x=>x.id==='npo'&&x.status==='executed'));
  const drugs=await f.post('Enfermera una vía y Ringer 500 ml y ceftriaxona 1 g y metronidazol 500 mg');
  assert(drugs.clinical.every(x=>['executed','pending'].includes(x.status)));
  assert.deepEqual(f.s.read().eligibleDestinations,[]);
  await f.advance(75);
  await f.post('/reevaluar');
  const ready=f.s.read();
  assert(ready.patient.orders.some(x=>x.id==='chole_us'&&x.status==='done'));
  assert(ready.patient.consults.some(x=>x.id==='cirugia'&&x.accepted));
  assert(ready.patient.treatments.some(x=>x.id==='npo'));
  assert(ready.patient.administrationLog.some(x=>x.id==='ceftriaxone'));
  assert(ready.patient.administrationLog.some(x=>x.id==='metronidazole'));
  assert.deepEqual(ready.eligibleDestinations,['quirofano']);
  const bad=await f.post('/disposicion alta');
  assert.equal(bad.clinical[0].status,'rejected');
  const closed=await f.post('/disposicion quirofano');
  assert.equal(closed.clinical[0].status,'executed');
  const end=f.s.read();
  assert.equal(end.patient.closure.destination,'quirofano');
  assert.equal(end.progress.receipts.length,1);
  assert(end.patient.closure.quality.score>0);
  assert(end.progress.xp>0);
  assert(!end.patient.treatments.some(x=>x.id==='surgery'||x.id==='source_control'));
  const xp=end.progress.xp;
  await f.post('/disposicion quirofano');
  assert.equal(f.s.read().progress.xp,xp);
 }finally{f.s.dispose();}
});
test('dangerous excess crystalloid is reflected by the same native CHOLE owner',async()=>{
 const f=fixture('chole-overload');
 try{
  await f.post('Enfermera una vía');
  for(let n=0;n<8;n++){await f.post('Enfermera Ringer 500 ml');await f.advance(1);}
  const p=f.s.read().patient;
  assert.equal(p.administrationLog.filter(x=>x.id==='fluid').length,8);
  await f.advance(40);
  const later=f.s.read();
  assert(later.patient.liveVitals.spo2<caseData.vitals.spo2-3);
  assert(later.patient.liveVitals.rr>caseData.vitals.rr+3);
 }finally{f.s.dispose();}
});
