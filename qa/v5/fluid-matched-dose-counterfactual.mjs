// Same elapsed time + different confirmed bolus counts, V4 actual generated
// clinical runtime vs V5 actual guard. Separate kinetics from elapsed smoothing.
// This is a characterization gate; NEVER load a generated HTML in V5.
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487} from '../physiology-live/native-journey-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {readFileSync} from 'node:fs';
const content={cases:JSON.parse(readFileSync(new URL('../../src/v5/content/cases.json',import.meta.url))),
 therapies:JSON.parse(readFileSync(new URL('../../src/v5/content/therapies.json',import.meta.url))),
 defaultDoses:JSON.parse(readFileSync(new URL('../../src/v5/content/default-doses.json',import.meta.url)))};
const vals=p=>Object.fromEntries(['hr','sys','dia','rr','spo2'].map(k=>[k,+p.liveVitals[k].toFixed(3)]));
async function run(caseId,n){
 const old=createLiveNativeJourney487(caseId);
 const uid=caseId+'-'+n,s=createGuardSession({roomId:'cf-'+uid,mode:'solo',actorId:'QA',
  actorName:'QA',patient:{uid,caseId},content,resolveContext:()=>({patientUid:uid})});
 let seq=0;const post=text=>s.post({id:'cf-'+(++seq),text});
 try{
  await post('Enfermera una vía');
  const observed=[];
  for(let i=0;i<8;i++){
   if(i<n){
    const before=old.ctx.sim.administrationLog.filter(a=>a.id==='fluid').length;
    old.ctx.addMonitorTherapy('Ringer 500 ml');
    assert.equal((await post('Enfermera Ringer 500 ml')).clinical?.[0]?.status,'pending');
    advanceLiveNativeJourney487(old,2.7,{dt:1/30});
    s.advance(2.7);await s.flush();
    assert.equal(old.ctx.sim.administrationLog.filter(a=>a.id==='fluid').length,before+1);
   }else{
    advanceLiveNativeJourney487(old,2.7,{dt:1/30});
    s.advance(2.7);await s.flush();
   }
   const m=s.read();
   observed.push({t:(i+1)*2.7,old:vals(old.ctx.sim),v5:vals(m.patient),
    confirmedV4:old.ctx.sim.administrationLog.filter(a=>a.id==='fluid').length,
    confirmedV5:m.exposure.confirmedCrystalloidMl/500});
  }
  const v4=old.ctx.sim,v5=s.read().patient;
  assert.equal(v4.administrationLog.filter(a=>a.id==='fluid').length,n);
  assert.equal(v5.administrationLog.filter(a=>a.id==='fluid').length,n);
  return {caseId,boluses:n,timeRealSeconds:21.6,old:vals(v4),v5:vals(v5),observed};
 }finally{s.dispose();}
}
const results=[];for(const c of ['APP-001','CIRR-001'])for(const n of [0,1,2,4,8])results.push(await run(c,n));
const baseline=Object.fromEntries(results.filter(x=>x.boluses===0).map(x=>[x.caseId,x]));
const report=results.map(x=>({caseId:x.caseId,boluses:x.boluses,
 old:x.old,v5:x.v5,oldVsZero:Object.fromEntries(Object.keys(x.old).map(k=>[k,+(x.old[k]-baseline[x.caseId].old[k]).toFixed(3)])),
 v5VsZero:Object.fromEntries(Object.keys(x.v5).map(k=>[k,+(x.v5[k]-baseline[x.caseId].v5[k]).toFixed(3)]))}));
console.log('ATRIA_V4_V5_TIME_MATCHED_RINGER='+JSON.stringify(report));
