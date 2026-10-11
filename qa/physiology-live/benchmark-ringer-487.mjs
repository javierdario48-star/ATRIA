/** Reproducible Node VM measurement, not Android/iOS or canvas performance. */
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {createLiveNativeJourney487,advanceLiveNativeJourney487} from './native-journey-487.mjs';
import {enableNativeRinger487} from './ringer-journey-487.mjs';
const quantile=(a,q)=>a[Math.min(a.length-1,Math.floor(q*a.length))];
async function run(live){
 const r=createLiveNativeJourney487('PERI-SEC-001');let api;
 if(live)api=await enableNativeRinger487(r);
 r.ctx.nurseNatural('enfermera Ringer 500 ml');advanceLiveNativeJourney487(r,2);
 for(let i=0;i<120;i++)advanceLiveNativeJourney487(r,1/60);
 const timings=[];
 for(let i=0;i<1200;i++){
  const start=performance.now();advanceLiveNativeJourney487(r,1/60);timings.push(performance.now()-start);
 }
 timings.sort((a,b)=>a-b);assert.equal(r.ctx.sim.administrationLog.length,1);
 if(api)assert.equal(api.reportRinger().applications,1);
 const meta=api?.reportRinger();
 return {samples:timings.length,patients:1,activeTreatments:1,medianMs:quantile(timings,.5),p95Ms:quantile(timings,.95),p99Ms:quantile(timings,.99),maxMs:timings.at(-1),
  ownershipDataSerializedBytes:meta?Buffer.byteLength(JSON.stringify(r.ctx.sim.csRinger487))+Buffer.byteLength(JSON.stringify(meta.clock)):0,
  clockSegments:meta?.clock.segments.length??0,receiptCount:api?.reportRinger().applications??1};
}
const native=await run(false),ringer=await run(true);global.gc?.();
console.log('RINGER NODE BENCHMARK',JSON.stringify({runtime:process.version,platform:process.platform,arch:process.arch,
 native,ringer,totalProcessMemory:process.memoryUsage(),physicalAndroid:false,includesRendering:false,
 scope:'actual generated update + nursing/timer loop; fixed V3 variant; whole-process memory is not incremental per-patient RAM'}));
