#!/usr/bin/env node
// Genuine public-command guard runtime, one isolated patient per trajectory.
// Wrong clinical outcomes are not automatically programming errors.
import assert from 'node:assert/strict';
import {mkdir,writeFile,appendFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {clinicalContent} from '../../src/v5/server/content.js';
import {campaignV1Candidates as cases} from '../../src/v5/content/packs/v2-staging-candidates.js';
import {createClinicalGraphObserver} from '../../src/v5/clinical/clinical-graph-observer.js';
import {runClinicalCaseScenario,treatmentCommand} from './certify-clinical-cases.mjs';
import {campaignScenario,campaignRange} from './v2-campaign-plan.mjs';
const start=Number(process.env.CAMPAIGN_START??0),count=Number(process.env.CAMPAIGN_COUNT??12);
const indexes=campaignRange(start,count),namespace=process.env.CAMPAIGN_NAMESPACE||'atria-v2-campaign-1';
const out='qa/v5-campaign-'+start;await mkdir(out,{recursive:true});await writeFile(out+'/rows.jsonl','');
const content={...clinicalContent,cases:clinicalContent.cases.map(c=>cases.find(v=>v.id===c.id)||c)};
assert.equal(content.cases.length,55);assert.equal(new Set(content.cases.map(c=>c.id)).size,55);
const wrong={ 'RESP-01':'furosemide','VARIX-001':'aspirin','CARD-08':'aspirin' };
const destinations=['alta','observacion','sala','uti','procedimiento','quirofano'];
const counts={pass:0,review:0,integrity:0,gap:0},summary={sourceSha:process.env.GITHUB_SHA||'local',
 namespace,start,count,executed:0,counts,byCase:{},findings:[],maxRssBytes:0};
const started=performance.now();
for(const index of indexes){
 const scenario=campaignScenario(cases,index,namespace),c=cases.find(x=>x.id===scenario.caseId);
 const graph=createClinicalGraphObserver(c.clinicalGraph);
 const began=performance.now(),memoryBefore=process.memoryUsage().heapUsed;
 let run=null,covered=[],integrity=[],review=[],gap=[];
 try{
  const baseCommand=treatmentCommand(c,content,wrong[c.id]);
  const command=baseCommand.replace(/(\s)(\d+(?:\.\d+)?)(\s)/,(_,a,n,z)=>a+Number((Number(n)*scenario.doseMultiplier).toFixed(4))+z);
  run=await runClinicalCaseScenario(c,{content,mode:scenario.mode,profile:scenario.profile,seed:scenario.seed,
   horizon:scenario.horizon,recovery:scenario.recovery,traceEvery:60,
   preferredDestination:scenario.destination,preferredTreatmentGroupIndex:scenario.group,
   preferredStudyId:scenario.study,qaPerturbation:scenario.qaPerturbation,
   wrongMedicationCommand:command,onObservation:s=>graph.observe(s),
   source:{kind:'large-seeded-native-campaign',index,namespace,scenario}});
  covered=graph.read().covered;
  if(!run.initial||!run.final||!run.evidenceDigest||!run.integrityChecks)
   throw Error('native journey incomplete: '+JSON.stringify(run.failures||[]));
  if(run.patientIdentity?.identityUnchanged!==true||run.patientIdentity?.restoredIdentityUnchanged!==true)
   integrity.push('patient identity/checkpoint mismatch');
  if(run.final.patientUid!==run.patientUid||run.initial.patientUid!==run.patientUid)
   integrity.push('patient UID mismatch');
  for(const k of ['clock','nursing','persistence','sync','performanceXP'])
   if(run.integrityChecks[k]!==true)integrity.push('native integrity '+k);
  if((run.final.closed||run.final.died)&&run.integrityChecks.terminal!==true)
   integrity.push('terminal integrity');
  const doses=run.administrations||[],events=doses.map(d=>d.sourceEventId);
  if(events.some(x=>!x)||new Set(events).size!==events.length||doses.some(d=>d.patientUid!==run.patientUid))
   integrity.push('missing/duplicated/misattributed administration');
  const terminal=covered.filter(id=>c.clinicalGraph.edges.some(e=>e.id===id&&destinations.includes(e.when)));
  if(run.closureReceipt?.closed){
   if(run.final.died||!run.final.closed||run.outcome!=='accepted-destination'||(run.xpReceipts||[]).length!==1)
    integrity.push('closure/XP/death contradiction');
   if(!c.clinicalPolicy.closure.destinations.includes(run.closureReceipt.destination)||
    terminal.length!==1||c.clinicalGraph.edges.find(e=>e.id===terminal[0])?.when!==run.closureReceipt.destination)
    integrity.push('native disposition and graph disagree');
  }else if(terminal.length||(run.xpReceipts||[]).length||run.final.closed)
   integrity.push('unclosed patient received closure edge or XP');
  if(scenario.profile==='abandon'&&(doses.length||run.closureReceipt?.closed))
   integrity.push('abandonment manufactured treatment or closure');
  if(scenario.profile==='wrong-medication'){
   if(!doses.some(d=>d.id===wrong[c.id]&&d.dose?.amount>0))gap.push('wrong drug not confirmed');
   if(run.closureReceipt?.closed)integrity.push('unsafe wrong-medication-only closure');
  }
  if(['competent','slow'].includes(scenario.profile)&&!run.passed)
   review.push('competent/slow trajectory not certified: '+JSON.stringify(run.failures));
  if(scenario.profile==='complication-rescue'){
   if(!(run.complicationObservations||[]).length)gap.push('selected complication did not manifest; no rescue credit');
   else if(run.integrityChecks.complicationRescue!==true||!run.passed)
    review.push('manifested episode/rescue not certified: '+JSON.stringify(run.failures));
  }
 }catch(error){integrity.push(String(error.stack||error));}
 const status=integrity.length?'integrity':review.length?'review':gap.length?'gap':'pass';
 const row={...scenario,status,integrity,review,gap,outcome:run?.outcome??null,clinicalPassed:run?.passed??false,
  evidenceDigest:run?.evidenceDigest??null,covered,adminCount:run?.administrations?.length??0,
  harmCount:run?.adverseEvents?.length??0,episodeCount:run?.complicationObservations?.length??0,
  closure:run?.closureReceipt?.destination??null,penalties:run?.progress?.penalties?.length??0,
  grossReceipts:run?.xpReceipts?.length??0,elapsedMs:Math.round(performance.now()-began),
  heapDelta:process.memoryUsage().heapUsed-memoryBefore,rssBytes:process.memoryUsage().rss};
 await appendFile(out+'/rows.jsonl',JSON.stringify(row)+'\n');
 summary.executed++;counts[status]++;
 const stats=summary.byCase[c.id]??={executed:0,pass:0,review:0,integrity:0,gap:0,edges:[]};
 stats.executed++;stats[status]++;stats.edges=[...new Set([...stats.edges,...covered])];
 summary.maxRssBytes=Math.max(summary.maxRssBytes,row.rssBytes);
 if(status!=='pass'||index%120===0){
  await writeFile(out+'/scenario-'+index+'.json',JSON.stringify({scenario,row,run,graph:graph.read()},null,2)+'\n');
  if(status!=='pass')summary.findings.push({index,caseId:c.id,mode:scenario.mode,profile:scenario.profile,status,integrity,review,gap});
 }
 // Save a recoverable report every scenario, including in a timed-out shard.
 summary.elapsedMs=Math.round(performance.now()-started);
 await writeFile(out+'/summary.json',JSON.stringify(summary,null,2)+'\n');
 if(status==='integrity'||status==='review'||(summary.executed%10===0))
  console.log('ATRIA_CAMPAIGN_PROGRESS '+JSON.stringify({start,executed:summary.executed,count,counts,last:index,status,integrity,review}));
}
console.log('ATRIA_CAMPAIGN_SUMMARY '+JSON.stringify({...summary,findings:summary.findings.map(x=>({index:x.index,status:x.status,caseId:x.caseId,profile:x.profile}))}));
if(counts.integrity||counts.review||summary.executed!==count)process.exitCode=1;
