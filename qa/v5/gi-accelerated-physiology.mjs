import {writeFileSync,mkdirSync} from 'node:fs';
import {clinicalCertificationContent,runClinicalCaseScenario} from './certify-clinical-cases.mjs';
const ids=['CIRR-001','APP-001','CDI-001','ACAL-001','CHOLE-001','DIVERT-001','UC-AS-001','CELIAC-001','ENCEF-001','PUD-001','CROHN-001','FECAL-001','COLON-001','DIARR-001','HEPAT-001'];
const shard=Number(process.argv[2]??0),shards=Number(process.argv[3]??3);
if(!Number.isInteger(shard)||!Number.isInteger(shards)||shard<0||shard>=shards)throw Error('invalid shard');
const content=await clinicalCertificationContent();
const selected=ids.filter((_,i)=>i%shards===shard);
const rows=[];
for(const id of selected){
 const c=content.cases.find(c=>c.id===id);
 if(!c)throw Error('missing '+id);
 for(const profile of ['competent','abandon','wrong-medication']){
  const row=await runClinicalCaseScenario(c,{content,profile,mode:'solo',horizon:600,traceEvery:5,seed:'atria-gi-accelerated-2026-10-29'});
  const initial=row.initial?.vitals??{},final=row.final?.vitals??{};
  const delta=Object.fromEntries(['temp','hr','rr','sys','dia','spo2'].map(k=>[k,Number(((final[k]??0)-(initial[k]??0)).toFixed(3))]));
  const result={caseId:id,profile,outcome:row.outcome,closed:!!row.closureReceipt?.closed,atRealSecond:row.final?.atRealSecond,
   atNativeMinute:row.final?.atNativeMinute,delta,firstMeaningfulPhysiologicalDelta:row.firstMeaningfulPhysiologicalDelta,
   deathEvents:row.deathEvents,complications:row.complications,administrations:row.administrations,
   treatments:row.treatments,adverseEvents:row.adverseEvents,closureReceipt:row.closureReceipt,observations:row.observations,
   initial:row.initial,final:row.final,errors:row.errors,checks:row.checks};
  // Clinical invariants, not merely a successful Node exit. A partial
  // disposition may close despite incorrect care, but must not earn full XP.
  if(profile==='competent'&&(!result.closed||!row.final?.xp))
   throw Error(id+': competent clinical disposition failed');
  if(profile==='abandon'&&(result.closed||row.administrations.length||row.final?.xp))
   throw Error(id+': abandonment unexpectedly received care or closure');
  if(profile==='wrong-medication'){
   if(!row.administrations.some(a=>a.id==='furosemide'))
    throw Error(id+': unsafe medication was not actually delivered');
   const untreated=rows.find(r=>r.caseId===id&&r.profile==='abandon');
   const successful=rows.find(r=>r.caseId===id&&r.profile==='competent');
   if(result.closed&&!(row.final.xp<successful.final.xp))
    throw Error(id+': wrong treatment earned full competent XP');
   if(!result.closed&&!row.final?.died){
    if(!(result.delta.sys<untreated.delta.sys-3))
     throw Error(id+': repeated confirmed diuretic did not worsen perfusion');
    if(!row.adverseEvents.some(e=>e.kind==='diuretic-volume-depletion'))
     throw Error(id+': observed diuretic hypotension was not documented');
   }
  }
  rows.push(result);console.log('ATRIA_GI_FAST='+JSON.stringify({caseId:id,profile,outcome:result.outcome,closed:result.closed,delta:result.delta,atNativeMinute:result.atNativeMinute}));
 }
}
mkdirSync('qa/v5-gi-fast-results',{recursive:true});
writeFileSync('qa/v5-gi-fast-results/shard-'+shard+'.json',JSON.stringify({shard,shards,rows},null,2));
