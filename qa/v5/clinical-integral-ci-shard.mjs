// Distribute the existing native worker, restoring completed QA evidence only.
// This never supplies a checkpoint, patient state or result to a game runtime.
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync,copyFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {fork} from 'node:child_process';
import {integralSourceIdentity,integralClinicalContent,makeIntegralManifest,assessIntegralJourney} from './clinical-integral-matrix.mjs';
import {clinicalEvidenceDigest} from './clinical-evidence-archive.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
export async function readNativeEvidenceCheckpoint(path){
 const [header,...rows]=gunzipSync(readFileSync(path)).toString().trim().split('\n').map(JSON.parse);
 assert.equal(header.kind,'atria-native-clinical-integral-checkpoint');assert.equal(header.schemaVersion,1);
 assert.equal(header.recordedExecutions,rows.length);
 const manifest=header.manifest,identity=integralSourceIdentity(),{cases}=await integralClinicalContent();
 assert.equal(manifest.sourceDigest,identity.digest,'clinical dependencies changed; checkpoint cannot be resumed');
 assert.equal(hash(manifest.sourceFiles),identity.digest,'recorded dependency identities changed');
 const expected=makeIntegralManifest(cases,{seed:manifest.seed,sourceDigest:identity.digest,horizon:manifest.horizonRealSeconds});
 assert.equal(manifest.configurationDigest,expected.configurationDigest,'case definitions or scenarios changed');
 assert.equal(hash(manifest.scenarios),hash(expected.scenarios));
 const seen=new Set(),indices=new Map(manifest.scenarios.map((scenario,index)=>[scenario.scenarioId,index]));
 for(const row of rows){
  const index=indices.get(row.scenarioId),scenario=manifest.scenarios[index];
  assert(scenario&&!seen.has(index),'unknown or duplicate recorded execution');seen.add(index);
  for(const key of ['caseId','profile','mode','seed','scenarioProfile'])assert.equal(row[key],scenario[key]);
  assert.equal(row.configurationDigest,manifest.configurationDigest);assert.equal(row.source.sourceDigest,identity.digest);
  assert.equal(row.source.caseDefinitionDigest,manifest.caseDefinitions.find(c=>c.caseId===row.caseId)?.digest);
  assert.equal(row.evidenceDigest,clinicalEvidenceDigest(row),'recorded receipts changed');
  const assessment=assessIntegralJourney(row);assert(assessment.complete&&assessment.integrityPassed,'invalid recorded execution');
 }
 return {manifest,rows,indices};
}
export async function runNativeEvidenceShard({shard,shards=8,checkpoint=resolve(root,'docs/qa/2026-10-28-clinical-integral-checkpoint.jsonl.gz'),verifyOnly=false}){
 assert(Number.isInteger(shard)&&Number.isInteger(shards)&&shard>=0&&shard<shards&&shards<=16);
 const {manifest,rows,indices}=await readNativeEvidenceCheckpoint(checkpoint);
 if(verifyOnly)return {sourceDigest:manifest.sourceDigest,completed:rows.length,expected:manifest.scenarios.length};
 const directory=resolve(root,'qa/integral-results',manifest.configurationDigest),manifestPath=resolve(directory,'manifest.json');
 mkdirSync(resolve(directory,'rows'),{recursive:true});writeFileSync(manifestPath,JSON.stringify(manifest,null,2)+'\n');
 for(const row of rows)writeFileSync(resolve(directory,'rows',String(indices.get(row.scenarioId)).padStart(4,'0')+'.json'),JSON.stringify(row,null,2)+'\n');
 await new Promise((done,reject)=>{
  const child=fork(resolve(root,'qa/v5/clinical-integral-matrix.mjs'),['--worker',manifestPath,String(shard),String(shards)],
   {cwd:root,stdio:['ignore','inherit','inherit','ipc']});
  child.on('message',message=>console.log(JSON.stringify(message)));
  child.on('error',reject);child.on('exit',code=>code===0?done():reject(Error('native worker exited '+code)));
 });
 const output=resolve(root,'qa/v5-integral-shard-results','shard-'+shard);mkdirSync(resolve(output,'rows'),{recursive:true});
 copyFileSync(manifestPath,resolve(output,'manifest.json'));
 const completed=[];
 for(let index=shard;index<manifest.scenarios.length;index+=shards){
  const name=String(index).padStart(4,'0')+'.json',path=resolve(directory,'rows',name),row=JSON.parse(readFileSync(path));
  const assessment=assessIntegralJourney(row);assert(assessment.complete&&assessment.integrityPassed,'incomplete native shard row '+index);
  assert.equal(row.configurationDigest,manifest.configurationDigest);
  copyFileSync(path,resolve(output,'rows',name));completed.push(row.scenarioId);
 }
 const report={kind:'atria-native-clinical-evidence-shard',sourceDigest:manifest.sourceDigest,
  configurationDigest:manifest.configurationDigest,shard,shards,completed};
 writeFileSync(resolve(output,'shard.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const shard=Number(process.argv[2]??0),shards=Number(process.argv[3]??8);
 console.log('ATRIA_NATIVE_SHARD='+JSON.stringify(await runNativeEvidenceShard({shard,shards,verifyOnly:process.argv.includes('--verify-only')})));
}
