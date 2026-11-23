#!/usr/bin/env node
// Adversarial, seeded V2 certification through the actual guard runtime.
// Wrong clinical choices are allowed to fail medically; integrity breaches are not.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {clinicalContent} from '../../src/v5/server/content.js';
import {generatePatientVariation} from '../../src/v5/content/patient-variation.js';
import {varixV2Candidate} from '../../src/v5/content/packs/varix-v2-candidate.js';
import {runClinicalCaseScenario} from './certify-clinical-cases.mjs';

const mode=process.env.VARIX_QA_MODE;
assert(['solo','apprentice','coop','competitive'].includes(mode),'Pass VARIX_QA_MODE');
const v1=clinicalContent.cases.find(c=>c.id==='VARIX-001');
const v2=varixV2Candidate;
const content={...clinicalContent,cases:clinicalContent.cases.map(c=>c.id===v2.id?v2:c)};
assert.equal(content.cases.length,55);
assert.equal(new Set(content.cases.map(c=>c.id)).size,55);

const names=new Set(),personalities=new Set(),backgrounds=new Set(),allergies=new Map();
let selected=0;
for(let n=0;n<256;n++){
 const guardSeed='varix-v2-seed-audit-'+mode+'-'+n;
 const seed=guardSeed+':patient:VARIX-001';
 const context={guardSeed,patientIndex:0};
 const previous=generatePatientVariation(v1.variation,seed,context);
 const current=generatePatientVariation(v2.variation,seed,context);
 for(const key of ['name','age','personality','opening'])
  assert.deepEqual(current[key],previous[key],'V1 demographics drifted: '+mode+'/'+n+'/'+key);
 assert.deepEqual(current.allergies,previous.allergies,'V1 allergy draw drifted: '+mode+'/'+n);
 names.add(current.name);personalities.add(current.personality);
 backgrounds.add(current.backgroundHistory?.id??'none');
 if(current.complicationCandidates.some(x=>x.id==='varix_v2_rebleeding'))selected++;
 for(const a of current.allergies)allergies.set(a.drugId,(allergies.get(a.drugId)||0)+1);
}
const drawFraction=selected/256;
assert.equal(personalities.size,7,'All seven personalities must remain reachable');
assert(backgrounds.size>=3,'New V2 background histories are not varied');
assert(names.size>=20,'V2 seeded patient identities are not varied');
assert(drawFraction>.10&&drawFraction<.40,'Game-only 24% candidate draw appears broken: '+drawFraction);

const profiles=['competent','slow','inexperienced','negligent','omit-studies',
 'wrong-medication','no-allergy-question','abandon','complication-rescue','wrong-diagnosis'];
const rows=[],faults=[];
for(const profile of profiles){
 for(let repetition=0;repetition<2;repetition++){
  const seed='varix-v2-extended-'+mode+'-'+profile+'-'+repetition;
  const r=await runClinicalCaseScenario(v2,{content,mode,profile,seed,horizon:720,
   recovery:true,traceEvery:30,preferredDestination:'procedimiento',
   wrongMedicationCommand:'Enfermera heparina 5000 UI IV',
   source:{kind:'isolated-seeded-v2-adversarial',mode,profile,repetition}});
  const reason=[];
  if(!r.final||!r.initial)reason.push('missing native initial/final snapshot');
  if(r.patientIdentity?.identityUnchanged!==true||
   r.patientIdentity?.restoredIdentityUnchanged!==true)
   reason.push('identity drift or checkpoint restore mismatch');
  for(const [key,value] of Object.entries(r.integrityChecks||{}))
   if(value===false)reason.push('runtime integrity '+key);
  if(!r.integrityChecks)reason.push('no native integrity assessment');
  if(r.patientUid!==r.final?.patientUid)reason.push('different patient UID');
  if(r.studies?.some(s=>s.id==='g_varix_egd'))reason.push('invented bedside endoscopy');
  if(r.closureReceipt?.closed){
   if(r.closureReceipt.destination!=='procedimiento')reason.push('wrong accepted destination');
   if(r.xpReceipts?.length!==1)reason.push('closed without exactly one XP receipt');
   if(r.outcome!=='accepted-destination')reason.push('closed with wrong outcome');
  }else if(r.xpReceipts?.length)reason.push('premature XP receipt');
  if(new Set((r.administrations||[]).map(a=>a.sourceEventId)).size!==(r.administrations||[]).length)
   reason.push('duplicated medication receipt');
  if(profile==='abandon'&&(r.closureReceipt?.closed||r.xpReceipts?.length))
   reason.push('abandonment received clinical credit');
  if(profile==='competent'&&r.outcome!=='accepted-destination')
   reason.push('competent physician did not obtain safe accepted handoff');
  if(profile==='wrong-diagnosis'&&r.outcome==='accepted-destination')
   reason.push('contradictory diagnosis produced a transfer');
  if(profile==='complication-rescue'&&
   !r.patientIdentity?.initial?.variation?.complicationCandidates?.some(x=>x.id==='varix_v2_rebleeding'))
   reason.push('rescue bot did not select documented complication candidate');
  rows.push({profile,repetition,seed,outcome:r.outcome,clinicallyPassed:r.passed,issues:r.failures,
   xp:r.progress?.xp??null,penaltyCount:r.progress?.penalties?.length??0,
   administrations:r.administrations?.length??0,orders:r.studies?.length??0,
   complicationCandidates:r.patientIdentity?.initial?.variation?.complicationCandidates||[],
   complicationObservations:r.complicationObservations?.length??0,
   recovery:r.recovery?.sameClinicalPatient===true,integrity:r.integrityChecks,
   invariantFaults:reason});
  if(reason.length)faults.push({profile,repetition,reason,failures:r.failures?.slice(0,10)});
  console.log('VARIX_EXTENDED '+JSON.stringify({mode,profile,repetition,outcome:r.outcome,
   nativeIntegrity:reason.length===0,clinicalIssues:r.failures?.slice(0,4),
   complications:r.complicationObservations?.length??0,anomalies:reason}));
 }
}
const summary={schema:'atria.varix-v2.extended.1',mode,sourceSha:process.env.GITHUB_SHA,
 trials:rows.length,seedCensus:{drawCount:256,selectedComplications:selected,
 drawFraction,distinctNames:names.size,distinctPersonalities:[...personalities],
 backgroundHistories:[...backgrounds],allergies:Object.fromEntries(allergies)},
 accepted:rows.filter(x=>x.outcome==='accepted-destination').length,
 deaths:rows.filter(x=>x.outcome==='native-death').length,
 aliveUnclosed:rows.filter(x=>x.outcome==='alive-unclosed').length,
 manifestedEpisodes:rows.reduce((sum,r)=>sum+r.complicationObservations,0),
 faults,rows};
await mkdir('qa/v5-varix-v2-adversarial',{recursive:true});
await writeFile('qa/v5-varix-v2-adversarial/'+mode+'.json',JSON.stringify(summary,null,2)+'\n');
console.log('VARIX_EXTENDED_SUMMARY '+JSON.stringify({mode,trials:summary.trials,
 accepted:summary.accepted,deaths:summary.deaths,aliveUnclosed:summary.aliveUnclosed,
 manifestedEpisodes:summary.manifestedEpisodes,faults}));
assert.equal(faults.length,0,'V2 adverse scenarios violated native invariants');
