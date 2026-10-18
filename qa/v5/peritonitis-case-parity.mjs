// QA only: the effective generated V4 executor versus the real V5 guard.
// Both receive genuine orders. No vital/physiology writes or fake receipts.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {createLiveNativeJourney487,advanceLiveNativeJourney487,liveNativeJourneySources487} from '../physiology-live/native-journey-487.mjs';
import {createGuardSession} from '../../src/v5/clinical/guard-session.js';
import {readNeurologicalState} from '../../src/v5/clinical/patient-observations.js';
const read=name=>JSON.parse(fs.readFileSync('src/v5/content/'+name+'.json'));
const content={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
const vitalAxes=['temp','hr','rr','sys','dia','spo2'];
const physAxes=['inflammation','effectiveVolume','svr','contractility','oxygenation','renalReserve','renalStress'];
export async function comparePeritonitisCase({caseId,scenarios,reportName}){
 const results=[];
 for(const spec of scenarios){
  const original=createLiveNativeJourney487(caseId),uid=original.ctx.sim.patientInstance.uid;
  assert.equal(original.ctx.window.csPharm487,undefined,'experimental general pharmacology is not the reference');
  let sequence=0,elapsed=0,typing=false;
  const guard=createGuardSession({roomId:'parity-'+spec.id,mode:'solo',actorId:'doctor',actorName:'Doctor',
   patient:{uid,caseId},content,resolveContext:()=>({patientUid:uid})});
  const send=text=>guard.post({id:String(++sequence),text});
  const maxError={vitals:0,physiology:0},points=[],sourceControlled=original.ctx.sim.phys.sourceControlled;
  try{
   await send('Enfermera una vía');
   const timeline=spec.timeline||[{at:0,orders:spec.orders||[]}];
   const samples=[0,.54,.56,.79,.81,1.49,1.51,5,15,30,45,60,90,120,...(spec.samples||[])];
   // At identical cuts both Euler integrators observe before new orders.
   const times=[...new Set([...samples,...timeline.map(x=>x.at)])].sort((a,b)=>a-b);
   for(const at of times){
    if(at>elapsed){
     advanceLiveNativeJourney487(original,at-elapsed,{typing});guard.advance(at-elapsed,{typing});await guard.flush();elapsed=at;
    }
    for(const step of timeline.filter(x=>x.at===at)){
     if(step.typing!==undefined)typing=step.typing;
     for(const text of step.orders||[]){
      assert(original.ctx.addMonitorTherapy(text),'native recognized '+text);
      const ack=await send('Enfermera '+text);assert.equal(ack.clinical.at(-1).status,'pending',text);
     }
    }
    const p=guard.read().patient,o=original.ctx.sim;
    assert.equal(p.uid,uid);assert.equal(o.patientInstance.uid,uid);
    assert.equal(p.administrationLog.length,o.administrationLog.length,spec.id+' receipt count @'+at);
    for(let i=0;i<p.administrationLog.length;i++){
     const a=p.administrationLog[i],b=o.administrationLog[i];
     assert.equal(a.id,b.id);assert.equal(a.patientUid,uid);
     assert(Math.abs(a.administeredAtNativeMinute-b.m)<1e-8,'native receipt time');
     if(b.dose?.amount!==undefined)assert.equal(a.dose.amount,b.dose.amount);
    }
    for(const axis of vitalAxes){const error=Math.abs(p.liveVitals[axis]-o.liveVitals[axis]);
     maxError.vitals=Math.max(maxError.vitals,error);assert(error<1e-6,spec.id+'/'+at+'/'+axis+': '+error);}
    for(const axis of physAxes){const error=Math.abs(p.phys[axis]-o.phys[axis]);
     maxError.physiology=Math.max(maxError.physiology,error);assert(error<1e-7,spec.id+'/'+at+'/'+axis+': '+error);}
    const coverage=original.ctx.antibioticCoverageStatus();
    assert(Math.abs((p.coverage?.score||0)-coverage.score)<1e-8,'coverage score');
    assert(Math.abs((p.coverage?.ramp||0)-coverage.ramp)<1e-8,'coverage ramp');
    assert.equal(p.phys.sourceControlled,sourceControlled);assert.equal(o.phys.sourceControlled,sourceControlled);
    const neuro=readNeurologicalState(p),nativeNeuro=original.ctx.window.nsGlasgowState();
    for(const axis of ['eye','verbal','motor'])assert.equal(neuro[axis],nativeNeuro[axis],spec.id+' neurological '+axis+' @'+at);
    points.push({realSeconds:at,nativeMinute:guard.read().clock.nativeMinute,vitals:p.liveVitals,phys:p.phys,
     coverage:p.coverage,neuro,receipts:p.administrationLog.length});
   }
   results.push({...spec,maxError,points});
  }finally{guard.dispose();}
 }
 const summary={schema:'atria-peritonitis-case-parity/v1',caseId,allMatched:true,
  scope:'Typical effective native phenotype, genuine preparation/administration and explicit native clock epochs; pre-death horizon <=120 real seconds. No source-control procedure or simulated study transport.',
  sourceHashes:liveNativeJourneySources487.compiled.map(({id,code})=>({id,sha256:createHash('sha256').update(code).digest('hex')})),results};
 const out=process.env.V5_PERITONITIS_EVIDENCE||'qa/v5-browser-results';fs.mkdirSync(out,{recursive:true});
 fs.writeFileSync(out+'/'+reportName+'.json',JSON.stringify(summary,null,2)+'\n');
 console.log('PERITONITIS CASE PARITY PASS',JSON.stringify({caseId,scenarios:results.length,measurements:results.reduce((n,r)=>n+r.points.length,0),
  maxVitalError:Math.max(...results.map(x=>x.maxError.vitals)),maxPhysiologyError:Math.max(...results.map(x=>x.maxError.physiology))}));
 return summary;
}
