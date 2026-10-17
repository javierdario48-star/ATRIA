// C12.b QA-only: characterize legacy rapid harm and treatment observables.
// No legacy VM code enters the V5 game bundle or its native care engine.
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487}
 from '../physiology-live/native-journey-487.mjs';

const round=x=>Number(Number(x).toFixed(6));
const vital=p=>Object.fromEntries(['sys','dia','hr','rr','spo2'].map(k=>[k,round(p.liveVitals[k])]));
const rows=[];
for(const caseId of ['CIRR-001','APP-001']){
 const treated=createLiveNativeJourney487(caseId),control=createLiveNativeJourney487(caseId);
 const snapshots=[];
 for(let n=1;n<=8;n++){
  const before=treated.ctx.sim.administrationLog.filter(x=>x.id==='fluid').length;
  assert.notEqual(treated.ctx.addMonitorTherapy('Ringer 500 ml'),false);
  assert.equal(treated.ctx.sim.administrationLog.filter(x=>x.id==='fluid').length,before,
   'message acknowledgement cannot administer');
  advanceLiveNativeJourney487(treated,2.7,{dt:1/30});
  advanceLiveNativeJourney487(control,2.7,{dt:1/30});
  const log=treated.ctx.sim.administrationLog.filter(x=>x.id==='fluid');
  assert.equal(log.length,n,'every separate prescription must receive a new native dose');
  assert.equal(treated.ctx.sim.therapyTotals.fluidMl,n*500);
  const tv=vital(treated.ctx.sim),cv=vital(control.ctx.sim);
  const delta=Object.fromEntries(Object.keys(tv).map(k=>[k,round(tv[k]-cv[k])]));
  snapshots.push({doseCount:n,confirmedMl:n*500,seconds:round(n*2.7),
   treated:tv,untreated:cv,delta,patientDied:!!treated.ctx.sim.patientDied});
 }
 advanceLiveNativeJourney487(treated,24,{dt:1/30});
 advanceLiveNativeJourney487(control,24,{dt:1/30});
 const a=vital(treated.ctx.sim),b=vital(control.ctx.sim);
 const finalDelta=Object.fromEntries(Object.keys(a).map(k=>[k,round(a[k]-b[k])]));
 assert(treated.ctx.sim.administrationLog.filter(x=>x.id==='fluid').length===8);
 const last=snapshots.at(-1);
 if(caseId==='CIRR-001')
  assert(finalDelta.rr>1||finalDelta.spo2<-.8,
   'legacy repeated CIRR Ringer must show a real respiratory change');
 rows.push({caseId,doses:8,ml:4000,snapshots,final:{
  seconds:45.6,treated:a,untreated:b,delta:finalDelta,
  fatalExposure:treated.ctx.sim._fatalExposure||0,patientDied:!!treated.ctx.sim.patientDied}});
}
console.log('LEGACY REPEATED FLUID CHARACTERIZATION '+JSON.stringify({
 type:'effective-native-v4.8.7',testOnly:true,
 notV5Effect:true,rows
}));
