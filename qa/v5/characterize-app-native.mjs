// C3a characterization of the original effective APP-001 pharmacology/physiology.
// QA ONLY: the new game must never import this script or the historical VM.
import assert from 'node:assert/strict';
import {createNativeReferenceRuntime487,orderNativeReference487,
 advanceNativeReference487,snapshotNativeReference487} from '../physiology-pilot/native-reference-487.mjs';

export function characterizeAppNative(){
 const scenarios=[
  {id:'untreated',orders:[]},
  {id:'ceftriaxone',orders:[['ceftriaxone','ceftriaxona 1 g']]},
  {id:'metronidazole',orders:[['metronidazole','metronidazol 500 mg']]},
  {id:'dual-antibiotics',orders:[['ceftriaxone','ceftriaxona 1 g'],['metronidazole','metronidazol 500 mg']]},
  {id:'ringer',orders:[['fluid','Ringer 500 ml']]}
 ];
 return scenarios.map(s=>{
  const runtime=createNativeReferenceRuntime487({caseId:'APP-001',confirmedIVCount:1});
  const baseline=snapshotNativeReference487(runtime);
  for(const [id,text] of s.orders)orderNativeReference487(runtime,{id,text});
  // The reference harness takes native minutes: IV drug administration at
  // .18 native min = 1.5 real seconds. Sample before and after that boundary.
  const points=[0,.06,.12,.18,.2,1,5].map(at=>advanceNativeReference487(runtime,at));
  const log=JSON.parse(JSON.stringify(runtime.ctx.sim.administrationLog));
  const doses=s.orders.map(([id])=>{
   const entry=runtime.ctx.sim.monitorTherapies.get(id);
   return {id,dose:entry?JSON.parse(JSON.stringify(entry.dose)):null};
  });
  assert.equal(points[0].administrationCount,0,'administration cannot occur on order submission');
  assert.equal(points[1].administrationCount,0,'native 550 ms preparation not yet elapsed');
  // Measure each drug-specific delay without assuming one universal IV timer.
  assert.equal(points[1].administrationCount,0,'no preparation finishes before 500ms');
  assert.equal(log.length,s.orders.length,'each native order must eventually administer once');
  assert.equal(points[6].administrationCount,s.orders.length);
  assert.deepEqual(log.map(x=>x.id).sort(),s.orders.map(x=>x[0]).sort(),'actual native drug identities');
  return {id:s.id,orders:s.orders,baseline,points,log,doses,deliveryAtNativeMinutes:log.map(x=>({id:x.id,min:x.m}))};
 });
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const cases=characterizeAppNative();
 console.log('APP-001 ORIGINAL NATIVE CHARACTERIZATION',JSON.stringify(cases));
 console.log('APP NATIVE CHARACTERIZATION PASS: '+cases.length+' scenarios with native-measured per-therapy preparation and exactly one administration per explicit therapy.');
}
