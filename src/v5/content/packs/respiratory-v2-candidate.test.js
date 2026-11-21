import test from 'node:test';
import assert from 'node:assert/strict';
import {respiratoryPack} from './respiratory-pack.js';
import {resp01V2Candidate,resp01V2ExperimentalPack} from './respiratory-v2-candidate.js';
import {compileClinicalCasePack} from '../compile-clinical-case-pack.js';
import {CLINICAL_POLICY_REGISTRIES} from '../../clinical/clinical-policy-registry.js';
import {generatePatientVariation} from '../patient-variation.js';
import {evaluateClinicalPolicyDisposition} from '../../clinical/clinical-policy-closure.js';
import {clinicalContent} from '../../server/content.js';
import {createGuardSession} from '../../clinical/guard-session.js';

const v1=respiratoryPack.cases.find(c=>c.id==='RESP-01');
const v2=resp01V2Candidate;
const complication='resp01_v2_hypoxemic_setback';

test('RESP-01 V2 is an isolated same-ID revision, not another active case or motor',()=>{
 assert(v1&&v2);
 assert.equal(v1.id,v2.id);
 assert.equal(v1.clinicalRevision,undefined);
 assert.equal(v2.clinicalRevision,'v2-candidate');
 assert.equal(v1.clinicalExecutorId,v2.clinicalExecutorId);
 assert.equal(v1.closurePolicyId,v2.closurePolicyId);
 assert.equal(v1.studyPolicyId,v2.studyPolicyId);
 assert.deepEqual(v1.clinicalPolicy.closure.destinations,['alta']);
 assert.deepEqual(v1.clinicalPolicy.complications,[]);
 assert.deepEqual(v2.clinicalPolicy.closure.destinations,['alta','observacion','sala']);
 assert.equal(v1.clinicalPolicy.closure.dischargeRequiresResolvedComplications,undefined);
 assert.equal(v2.clinicalPolicy.closure.dischargeRequiresResolvedComplications,true);
 const staged=compileClinicalCasePack(resp01V2ExperimentalPack,CLINICAL_POLICY_REGISTRIES);
 assert.equal(staged.ok,true,staged.errors?.join('\n'));
 assert.equal(staged.cases[0].id,'RESP-01');
});
test('V2 complications are reproducible by seed; configured chance is not 100%',()=>{
 const c=v2.clinicalPolicy.complications[0];
 assert.equal(c.id,complication);
 assert.equal(c.probability,.2);
 let selected=0;
 for(let i=0;i<256;i++){
  const seed='resp-v2-candidate:'+i;
  const a=generatePatientVariation(v2.variation,seed);
  const b=generatePatientVariation(v2.variation,seed);
  assert.deepEqual(a.complicationCandidates,b.complicationCandidates);
  assert.equal(a.personality,b.personality);
  const original=generatePatientVariation(v1.variation,seed);
  assert.equal(a.name,original.name,'V2 must not reroll patient identity');
  assert.equal(a.age,original.age,'V2 must not reroll age');
  assert.equal(a.personality,original.personality,'V2 must not reroll personality');
  assert.deepEqual(a.backgroundHistory,original.backgroundHistory,'V2 must not reroll background history');
  if(a.complicationCandidates.some(x=>x.id===complication))selected++;
 }
 assert(selected>15&&selected<90,'seeded distribution outside broad game-design sanity interval: '+selected);
});
test('unresolved complication specifically blocks V2 alta; V1 is not changed',()=>{
 const patient={
  uid:'test:v2',caseId:v2.id,patientDied:false,caseEnded:false,
  liveVitals:{temp:38.1,hr:94,rr:20,sys:122,dia:76,spo2:96},
  policyState:{nativeMinute:5,complications:[{id:complication,status:'active',onsetAt:3}]},
  lastVitalsKnown:{patientUid:'test:v2',eventId:'vitals'},
  examDone:false,examFindings:{},intentHistory:[],orders:[],treatments:[],
  administrationLog:[],pendingTreatments:[],pendingConsults:[],consults:[],
  venousAccessCount:0,procedures:{},reassessments:0
 };
 const active=evaluateClinicalPolicyDisposition(patient,v2,'alta');
 assert.equal(active.ready,false);
 assert(active.missing.some(x=>/rescate confirmado/i.test(x)),active.missing.join(' | '));
 const observed=evaluateClinicalPolicyDisposition(patient,v2,'observacion');
 assert(observed.missing.some(x=>/rescate confirmado/i.test(x)),'observation must also request rescue during active deterioration');
 const recovered=evaluateClinicalPolicyDisposition(
  {...patient,policyState:{...patient.policyState,complications:[{id:complication,status:'recovered'}]}},v2,'alta');
 assert(!recovered.missing.some(x=>/rescate confirmado|resolución fisiológica confirmada/i.test(x)));
 const wardWithoutDeterioration=evaluateClinicalPolicyDisposition({
  ...patient,policyState:{...patient.policyState,complications:[]}},v2,'sala');
 assert(wardWithoutDeterioration.requirements.some(x=>x.reason==='destination-not-indicated'),
  'the stable, uncomplicated outpatient must not be admitted to ward for full credit');
 const wardDuringDeterioration=evaluateClinicalPolicyDisposition(patient,v2,'sala');
 assert(!wardDuringDeterioration.requirements.some(x=>x.reason==='destination-not-indicated'),
  'manifested complication may justify a ward transfer after preparation');
 const old=evaluateClinicalPolicyDisposition(patient,v1,'alta');
 assert(!old.missing.some(x=>/rescate confirmado|resolución fisiológica confirmada/i.test(x)));
});

test('Dr. Vega uses the same staged V2 readiness and moves to a new real control',async()=>{
 const stagedContent={...clinicalContent,cases:clinicalContent.cases.map(c=>c.id==='RESP-01'?v2:c)};
 const uid='resp01-v2-vega-patient',session=createGuardSession({
  roomId:'resp01-v2-vega',mode:'solo',actorId:'doctor',actorName:'Auditor',
  patient:{uid,caseId:v2.id},content:stagedContent,
  resolveContext:()=>({patientUid:uid})
 });
 try{
  const initial=session.clinicalHint();
  assert.equal(initial.action?.kind,'vitals');
  assert.equal(initial.action?.command,'/signos');
  assert.equal(session.hintCount('doctor'),0,'selection alone is never billed');
  const ack=await session.post({id:'resp01-v2-vega-vitals',text:initial.action.command});
  assert(ack.clinical?.some(x=>x.status==='executed'),'real vitals command is acknowledged');
  const second=session.clinicalHint();
  assert(second?.action&&second.action.kind!=='vitals','hint must advance after confirmed action');
  assert.equal(session.hintCount('doctor'),0,'querying another hint does not bill XP');
 }finally{session.dispose();}
});
