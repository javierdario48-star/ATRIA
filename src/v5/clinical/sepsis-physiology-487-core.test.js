import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createLiveNativeJourney487} from '../../../qa/physiology-live/native-journey-487.mjs';
import {initialLegacySepsisPhysiology487,advanceLegacySepsisPhysiology487,
 legacySepsisVitalsOffsets487} from './sepsis-physiology-487-core.js';
const cases=JSON.parse(readFileSync(new URL('../content/cases.json',import.meta.url)));
for(const id of ['PERI-PBE-001','PERI-SEC-001','PERI-TER-001']){
 const c=cases.find(x=>x.id===id);
 test('exact V4 native disease state and progression offsets for untreated '+id,()=>{
  const old=createLiveNativeJourney487(id);
  const original=old.ctx.sim.phys;
  const baseline=initialLegacySepsisPhysiology487(c);
  for(const k of ['inflammation','effectiveVolume','svr','contractility','oxygenation','renalReserve',
   'sourceControlled','renalStress'])
   assert.equal(baseline[k],original[k],'original '+k);
  let next=baseline;
  // Advance the REAL legacy disease owner directly at the same controlled
  // native-minute timestamps; no browser timers or fabricated medicines.
  for(const at of [.12,.30,.60,.90]){
   old.ctx.sim.gameMinute=at;
   old.ctx.updatePhysiologyState();
   next=advanceLegacySepsisPhysiology487(next,c,at);
   for(const k of ['inflammation','effectiveVolume','svr','contractility','oxygenation',
    'renalReserve','renalStress'])
    assert(Math.abs(next[k]-old.ctx.sim.phys[k])<1e-9,id+' '+at+' '+k+
     ': V5 '+next[k]+' old '+old.ctx.sim.phys[k]);
   const legacy=old.ctx.progressionOffsets(),pure=legacySepsisVitalsOffsets487(next,baseline,c);
   for(const k of Object.keys(pure))
    assert(Math.abs(pure[k]-legacy[k])<1e-8,id+' '+at+' '+k);
  }
 });
}
test('fail closed for other diagnoses, skipped time, malicious coverage and reversed clock',()=>{
 const c=cases.find(x=>x.id==='PERI-SEC-001');
 const p=initialLegacySepsisPhysiology487(c);
 assert.throws(()=>initialLegacySepsisPhysiology487(cases.find(x=>x.id==='APP-001')),/sepsis\\/peritonitis/);
 assert.throws(()=>advanceLegacySepsisPhysiology487(p,c,5),/bounded native clock/);
 assert.throws(()=>advanceLegacySepsisPhysiology487(p,c,-1),/nonmonotonic/);
 assert.throws(()=>advanceLegacySepsisPhysiology487(p,c,0.2,{coverageScore:2}),/verified antimicrobial/);
 assert.deepEqual(advanceLegacySepsisPhysiology487(p,c,0),p);
 assert.equal(p.lastNativeMinute,0,'pure original state must remain unchanged');
});
test('V4 antimicrobial/source-control branch requires explicit evidence rather than assumed cure',()=>{
 const c=cases.find(x=>x.id==='PERI-SEC-001'),base=initialLegacySepsisPhysiology487(c);
 const noCoverage=advanceLegacySepsisPhysiology487(base,c,1);
 const partial=advanceLegacySepsisPhysiology487(base,c,1,{coverageScore:.5,coverageRamp:.4});
 assert(partial.inflammation<noCoverage.inflammation);
 const supported=advanceLegacySepsisPhysiology487({...base,sourceControlled:true},c,1,
  {coverageScore:1,coverageRamp:1});
 assert(supported.inflammation<partial.inflammation);
 assert(supported.effectiveVolume>noCoverage.effectiveVolume);
});
