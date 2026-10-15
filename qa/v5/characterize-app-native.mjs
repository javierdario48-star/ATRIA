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
  // Native harness takes NATIVE minutes: .06 -> .5 real s; .12 -> 1 real s.
  // IV preparation can use a different delay from the 550ms oral CIRR path.
  const points=[0,.06,.096,.12,1,5].map(at=>advanceNativeReference487(runtime,at));
  const log=JSON.parse(JSON.stringify(runtime.ctx.sim.administrationLog));
  const doses=s.orders.map(([id])=>{
   const entry=runtime.ctx.sim.monitorTherapies.get(id);
   return {id,dose:entry?JSON.parse(JSON.stringify(entry.dose)):null};
  });
  assert.equal(points[0].administrationCount,0,'administration cannot occur on order submission');
  assert.equal(points[1].administrationCount,0,'native 550 ms preparation not yet elapsed');
  console.log('APP NATIVE DIAGNOSTIC',JSON.stringify({scenario:s.id,counts:points.map(x=>x.administrationCount),pending:points.map(x=>x.pending),active:points.map(x=>x.active),timers:runtime.clock.timers.map(x=>({id:x.id,at:x.at})),log}));
  assert.equal(points[3].administrationCount,s.orders.length,'real IV preparation must confirm each ordered therapy within one real second');
  assert.equal(log.length,s.orders.length,'no duplicate administration log');
  assert.equal(points[5].administrationCount,s.orders.length);
  return {id:s.id,orders:s.orders,baseline,points,log,doses};
 });
}
if(import.meta.url===new URL('file://'+process.argv[1]).href){
 const cases=characterizeAppNative();
 console.log('APP-001 ORIGINAL NATIVE CHARACTERIZATION',JSON.stringify(cases));
 console.log('APP NATIVE CHARACTERIZATION PASS: '+cases.length+' scenarios with pending at 500ms, confirmed by 1s and exactly one administration per explicit therapy.');
}
