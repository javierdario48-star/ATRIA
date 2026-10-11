// Deterministic bot for B1 scaling. Additional profiles/medicines are SYNTHETIC
// mechanism fixtures, never evidence of 100 medically validated diseases.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createPhysiologyState487,stepPhysiology487,observePhysiology487} from './physiology-pilot-487.js';
import {PILOT_DRUGS_487,PILOT_DEFINITIONS_487,compilePhysiologyDefinitions487} from './physiology-pilot-definitions-487.js';
import {createPilotProfile487} from './physiology-pilot-cases-487.js';

const scenarios=[
 {id:'PERI-SEC-001',vitals:{bp:'86/50',temp:38.9,hr:128,rr:30,spo2:92}},
 {id:'HDA-001',vitals:{bp:'94/58',temp:36.6,hr:118,rr:22,spo2:97}},
 {id:'CIRR-001',vitals:{bp:'108/68',temp:37.2,hr:94,rr:20,spo2:96}}
];
const profiles=scenarios.map(c=>createPilotProfile487(c));
const meds=[
 ['oxygen',4,'L/min','start','inhaled'],
 ['fluid',500,'ml','bolus','iv'],
 ['vasopressor',.05,'mcg/kg/min','start','iv'],
 ['morphine',4,'mg','bolus','iv'],
 ['furosemide',40,'mg','bolus','iv']
];
const seed=()=>{let z=0xC0FFEE01;return ()=>((z=Math.imul(1664525,z)+1013904223>>>0)/4294967296)};
const rand=seed();
const receipt=(id,i,at=0,modifier=1,status='administered')=>{
 const [drugId,base,unit,action,route]=meds[i];
 return {eventId:id+':'+i+':'+at,patientId:id,drugId,status,atClinicalMinute:at,sequence:i,
  action,route,dose:{amount:base*modifier,unit}};
};
const step=(s,ev=[],dt=.25,defs=PILOT_DEFINITIONS_487)=>stepPhysiology487(s,ev,dt,defs);
const state=(p,id)=>createPhysiologyState487(p,id);
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const copy=p=>structuredClone(p);
function safeObservations(s,where){
 const o=observePhysiology487(s);
 for(const k of ['sys','dia','map','hr','rr','spo2','temp','perfusion','renalFunction','circulatingVolumeMl',
  'interstitialFluidMl','fluidOverloadRisk','respiratoryDepression','drugDiuresisMlPerMin']){
  assert(finite(o[k]),where+': nonfinite '+k);
 }
 assert(o.sys>0&&o.dia>0&&o.sys>=o.dia,where+': invalid arterial pressures');
 assert(o.spo2>=40&&o.spo2<=99,where+': invalid SpO2');
 assert(s.renalFunction>=0&&s.renalFunction<=1,where+': invalid renal function');
 assert(s.oxygenSupport>=0&&s.oxygenSupport<=1,where+': invalid oxygen support');
 assert(s.circulatingVolumeMl>=500,where+': depleted below model floor');
 assert(s.interstitialFluidMl>=0,where+': negative interstitial volume');
 return o;
}
const observedKeys=new Set();
const stats={pilotCases:3,syntheticProfiles:0,catalogueSizes:[],trajectories:0,
  uniqueTrajectories:0,observedSnapshots:0,metamorphicChecks:0,receiptsCapacity:0,
  zeroGhostTreatments:true,noSourceControlInPilot:true,relativeRuntime:{},physicalAndroid:false};

// Exhaust all five-agent subsets over all three REAL supported B1 clinical
// profiles. Exercise a clinically varied but deterministic latent starting
// state; assertions test software invariants and NOT numerical medical ranges.
for(let ci=0;ci<profiles.length;ci++){
 for(let mask=0;mask<32;mask++){
  for(let variant=0;variant<3;variant++){
   const p=copy(profiles[ci]);p.caseId='QA-VARIANT-'+ci+'-'+variant;
   if(variant===1){p.circulatingVolumeMl=Math.max(500,p.circulatingVolumeMl*.75);p.renalFunction=.25;}
   if(variant===2){p.circulatingVolumeMl=5600;p.interstitialFluidMl=4200;p.pulmonarySusceptibility=.95;}
   const id='b1-'+ci+'-'+mask+'-'+variant;
   const events=meds.flatMap((_,k)=>(mask&(1<<k))?[receipt(id,k,0,variant===2?1.3:1)]:[]);
   events.push({...receipt(id,3,0,1,'pending'),eventId:id+':unperformed'});
   const frozen=JSON.stringify(p);
   const original=state(p,id);
   const a=step(original,events,60);
   const b=step(original,[...events].reverse(),60);
   assert.deepEqual(a,b,id+': arrival ordering changed deterministic outcome');
   assert.equal(JSON.stringify(p),frozen,id+': mutated patient clinical case definition');
   assert.equal(original.clinicalMinute,0,id+': mutated source state');
   assert.equal(a.sourceControlled,original.sourceControlled,id+': synthetic medicines controlled source');
   assert.equal(a.infectionBurden>=0,true);
   safeObservations(a,id);
   observedKeys.add(JSON.stringify(observePhysiology487(a)));
   const expectedAdmin=events.filter(x=>x.status==='administered').length;
   assert.equal(Object.keys(a.seenEvents).length,expectedAdmin,id+': ghost/duplicate treatment');
   stats.trajectories++;stats.observedSnapshots++;
  }
 }
}

stats.uniqueTrajectories=observedKeys.size;
assert(stats.uniqueTrajectories>30,'pilot bot must sample meaningfully distinct physiological outcomes');

// 100 different synthetic cases are generated from validated B1 profile shapes,
// NOT real cases introduced into ATRIA's CASES, studies or pharmacy.
const synthetic=Array.from({length:100},(_,i)=>{
 const p=copy(profiles[i%3]);
 p.caseId='QA-SYNTHETIC-'+String(i).padStart(3,'0');
 p.circulatingVolumeMl=Math.max(600,Math.min(7000,p.circulatingVolumeMl*(.75+rand()*.6)));
 p.renalFunction=.18+rand()*.82;
 p.hepaticFunction=.3+rand()*.7;
 p.pumpFunction=.55+rand()*.55;
 p.vascularTone=.45+rand()*.8;
 p.gasExchangeImpairment=rand()*.65;
 p.pulmonarySusceptibility=rand();
 return p;
});
stats.syntheticProfiles=synthetic.length;
for(let i=0;i<synthetic.length;i++){
 const id='patient-'+i,p=synthetic[i],input=state(p,id);
 const subset=meds.filter((_,m)=>(i+m)%3===0).map((x)=>meds.indexOf(x));
 const ev=subset.map(k=>receipt(id,k,0,1));
 const full=step(input,ev,15);
 let fragmented=step(input,ev,5);fragmented=step(fragmented,[],5);fragmented=step(fragmented,[],5);
 assert.deepEqual(full,fragmented,'fixed-step partition mismatch '+i);
 safeObservations(full,'synthetic-'+i);
 stats.metamorphicChecks++;
}

// A new molecule that uses an EXISTING opioid mechanism must be data-only:
// identical definition+exposure gives identical physiology without a new
// drug-ID branch in the numerical kernel.
const alternate={...PILOT_DRUGS_487.find(x=>x.id==='morphine'),id:'synthetic-new-opioid'};
const altDefs=compilePhysiologyDefinitions487([alternate]);
for(const p of profiles){
 const base=state(p,'reference'),other=state(p,'reference');
 const e=receipt('reference',3);
 const alternative={...e,drugId:'synthetic-new-opioid'};
 const a=step(base,[e],40,PILOT_DEFINITIONS_487);
 const b=step(other,[alternative],40,altDefs);
 assert.deepEqual(observePhysiology487(a),observePhysiology487(b),
  'new molecule must reuse existing mechanism without case-specific code');
 stats.metamorphicChecks++;
}

// Cold catalogues of 5/55/305/1005 definitions: with TWO ACTIVE medicines,
// results must stay byte-for-byte identical regardless of inactive installed
// entries. These synthetic entries do NOT certify new clinical molecules.
const extras=n=>Array.from({length:n},(_,i)=>({
 ...PILOT_DRUGS_487.find(x=>x.id==='morphine'),id:'synthetic-padding-'+i
}));
const registries=[0,50,300,1000].map(n=>compilePhysiologyDefinitions487([
 ...PILOT_DRUGS_487,...extras(n)]));
const baseP=synthetic[0],patientId='catalogue-independence';
const active=[receipt(patientId,2),receipt(patientId,3)];
const expected=step(state(baseP,patientId),active,45,registries[0]);
for(const reg of registries){
 assert.deepEqual(step(state(baseP,patientId),active,45,reg),expected,
  'inactive registered medications must not change live patient');
 stats.catalogueSizes.push(reg.drugs.size);
}
assert.throws(()=>compilePhysiologyDefinitions487([...PILOT_DRUGS_487,
 {...PILOT_DRUGS_487[0],id:'new-mechanism',mechanism:'anticoagulant'}]),/unsupported/,
 'new mechanism cannot be silently invented');

// Event capacity is a defined limit, not an infinite history: a compacted,
// versioned replay checkpoint is required before >2,048 confirmed receipts.
const capacityId='capacity';
const many=Array.from({length:2048},(_,i)=>({
 eventId:'zero-'+i,patientId:capacityId,drugId:'fluid',status:'administered',
 action:'bolus',route:'iv',dose:{amount:0,unit:'ml'},atClinicalMinute:0,sequence:i
}));
const atLimit=step(state(profiles[0],capacityId),many,0);
assert.equal(Object.keys(atLimit.seenEvents).length,2048);
assert.throws(()=>step(atLimit,[{...many[0],eventId:'zero-2048',sequence:2048}],0),/session administration limit/i);
stats.receiptsCapacity=2048;

// Comparative load: static performance does not have stable timing across
// GitHub runners. Report median/p95 and ratios; do not gate on a made-up
// Android FPS claim. The output remains a Node-only measurement.
function bench(reg){
 let a=Array.from({length:64},(_,i)=>{
  const id='benchmark-'+i;
  return step(state(synthetic[i],id),[receipt(id,2),receipt(id,3)],0,reg);
 });
 const times=[];
 for(let i=0;i<80;i++){
  const t=performance.now();
  a=a.map(s=>step(s,[],.25,reg));
  times.push(performance.now()-t);
 }
 const ordered=times.slice(20).sort((x,y)=>x-y);
 return {p50Ms:ordered[Math.floor(ordered.length*.5)],
  p95Ms:ordered[Math.floor(ordered.length*.95)]};
}
const times=registries.map(bench);
stats.relativeRuntime={catalogue5:times[0],catalogue55:times[1],
 catalogue305:times[2],catalogue1005:times[3],
 medianRatio1005to5:times[3].p50Ms/Math.max(.00001,times[0].p50Ms)};
assert(stats.relativeRuntime.medianRatio1005to5<12,
 'massively increasing only inactive catalogue entries should not multiply hot-tick CPU use');
console.log('PHYSIOLOGY SCALE FUZZ BOT PASS',JSON.stringify(stats));
