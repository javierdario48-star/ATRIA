import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalInterventionEligibility} from './native-medication-eligibility.js';
import {executePatientDialogue} from './patient-dialogue.js';
import {respiratoryPack} from '../content/packs/respiratory-pack.js';

function fixture(withStudy=false){
 const completed={id:'alteplase_pe',patientUid:'P',sourceEventId:'lysis',route:'iv',
  administeredAtNativeMinute:2,completedAtNativeMinute:122,
  dose:{amount:100,unit:'mg'},prescribedDose:{amount:100,unit:'mg'},deliveryFraction:1,
  status:'completed',completionStatus:'completed'};
 const p={uid:'P',treatments:[completed],administrationLog:[structuredClone(completed)],orders:[],
  liveVitals:{hr:90,rr:20,sys:120,dia:70,spo2:97}};
 const c={clinicalPolicy:{eligibility:{heparin_therapeutic:{requiresCompletedTreatments:['alteplase_pe'],
  ...(withStudy?{requiresStudiesAfterTreatments:[{treatmentId:'alteplase_pe',studyId:'g_followup'}]}:{})}}}};
 if(withStudy)p.orders.push({id:'g_followup',patientUid:'P',sourceEventId:'sample',status:'done',
  sampledAtNativeMinute:122.5,readyAtMinute:1000});
 return {p,c,clock:{nativeMinute:123,clinicalMinute:1001}};
}

test('dependent medication requires actual completed patient-bound prerequisite treatment',()=>{
 for(const mutate of [
  p=>p.treatments=[],p=>p.administrationLog=[],p=>p.treatments[0].patientUid='another',
  p=>p.administrationLog[0].status='administering',p=>p.treatments[0].completedAtNativeMinute=124,
  p=>p.treatments.push(structuredClone(p.treatments[0]))
 ]){
  const {p,c,clock}=fixture();assert.equal(clinicalInterventionEligibility(p,c,'heparin_therapeutic',clock),null);
  mutate(p);assert.equal(clinicalInterventionEligibility(p,c,'heparin_therapeutic',clock)?.reason,'clinical-treatment-required');
 }
});

test('post-treatment study prerequisite requires a real specimen sampled after completion and reported by the current clock',()=>{
 for(const mutate of [
  p=>p.orders=[],p=>p.orders[0].patientUid='another',p=>p.orders[0].status='pending',
  p=>p.orders[0].sampledAtNativeMinute=121.5,p=>delete p.orders[0].sampledAtNativeMinute,
  p=>p.orders[0].sampledAtNativeMinute=124,p=>p.orders[0].readyAtMinute=1002,
  p=>delete p.orders[0].sourceEventId,p=>p.orders.push(structuredClone(p.orders[0]))
 ]){
  const {p,c,clock}=fixture(true);assert.equal(clinicalInterventionEligibility(p,c,'heparin_therapeutic',clock),null);
  mutate(p);assert.equal(clinicalInterventionEligibility(p,c,'heparin_therapeutic',clock)?.reason,'clinical-post-treatment-study-required');
 }
 const {p,c,clock}=fixture(true);p.orders[0].sampledAtNativeMinute=122;
 assert.equal(clinicalInterventionEligibility(p,c,'heparin_therapeutic',clock),null,'a specimen taken immediately after completion is eligible');
});

test('alternate legitimate reaction-history wording satisfies the same clinical history prerequisite',()=>{
 const c=structuredClone(respiratoryPack.cases.find(x=>x.id==='RESP-01'));
 c.clinicalPolicy.eligibility={amoxicillin:{requiresHistory:['allergies']}};
 const {p,clock}=fixture();p.caseId=c.id;p.intentHistory=[];
 assert.equal(clinicalInterventionEligibility(p,c,'amoxicillin',clock).reason,'clinical-evidence-required');
 const response=executePatientDialogue(p,c,{eventId:'reaction-history',actorId:'doctor',
  intent:{kind:'history.ask',id:'history',sourceText:'¿Tuvo alguna reacción con antibióticos?'}},clock);
 assert.equal(response.status,'executed');assert.equal(p.intentHistory[0].id,'anamnesis:allergies');
 assert.equal(clinicalInterventionEligibility(p,c,'amoxicillin',clock),null);
 p.intentHistory[0].patientUid='another';
 assert.equal(clinicalInterventionEligibility(p,c,'amoxicillin',clock).reason,'clinical-evidence-required');
});
