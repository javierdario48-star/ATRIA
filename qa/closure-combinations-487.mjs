/** Pairwise clinical closure regression: native closure and original XP formula,
 * NOT synthetic flags. Only studies/history/specialist responses are fixture evidence.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {CASE_CLOSURE_RULES_487} from '../src/clinical/case-completion-487.js';
import {createNativeXPJourney487} from './physiology-live/native-journey-487.mjs';
const cases=Object.keys(CASE_CLOSURE_RULES_487);
const variants=['minimum','complete','unnecessaryStudies','noDiagnosis','noExam',
 'noStudy','noReassessment','noTreatment','noConsult','wrongDestination',
 'unstableDischarge','alreadyDied','repeatedClose'];
let assertions=0;const result=[],failures=[];
for(const id of cases)for(const variant of variants){
 const rt=createNativeXPJourney487(id),{ctx}=rt,{sim:p,C:c}=ctx,rule=CASE_CLOSURE_RULES_487[id];
 p.diagnosis=c.dx[0];p.examDone=true;p.lastVitalsKnown=true;p.reassessments=1;
 p.intentHistory=(variant==='complete'?c.requiredHistory:[c.requiredHistory[0]]).map(id=>({id}));
 if(variant==='complete')for(const study of c.keyStudies)p.orders.set(study,{status:'done'});
 else p.orders.set(rule.study[0][0],{status:'done'});
 for(const name of rule.treatment[0]||[]){
  if(name==='iv')p.venousAccessCount=1;
  else if(['npo','ngt'].includes(name))p.interventions.add(name);
  else p.therapyExposure.set(name,{count:1});
 }
 p.consults??=new Map();
 for(const service of rule.consult?.[rule.destinations[0]]||[])
  p.consults.set(service,{status:'done',accepted:true});
 if(variant==='unnecessaryStudies')for(const st of ['unnecessary1','unnecessary2'])p.orders.set(st,{status:'done'});
 if(variant==='noDiagnosis')p.diagnosis='unrelated diagnosis';
 if(variant==='noExam')p.examDone=false;
 if(variant==='noStudy')p.orders.clear();
 if(variant==='noReassessment')p.reassessments=0;
 if(variant==='noTreatment'){p.therapyExposure.clear();p.interventions.delete('npo');p.interventions.delete('ngt');p.venousAccessCount=0;}
 if(variant==='noConsult')p.consults.clear();
 if(variant==='unstableDischarge'&&id==='COLON-001')p.liveVitals.sys=75;
 if(variant==='alreadyDied')p.patientDied=true;
 const destination=variant==='wrongDestination'?'alta':rule.destinations[0];
 const expectedBad=['noDiagnosis','noExam','noStudy','noReassessment',
  'alreadyDied'].includes(variant)||
  variant==='wrongDestination'&&id!=='COLON-001'||
  variant==='noTreatment'&&rule.treatment.length>0||
  variant==='noConsult'&&!!rule.consult?.[destination]?.length||
  variant==='unstableDischarge'&&id==='COLON-001';
 const oldXp=ctx.csProfile.xp;
 let succeeded=false,error=null;
 try{succeeded=ctx.window.csFinalizeCase487(destination)===true}
 catch(e){error=String(e.stack||e)}
 const outcome=p.nsOutcome,earned=ctx.csProfile.xp-oldXp;
 if(error)failures.push({id,variant,error:error.slice(0,400)});
 else if(expectedBad){
  if(succeeded||p._careerEndProcessed||earned!==0)
   failures.push({id,variant,reason:'Unsafe/incomplete case closed or earned XP',earned,succeeded});
 }else if(!succeeded||!p.caseEnded||outcome?.career?.xpDelta!==earned||earned<=0)
  failures.push({id,variant,reason:'Genuine finishCase or XP failed',earned,succeeded});
 else {
  ctx.finishCase('completed');
  if(ctx.csProfile.xp-oldXp!==earned)failures.push({id,variant,reason:'Duplicated XP'});
 }
 assertions++;
 result.push({id,variant,expectedBad,succeeded,earned,score:outcome?.score??null,
  actualOutcome:outcome?.career?.outcome||null,error:error?.slice(0,400)||null});
}
for(const id of cases){
 const get=v=>result.find(x=>x.id===id&&x.variant===v);
 const a=get('minimum'),b=get('complete'),c=get('unnecessaryStudies');
 if(!(b.score>=a.score&&b.earned>=a.earned))
  failures.push({id,reason:'Thoroughness did not improve score and XP',a,b});
 if(!(c.score<a.score&&c.earned<a.earned))
  failures.push({id,reason:'Unnecessary tests did not lower score and XP',a,c});
}
fs.mkdirSync('qa/closure-combinations-results',{recursive:true});
fs.writeFileSync('qa/closure-combinations-results/report.json',
 JSON.stringify({summary:{cases:10,variants:13,scenarios:130,
 passed:result.length-failures.length,failures:failures.length},result,failures},null,2)+'\n');
console.log('ATRIA NATIVE CLOSURE 130 COMBINATIONS',JSON.stringify({
 cases:10,variations:13,scenarios:130,
 actualClosures:result.filter(x=>x.succeeded).length,
 denied:result.filter(x=>!x.succeeded).length,
 genuineXp:result.filter(x=>x.earned>0).length,
 failures:failures.slice(0,12)
}));
assert.equal(failures.length,0,'Native closure & XP combinatorial failures: see emitted report');
