import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CARE_JOURNEYS_487} from './clinical-care-journeys-487.js';
import {createLiveNativeJourney487,advanceLiveNativeJourney487 as advance}
 from './physiology-live/native-journey-487.mjs';
const cases=Object.keys(CARE_JOURNEYS_487),runs=[];
assert.equal(cases.length,13);
const vital=p=>Object.fromEntries(['hr','rr','sys','dia','spo2']
 .map(k=>[k,Number(p.liveVitals?.[k]??NaN)]));
function setup(r){
 const c=r.ctx.C,s=r.ctx.sim;
 s.diagnosis=c.dx[0];s.lastVitalsKnown=true;s.examDone=true;
 s.examRegions=new Set(['general','abdomen','target']);
 s.intentHistory=c.requiredHistory.map(id=>({id,reveal:'test workup'}));
 for(const id of c.keyStudies)s.orders.set(id,{id,status:'done',result:'test prerequisite'});
 s.reassessments=1;
}
for(const id of cases)for(const variation of ['standard','alternative']){
 const plan=CARE_JOURNEYS_487[id],orders=variation==='standard'?plan.orders:plan.alternatives[0];
 const runtime=createLiveNativeJourney487(id),{ctx}=runtime,p=ctx.sim;
 setup(runtime);const start=vital(p),receipts=[],errors=[];
 for(let k=0;k<orders.length;k++){
  const t=orders[k],mid=ctx.findMonitorTherapy(t)?.id,by=(k+Number(variation==='alternative'))%2?'nurse':'monitor';
  const before=Number(p.therapyExposure.get(mid)?.count||0);
  try{if(by==='nurse')ctx.nurseNatural('enfermera '+t);else ctx.addMonitorTherapy(t)}
  catch(e){errors.push('order '+t+' '+e.message)}
  advance(runtime,2.7,{dt:1/30});
  const delivered=Number(p.therapyExposure.get(mid)?.count||0)>before;
  receipts.push({id:mid,by,delivered});
  if(!delivered)errors.push('no confirmed execution '+t);
 }
 for(const treatment of plan.support){
  const i=ctx.C.interventions.find(x=>x.id===treatment);
  if(!i||typeof ctx.orderIntervention!=='function')errors.push('non-drug missing executor '+treatment);
  else try{ctx.orderIntervention(i)}catch(e){errors.push('non-drug '+e.message)}
 }
 let consult=null;
 if(plan.consult){
  try{ctx.window.csRequestConsult(plan.consult);advance(runtime,5.8,{dt:1/30});
   consult=p.consults.get(plan.consult)?.status||null}
  catch(e){errors.push('consult '+e.message)}
 }
 const sourceControlled=!!p.phys?.sourceControlled;
 let peri=null;try{peri=ctx.window.csPeritonitisAssessment487?.()}
 catch(e){errors.push('peri '+e.message)}
 let chosen=false;try{chosen=ctx.window.csSetDisposition(plan.destination)===true}
 catch(e){errors.push('destination '+e.message)}
 let score=null,safe=null;
 try{const v=ctx.csBreakdown();score=v?.score??null;safe=v?.safe??null}
 catch(e){errors.push('breakdown '+e.message)}
 let finishIssue=null;try{ctx.finishCase('auto')}
 catch(e){finishIssue=e.message;errors.push('finish '+e.message)}
 const untreated=createLiveNativeJourney487(id);
 setup(untreated);
 advance(untreated,runtime.clock.realSeconds,{dt:1/30});
 const untreatedVitals=vital(untreated.ctx.sim);
 const finalVitals=vital(p);
 const deltaVsUntreated=Object.fromEntries(Object.keys(finalVitals).map(k=>
  [k,Number((finalVitals[k]-untreatedVitals[k]).toFixed(2))]));
  const closed=!!p.caseEnded&&p.disposition?.id===plan.destination;
 if(['quirofano','procedimiento'].includes(plan.destination))
  assert.equal(!!p.phys?.sourceControlled,sourceControlled,id+' referral cannot simulate surgery');
 for(const v of Object.values(vital(p)))assert(Number.isFinite(v),'finite vitals '+id);
 runs.push({id,variation,orders,receipts,errors,consult,destination:plan.destination,
  chosen,closed,safe,score,peritonitis:peri?{ready:peri.ready,
  action:peri.action,missing:[...peri.missing]}:null,
  vitalsStart:start,vitalsEnd:finalVitals,untreatedVitals,deltaVsUntreated});
 console.log('ATRIA CASE JOURNEY',JSON.stringify({id,variation,medications:receipts.filter(x=>x.delivered).length,
  total:receipts.length,consult,destination:plan.destination,chosen,closed,safe,score,
  vitalDelta:deltaVsUntreated,errors}));
}
const summary={caseCount:cases.length,scenarios:runs.length,
 delivered:runs.reduce((n,x)=>n+x.receipts.filter(y=>y.delivered).length,0),
 orders:runs.reduce((n,x)=>n+x.orders.length,0),
 closed:runs.filter(x=>x.closed).length,safe:runs.filter(x=>x.safe&&x.closed).length,
 problems:runs.filter(x=>x.errors.length||!x.closed||!x.safe).map(x=>({id:x.id,
  variation:x.variation,errors:x.errors,safe:x.safe,closed:x.closed}))};
assert.equal(runs.length,26);
fs.mkdirSync('qa/care-journey-results',{recursive:true});
fs.writeFileSync('qa/care-journey-results/report-487.json',JSON.stringify({summary,runs},null,2)+'\n');
console.log('ATRIA CARE CLOSURE AUDIT',JSON.stringify(summary));
