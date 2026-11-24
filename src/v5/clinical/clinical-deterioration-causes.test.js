import test from 'node:test';
import assert from 'node:assert/strict';
import {observedDeteriorationCauses} from './clinical-deterioration-causes.js';
import {observedStabilizationRequirements} from './clinical-stabilization-requirements.js';
import {resp01V2Candidate as respiratory} from '../content/packs/respiratory-v2-candidate.js';
import {varixV2Candidate as hemorrhage} from '../content/packs/varix-v2-candidate.js';
import {clinicalContent} from '../server/content.js';
import {createGuardSession} from './guard-session.js';

const origins=({patient,caseData,minute})=>observedDeteriorationCauses({patient,caseData,minute}).causes;
function admin(p,id,sourceId,minute=1,advisories=[]){
 const dose={amount:1,unit:'mg'};
 const receipt={id,sourceEventId:sourceId,patientUid:p.uid,
  administeredAtNativeMinute:minute,route:'iv',dose,
  clinicalAdvisories:advisories};
 p.administrationLog??=[];p.treatments??=[];
 p.administrationLog.push(receipt);p.treatments.push({...receipt});
 return receipt;
}
const baseline=caseData=>({
 uid:'P',liveVitals:{sys:122,dia:76,hr:95,rr:20,spo2:96,temp:38},
 policyState:{nativeMinute:2,complications:[]},treatments:[],administrationLog:[],adverseEvents:[]
});
test('random: only authored, manifested native episodes count; never reveal future draws',()=>{
 const c=respiratory,p=baseline(c),id=c.clinicalPolicy.complications[0].id;
 p.variation={complicationCandidates:[{id}]};
 assert.deepEqual(origins({patient:p,caseData:c}),[]);
 p.policyState.complications=[{id,status:'candidate',onsetAt:1}];
 assert.deepEqual(origins({patient:p,caseData:c}),[]);
 p.policyState.complications[0].status='active';
 assert.deepEqual(origins({patient:p,caseData:c}).map(x=>x.origin),['random']);
 p.policyState.complications[0].onsetAt=5;
 assert.deepEqual(origins({patient:p,caseData:c}),[],'future onset cannot be visible');
 p.policyState.complications[0].onsetAt=1;p.policyState.complications[0].status='recovered';
 assert.deepEqual(origins({patient:p,caseData:c}),[]);
});
test('treatment and contraindication: only delivered harm can produce one or two causal tags',()=>{
 const c=hemorrhage,p=baseline(c);
 admin(p,'anticoagulation','heparin-1',1,[{code:'clinical-contraindication',message:'Sangrado activo'}]);
 const e={kind:'anticoagulant-bleeding',status:'active',sourceEventId:'heparin-1',drugId:'anticoagulation',
  patientUid:p.uid,atNativeMinute:1};
 assert.deepEqual(origins({patient:p,caseData:c}),[],
  'a contraindicated exposure with no injury is a quality issue, not an invented complication');
 p.adverseEvents=[e];
 const x=origins({patient:p,caseData:c});
 assert.deepEqual(x.map(a=>a.origin),['treatment','contraindication']);
 assert(x.every(a=>a.sourceId==='heparin-1'),'one injury, two origins, never double physiology');
 assert.equal(x[0].repeated,false);
 admin(p,'anticoagulation','heparin-2',1.2);
 assert.equal(origins({patient:p,caseData:c})[0].repeated,true,
  'repetition is evidence of exposure, not a fabricated second injury');
 p.adverseEvents[0].status='resolved';
 assert.deepEqual(origins({patient:p,caseData:c}),[]);
});
test('allergy: a confirmed native event is distinct from intolerance and unrelated medicine',()=>{
 const p=baseline(respiratory);
 admin(p,'amoxicillin','amox-1');
 p.adverseEvents=[{kind:'severe-drug-allergy',sourceEventId:'amox-1',drugId:'amoxicillin',
  status:'active',patientUid:p.uid,atNativeMinute:1}];
 assert.deepEqual(origins({patient:p,caseData:respiratory}).map(x=>x.origin),['allergy']);
 p.adverseEvents[0].kind='cutaneous-drug-hypersensitivity';
 assert.deepEqual(origins({patient:p,caseData:respiratory}).map(x=>x.origin),['allergy']);
 p.adverseEvents[0].kind='intolerance';
 assert.deepEqual(origins({patient:p,caseData:respiratory}),[]);
});
test('untrusted, pending, foreign and future events cannot forge an origin or stabilization requirement',()=>{
 const p=baseline(respiratory);
 p.liveVitals.spo2=96;
 p.adverseEvents=[{kind:'opioid-respiratory-depression',status:'active',patientUid:p.uid,
  sourceEventId:'not-delivered',atNativeMinute:1}];
 assert.deepEqual(origins({patient:p,caseData:respiratory}),[]);
 const a=admin(p,'morphine','not-delivered',1);
 p.administrationLog[0].patientUid='other';
 assert.deepEqual(origins({patient:p,caseData:respiratory}),[]);
 a.patientUid=p.uid;a.administeredAtNativeMinute=10;
 assert.deepEqual(origins({patient:p,caseData:respiratory}),[]);
 a.administeredAtNativeMinute=1;
 p.adverseEvents[0].atNativeMinute=10;
 assert.deepEqual(origins({patient:p,caseData:respiratory}),[]);
 p.adverseEvents[0].atNativeMinute=1;
 p.administrationLog[0].status='administering';p.administrationLog[0].completionStatus='pending';
 assert.deepEqual(origins({patient:p,caseData:respiratory}),[]);
 p.administrationLog[0].status=undefined;p.administrationLog[0].completionStatus=undefined;
 assert.deepEqual(origins({patient:p,caseData:respiratory}).map(x=>x.origin),['treatment']);
 const duplicate={...p.administrationLog[0]};
 p.administrationLog.push(duplicate);
 assert.deepEqual(origins({patient:p,caseData:respiratory}),[],
  'duplicated source ID cannot pass native administration receipts');
});
test('unattended progression: actual worsening, authored time and absent causal therapy, not a timer penalty',()=>{
 const c=respiratory,p=baseline(c);
 p.policyState.nativeMinute=c.clinicalPolicy.trajectory.earlyEnd+1;
 p.liveVitals={...p.liveVitals,spo2:87,hr:115};
 const a=origins({patient:p,caseData:c});
 assert.equal(a.some(x=>x.origin==='unattended'),true);
 assert.equal(a.find(x=>x.origin==='unattended').attribution,'not-a-malpractice-finding');
 assert.deepEqual(observedStabilizationRequirements({patient:p,caseData:c,fulfilled:[]})[0].anyOf,[['oxygen']]);
 p.policyState.nativeMinute=1;
 assert.equal(origins({patient:p,caseData:c}).some(x=>x.origin==='unattended'),false);
 p.policyState.nativeMinute=20;
 // A dose that was really confirmed, not an order, changes the classification.
 admin(p,'amoxicillin','antibiotic-confirmed',1);
 assert.equal(origins({patient:p,caseData:c}).some(x=>x.origin==='unattended'),false);
});
test('simultaneous origins remain additive evidence, never duplicate a native episode or harm',()=>{
 const c=hemorrhage,p=baseline(c),id=c.clinicalPolicy.complications[0].id;
 p.policyState.complications=[{id,onsetAt:1,status:'recovering'}];
 admin(p,'anticoagulation','harmful-dose',1,[{code:'clinical-contraindication'}]);
 p.adverseEvents=[{kind:'anticoagulant-bleeding',status:'active',patientUid:p.uid,
  sourceEventId:'harmful-dose',drugId:'anticoagulation',atNativeMinute:1}];
 p.liveVitals={...p.liveVitals,sys:82,dia:44};
 const snapshot=structuredClone(p);
 const reasons=origins({patient:p,caseData:c});
 assert.deepEqual(reasons.map(x=>x.origin),['random','treatment','contraindication']);
 const plan=observedStabilizationRequirements({patient:p,caseData:c,fulfilled:[],destination:'procedimiento'});
 assert.deepEqual(plan[0].anyOf,[['transfusion']]);
 assert.equal(plan[0].reason,'iatrogenic-deterioration-rescue');
 assert.deepEqual(plan[0].origins,['random','treatment','contraindication']);
 assert.deepEqual(p,snapshot,'read-only provenance and safety may never change a patient');
});
test('active severe injury prevents V2 discharge after supportive oxygen; V1 remains untouched',()=>{
 const p=baseline(respiratory);
 admin(p,'morphine','morphine-1');
 p.adverseEvents=[{kind:'opioid-respiratory-depression',patientUid:p.uid,
  status:'active',sourceEventId:'morphine-1',drugId:'morphine',atNativeMinute:1}];
 p.liveVitals.spo2=91;
 const needed=observedStabilizationRequirements({patient:p,caseData:respiratory,destination:'alta'});
 assert(needed.some(x=>x.type==='treatment'&&x.anyOf[0].includes('oxygen')));
 const afterSupport=observedStabilizationRequirements({patient:p,caseData:respiratory,
  destination:'alta',fulfilled:['oxygen']});
 assert(afterSupport.some(x=>x.type==='wait'&&x.reason==='active-adverse-recovery'));
 const v1=clinicalContent.cases.find(c=>c.id==='RESP-01');
 assert.deepEqual(observedStabilizationRequirements({patient:p,caseData:v1,destination:'alta'}),[]);
 p.adverseEvents[0].status='resolved';
 assert.deepEqual(observedStabilizationRequirements({patient:p,caseData:respiratory,
  destination:'alta',fulfilled:['oxygen']}),[]);
});
test('real-session VARIX V2 heparin and RESP V2 morphine retain their authored native injury and causes',async()=>{
 for(const [c,drug,text,expected] of [
  [hemorrhage,'anticoagulation','Enfermera heparina IV','anticoagulant-bleeding'],
  [respiratory,'morphine','Enfermera morfina 8 mg','opioid-respiratory-depression']
 ]){
  const uid='five-origins-'+c.id,content={...clinicalContent,
   cases:clinicalContent.cases.map(x=>x.id===c.id?c:x)};
  const s=createGuardSession({roomId:'five-origins-'+c.id,mode:'solo',
   actorId:'doctor',actorName:'QA',patient:{uid,caseId:c.id},content,
   resolveContext:()=>({patientUid:uid})});
  try{
   await s.post({id:'signs',text:'/signos'});
   await s.post({id:'access',text:'Enfermera una vía'});
   const rx=await s.post({id:'drug',text});
   assert(['pending','executed'].includes(rx.clinical?.[0]?.status));
   for(let k=0;k<55&&!s.read().patient.adverseEvents.some(x=>x.kind===expected);k++){
    s.advance(5);await s.flush();
   }
   const p=s.read().patient,events=p.adverseEvents.filter(e=>e.kind===expected);
   assert(events.length,'native physiological mechanism must manifest before provenance');
   const kinds=origins({patient:p,caseData:c});
   assert(kinds.some(x=>x.origin==='treatment'&&x.kind===expected));
  }finally{s.dispose();}
 }
});
