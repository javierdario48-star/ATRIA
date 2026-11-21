#!/usr/bin/env node
// Experimental V1/V2 comparison on the SAME native game runtime and seed.
// It does NOT register, publish or activate the V2 in the playable catalog.
// Profiles with unsafe/omitted care characterize consequences; do not require
// the patient to survive or a bad doctor to receive XP to pass the harness.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {performance} from 'node:perf_hooks';
import {resolve} from 'node:path';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
import {resp01V2Candidate,resp01V2ExperimentalPack} from '../../src/v5/content/packs/respiratory-v2-candidate.js';
import {compileClinicalCasePack} from '../../src/v5/content/compile-clinical-case-pack.js';
import {CLINICAL_POLICY_REGISTRIES} from '../../src/v5/clinical/clinical-policy-registry.js';
import {clinicalCertificationContent,runClinicalCaseScenario} from './certify-clinical-cases.mjs';

const smoke=process.argv.includes('--smoke');
if(process.argv.slice(2).some(x=>x!=='--smoke'))throw Error('only --smoke supported');
const old=respiratoryPack.cases.find(c=>c.id==='RESP-01');
assert(old&&resp01V2Candidate);
assert.equal(old.id,resp01V2Candidate.id);
assert.equal(old.clinicalRevision,undefined);
assert.deepEqual(old.clinicalPolicy.complications,[]);
const staged=compileClinicalCasePack(resp01V2ExperimentalPack,CLINICAL_POLICY_REGISTRIES);
assert.equal(staged.ok,true,staged.errors?.join('\n'));
const candidate=staged.cases[0];
assert.equal(candidate.id,'RESP-01');
const contentV1=await clinicalCertificationContent([old]);
const contentV2=await clinicalCertificationContent([candidate]);
assert.equal(contentV1.cases.filter(c=>c.id==='RESP-01').length,1);
assert.equal(contentV2.cases.filter(c=>c.id==='RESP-01').length,1);
assert.equal(contentV1.cases.length,contentV2.cases.length,'isolated replacement, not catalog growth');

const base=smoke?
 [{profile:'competent',mode:'solo'},{profile:'complication-rescue',mode:'solo'}]:
 [
  ...['competent','slow','inexperienced','negligent','omit-studies',
   'wrong-medication','no-allergy-question','abandon','complication-rescue']
   .map(profile=>({profile,mode:'solo'})),
  ...['competent','complication-rescue'].flatMap(profile=>
   ['apprentice','coop','competitive'].map(mode=>({profile,mode})))
 ];
const output=resolve('qa/v5-resp01-v2-parity');
await mkdir(output,{recursive:true});
const pairs=[],errors=[];
function digest(row){
 const s=row.final??{},q=row.closureReceipt?.quality??{},comp=row.complications??[];
 const uniqueCommands=new Set((row.commands||[]).map(x=>x.id));
 const unsafeDischargeAttempts=(row.commands||[]).flatMap(x=>x.clinical||[])
  .filter(x=>x.receipt?.disposition?.kind==='clinical.unsafe-discharge').length;
 return {
  passed:row.passed===true,outcome:row.outcome??'error',
  failures:row.failures||[],
  atRealSecond:s.atRealSecond??null,atNativeMinute:s.atNativeMinute??null,
  died:s.died??null,closed:s.closed??null,destination:s.destination??null,
  xp:s.xp??null,qualityScore:q.score??null,diagnosticFactor:q.diagnosticFactor??null,
  completedStudies:(row.studies||[]).filter(x=>x.status==='done').length,
  totalStudies:(row.studies||[]).length,administrationCount:(row.administrations||[]).length,
  totalCommands:uniqueCommands.size,unsafeDischargeAttempts,complications:comp.map(x=>({id:x.id,status:x.status,
   onsetAt:x.onsetAt??null,recoveredAt:x.recoveredAt??null})),
  hintActions:(row.commands||[]).filter(x=>/vega|pista/i.test(x.text)).length,
  recoveryRestored:row.recovery?.sameClinicalPatient??null,
  identity:{age:row.patientIdentity?.initial?.age??null,
   personality:row.patientIdentity?.initial?.personality??null,
   backgroundHistory:row.patientIdentity?.initial?.backgroundHistory?.id??null}
 };
}
for(const x of base){
 const seed='resp01:paired:v2:2026:'+x.profile+':'+x.mode;
 const pair={profile:x.profile,mode:x.mode,seed,rows:{}};
 for(const [label,clinicalCase,content] of [['v1',old,contentV1],['v2',candidate,contentV2]]){
  const start=performance.now();
  const row=await runClinicalCaseScenario(clinicalCase,{
   content,profile:x.profile,mode:x.mode,seed,horizon:720,recovery:true,
   preferredDestination:label==='v2'?(x.profile==='complication-rescue'?'sala':'alta'):null,
   traceEvery:10,source:{comparison:'resp01-v1-v2',revision:label,staging:true}
  });
  const summarized=digest(row);
  pair.rows[label]={...summarized,benchmarkWallMs:Math.round(performance.now()-start)};
  await writeFile(resolve(output,x.profile+'-'+x.mode+'-'+label+'.json'),
   JSON.stringify(row,null,2)+'\n');
  if(x.profile==='competent'&&row.passed!==true)
   errors.push(label+'/'+x.profile+'/'+x.mode+': competent path failed: '+(row.failures||[]).join('; '));
  if(x.profile==='complication-rescue'&&label==='v2'&&row.passed!==true)
   errors.push(label+'/'+x.profile+'/'+x.mode+': complication/rescue failed: '+(row.failures||[]).join('; '));
  if(label==='v2'&&['competent','slow','no-allergy-question','complication-rescue'].includes(x.profile)&&
   summarized.unsafeDischargeAttempts>0)
   errors.push(label+'/'+x.profile+'/'+x.mode+': medically competent bot attempted premature unsafe discharge '+summarized.unsafeDischargeAttempts+' times');
 }
 pair.delta={
  elapsedRealSeconds:(pair.rows.v2.atRealSecond??0)-(pair.rows.v1.atRealSecond??0),
  qualityScore:(pair.rows.v2.qualityScore??0)-(pair.rows.v1.qualityScore??0),
  xp:(pair.rows.v2.xp??0)-(pair.rows.v1.xp??0),
  commands:(pair.rows.v2.totalCommands??0)-(pair.rows.v1.totalCommands??0),
  complicationCount:pair.rows.v2.complications.length-pair.rows.v1.complications.length,
  sameAge:pair.rows.v1.identity.age===pair.rows.v2.identity.age,
  samePersonality:pair.rows.v1.identity.personality===pair.rows.v2.identity.personality,
  sameHistoryVariant:pair.rows.v1.identity.backgroundHistory===pair.rows.v2.identity.backgroundHistory
 };
 // A candidate that adds observation may cost elapsed time, but a clean
 // outpatient bot must not duplicate examination/reassessment work.
 if(x.profile==='competent'&&pair.rows.v2.complications.length===0&&
   pair.delta.commands>1)
  errors.push('v2/'+x.profile+'/'+x.mode+': unnecessary outpatient bot actions beyond one final observation check: '+pair.delta.commands);
 pairs.push(pair);
 console.log(JSON.stringify({profile:x.profile,mode:x.mode,
  v1:{outcome:pair.rows.v1.outcome,quality:pair.rows.v1.qualityScore,xp:pair.rows.v1.xp},
  v2:{outcome:pair.rows.v2.outcome,quality:pair.rows.v2.qualityScore,xp:pair.rows.v2.xp,
   complications:pair.rows.v2.complications},
  delta:pair.delta,errors:errors.slice(-2)}));
}
const summary={
 schema:'atria.resp01.v1-v2.comparison.v1',sourceSha:process.env.GITHUB_SHA||'local',
 recordedAt:new Date().toISOString(),
 status:errors.length?'FAILED':'COMPLETED_WITH_LIMITATIONS',
 isolation:'V2 candidate never activated; V1 is unchanged',
 cases:['RESP-01'],runMode:smoke?'smoke':'full',pairs:pairs.length,
 byProfile:pairs.map(p=>({profile:p.profile,mode:p.mode,delta:p.delta,
  outcomeV1:p.rows.v1.outcome,outcomeV2:p.rows.v2.outcome,
  passedV1:p.rows.v1.passed,passedV2:p.rows.v2.passed,
  failuresV1:p.rows.v1.failures,failuresV2:p.rows.v2.failures})),
 results:pairs,errors,
 limitations:[
  'Wall-clock benchmark depends on CI host scheduling; not a controlled CPU/performance claim.',
  'Only authored RESP-01 behaviors are compared; universal all-study coverage is not proven.',
  'Chance of complications is a seeded game probability, not clinical epidemiology.',
  'In the forced complication-rescue profile the native bot searches a seed identity with a selected complication, so patient demographic draws may differ.',
  'Clinical validity and medical guideline review require independent approval.',
  'Browser/Android physical and Vercel deployment are not tested.'
 ]
};
await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');
console.log('RESP01_V1_V2_SUMMARY '+JSON.stringify({pairs:summary.pairs,
 errors:summary.errors,passV2:pairs.filter(p=>p.rows.v2.passed).length,
 cleanCompetent:pairs.filter(p=>p.profile==='competent'&&p.rows.v2.passed).length}));
if(errors.length)process.exitCode=1;
