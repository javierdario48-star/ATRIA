import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {gzipSync} from 'node:zlib';
import {clinicalCertificationContent,runClinicalCaseScenario} from '../v5/certify-clinical-cases.mjs';
import {makeIntegralManifest,integralSourceIdentity,assessIntegralJourney,summarizeIntegralRows} from '../v5/clinical-integral-matrix.mjs';
import {verifyClinicalEvidenceArchive} from '../v5/clinical-evidence-archive.mjs';

test('archived real public-runtime receipts reject missing, duplicated and altered executions',async()=>{
 const directory=await mkdtemp(join(tmpdir(),'atria-clinical-archive-'));
 try{
  const content=await clinicalCertificationContent(),c=content.cases.find(c=>c.id==='APP-001');
  const identity=integralSourceIdentity(),manifest={...makeIntegralManifest([c],{
   sourceDigest:identity.digest,horizon:1,profiles:['abandon']}),sourceFiles:identity.sources};
  const scenario=manifest.scenarios[0];
  const row={...await runClinicalCaseScenario(c,{...scenario,content,source:{sourceDigest:identity.digest}}),
   scenarioId:scenario.scenarioId,scenarioProfile:scenario.scenarioProfile,configurationDigest:manifest.configurationDigest};
  row.integral=assessIntegralJourney(row);
  const summary={configurationDigest:manifest.configurationDigest,...summarizeIntegralRows([row]),
   evidenceComplete:true,runtimeIntegrityPassed:true};
  const header={kind:'atria-native-clinical-evidence-archive',schemaVersion:1,manifest,summary};
  const path=join(directory,'journeys.jsonl.gz');
  const write=async rows=>writeFile(path,gzipSync([header,...rows].map(x=>JSON.stringify(x)).join('\n')+'\n'));
  const verify=()=>verifyClinicalEvidenceArchive(path,{minimumCases:1,minimumPerCase:1});
  await write([row]);assert.equal((await verify()).executions,1);
  await write([]);await assert.rejects(verify,/missing executions/);
  await write([row,row]);await assert.rejects(verify,/unexpected extra execution/);
  const changed=structuredClone(row);changed.final.xp+=100;
  await write([changed]);await assert.rejects(verify,/clinical receipts changed/);
  await write([row]);header.manifest.sourceFiles[0].sha256='0'.repeat(64);
  await write([row]);await assert.rejects(verify,/source identities changed/);
 }finally{await rm(directory,{recursive:true,force:true});}
});
