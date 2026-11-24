import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {selectClinicalHint} from './clinical-hints.js';
import {clinicalHintRequirements} from './clinical-hint-requirements.js';
import {evaluateClinicalPolicyDisposition} from './clinical-policy-closure.js';
import {observedStabilizationRequirements} from './clinical-stabilization-requirements.js';
import {resp01V2Candidate} from '../content/packs/respiratory-v2-candidate.js';
import {varixV2Candidate} from '../content/packs/varix-v2-candidate.js';

const stages=[resp01V2Candidate,varixV2Candidate];
const staged=c=>({...clinicalContent,cases:clinicalContent.cases.map(x=>x.id===c.id?c:x)});
async function fixture(c,label){
 const roomId='iatrogenic-hint-'+c.id+'-'+label,uid=roomId+':patient';
 const s=createGuardSession({roomId,actorId:'doctor',actorName:'QA',mode:'solo',
  patient:{uid,caseId:c.id},content:staged(c),resolveContext:()=>({patientUid:uid})});
 let i=0;return {s,send:text=>s.post({id:'action-'+(++i),text})};
}
function hint(p,c,minute,destination){
 const content=staged(c),assessment=evaluateClinicalPolicyDisposition(p,c,destination);
 const requirements=clinicalHintRequirements(p,c,assessment,destination);
 const before=structuredClone(p);
 const h=selectClinicalHint({patient:p,caseData:c,content,
  clock:{nativeMinute:minute,clinicalMinute:minute},destination,requirements,
  fulfilledTreatmentIds:assessment.fulfilledTreatmentIds});
 assert.deepEqual(p,before,'Vega cannot write native physiology or execute rescue');
 return {h,assessment};
}
test('RESP-01 V2: observed severe hypoxemia without any random complication prioritizes real oxygen',async()=>{
 const {s}=await fixture(resp01V2Candidate,'omission');
 try{
  const p=s.read().patient,prior=hint(p,resp01V2Candidate,0,'alta');
  assert.equal(p.policyState?.complications?.length||0,0);
  assert.notEqual(prior.h.requirement,'observed-instability-rescue');
  p.liveVitals.spo2=85;p.liveVitals.rr=32;
  const next=hint(p,resp01V2Candidate,0,'alta');
  assert.equal(next.h.requirement,'observed-instability-rescue');
  assert.equal(next.h.action.id,'oxygen');
  assert.equal(next.h.action.kind,'treatment');
  assert.match(next.h.action.command,/Enfermera/);
  assert(next.assessment.requirements.some(r=>r.reason==='observed-instability-rescue'));
  assert(next.assessment.ready===false);
 }finally{s.dispose();}
});
test('VARIX-001 V2: native heparin harm redirects Vega to transfusion, without seeded random episode',async()=>{
 const {s,send}=await fixture(varixV2Candidate,'heparin');
 try{
  // The unsafe choice must pass the real nursing/pharmacology owner.
  await send('/signos');
  await send('Enfermera una vía');
  const order=await send('Enfermera heparina IV');
  assert.equal(order.clinical?.[0]?.status,'pending');
  s.advance(130);await s.flush();
  const p=s.read().patient;
  assert(p.administrationLog.some(x=>x.id==='anticoagulation'),'harm requires a confirmed administration');
  assert(p.adverseEvents.some(x=>x.kind==='anticoagulant-bleeding'&&x.status==='active'),
   'the native drug harm must be documented before the hint changes');
  assert(!p.policyState?.complications?.length,
   'iatrogenic bleeding must work without a selected random episode');
  const current=hint(p,varixV2Candidate,s.read().clock.nativeMinute,'procedimiento');
  assert.equal(current.h.requirement,'iatrogenic-deterioration-rescue');
  assert.equal(current.h.action.id,'transfusion');
  assert(current.assessment.requirements.some(r=>r.reason==='iatrogenic-deterioration-rescue'));
  // The bot never claims a transfusion happened merely because Vega suggested it.
  assert(!p.treatments.some(x=>x.id==='transfusion'));
 }finally{s.dispose();}
});
test('RESP-01 V2: actual opioid respiratory harm requires support even without a random pneumonia setback',async()=>{
 const {s,send}=await fixture(resp01V2Candidate,'morphine');
 try{
  await send('/signos');
  await send('Enfermera una vía');
  const rx=await send('Enfermera morfina 8 mg');
  assert(['pending','executed'].includes(rx.clinical?.[0]?.status));
  for(let n=0;n<60&&!s.read().patient.adverseEvents.some(x=>x.kind==='opioid-respiratory-depression');n++){
   s.advance(5);await s.flush();
  }
  const p=s.read().patient;
  assert(p.adverseEvents.some(x=>x.kind==='opioid-respiratory-depression'&&x.status==='active'),
   'real opioid toxicity must emerge from native medication and patient observations');
  const current=hint(p,resp01V2Candidate,s.read().clock.nativeMinute,'alta');
  assert.equal(current.h.requirement,'iatrogenic-deterioration-rescue');
  assert.equal(current.h.action.id,'oxygen');
  assert(!p.policyState?.complications?.length,
   'opioid toxicity is not a probabilistically selected pneumonia complication');
 }finally{s.dispose();}
});
test('unknown, future and unlinked adverse records cannot invent a rescue',async()=>{
 const {s}=await fixture(resp01V2Candidate,'untrusted');
 try{
  const p=s.read().patient,baseline=observedStabilizationRequirements({patient:p,caseData:resp01V2Candidate});
  assert.deepEqual(baseline,[]);
  p.adverseEvents=[{kind:'opioid-respiratory-depression',status:'active',sourceEventId:'fake',
   patientUid:p.uid,atNativeMinute:0}];
  assert.deepEqual(observedStabilizationRequirements({patient:p,caseData:resp01V2Candidate}),[]);
  p.adverseEvents[0].patientUid='another-patient';
  assert.deepEqual(observedStabilizationRequirements({patient:p,caseData:resp01V2Candidate}),[]);
  assert.deepEqual(observedStabilizationRequirements({patient:p,caseData:
   clinicalContent.cases.find(c=>c.id==='RESP-01')}),[],
   'legacy case policies must not be changed by staging-only rescue rules');
 }finally{s.dispose();}
});
