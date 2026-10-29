// Reproducible generated-history challenges through ordinary public commands.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {clinicalCertificationContent,runClinicalCaseScenario} from './certify-clinical-cases.mjs';
import {assessIntegralJourney,integralSourceIdentity} from './clinical-integral-matrix.mjs';
import {chooseClinicalScenarioSeed} from './scenario-seeds.mjs';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
const content=await clinicalCertificationContent(respiratoryPack.cases);
const source=integralSourceIdentity();
const specs=[
 {id:'generated-severe-allergy',caseId:'APP-001',profile:'wrong-medication',command:'Enfermera amikacina 500 mg',
  select:v=>v.allergies.some(a=>a.drugId==='amikacin'&&a.severity==='severe'),
  verify:row=>{
   assert(row.patientIdentity.initial.severeAllergies.includes('amikacin'));
   assert(row.history.some(h=>/amikacina/.test(h.answer)&&/grave|presión/.test(h.answer)));
   assert(row.adverseEvents.some(e=>e.kind==='severe-drug-allergy'));
  }},
 {id:'opioid-overdose',caseId:'RESP-01',profile:'wrong-medication',command:'Enfermera morfina 30 mg',
  select:v=>!v.allergies.some(a=>a.drugId==='morphine'),
  verify:row=>assert(row.adverseEvents.some(e=>e.kind==='opioid-respiratory-depression'))},
 {id:'intolerance-is-not-anaphylaxis',caseId:'RESP-01',profile:'competent',
  select:v=>v.allergies.some(a=>a.drugId==='amoxicillin'&&a.type==='intolerance'),
  verify:row=>{
   assert(row.patientIdentity.initial.intolerances.includes('amoxicillin'));
   assert(!row.patientIdentity.initial.allergies.includes('amoxicillin'));
   assert(row.history.some(h=>/amoxicilina/.test(h.answer)&&/náuseas/.test(h.answer)));
   assert(row.administrations.some(a=>a.id==='amoxicillin'));
   assert(!row.adverseEvents.some(e=>e.kind==='severe-drug-allergy'));
   assert(row.closureReceipt?.closed);
  }}
];
const output='qa/reaction-results';await fs.mkdir(output,{recursive:true});const summaries=[];
for(const spec of specs){
 const c=content.cases.find(c=>c.id===spec.caseId),seed=chooseClinicalScenarioSeed(c,spec.id,spec.select);
 const row=await runClinicalCaseScenario(c,{content,profile:spec.profile,seed,horizon:360,recovery:true,
  source:{revision:source.revision,sourceDigest:source.digest},
  ...(spec.command?{wrongMedicationCommand:spec.command}:{})});
 row.integral=assessIntegralJourney(row);
 await fs.writeFile(output+'/'+spec.id+'.json',JSON.stringify(row)+'\n');
 assert(row.integral.complete&&row.integral.integrityPassed,JSON.stringify(row.integral));spec.verify(row);
 if(row.final.died)assert.equal(row.final.xp,0);
 const summary={id:spec.id,caseId:spec.caseId,seed,profile:spec.profile,outcome:row.outcome,
  reactions:row.adverseEvents.map(e=>e.kind),administrations:row.administrations.length,
  xp:row.final.xp,evidenceDigest:row.evidenceDigest,integrityPassed:true};summaries.push(summary);console.log(JSON.stringify(summary));
}
assert.equal(integralSourceIdentity().digest,source.digest,'clinical sources changed during adverse-effect challenges');
const archivePath='docs/qa/2026-10-28-reaction-evidence.jsonl.gz';
const header={kind:'atria-public-runtime-adverse-effect-evidence',schemaVersion:1,
 revision:source.revision,sourceDigest:source.digest,sourceFiles:source.sources};
const raw=await Promise.all(specs.map(spec=>fs.readFile(output+'/'+spec.id+'.json','utf8').then(text=>JSON.parse(text))));
const compressed=gzipSync([header,...raw].map(row=>JSON.stringify(row)).join('\n')+'\n',{level:9});
await fs.writeFile(archivePath,compressed);
await fs.writeFile('docs/qa/2026-10-28-reaction-evidence.json',JSON.stringify({
 authority:'createGuardRuntime',revision:source.revision,sourceDigest:source.digest,sourceFiles:source.sources,
 rawEvidence:{path:archivePath,sha256:createHash('sha256').update(compressed).digest('hex'),executions:raw.length},
 scenarios:summaries},null,2)+'\n');
