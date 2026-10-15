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
  assert.equal(points[2].administrationCount,0,'native IV preparation remains pending after one real second');
  assert.equal(points[4].administrationCount,s.orders.length,'original IV preparation delivers each therapy at about 1.5 real seconds');
  assert.equal(log.length,s.orders.length,'no duplicate administration log');
  assert.equal(points[6].administrationCount,s.orders.length);
  return {id:s.id,orders:s.orders,baseline,points,log,doses};
 });
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const cases=characterizeAppNative();
 console.log('APP-001 ORIGINAL NATIVE CHARACTERIZATION',JSON.stringify(cases));
 console.log('APP NATIVE CHARACTERIZATION PASS: '+cases.length+' scenarios with verified 1.5s native IV preparation and exactly one administration per explicit therapy.');
}
