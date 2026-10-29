#!/usr/bin/env node
import {mkdir,writeFile} from 'node:fs/promises';
import {createWriteStream,readFileSync} from 'node:fs';
import {createGzip} from 'node:zlib';
import {once} from 'node:events';
import {finished} from 'node:stream/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
import {personalityContent,runAnamnesis,INTERVIEW_DOCTORS,behaviorSignature,digest} from './personality-anamnesis-bots.mjs';
import {compareConversations,substantiveBody,interviewQuality,expressiveInterview} from './personality-conversation-metrics.mjs';

export async function certifyPatientPersonalities({count=1100,output='qa/v5-personality-results',strict=true}={}){
 if(!Number.isSafeInteger(count)||count<1)throw Error('invalid interview count');
 const content=await personalityContent();await mkdir(output,{recursive:true});
 const archive=createWriteStream(resolve(output,'anamneses.jsonl.gz')),gzip=createGzip();gzip.pipe(archive);
 const profiles=new Set(),bodies=new Set(),comparisons=[],examples=[],failures=[],caseCounts={},doctorCounts={};
 const totals={facts:0,spontaneous:0,realizations:0,emotionalRemarks:0,repeatedRemarks:0};
 let verifiedClinicalFacts=0,dynamicObservationFacts=0;
 const lengths={},fingerprints=[];let completed=0;
 try{
  for(let index=0;index<count;index++){
   const c=content.cases[index%content.cases.length],round=Math.floor(index/content.cases.length);
   const row=await runAnamnesis(c,content,{index,profileIndex:index,
    doctor:c.id==='APP-001'&&round<10?'expert':INTERVIEW_DOCTORS[round%INTERVIEW_DOCTORS.length],recover:round%10===9});
   const q=interviewQuality(row);
   verifiedClinicalFacts+=row.verifiedClinicalFacts;dynamicObservationFacts+=row.dynamicObservationFacts;
   for(const key of Object.keys(totals))totals[key]+=q[key];
   if(row.rows.length===15&&row.rows.every(t=>t.status==='executed'&&t.answer))completed++;
   caseCounts[c.id]=(caseCounts[c.id]||0)+1;doctorCounts[row.doctor]=(doctorCounts[row.doctor]||0)+1;
   profiles.add(behaviorSignature(row.behavior));bodies.add(substantiveBody(row));fingerprints.push(digest(row));
   (lengths[row.archetype]??=[]).push(row.rows.reduce((a,t)=>a+t.answer.split(/\s+/).length,0));
   if(round<20)comparisons.push(row);
   if(c.id==='APP-001'&&examples.length<10)examples.push(row);
   if(row.failures.length||q.failures.length)failures.push({caseId:c.id,index,failures:[...row.failures,...q.failures]});
   if(!gzip.write(JSON.stringify(row)+'\n'))await once(gzip,'drain');
   if((index+1)%550===0)console.log(JSON.stringify({completed:index+1,failures:failures.length}));
  }
 }finally{gzip.end();await finished(archive);}
 const comparison=compareConversations(comparisons);
 const expressive=compareConversations(comparisons.filter(expressiveInterview));
 const primary=compareConversations(comparisons.filter(expressiveInterview),{primaryOnly:true});
 const sourcePaths=execFileSync('git',['ls-files','src/v5','src/clinical/anamnesis-intents.js'],{encoding:'utf8'}).trim().split('\n').filter(p=>/\.(?:js|json)$/.test(p)&&!p.endsWith('.test.js'));
 const summary={schemaVersion:1,head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),
  sourceDigest:digest(sourcePaths.sort().map(path=>[path,readFileSync(path,'utf8')])),contentDigest:digest(content.cases),
  workingTreeChanges:execFileSync('git',['status','--porcelain','--untracked-files=all','--','src/v5','qa/v5','qa/tests'],{encoding:'utf8'}).trim(),
  engine:'createGuardSession.post → speech-router → room-authority → native clinical executor',
  caseCount:Object.keys(caseCounts).length,requestedInterviews:count,completeAnamneses:completed,
  dialogueTurns:count*15,distinctBehaviorProfiles:profiles.size,distinctSubstantiveConversations:bodies.size,
  caseCounts,doctorCounts,comparisonSample:comparison,expressiveComparison:expressive,primaryFactComparison:primary,
  intentionallyRestrictedInterviewsInComparison:comparisons.filter(r=>!expressiveInterview(r)).length,quality:totals,
  sourceVerification:{verifiedClinicalFacts,dynamicObservationFacts},
  meanWordsByArchetype:Object.fromEntries(Object.entries(lengths).map(([k,v])=>[k,v.reduce((a,n)=>a+n,0)/v.length])),
  failedAnamneses:failures.length,failures:failures.slice(0,100),corpusDigest:digest(fingerprints),
  criteria:{complete:completed===count,clinicalAndBehavioral:failures.length===0,
   substantiveDiversity:expressive.pairs>0&&expressive.nearIdenticalPairs/expressive.pairs<.45},
  limitations:['Surface grammar checks are deterministic heuristics, not an independent medical or human naturalness judgment.',
   'Neurological impairment and indirect history intentionally restrict personality expression.',
   'Pairwise similarity samples the first twenty interviews per case; exact substantive fingerprints cover the full campaign.',
   'The source oracle verifies authored provenance; it is not an independent diagnosis or a proof that every possible question is routed to the optimal domain.']};
 summary.passed=Object.values(summary.criteria).every(Boolean);
 await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
 const transcripts=['# Ten complete native anamneses — APP-001','',
  'Same clinical identity, history, allergies and physiology; only behavior and doctor style vary. Each interview has fifteen actual public-session turns.',''];
 for(const [i,row] of examples.entries()){
  transcripts.push('## Patient '+(i+1)+' — '+row.archetype+'; doctor '+row.doctor,'',
   'Traits: `'+JSON.stringify(row.behavior)+'`','');
  for(const [j,t] of row.rows.entries())transcripts.push((j+1)+'. **Doctor:** '+t.question,'',
   '   **Patient:** '+t.answer,'');
 }
 await writeFile(resolve(output,'ten-complete-anamneses.md'),transcripts.join('\n'));
 console.log(JSON.stringify({...summary,failures:summary.failures.slice(0,5)}));
 if(strict&&!summary.passed)process.exitCode=1;
 return summary;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2),options={};
 for(let i=0;i<args.length;i+=2){
  if(!['--count','--output'].includes(args[i])||!args[i+1])throw Error('unknown personality certification argument');
  options[args[i].slice(2)]=args[i]==='--count'?Number(args[i+1]):args[i+1];
 }
 await certifyPatientPersonalities(options);
}
