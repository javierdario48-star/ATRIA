import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseStandardIVDose} from './native-medications.js';
import {createGuardSession} from './guard-session.js';
import {routeWardSpeech} from '../core/speech-router.js';
const read=n=>JSON.parse(readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
function create(caseId,mode='solo'){
 const p={uid:'qa-'+caseId+'-'+mode,caseId};
 const s=createGuardSession({roomId:'ringer-'+caseId+'-'+mode,mode,actorId:'doctor',
  actorName:'Doctor',patient:p,content,resolveContext:()=>({patientUid:p.uid})});
 let i=0;return {s,post:text=>s.post({id:'m-'+(++i),text})};
}
test('Spanish single-order Ringer 4 litros, 4 l or 4000 ml is a single validated IV dose, not 500ml',()=>{
 const r=content.defaultDoses.fluid;
 for(const text of ['Enfermera Ringer 4 litros','Ringer 4 l','Ringer 4000 ml','Ringer 4 litros intravenoso']){
  const dose=parseStandardIVDose(text,r);
  assert.equal(dose.amount,4000,text);
  assert.equal(dose.unit,'ml');
  assert.equal(dose.display,'4 l');
  assert.equal(dose.defaultApplied,false);
 }
 assert.equal(parseStandardIVDose('Ringer',r).amount,500);
 for(const text of ['Ringer 4 litros y 500 ml','Ringer 0 ml','Ringer 40001 ml',
   'Ringer -500 ml','Ringer 40 litros y 20 ml','Ringer 4 litros oral']){
  assert.throws(()=>parseStandardIVDose(text,r),/dose|route/);
 }
 assert.throws(()=>parseStandardIVDose('furosemida 400 mg',content.defaultDoses.furosemide),/unsupported-dose/);
});
test('4 litres truly administered once, with 8x500 ml equivalent respiratory targets; none before actual receipt',async()=>{
 for(const caseId of ['APP-001','CIRR-001']){
  for(const mode of ['solo','apprentice']){
   const a=create(caseId,mode);
   try{
    const route=routeWardSpeech('Enfermera Ringer 4 litros',{
     patientUid:'P',clinicalEvaluation:true,studies:[],therapies:content.therapies,
     interventions:content.cases.find(c=>c.id===caseId).interventions});
    assert.deepEqual(route.intents.map(x=>x.id),['fluid']);
    await a.post('Enfermera una vía');
    await a.post('Enfermera monitor');
    const original=a.s.read().patient.liveVitals;
    const ordered=await a.post('Enfermera Ringer 4 litros');
    assert.equal(ordered.clinical[0].status,'pending');
    assert.equal(a.s.read().exposure.confirmedCrystalloidMl,0);
    assert.equal(a.s.read().patient.liveVitals.spo2,original.spo2);
    a.s.advance(.81);await a.s.flush();
    const after=a.s.read();
    assert.equal(after.exposure.confirmedCrystalloidMl,4000);
    assert.deepEqual(after.patient.administrationLog.filter(x=>x.id==='fluid').map(x=>x.dose.amount),[4000]);
    a.s.advance(46);await a.s.flush();
    const treated=a.s.read().patient;
    assert(treated.liveVitals.spo2<original.spo2-3,caseId+' O2 must fall after confirmed 4L');
    assert(treated.liveVitals.rr>original.rr+3,caseId+' RR must rise after confirmed 4L');
    assert.equal(treated.patientDied,undefined,'4L must not cause instant death in stable patient');
    assert.equal(treated.lastVitalsKnown.source,'monitor');
    assert(Math.abs(treated.lastVitalsKnown.vitals.spo2-treated.liveVitals.spo2)<.6,'connected monitor displays injury');
   }finally{a.s.dispose();}
  }
 }
});
test('4L order without verified venous access is rejected and produces no physiology',async()=>{
 const f=create('CIRR-001');
 try{
  const initial=f.s.read().patient.liveVitals;
  const result=await f.post('Enfermera Ringer 4 litros');
  assert.equal(result.clinical[0].status,'rejected');
  assert.equal(result.clinical[0].reason,'venous-access-required');
  f.s.advance(90);await f.s.flush();
  assert.equal(f.s.read().exposure.confirmedCrystalloidMl,0);
  assert.deepEqual(f.s.read().patient.liveVitals,initial);
 }finally{f.s.dispose();}
});
test('malformed and wrong-dose medications never create IV receipts or clinical harm',async()=>{
 const f=create('APP-001');
 try{
  await f.post('Enfermera una vía');
  for(const phrase of ['Enfermera ceftriaxona 2 g','Enfermera metronidazol 2 g',
    'Enfermera furosemida 400 mg','Enfermera Ringer 4 litros oral']){
   const response=await f.post(phrase);
   assert.equal(response.clinical[0]?.status,'rejected',phrase);
  }
  f.s.advance(15);await f.s.flush();
  assert.equal(f.s.read().patient.administrationLog.length,0);
 }finally{f.s.dispose();}
});
