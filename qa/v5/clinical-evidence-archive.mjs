// Preserve and verify recorded public-runtime journeys; never execute or alter care.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createReadStream,createWriteStream,readFileSync,existsSync,renameSync,unlinkSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createGzip,createGunzip} from 'node:zlib';
import {Readable} from 'node:stream';
import {pipeline} from 'node:stream/promises';
import {createInterface} from 'node:readline';
import {assessIntegralJourney,summarizeIntegralRows,integralSourceIdentity} from './clinical-integral-matrix.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const read=path=>JSON.parse(readFileSync(path));
export const clinicalEvidenceDigest=row=>hash({caseId:row.caseId,initial:row.initial,final:row.final,
 administrations:row.administrations,studies:row.studies,closure:row.closureReceipt,xp:row.xpReceipts,deathEvents:row.deathEvents});
const same=(actual,expected,message)=>assert.equal(hash(actual),hash(expected),message);

export async function verifyClinicalEvidenceArchive(path,{verifySources=true,minimumCases=55,minimumPerCase=10}={}){
 const input=createReadStream(path).pipe(createGunzip());
 const lines=createInterface({input,crlfDelay:Infinity});
 const rows=[],seen=new Set();let manifest,summary;
 for await(const line of lines){
  const record=JSON.parse(line);
  if(!manifest){
   assert.equal(record.kind,'atria-native-clinical-evidence-archive');assert.equal(record.schemaVersion,1);
   ({manifest,summary}=record);
   const configuration={schemaVersion:manifest.schemaVersion,seed:manifest.seed,sourceDigest:manifest.sourceDigest,
    horizonRealSeconds:manifest.horizonRealSeconds,caseDefinitions:manifest.caseDefinitions,scenarioDefinitions:manifest.scenarioDefinitions};
   assert.equal(hash(configuration),manifest.configurationDigest,'manifest configuration changed');
   assert.equal(hash(manifest.sourceFiles),manifest.sourceDigest,'source identities changed');
   assert(manifest.caseDefinitions.length>=minimumCases,'missing clinical cases');
   same(summary.configurationDigest,manifest.configurationDigest,'summary belongs to another execution');
   if(verifySources)same(integralSourceIdentity().sources,manifest.sourceFiles,'clinical sources differ from recorded execution');
   continue;
  }
  const row=record,scenario=manifest.scenarios[rows.length];
  assert(scenario,'unexpected extra execution');
  for(const key of ['scenarioId','caseId','scenarioProfile','profile','mode','seed'])
   assert.equal(row[key],scenario[key],'execution binding '+key);
  assert(!seen.has(row.scenarioId),'duplicate execution');seen.add(row.scenarioId);
  assert.equal(row.configurationDigest,manifest.configurationDigest,'execution configuration changed');
  assert.equal(row.source.sourceDigest,manifest.sourceDigest,'execution sources changed');
  assert.equal(row.source.caseDefinitionDigest,manifest.caseDefinitions.find(c=>c.caseId===row.caseId)?.digest,'case definition changed');
  assert.equal(row.evidenceDigest,clinicalEvidenceDigest(row),'recorded clinical receipts changed');
  const actual=assessIntegralJourney(row);
  same(actual,row.integral,'stored assessment differs from recorded receipts');
  assert(actual.complete&&actual.integrityPassed,'incomplete or invalid native journey '+row.scenarioId);
  rows.push(row);
 }
 assert(manifest,'empty evidence archive');assert.equal(rows.length,manifest.scenarios.length,'missing executions');
 const counts=summarizeIntegralRows(rows);
 assert.equal(counts.patientCount,rows.length,'executions reuse an admitted patient');
 for(const c of manifest.caseDefinitions)assert(counts.byCase[c.caseId]?.executed>=minimumPerCase,'insufficient executions for '+c.caseId);
 for(const [key,value] of Object.entries(counts))same(summary[key],value,'summary counter changed: '+key);
 assert(summary.evidenceComplete&&summary.runtimeIntegrityPassed,'summary does not certify complete native evidence');
 return {executions:rows.length,cases:manifest.caseDefinitions.length,sourceDigest:manifest.sourceDigest,
  configurationDigest:manifest.configurationDigest,carePassed:counts.carePassed,outcomes:counts.outcomes};
}

export async function createClinicalEvidenceArchive(summaryPath,path){
 const summary=read(summaryPath),directory=resolve(root,summary.rawEvidenceDirectory),manifest=read(resolve(directory,'manifest.json'));
 assert(summary.evidenceComplete&&summary.runtimeIntegrityPassed,'cannot archive an unfinished matrix');
 const temporary=path+'.tmp';
 async function* records(){
  yield JSON.stringify({kind:'atria-native-clinical-evidence-archive',schemaVersion:1,manifest,summary})+'\n';
  for(let index=0;index<manifest.scenarios.length;index++){
   const file=resolve(directory,'rows',String(index).padStart(4,'0')+'.json');
   assert(existsSync(file),'missing execution '+index);yield JSON.stringify(read(file))+'\n';
  }
 }
 try{
  await pipeline(Readable.from(records()),createGzip({level:9}),createWriteStream(temporary));
  const result=await verifyClinicalEvidenceArchive(temporary);renameSync(temporary,path);return result;
 }catch(error){if(existsSync(temporary))unlinkSync(temporary);throw error;}
}

if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [operation,arg,path]=process.argv.slice(2);
 const result=operation==='create'?await createClinicalEvidenceArchive(resolve(arg),resolve(path)):
  operation==='verify'?await verifyClinicalEvidenceArchive(resolve(arg)):
  (()=>{throw Error('usage: clinical-evidence-archive.mjs create <summary.json> <evidence.jsonl.gz> | verify <evidence.jsonl.gz>');})();
 console.log('ATRIA_CLINICAL_EVIDENCE_ARCHIVE='+JSON.stringify(result));
}
