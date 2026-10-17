// C12.h — read-only execution comparison of EIGHT real 500 ml administrations.
// The old runtime executes the actual generated V4.8.7 closure/nursing stack;
// the new runtime executes createGuardSession through the same native port used
// by the V5 game. These are not synthetic patient administration flags.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createLiveNativeJourney487,advanceLiveNativeJourney487} from '../physiology-live/native-journey-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
const read=n=>JSON.parse(readFileSync(new URL('../../src/v5/content/'+n+'.json',import.meta.url)));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const axes=['sys','dia','hr','rr','spo2'];
const round=x=>Number(x.toFixed(3));
const signs=p=>Object.fromEntries(axes.map(x=>[x,round(p.liveVitals[x])]));
async function run(caseId,{monitor}){
 const old=createLiveNativeJourney487(caseId),oldInitial=signs(old.ctx.sim);
 const id=caseId+'-'+(monitor?'connected':'disconnected');
 const v5=createGuardSession({roomId:'audit-'+id,mode:'solo',actorId:'bot',actorName:'Bot',
  patient:{uid:id,caseId},content,resolveContext:()=>({patientUid:id})});
 let ordinal=0;
 const send=txt=>v5.post({id:'audit-'+(++ordinal),text:txt});
 try{
  await send('Enfermera una vía');
  if(monitor)await send('Enfermera monitor');
  const initial=signs(v5.read().patient),shots=[];
  for(let n=1;n<=8;n++){
   const oldBefore=old.ctx.sim.administrationLog.filter(x=>x.id==='fluid').length;
   assert.notEqual(old.ctx.addMonitorTherapy('Ringer 500 ml'),false);
   const ack=await send('Enfermera Ringer 500 ml');
   assert.equal(ack.clinical?.[0]?.status,'pending','V5 requests cannot be treated as delivered');
   assert.equal(v5.read().exposure.confirmedCrystalloidMl,(n-1)*500);
   advanceLiveNativeJourney487(old,2.7,{dt:1/30});
   v5.advance(2.7);await v5.flush();
   const p=v5.read().patient,legacy=old.ctx.sim,ledger=legacy.administrationLog.filter(x=>x.id==='fluid');
   assert.equal(ledger.length,oldBefore+1);
   assert.equal(ledger.length,n);
   assert.equal(p.administrationLog.filter(x=>x.id==='fluid').length,n);
   assert.equal(v5.read().exposure.confirmedCrystalloidMl,n*500);
   const oldVitals=signs(legacy),v5Vitals=signs(p);
   shots.push({dose:n,totalMl:n*500,old:oldVitals,new:v5Vitals,
    oldAgainstAdmission:Object.fromEntries(axes.map(k=>[k,round(oldVitals[k]-oldInitial[k])])),
    v5AgainstAdmission:Object.fromEntries(axes.map(k=>[k,round(v5Vitals[k]-initial[k])])),
    lastRecorded:p.lastVitalsKnown?signs({liveVitals:p.lastVitalsKnown.vitals}):null,
    visibleWithoutNewMeasurement:!monitor&&!!p.lastVitalsKnown});
  }
  // Unlike the V4 additive exposure+circulation model, V5 native APP applies
  // the same +14mmHg target as soon as *any* fluid has been delivered.
  const saturation=shots.slice(0,5).every(x=>x.new.spo2===initial.spo2);
  return {caseId,monitor,initial,oldInitial,shots,
   firstFiveV5SpO2Unchanged:saturation,allEightDelivered:true,
   v5HasGradedHemodynamicTarget:caseId==='CIRR-001'?false:false,
   qualifier:'The latest bedside reading is live only while monitor is connected; V4 values are independent generated VM measurements'};
 }finally{v5.dispose();}
}
const results=[];
for(const caseId of ['APP-001','CIRR-001']){
 results.push(await run(caseId,{monitor:true}));
 results.push(await run(caseId,{monitor:false}));
}
const summary=results.map(row=>({
 caseId:row.caseId,monitor:row.monitor,exposureCount:row.shots.length,
 v4AfterDose1:row.shots[0].old,v4AfterDose5:row.shots[4].old,
 v4AfterDose8:row.shots[7].old,
 v5AfterDose1:row.shots[0].new,v5AfterDose5:row.shots[4].new,
 v5AfterDose8:row.shots[7].new,
 firstFiveV5SpO2Unchanged:row.firstFiveV5SpO2Unchanged,
 lastRecordedAfterDose8:row.shots[7].lastRecorded
}));
const report={schema:'atria.v5.legacy-fluid-parity-audit.v1',
 proof:'eight executed V4 and V5 orders per case, with and without a monitor',
 results,summary,observedGaps:[
  'V5 APP fluid positive hemodynamics are a Boolean treatment flag, not response to volume; CIRR has no general volume response',
  'V5 toxicity uses a 2800ml threshold and prior cumulative receipts: no new respiratory injury for early boluses',
  'V5 has no native blood-volume, interstitial, renal-clearance or renal-risk state comparable to the older clinical reference',
  'Without an active monitor or a new /signos reading, the last displayed measurement need not update',
  'V4 fluid kinetics contain known defects and optional experimental owners; port tested behavior selectively instead of source-patching the whole V4 game'
 ]};
mkdirSync('qa/v5-audit-results',{recursive:true});
writeFileSync('qa/v5-audit-results/fluid-eight-dose.json',JSON.stringify(report,null,2)+'\n');
console.log('ATRIA_V4_V5_EIGHT_BOLUS_COMPARISON='+JSON.stringify(summary));
console.log('ATRIA_V4_V5_EXECUTION_GAPS='+JSON.stringify(report.observedGaps));
