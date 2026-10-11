/** Node-only engineering measurement; never physical Android/iPhone evidence. */
import fs from 'node:fs';
import os from 'node:os';
import {performance} from 'node:perf_hooks';
import {createPilotProfile487} from '../../src/clinical/physiology-pilot-cases-487.js';
import {createPhysiologyState487,stepPhysiology487} from '../../src/clinical/physiology-pilot-487.js';
import {PILOT_DRUGS_487,compilePhysiologyDefinitions487} from '../../src/clinical/physiology-pilot-definitions-487.js';
import {readFrozenNativeReference487} from './native-reference-487.mjs';
const ref=readFrozenNativeReference487();
const profiles=ref.trajectories.filter(t=>t.scenarioId==='untreated').map(t=>
 createPilotProfile487({id:t.caseId},{liveVitals:t.initial.vitals,phys:t.initial.physiology}));
const normal=compilePhysiologyDefinitions487(),padded=compilePhysiologyDefinitions487([...PILOT_DRUGS_487,
 ...Array.from({length:300},(_,i)=>({...PILOT_DRUGS_487.find(d=>d.id==='morphine'),id:'synthetic-'+i}))]);
function events(patientId,count){
 const specs=count===2?[['vasopressor',.05,'mcg/kg/min','start'],['morphine',4,'mg','bolus']]:
  [['oxygen',4,'L/min','start'],['fluid',500,'ml','bolus'],['vasopressor',.05,'mcg/kg/min','start'],
   ['morphine',4,'mg','bolus'],['furosemide',40,'mg','bolus']];
 return specs.map(([drugId,amount,unit,action],sequence)=>({eventId:patientId+':'+sequence,
  patientId,drugId,status:'administered',atClinicalMinute:0,sequence,action,
  route:drugId==='oxygen'?'inhaled':'iv',dose:{amount,unit}}));
}
const percentile=(times,q)=>times.slice().sort((a,b)=>a-b)[Math.ceil(times.length*q)-1];
function trial(patientCount,treatmentCount,definitions){
 let states=Array.from({length:patientCount},(_,i)=>{
  const id='benchmark-'+i,s=createPhysiologyState487(profiles[i%3],id);
  return stepPhysiology487(s,events(id,treatmentCount),0,definitions);
 });
 for(let i=0;i<100;i++)states=states.map(s=>stepPhysiology487(s,[],.25,definitions));
 const durations=[];
 for(let i=0;i<600;i++){
  const start=performance.now();states=states.map(s=>stepPhysiology487(s,[],.25,definitions));
  durations.push(performance.now()-start);
 }
 return {patientCount,treatmentCount,registrySize:definitions.drugs.size,iterations:600,stepClinicalMinutes:.25,
  batchP50Ms:percentile(durations,.5),batchP95Ms:percentile(durations,.95),batchP99Ms:percentile(durations,.99),
  maxMs:Math.max(...durations),perPatientP95Ms:percentile(durations,.95)/patientCount};
}
const measurements=[];
for(const count of [1,16,64])for(const drugs of [2,5])measurements.push(trial(count,drugs,normal));
measurements.push(trial(64,2,padded));
let memory={measured:false,reason:'requires node --expose-gc'};
if(typeof global.gc==='function'){
 global.gc();const before=process.memoryUsage().heapUsed;
 let retained=Array.from({length:2000},(_,i)=>{
  const id='retained-'+i;return stepPhysiology487(createPhysiologyState487(profiles[i%3],id),events(id,5),20);
 });
 global.gc();const after=process.memoryUsage().heapUsed;
 memory={measured:true,patients:retained.length,retainedHeapBytes:after-before,
  estimatedHeapBytesPerPatient:(after-before)/retained.length,
  serializedStateBytes:Buffer.byteLength(JSON.stringify(retained[0]))};
 // One bounded heavy receipt history measures the actual dedup retention cost.
 const id='receipt-bound',receipts=Array.from({length:2048},(_,i)=>({eventId:'receipt-'+i,patientId:id,
  drugId:'fluid',status:'administered',action:'bolus',route:'iv',dose:{amount:0,unit:'ml'},atClinicalMinute:0,sequence:i}));
 const full=stepPhysiology487(createPhysiologyState487(profiles[1],id),receipts,0);
 memory.serializedStateBytesAt2048Receipts=Buffer.byteLength(JSON.stringify(full));
 retained=null;
}
const result={schema:'atria-physiology-benchmark/v1',runtime:process.version,platform:process.platform,
 arch:process.arch,cpu:os.cpus()[0]?.model,physicalAndroid:false,physicalIOS:false,seed:'no stochastic terms',
 scope:'pure kernel only; no render, native engine, shadow sample history, network or device throttling',measurements,memory};
if(process.argv.includes('--write'))fs.writeFileSync(new URL('./benchmark-487.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
