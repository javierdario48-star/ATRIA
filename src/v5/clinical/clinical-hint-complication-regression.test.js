import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalContent} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {selectClinicalHint} from './clinical-hints.js';
import {clinicalHintRequirements} from './clinical-hint-requirements.js';
import {evaluateClinicalPolicyDisposition} from './clinical-policy-closure.js';
import {advanceClinicalComplications} from './clinical-policy-effects.js';
import {resp01V2Candidate} from '../content/packs/respiratory-v2-candidate.js';
import {varixV2Candidate} from '../content/packs/varix-v2-candidate.js';

// Real V2 cases, seeded patient variations, native complication manifestation,
// and the ACTUAL closure projection. No fake Vega response or second simulator.
const cases=[
 {c:resp01V2Candidate,destination:'alta',immediate:'oxygen',secondary:'amoxicillin'},
 {c:varixV2Candidate,destination:'procedimiento',immediate:'transfusion',secondary:'terlipressin'}
];
const staged=c=>({...clinicalContent,cases:clinicalContent.cases.map(item=>item.id===c.id?c:item)});

async function seededPatient(c,content){
 const comp=c.clinicalPolicy.complications[0];
 for(let i=0;i<100;i++){
  const roomId='vega-rescue-'+c.id+'-'+i,uid=roomId+':patient';
  const session=createGuardSession({roomId,mode:'solo',actorId:'physician',actorName:'QA',
   patient:{uid,caseId:c.id},content,resolveContext:()=>({patientUid:uid})});
  try{
   if(!session.read().patient.variation?.complicationCandidates?.some(x=>x.id===comp.id))continue;
   // The IV line, when needed, is a real nursing order and native receipt.
   if(c.id==='VARIX-001'){
    const order=await session.post({id:'venous-access',text:'Enfermera una vía'});
    assert(order.clinical?.length,'venous access was not routed through the native engine');
    session.advance(6);await session.flush();
    assert(session.read().patient.venousAccessCount>0,'nursing did not confirm venous access');
   }
   return structuredClone(session.read().patient);
  }finally{session.dispose();}
 }
 throw Error('No seeded complication candidate for '+c.id);
}

function actualHint(p,c,content,destination,minute){
 const assessment=evaluateClinicalPolicyDisposition(p,c,destination);
 const requirements=clinicalHintRequirements(p,c,assessment,destination);
 const before=structuredClone(p);
 const hint=selectClinicalHint({patient:p,caseData:c,content,
  clock:{nativeMinute:minute,clinicalMinute:minute},destination,requirements,
  fulfilledTreatmentIds:assessment.fulfilledTreatmentIds});
 assert.deepEqual(p,before,'Dr Vega is read-only, even during an emergency');
 return {hint,assessment,requirements};
}

function manifest(p,c){
 const def=c.clinicalPolicy.complications[0];
 // Apply documented trigger vitals and advance the actual native complication
 // state machine. The draw came from the real patient seed, not from this test.
 for(const [axis,limits] of Object.entries(def.requiredState||{})){
  if(Number.isFinite(limits.lt))p.liveVitals[axis]=Math.min(p.liveVitals[axis],limits.lt-1);
 }
 const minute=Math.max(def.minMinute,(p.policyState?.nativeMinute||0))+1;
 advanceClinicalComplications(p,c,minute);
 const episode=p.policyState?.complications?.find(x=>x.id===def.id);
 assert(episode&&episode.status==='active','the native clinical deterioration must manifest');
 return minute;
}

for(const {c,destination,immediate,secondary} of cases){
 test(c.id+' V2: Vega switches from routine checklist to manifested complication rescue',async()=>{
  const content=staged(c),p=await seededPatient(c,content);
  const baseline=actualHint(p,c,content,destination,p.policyState?.nativeMinute||0);
  assert.notEqual(baseline.hint?.requirement,'manifested-complication-rescue');
  const minute=manifest(p,c);
  const urgent=actualHint(p,c,content,destination,minute);
  assert(urgent.requirements.some(r=>r.type==='treatment'&&r.reason==='manifested-complication-rescue'));
  assert.equal(urgent.hint?.requirement,'manifested-complication-rescue',
   'complication rescue must outrank vitals, history, studies, diagnosis and routine drugs');
  assert.equal(urgent.hint?.action?.id,immediate,
   'Vega must recommend the immediate support intervention before ordinary closure care');
  assert.equal(urgent.hint.action.kind,'treatment');
  assert(urgent.hint.action.command.startsWith('Enfermera'),'rescue must be a real executable nursing control');
  assert.notEqual(urgent.hint?.requirement,baseline.hint?.requirement,
   'the hint must become an explicit complication rescue even if the same lifesaving action was already appropriate');
  // The post-recovery state must return to the ordinary checklist; the
  // actual recovery transitions are already covered by native physiology QA.
  p.policyState.complications.find(x=>x.id===c.clinicalPolicy.complications[0].id).status='recovered';
  const stable=actualHint(p,c,content,destination,minute);
  assert.notEqual(stable.hint?.requirement,'manifested-complication-rescue');
 });
 test(c.id+' V2: rescue already executing is not duplicated, other rescue comes next, then a free wait',async()=>{
  const content=staged(c),p=await seededPatient(c,content),minute=manifest(p,c);
  p.pendingTreatments??=[];
  p.pendingTreatments.push({id:immediate,sourceEventId:'nursing-in-progress'});
  const second=actualHint(p,c,content,destination,minute).hint;
  assert.equal(second?.requirement,'manifested-complication-rescue');
  assert.equal(second?.action?.id,secondary,'a second required rescue must not be hidden by the first pending order');
  p.pendingTreatments.push({id:secondary,sourceEventId:'second-in-progress'});
  const hold=actualHint(p,c,content,destination,minute).hint;
  assert.equal(hold?.action?.kind,'wait','routine tasks cannot preempt the active rescue confirmation');
  assert.equal(hold?.chargeable,false,'waiting for native administration never costs XP');
  assert.equal(hold?.requirement,'manifested-complication-rescue');
 });
}
