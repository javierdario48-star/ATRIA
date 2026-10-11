import assert from 'node:assert/strict';
import {PILOT_DEFINITIONS_487} from '../clinical/physiology-pilot-definitions-487.js';
import {createPhysiologyState487,stepPhysiology487,observePhysiology487} from '../clinical/physiology-pilot-487.js';
import {createPilotProfile487} from '../clinical/physiology-pilot-cases-487.js';
import {loadNativeReferenceSources487} from '../../qa/physiology-pilot/native-reference-487.mjs';
const api=await import('./pharmacology-receipts-487.js').catch(()=>({}));
assert.equal(typeof api.adaptConfirmedPharmacologyEvents487,'function','verified typed receipt adapter must exist');
const {createClinicalClock487,advanceClinicalClock487}=await import('../clinical/clinical-clock-487.js');
const {adaptConfirmedPharmacologyEvents487:adapt}=api;
const clock=advanceClinicalClock487(createClinicalClock487({authorityId:'qa-authority'}),{deltaRealSeconds:120,nativeMinutesPerRealSecond:.12});
const ctx=confirmations=>({patientId:'patient-a',clock,definitions:PILOT_DEFINITIONS_487,confirmations});
function pair(id,{treatmentId='morphine',amount=4,unit='mg',action='bolus',kind='administration',time=0,sequence=0,route='iv',status='administered',timeUnit='clinical-minute'}={}){
 const common={schemaVersion:1,eventId:id,patientId:'patient-a',treatmentId,action,eventType:kind,status,sequence,route,
  timestamp:{authorityId:'qa-authority',unit:timeUnit,value:time},...(action==='stop'?{}:{dose:{amount,unit}})};
 return [{...structuredClone(common),verification:{source:'qa-confirmed-ledger',receiptId:'receipt-'+id}},
  {...structuredClone(common),source:'qa-confirmed-ledger',receiptId:'receipt-'+id}];
}
const fresh=()=>createPhysiologyState487(createPilotProfile487(loadNativeReferenceSources487().cases.find(c=>c.id==='HDA-001')),'patient-a');
let checks=0;const check=(name,fn)=>{fn();checks++;console.log('TYPED RECEIPT PASS',name);};
check('confirmed administration retains provenance and one application',()=>{
 const [e,c]=pair('morphine');const before=JSON.stringify([e,c]);const r=adapt([e,e],ctx([c]));
 assert.equal(r.events.length,1);assert.equal(r.events[0].drugId,'morphine');assert.equal(r.events[0].provenance.receiptId,c.receiptId);
 assert.equal(JSON.stringify([e,c]),before);const once=stepPhysiology487(fresh(),r.events,20);
 assert.deepEqual(stepPhysiology487(fresh(),[...r.events,...r.events],20),once);
});
check('pending or requested actions create no pharmacological effect',()=>{
 const [e,c]=pair('pending',{status:'pending'});const r=adapt([e],ctx([c]));
 assert.equal(r.events.length,0);assert.equal(r.ignored.length,1);
 assert.deepEqual(observePhysiology487(stepPhysiology487(fresh(),r.events,20)),observePhysiology487(stepPhysiology487(fresh(),[],20)));
});
check('receipt equality does not depend on JSON property order',()=>{
 const reverse=o=>Object.fromEntries(Object.entries(o).reverse());
 const [e,c]=pair('reordered'),er=reverse(e),cr=reverse(c);
 er.timestamp=reverse(e.timestamp);cr.timestamp=reverse(c.timestamp);
 const r=adapt([e,er],ctx([c,cr]));assert.equal(r.events.length,1);
 assert.deepEqual(stepPhysiology487(fresh(),r.events,20),stepPhysiology487(fresh(),adapt([e],ctx([c])).events,20));
});
check('self-declared administration without independent confirmation is rejected',()=>{
 const [e]=pair('unsupported-confirmation');assert.throws(()=>adapt([e],ctx([])),/confirm|verification|receipt/);
 const unverified=structuredClone(e);delete unverified.verification;assert.throws(()=>adapt([unverified],ctx([])),/confirm|verification|receipt/);
});
check('confirmation must match patient, action, dose, units and time',()=>{
 for(const mutate of [c=>{c.patientId='other';},c=>{c.action='stop';},c=>{c.dose.amount=40;},c=>{c.dose.unit='ml';},
  c=>{c.timestamp.value=1;},c=>{c.status='pending';}]){
  const [e,c]=pair('mismatch');mutate(c);assert.throws(()=>adapt([e],ctx([c])),/confirm|mismatch|receipt|patient|dose|action|status/);
 }
});
check('schema, route, drug and semantic action gaps cannot be guessed',()=>{
 for(const mutate of [e=>{e.schemaVersion=99;},e=>{e.route='oral';},e=>{e.treatmentId='anticoagulation';},
  e=>{e.eventType='dose-change';},e=>{e.timestamp.authorityId='other';},e=>{e.sequence=NaN;}]){
  const [e,c]=pair('invalid');mutate(e);assert.throws(()=>adapt([e],ctx([c])));
 }
});
check('infusion starts, titrations and stops are genuinely delivered events',()=>{
 const pairs=[pair('start',{treatmentId:'vasopressor',action:'start',amount:.05,unit:'mcg/kg/min',sequence:1}),
  pair('rate',{treatmentId:'vasopressor',action:'setRate',kind:'dose-change',amount:.1,unit:'mcg/kg/min',time:5,sequence:2}),
  pair('stop',{treatmentId:'vasopressor',action:'stop',kind:'suspension',time:10,sequence:3})];
 const events=adapt(pairs.map(p=>p[0]).reverse(),ctx(pairs.map(p=>p[1]))).events;
 assert.deepEqual(events.map(e=>e.action),['start','setRate','stop']);
 const s=stepPhysiology487(fresh(),events,10);assert.equal(s.exposures.vasopressor.infusionRate,0);
 const after=stepPhysiology487(s,[],5);assert(after.exposures.vasopressor.effect<s.exposures.vasopressor.effect*.05);
 const noStop=stepPhysiology487(fresh(),events.slice(0,2),15);assert(noStop.vascularTone>after.vascularTone);
});
check('stop request has no effect and bolus suspension cannot erase past drug',()=>{
 const [start,cs]=pair('start',{treatmentId:'vasopressor',action:'start',amount:.05,unit:'mcg/kg/min',sequence:1});
 const [request]=pair('stop-request',{treatmentId:'vasopressor',action:'stop',kind:'suspension',time:1,status:'requested',sequence:2});
 const r=adapt([start,request],ctx([cs]));assert.equal(r.events.length,1);
 assert.equal(stepPhysiology487(fresh(),r.events,5).exposures.vasopressor.infusionRate,1);
 const [dose,cd]=pair('bolus'),[stop,ct]=pair('bolus-stop',{action:'stop',kind:'suspension',time:1,sequence:1});
 const b=stepPhysiology487(fresh(),adapt([dose,stop],ctx([cd,ct])).events,10);assert(b.respiratoryDepression>0);
});
check('conflicting IDs, sequences and provenance fail instead of double dosing',()=>{
 const [e,c]=pair('same');const altered={...structuredClone(e),dose:{amount:40,unit:'mg'}};
 assert.throws(()=>adapt([e,altered],ctx([c])),/conflict|confirm|mismatch/);
 const [other,co]=pair('other');assert.throws(()=>adapt([e,other],ctx([c,co])),/sequence/);
 const given=stepPhysiology487(fresh(),adapt([e],ctx([c])).events,1);
 const [alias,ca]=pair('same');alias.verification.receiptId='receipt-other';ca.receiptId='receipt-other';
 assert.throws(()=>stepPhysiology487(given,adapt([alias],ctx([ca])).events,1),/conflict|provenance/);
});
check('typing-aware native timestamps map through the explicit authority clock',()=>{
 let piecewise=createClinicalClock487({authorityId:'qa-authority'});
 piecewise=advanceClinicalClock487(piecewise,{deltaRealSeconds:10,nativeMinutesPerRealSecond:.12});
 piecewise=advanceClinicalClock487(piecewise,{deltaRealSeconds:10,nativeMinutesPerRealSecond:.03});
 const [e,c]=pair('typing',{time:1.35,timeUnit:'native-minute'});
 assert.equal(adapt([e],{...ctx([c]),clock:piecewise}).events[0].atClinicalMinute,15);
});
check('sequence ownership and receipt protocol survive separate polling batches',()=>{
 const [e,c]=pair('first'),first=adapt([e],ctx([c])).events,s=stepPhysiology487(fresh(),first,1);
 const [again,ca]=pair('different-id',{time:1});
 assert.throws(()=>stepPhysiology487(s,adapt([again],ctx([ca])).events,1),/sequence/);
 const legacy={...first[0],eventId:'second-adapter',atClinicalMinute:1};delete legacy.provenance;
 assert.throws(()=>stepPhysiology487(s,[legacy],1),/protocol|adapter|replay/);
});
check('future timestamps, cross-patient events and late new receipt are rejected',()=>{
 const [future,cf]=pair('future',{time:121});assert.throws(()=>adapt([future],ctx([cf])),/time|clock|range|future/);
 const [other,co]=pair('other');other.patientId=co.patientId='patient-b';assert.throws(()=>adapt([other],ctx([co])),/patient/);
 const [late,cl]=pair('late',{time:1});const advanced=stepPhysiology487(fresh(),[],5);
 assert.throws(()=>stepPhysiology487(advanced,adapt([late],ctx([cl])).events,1),/late.*replay/);
});
console.log('PHARMACOLOGY TYPED RECEIPTS PASS',JSON.stringify({checks,nativeWrites:0,realExecutorInstalled:false,heparinActivated:false}));
