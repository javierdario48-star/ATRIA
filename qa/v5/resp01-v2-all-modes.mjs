// End-to-end V2 characterization against the REAL native guard, without
// activating its catalog entry or duplicating physiology, scores or nursing.
// Negative scenarios can be clinically unclosed: the assertion is absence
// of false credit/technical corruption, not forcing a happy outcome.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {resp01V2Candidate as c} from '../../src/v5/content/packs/respiratory-v2-candidate.js';
import {clinicalCertificationContent,runClinicalCaseScenario} from './certify-clinical-cases.mjs';
import {createClinicalGraphObserver} from '../../src/v5/clinical/clinical-graph-observer.js';
const modes=['solo','apprentice','coop','competitive'];
const profiles=['competent','slow','complication-rescue','wrong-medication',
 'no-allergy-question','inexperienced','negligent','omit-studies','abandon',
 'wrong-diagnosis'];
const content=await clinicalCertificationContent([c]);
const cases=content.cases.filter(x=>x.id===c.id);
if(cases.length!==1||cases[0].clinicalRevision!=='v2-candidate')throw Error('V2 catalog is not isolated');
const out=resolve('qa/v5-resp01-v2-modes');await mkdir(out,{recursive:true});
const summary={schema:'atria.v5.resp01-all-modes.v1',caseId:c.id,revision:c.clinicalRevision,
 modeCount:modes.length,profileCount:profiles.length,scenarioCount:0,errors:[],results:[]};
for(const mode of modes)for(const profile of profiles){
 const seed='atria:v5:resp01:v2:all-modes:20261121:'+mode+':'+profile;
 const preferredDestination=profile==='complication-rescue'?'sala':
  ['competent','slow','no-allergy-question','wrong-diagnosis'].includes(profile)?'alta':null;
 const graph=createClinicalGraphObserver(c.clinicalGraph);
 let run;
 try{run=await runClinicalCaseScenario(c,{content,mode,profile,seed,horizon:720,
  recovery:true,traceEvery:12,preferredDestination,onObservation:state=>graph.observe(state),
  source:{kind:'v2-multimode-independent-certification',revision:'v2-candidate'}});
 }catch(err){
  summary.errors.push(mode+'/'+profile+': '+String(err.message||err));continue;
 }
 run.graphCoverage=graph.read();
 const problems=[];
 const p=run.final||{},closure=run.closureReceipt,commands=run.commands||[];
 const performed=(run.administrations||[]).filter(x=>x.id==='furosemide'&&x.status!=='pending');
 const clinical=commands.flatMap(x=>x.clinical||[]);
 const invalid=clinical.filter(x=>x.status==='unconfirmed');
 const penalties=run.progress?.penalties||[],rewards=run.progress?.receipts||[];
 if(invalid.length)problems.push('unconfirmed native receipts: '+invalid.length);
 if(rewards.length>1)problems.push('more than one closure XP receipt');
 if(closure?.closed&&(!p.closed||!rewards.length))problems.push('closure without validated reward');
 if(p.closed&&!closure?.closed)problems.push('false local closure state');
 if(p.closed&&closure&&(!Number.isFinite(closure.quality?.score)||closure.quality.score<0||
   closure.quality.score>100))problems.push('invalid hidden quality');
 // Report the failing checkpoint field precisely. A replay assertion only
 // applies if the scenario actually replayed a command (e.g. abandon has none).
 const recoveryKeys=['samePatient','sameClinicalPatient','sameAdministrations',
  'sameXP','sameEventIds','sameClock','sameClaims','sameIdentity'];
 const recoveryIssues=run.recovery?recoveryKeys.filter(key=>run.recovery[key]!==true):
  ['no recovery checkpoint evidence'];
 if(run.recovery?.replayedCommandId&&run.recovery.replayUnchanged!==true)
  recoveryIssues.push('replayUnchanged');
 if(recoveryIssues.length)problems.push('broken checkpoint/replay: '+recoveryIssues.join(', '));
 if(profile==='competent'||profile==='slow'||profile==='complication-rescue'){
  if(run.passed!==true)problems.push('competent actor did not satisfy real native checks: '+(run.failures||[]).join('|'));
  if(!p.closed)problems.push('prepared actor never closes');
 }
 if(profile==='complication-rescue'&&!((run.complications||[]).length))
  problems.push('complication-rescue scenario did not exhibit a real manifested episode');
 if(profile==='abandon'&&(rewards.length||p.closed))problems.push('abandoned encounter minted closure XP');
 // A wrong explicit hypothesis must not silently satisfy the hidden
 // diagnosis contract or mint a safe outpatient closure reward.
 if(profile==='wrong-diagnosis'){
  if(!commands.some(row=>row.text==='/diagnostico neumotorax espontaneo'))
   problems.push('wrong diagnosis command was not submitted');
  if(p.closed||rewards.length)problems.push('wrong diagnosis incorrectly minted a safe closure');
 }
 if(profile==='wrong-medication'){
  if(!performed.length)problems.push('wrong but technically valid medication did not actually reach patient');
  if(performed.length&&closure?.quality?.penalty===0)
   problems.push('delivered incorrect medication was not deducted in native closure quality');
 }
 const entry={mode,profile,passed:problems.length===0,clinicallyCertified:run.passed===true,
  outcome:run.outcome||null,closed:!!p.closed,died:!!p.died,
  destination:p.destination||null,quality:closure?.quality?.score??null,xp:p.xp??null,
  commands:commands.length,nurseLines:commands.filter(x=>/enfermer/i.test(x.text)).length,
  dialogues:(run.history||[]).length,examActions:(run.examLog||[]).length,
  studyOrders:(run.studies||[]).length,administrations:(run.administrations||[]).length,
  complicationCount:(run.complications||[]).length,rescueActions:(run.rescueActions||[]).length,
  hintActions:commands.filter(x=>/pista|vega/i.test(x.text)).length,
  verifiedRewardCount:rewards.length,penalties:penalties.length,
  invalidReceipts:invalid.length,checkpointRecovered:run.recovery?.sameClinicalPatient??null,
  failures:run.failures||[],graphCovered:run.graphCoverage.covered,problems};
 summary.results.push(entry);summary.scenarioCount++;
 if(problems.length)summary.errors.push(mode+'/'+profile+': '+problems.join(' | '));
 await writeFile(resolve(out,mode+'-'+profile+'.json'),JSON.stringify(run,null,2)+'\n');
 console.log(JSON.stringify(entry));
}
await writeFile(resolve(out,'summary.json'),JSON.stringify(summary,null,2)+'\n');
const covered=[...new Set(summary.results.flatMap(x=>x.graphCovered||[]))];
await writeFile(resolve(out,'graph-coverage.json'),JSON.stringify({graphId:c.clinicalGraph.id,
 scenarioCount:summary.scenarioCount,covered,uncovered:c.clinicalGraph.edges.filter(e=>!covered.includes(e.id)).map(e=>e.id),
 semantics:c.clinicalGraph.semantics,source:'40 native scenario runs; no fabricated transitions'},null,2)+'\n');
console.log('ATRIA_V2_FOUR_MODE_SUMMARY '+JSON.stringify({scenarioCount:summary.scenarioCount,
 passed:summary.results.filter(x=>x.passed).length,errors:summary.errors}));
if(summary.errors.length)process.exitCode=1;
