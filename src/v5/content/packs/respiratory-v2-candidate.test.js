import test from 'node:test';
import assert from 'node:assert/strict';
import {respiratoryPack} from './respiratory-pack.js';
import {resp01V2Candidate,resp01V2ExperimentalPack} from './respiratory-v2-candidate.js';
import {compileClinicalCasePack} from '../compile-clinical-case-pack.js';
import {CLINICAL_POLICY_REGISTRIES} from '../../clinical/clinical-policy-registry.js';
import {generatePatientVariation} from '../patient-variation.js';
import {evaluateClinicalPolicyDisposition} from '../../clinical/clinical-policy-closure.js';

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
 const recovered=evaluateClinicalPolicyDisposition(
  {...patient,policyState:{...patient.policyState,complications:[{id:complication,status:'recovered'}]}},v2,'alta');
 assert(!recovered.missing.some(x=>/rescate confirmado|resolución fisiológica confirmada/i.test(x)));
 const old=evaluateClinicalPolicyDisposition(patient,v1,'alta');
 assert(!old.missing.some(x=>/rescate confirmado|resolución fisiológica confirmada/i.test(x)));
});
