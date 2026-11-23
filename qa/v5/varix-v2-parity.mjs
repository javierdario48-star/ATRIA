#!/usr/bin/env node
// Second V2 pilot: paired V1/V2 native scenarios, not a replacement catalog.
// A wrong decision is a meaningful negative outcome, not a requirement to close.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {clinicalContent} from '../../src/v5/server/content.js';
import {varixV2Candidate as v2} from '../../src/v5/content/packs/varix-v2-candidate.js';
import {runClinicalCaseScenario} from './certify-clinical-cases.mjs';
import {createClinicalGraphObserver} from '../../src/v5/clinical/clinical-graph-observer.js';
const v1=clinicalContent.cases.find(c=>c.id==='VARIX-001');
assert(v1&&v2&&v1.id===v2.id&&v1.clinicalPolicy===undefined);
// VARIX-001 is one of the ORIGINAL JSON cases, unlike RESP-01 which
// belongs to an additional pack. Replacing it in an immutable view avoids
// accidentally appending a second VARIX-001 or shrinking the 55-case catalog.
const v1Content=clinicalContent;
const v2Content={...clinicalContent,cases:clinicalContent.cases.map(c=>c.id===v2.id?v2:c)};
assert.equal(v1Content.cases.length,55);assert.equal(v2Content.cases.length,55);
const modes=['solo','apprentice','coop','competitive'];
const profiles=['competent','slow','wrong-medication','wrong-diagnosis','negligent','abandon'];
const out=resolve('qa/v5-varix-v2-parity');await mkdir(out,{recursive:true});
const report={schema:'atria.varix-001.v1-v2.paired.1',caseId:'VARIX-001',
 staged:true,sourceSha:process.env.GITHUB_SHA||'local',pairs:[],errors:[]};
const total=(process.argv.includes('--smoke')?
 [{mode:'solo',profile:'competent'},{mode:'solo',profile:'wrong-medication'}]:
 modes.flatMap(mode=>profiles.map(profile=>({mode,profile}))));
if(process.argv.slice(2).some(arg=>arg!=='--smoke'))throw Error('Only --smoke supported');
for(const {mode,profile} of total){
 const seed='atria-varix-001-pair-2026:'+mode+':'+profile,rows={};
 for(const [revision,caseData,content] of [['v1',v1,v1Content],['v2',v2,v2Content]]){
  const observer=revision==='v2'?createClinicalGraphObserver(v2.clinicalGraph):null;
  try{
   const scenario=await runClinicalCaseScenario(caseData,{content,profile,mode,seed,
    horizon:720,recovery:true,traceEvery:15,
    preferredDestination:'procedimiento',
    ...(observer?{onObservation:s=>observer.observe(s)}:{}),
    source:{caseId:'VARIX-001',revision,kind:'isolated-native-comparison'}});
   const patient=scenario.final||{},reward=scenario.progress?.receipts||[],
    penalties=scenario.progress?.penalties||[],admin=scenario.administrations||[],
    p=scenario.closureReceipt;
   rows[revision]={
    outcome:scenario.outcome,botPassed:scenario.passed,
    issues:scenario.failures||[],closed:!!patient.closed,died:!!patient.died,
    destination:patient.destination,xp:patient.xp,quality:p?.quality?.score??null,
    rewards:reward.length,penalties:penalties.length,
    uniqueAdministrationIds:new Set(admin.map(x=>x.sourceEventId)).size,
    administrationCount:admin.length,
    acceptedConsults:scenario.final?.consults||null,
    ...(observer?{graph:observer.read()}:{}),
    checkpointRecovered:scenario.recovery?.sameClinicalPatient??null
   };
   if(reward.length>1)report.errors.push(mode+'/'+profile+'/'+revision+': double XP award');
   if(patient.closed&&reward.length!==1)report.errors.push(mode+'/'+profile+'/'+revision+': closed without unique XP');
   if(profile==='abandon'&&(patient.closed||reward.length))
    report.errors.push(mode+'/'+profile+'/'+revision+': credit after abandonment');
   if(admin.length!==rows[revision].uniqueAdministrationIds)
    report.errors.push(mode+'/'+profile+'/'+revision+': double/missing medication receipt ID');
   if(scenario.recovery&&scenario.recovery.sameClinicalPatient!==true)
    report.errors.push(mode+'/'+profile+'/'+revision+': patient changed after checkpoint recovery');
   await writeFile(resolve(out,mode+'-'+profile+'-'+revision+'.json'),
    JSON.stringify(scenario,null,2)+'\n');
  }catch(e){rows[revision]={error:String(e.stack||e)};
   report.errors.push(mode+'/'+profile+'/'+revision+': '+String(e.message||e));}
 }
 const pair={mode,profile,seed,rows};report.pairs.push(pair);
 console.log('VARIX_PAIR '+JSON.stringify({mode,profile,
  v1:rows.v1&&{outcome:rows.v1.outcome,xp:rows.v1.xp,issues:rows.v1.issues},
  v2:rows.v2&&{outcome:rows.v2.outcome,xp:rows.v2.xp,issues:rows.v2.issues},
  errors:report.errors.slice(-2)}));
}
report.passed=report.errors.length===0;
report.limitations=[
 'Paired bot results do not prove every hemorrhage, airway or endoscopic pathway.',
 'The patient baseline clinical diagnosis is controlled by a shared case ID, not inferred from the player.',
 'Synthetic relapse probabilities are game design, not clinical incidence.',
 'A handoff ends the initial ED case but does not perform endoscopic hemostasis.',
 'Physical Android, networked Supabase and production hosting remain unvalidated.'
];
await writeFile(resolve(out,'summary.json'),JSON.stringify(report,null,2)+'\n');
console.log('VARIX_V1_V2_PAIRED_SUMMARY '+JSON.stringify({pairs:report.pairs.length,
 errors:report.errors,completed:report.pairs.filter(x=>x.rows.v2&&!x.rows.v2.error).length}));
if(report.errors.length)process.exitCode=1;
