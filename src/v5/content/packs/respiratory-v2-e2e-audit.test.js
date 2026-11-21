import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../../server/content.js';
import {createGuardSession} from '../../clinical/guard-session.js';
import {clinicalPolicyTargets} from '../../clinical/clinical-policy-effects.js';
import {resp01V2Candidate as candidate} from './respiratory-v2-candidate.js';

const content={...clinicalContent,
 cases:clinicalContent.cases.map(c=>c.id===candidate.id?candidate:c)};
function create(roomId='resp01-v2-independent-coverage'){
 const uid=roomId+':patient';
 const s=createGuardSession({roomId,mode:'solo',actorId:'doctor',actorName:'Auditor',
  patient:{uid,caseId:candidate.id},content,resolveContext:()=>({patientUid:uid})});
 let i=0;
 return {s,send:text=>s.post({id:'qa-'+(++i),text}),uid};
}
function receipt(response){return response.clinical?.[0]?.receipt;}

// This suite asserts actual patient/examination/study/nursing receipts, not
// the success of text-input parsing or a self-declared source case checklist.
test('RESP-01 V2: dialogue, history, directed examination and all five authored studies use native receipts',async()=>{
 const {s,send,uid}=create('resp01-v2-e2e-history-exam-studies');
 try{
  const dialogue=await send('Hola, ¿qué le pasó?');
  assert.equal(dialogue.clinical?.[0]?.status,'executed');
  assert.equal(receipt(dialogue).patientUid,uid);
  assert.match(receipt(dialogue).answer,/fiebre/i);
  for(const [question,expected] of [
   ['¿Desde cuándo?',/tres días/i],
   ['¿Antecedentes?',/enfermedad cardíaca/i],
   ['¿Alergias?',/medicamentos|morfina|amikacina/i],
   ['¿Tomaste alguna medicación recientemente?',/paracetamol/i],
   ['¿Con quién vive?',/familia/i]
  ]){
   const reply=await send(question);
   assert.equal(reply.clinical?.[0]?.status,'executed',question);
   assert.match(receipt(reply)?.answer||'',expected,question);
  }
  const exam=await send('/examen thorax auscultation');
  assert.equal(exam.clinical?.[0]?.status,'executed');
  assert.match(receipt(exam).message,/Crepitantes|soplo tubario/i);
  assert(s.read().patient.examLog.some(row=>row.patientUid===uid),'exam must be recorded');
  const expectedIds=[
   'g_resp01_cxr','g_resp01_cbc','g_resp01_renal',
   'g_resp01_v2_gas','g_resp01_v2_lactate'
  ];
  for(const id of expectedIds){
   const ordered=await send('/estudio '+id);
   assert.equal(ordered.clinical?.[0]?.status,'pending',id);
  }
  s.advance(90);await s.flush();
  const completed=s.read().patient.orders;
  for(const id of expectedIds){
   const report=completed.find(x=>x.id===id);
   assert(report,id+' missing');
   assert.equal(report.status,'done',id);
   assert.equal(report.patientUid,uid,id);
   assert(typeof report.result==='string'&&report.result.trim().length>10,id+' produced no report');
   assert(typeof report.sourceEventId==='string'&&report.sourceEventId.length,id+' unowned report');
  }
  assert.equal(s.read().patient.administrationLog.length,0,'history and studies did not administer treatments');
 }finally{s.dispose();}
});

test('RESP-01 V2: Dr Vega button has actual one-action offer and a unique 5% XP cost',async()=>{
 const {s,send}=create('resp01-v2-e2e-vega-ledger');
 const b=s.hintBinding('doctor'),ask=(op,id,other={})=>s.hint({...b,op,requestId:id,...other},'doctor');
 async function display(n){
  const p=await ask('prepare','v2-prepare-'+n);
  assert.equal(p.status,'verified','must prepare real executable hint');
  const d=await ask('displayed','v2-display-'+n,{offerId:p.offerId});
  assert.equal(d.status,'displayed');
  return d;
 }
 try{
  assert.equal(s.clinicalHint().action?.command,'/signos');
  await display('1');
  assert.equal(s.hintCount('doctor'),1);
  await display('2');
  assert.equal(s.hintCount('doctor'),1,'same action must remain free on repetition');
  assert.equal(s.rewardFor({xp:133,quality:{score:100}},'doctor').xp,126);
  await send('/signos');
  const next=s.clinicalHint();
  assert(next?.action?.command&&next.action.command!=='/signos');
  await display('3');
  assert.equal(s.hintCount('doctor'),2);
  assert.equal(s.rewardFor({xp:133,quality:{score:100}},'doctor').xp,119);
 }finally{s.dispose();}
});

test('RESP-01 V2: a real administered antibiotic changes delayed physiological targets, not immediate vitals on request',async()=>{
 const {s,send}=create('resp01-v2-e2e-antibiotic-effect');
 try{
  const first=structuredClone(s.read().patient.liveVitals);
  const placed=await send('/tratamiento amoxicillin 1000 mg oral');
  assert.equal(placed.clinical?.[0]?.status,'pending');
  assert.deepEqual(s.read().patient.liveVitals,first,'placing an order may not directly change vital signs');
  assert.equal(s.read().patient.administrationLog.length,0,'the order is not an infusion or a delivered dose');
  s.advance(3);await s.flush();
  const p=s.read().patient,delivery=p.administrationLog.find(x=>x.id==='amoxicillin');
  assert(delivery,'the medication has no confirmed native administration');
  assert.equal(delivery.patientUid,p.uid);
  const untreated={...p,treatments:[],administrationLog:[]};
  const at=delivery.administeredAtNativeMinute;
  assert.deepEqual(clinicalPolicyTargets(p,candidate,at+5),
   clinicalPolicyTargets(untreated,candidate,at+5),
   'antibiotic cannot instantly improve the simulated fever');
  const treatedLate=clinicalPolicyTargets(p,candidate,at+70);
  const untreatedLate=clinicalPolicyTargets(untreated,candidate,at+70);
  assert(treatedLate.temp<untreatedLate.temp,'temperature reduction from confirmed antibiotic was never modeled');
  assert(treatedLate.hr<untreatedLate.hr,'heart-rate improvement from confirmed antibiotic was never modeled');
 }finally{s.dispose();}
});

test('RESP-01 V2: natural-language nurse requests execute through the same public guard owner',async()=>{
 const {s,send,uid}=create('resp01-v2-e2e-nurse-message');
 try{
  const order=await send('Enfermera amoxicilina 1 g oral');
  assert.equal(order.clinical?.[0]?.status,'pending','natural nursing request not interpreted');
  s.advance(5);await s.flush();
  const p=s.read().patient;
  assert(p.administrationLog.some(a=>a.id==='amoxicillin'&&a.patientUid===uid&&a.sourceEventId),
   'a nurse-text request never reached a confirmed patient-bound dose');
  assert(s.read().messages.some(m=>m.role==='nurse'),
   'no authentic nurse confirmation message was published');
 }finally{s.dispose();}
});
