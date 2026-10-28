#!/usr/bin/env node
// Offline evidence only. Every scenario uses ordinary guard player commands.
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
import {cardiologyPack} from '../../src/v5/content/packs/cardiology-pack.js';
import {neurologyPack} from '../../src/v5/content/packs/neurology-pack.js';
import {compileClinicalCasePack} from '../../src/v5/content/compile-clinical-case-pack.js';
import {CLINICAL_POLICY_REGISTRIES} from '../../src/v5/clinical/clinical-policy-registry.js';
import {clinicalCertificationContent,runClinicalCaseScenario,CLINICAL_CERTIFICATION_PROFILES,
 CLINICAL_CERTIFICATION_MODES} from './certify-clinical-cases.mjs';
const args=process.argv.slice(2),options={};
for(let i=0;i<args.length;i+=2){
 if(!['--pack','--profiles','--modes','--output'].includes(args[i])||!args[i+1])throw Error('invalid specialty QA option');
 options[args[i].slice(2)]=args[i+1];
}
const available={respiratory:respiratoryPack,cardiology:cardiologyPack,neurology:neurologyPack};
const packs=options.pack&&options.pack!=='all'?[available[options.pack]]:Object.values(available);
if(packs.some(x=>!x))throw Error('unknown clinical pack');
const profiles=(options.profiles||'competent').split(','),modes=(options.modes||'solo').split(',');
if(profiles.some(x=>!CLINICAL_CERTIFICATION_PROFILES.includes(x))||modes.some(x=>!CLINICAL_CERTIFICATION_MODES.includes(x)))throw Error('unknown clinical profile or mode');
const output=resolve(options.output||'qa/v5-specialty-results');await mkdir(output,{recursive:true});
const cases=packs.flatMap(p=>p.cases),content=await clinicalCertificationContent(cases),rows=[];
for(const pack of packs){
 const staged=compileClinicalCasePack(pack,CLINICAL_POLICY_REGISTRIES);
 if(!staged.ok)throw Error(staged.errors.join('\n'));
 for(const c of staged.cases)for(const profile of profiles)for(const mode of modes){
  const row=await runClinicalCaseScenario(c,{content,profile,mode,recovery:true,
   seed:staged.digest+':'+c.id});
  rows.push(row);await writeFile(resolve(output,c.id+'-'+profile+'-'+mode+'.json'),JSON.stringify(row,null,2)+'\n');
  console.log(JSON.stringify({caseId:c.id,profile,mode,passed:row.passed,outcome:row.outcome,
   failures:row.failures,missing:row.readiness?.missing,xp:row.final?.xp}));
 }
}
const summary={scenarioCount:rows.length,passed:rows.filter(x=>x.passed).length,
 outcomes:Object.fromEntries(['native-death','accepted-destination','alive-unclosed'].map(x=>[x,rows.filter(r=>r.outcome===x).length])),
 cases:cases.map(c=>c.id),profiles,modes};
await writeFile(resolve(output,'summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
if(profiles.includes('competent')&&rows.some(x=>x.profile==='competent'&&!x.passed))process.exitCode=1;
