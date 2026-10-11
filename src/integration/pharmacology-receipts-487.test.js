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
function strictPair(id,options={}){
 const rows=pair(id,options),d=PILOT_DEFINITIONS_487.drugs.get(options.treatmentId||'morphine');
 for(const row of rows)Object.assign(row,{schemaVersion:2,
  formulation:{id:d.id,moleculeId:d.moleculeId,definitionVersion:d.definitionVersion,fingerprint:d.fingerprint},
  episodeId:options.episodeId||'course-a',previousEventId:options.previousEventId??null});
 return rows;
}
check('v2 binds an explicit formulation without changing B1 numerical behavior',()=>{
 const [e,c]=strictPair('strict-dose'),before=JSON.stringify([e,c]);
 const r=adapt([e],ctx([c])),[old,oc]=pair('strict-dose');
 assert.equal(r.events.length,1);assert(r.events[0].provenance.executionKey.includes('course-a'));
 assert.equal(JSON.stringify([e,c]),before);
 assert.deepEqual(observePhysiology487(stepPhysiology487(fresh(),r.events,20)),
  observePhysiology487(stepPhysiology487(fresh(),adapt([old],ctx([oc])).events,20)));
 assert.deepEqual(stepPhysiology487(fresh(),[...r.events,...r.events],20),stepPhysiology487(fresh(),r.events,20));
});
check('v2 rejects missing, contradictory or stale formulation identities',()=>{
 for(const mutate of [e=>{delete e.formulation;},e=>{e.formulation.id='oxygen';},
  e=>{e.formulation.moleculeId='fentanyl';},e=>{e.formulation.definitionVersion++;},
  e=>{e.formulation.fingerprint='old';},e=>{delete e.episodeId;},e=>{delete e.previousEventId;}]){
  const [e,c]=strictPair('bad-form');mutate(e);mutate(c);assert.throws(()=>adapt([e],ctx([c])),/formulation|episode|predecessor/);
 }
 const [e,c]=strictPair('independent-form');c.episodeId='other';assert.throws(()=>adapt([e],ctx([c])),/confirm|mismatch/);
});
check('v2 confirms a complete infusion episode across polling batches',()=>{
 const a={treatmentId:'vasopressor',amount:.05,unit:'mcg/kg/min',action:'start',sequence:1};
 const [e,c]=strictPair('a',a),[t,ct]=strictPair('b',{...a,action:'setRate',kind:'dose-change',amount:.1,time:5,sequence:2,previousEventId:'a'}),
  [s,cs]=strictPair('c',{...a,action:'stop',kind:'suspension',time:10,sequence:3,previousEventId:'b'});
 const first=adapt([e],ctx([c])).events,second=adapt([t],ctx([c,ct])).events,third=adapt([s],ctx([c,ct,cs])).events;
 assert.deepEqual([...first,...second,...third].map(x=>x.action),['start','setRate','stop']);
 const given=stepPhysiology487(stepPhysiology487(stepPhysiology487(fresh(),first,5),second,5),third,0),
  after=stepPhysiology487(given,[],5);
 assert.deepEqual(given,stepPhysiology487(fresh(),[...first,...second,...third],10));
 assert.equal(given.exposures.vasopressor.infusionRate,0);assert(after.exposures.vasopressor.effect<given.exposures.vasopressor.effect*.05);
});
check('v2 cannot titrate or stop an unknown, closed or different episode',()=>{
 const a={treatmentId:'vasopressor',amount:.05,unit:'mcg/kg/min',action:'start',sequence:1},[e,c]=strictPair('a',a);
 for(const patch of [{previousEventId:'missing'},{episodeId:'course-b',previousEventId:'a'},{previousEventId:null}]){
  const [t,ct]=strictPair('b',{...a,action:'setRate',kind:'dose-change',time:5,sequence:2,...patch});
  assert.throws(()=>adapt([t],ctx([c,ct])),/episode|predecessor|start/);
 }
 const [t,ct]=strictPair('b',{...a,action:'setRate',kind:'dose-change',time:5,sequence:2,previousEventId:'a'});
 assert.throws(()=>adapt([t],ctx([ct])),/episode|predecessor|start/,'truncated native history cannot establish initiation');
 const [s,cs]=strictPair('stop',{...a,action:'stop',kind:'suspension',time:6,sequence:3,previousEventId:'b'}),
  [again,cagain]=strictPair('again',{...a,action:'setRate',kind:'dose-change',time:7,sequence:4,previousEventId:'stop'});
 assert.throws(()=>adapt([again],ctx([c,ct,cs,cagain])),/closed|episode/);
});
check('v2 rejects zero rates, sequence collisions and concurrent duplicate starts',()=>{
 const a={treatmentId:'vasopressor',amount:.05,unit:'mcg/kg/min',action:'start',sequence:1},[e,c]=strictPair('a',a);
 const [zero,cz]=strictPair('zero',{...a,action:'setRate',kind:'dose-change',amount:0,time:1,sequence:2,previousEventId:'a'});
 assert.throws(()=>adapt([zero],ctx([c,cz])),/dose|stop/);
 const [again,ca]=strictPair('again',{...a,time:1,sequence:2,episodeId:'other'});
 assert.throws(()=>adapt([again],ctx([c,ca])),/active|episode|start/);
 ca.sequence=again.sequence=1;assert.throws(()=>adapt([again],ctx([c,ca])),/sequence/);
});
check('v2 repeated boluses accumulate; stopping the course preserves prior exposure',()=>{
 const [a,ca]=strictPair('bolus-a',{sequence:1}),[b,cb]=strictPair('bolus-b',{sequence:2,time:1,previousEventId:'bolus-a'}),
  [s,cs]=strictPair('bolus-stop',{sequence:3,time:2,action:'stop',kind:'suspension',previousEventId:'bolus-b'});
 const r=adapt([a,b,s],ctx([ca,cb,cs])),given=stepPhysiology487(fresh(),r.events,10);
 assert(given.respiratoryDepression>stepPhysiology487(fresh(),adapt([a],ctx([ca])).events,10).respiratoryDepression);
 assert(given.exposures.morphine.central>0);
 const altered={...r.events[0],provenance:{...r.events[0].provenance,
  executionKey:r.events[0].provenance.executionKey.replace('course-a','course-b')}};
 assert.throws(()=>stepPhysiology487(stepPhysiology487(fresh(),r.events,10),[altered],0),/conflict/,
  'execution identity must survive adaptation into the existing core receipt index');
});
check('v2 session rejects a second hidden infusion episode and a legacy downgrade between batches',()=>{
 const a={treatmentId:'vasopressor',amount:.05,unit:'mcg/kg/min',action:'start',sequence:1},[e,c]=strictPair('initial',a),
  given=stepPhysiology487(fresh(),adapt([e],ctx([c])).events,0);
 const [second,cs]=strictPair('hidden-course',{...a,amount:.1,time:1,sequence:2,episodeId:'course-b'}),
  [old,co]=pair('legacy-downgrade',{...a,amount:.1,time:1,sequence:2});
 const rejected=[[[second],[cs]],[[old],[co]]].map(([events,confirmations])=>{
  try{stepPhysiology487(given,adapt(events,ctx(confirmations)).events,2);return false;}catch{return true;}
 });
 assert.deepEqual(rejected,[true,true],'neither omitted earlier history nor legacy downgrade can bypass a strict session');
});
check('a confirmed stop permits a later distinct infusion episode with the existing receipt index',()=>{
 const a={treatmentId:'vasopressor',amount:.05,unit:'mcg/kg/min',action:'start',sequence:1},[first,cfirst]=strictPair('first',a),
  [stop,cstop]=strictPair('stop',{...a,action:'stop',kind:'suspension',time:1,sequence:2,previousEventId:'first'}),
  [restart,crestart]=strictPair('restart',{...a,time:2,sequence:3,episodeId:'course-b'});
 const initial=stepPhysiology487(fresh(),adapt([first,stop],ctx([cfirst,cstop])).events,1),
  continued=stepPhysiology487(initial,adapt([restart],ctx([cfirst,cstop,crestart])).events,2);
 assert.equal(continued.receiptProtocol,'typed-v2');assert.equal(continued.exposures.vasopressor.infusionRate,1);
});
check('separate completed boluses do not become permanently active infusion episodes',()=>{
 const [a,ca]=strictPair('ringer-a',{treatmentId:'fluid',amount:500,unit:'ml',sequence:1,episodeId:'bolus-one'}),
  [b,cb]=strictPair('ringer-b',{treatmentId:'fluid',amount:250,unit:'ml',time:1,sequence:2,episodeId:'bolus-two'});
 const given=stepPhysiology487(fresh(),adapt([a,b],ctx([ca,cb])).events,1);
 assert.equal(given.administeredFluidMl,750);
 const [m,cm]=strictPair('morphine-new-course',{time:2,sequence:3,episodeId:'analgesia-other'});
 assert.equal(adapt([m],ctx([ca,cb,cm])).events.length,1);
});
check('legacy and strict protocols cannot silently mix; pending stops earn no history',()=>{
 const [e,c]=strictPair('strict',{sequence:1}),[legacy,cl]=pair('legacy',{sequence:2,time:1});
 assert.throws(()=>adapt([e,legacy],ctx([c,cl])),/mix|version|protocol/);
 const [request,cr]=strictPair('request',{action:'stop',kind:'suspension',time:1,sequence:2,status:'requested',previousEventId:'strict'});
 const r=adapt([e,request],ctx([c,cr]));assert.equal(r.events.length,1);assert.equal(r.ignored.length,1);
 const [other,co]=strictPair('other',{time:2,sequence:3,previousEventId:'request'});
 assert.throws(()=>adapt([other],ctx([c,cr,co])),/predecessor|episode/);
});
console.log('PHARMACOLOGY TYPED RECEIPTS PASS',JSON.stringify({checks,nativeWrites:0,realExecutorInstalled:false,heparinActivated:false}));
