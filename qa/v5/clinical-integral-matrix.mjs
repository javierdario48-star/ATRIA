// Executable journeys through the public runtime. A failed clinical strategy is
// an observed outcome, never promoted to a successful clinical certificate.
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,mkdirSync,existsSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync,fork} from 'node:child_process';
import {clinicalCertificationContent,runClinicalCaseScenario,assessClinicalCertificationEvidence} from './certify-clinical-cases.mjs';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
import {cardiologyPack} from '../../src/v5/content/packs/cardiology-pack.js';
import {neurologyPack} from '../../src/v5/content/packs/neurology-pack.js';

const root=fileURLToPath(new URL('../../',import.meta.url));
const self=fileURLToPath(import.meta.url);
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const copy=value=>structuredClone(value);
const modes=['solo','apprentice','coop','competitive'];
const requiredEvidenceArrays=['commands','observations','history','examLog','studies','administrations','treatments',
 'consultations','adverseEvents','complications','xpReceipts','deathEvents','sharedViews','pendingTreatments'];
export const INTEGRAL_SCENARIOS=Object.freeze([
 ...['competent','slow','inexperienced','negligent','omit-studies','wrong-medication','no-allergy-question','abandon','complication-rescue']
  .map(profile=>Object.freeze({label:profile,profile})),
 Object.freeze({label:'competent-second-seed',profile:'competent',mode:'coop'})
]);

/** The strict activation assessment is preserved. This independent assessment
 * answers whether an actual longitudinal execution was collected faithfully. */
export function assessIntegralJourney(row){
 const failures=[];
 const require=(condition,message)=>{if(!condition)failures.push(message);};
 require(row.authority==='createGuardRuntime','missing real runtime authority');
 require(!!row.patientUid&&row.initial?.patientUid===row.patientUid&&row.final?.patientUid===row.patientUid,'patient binding');
 require(requiredEvidenceArrays.every(key=>Array.isArray(row[key])),'incomplete observed evidence arrays');
 require(!!row.source&&row.source.caseId===row.caseId&&/^[a-f0-9]{64}$/.test(row.source.caseDefinitionDigest||''),'source trace');
 require(row.patientIdentity?.patientUid===row.patientUid&&row.patientIdentity?.identityUnchanged===true&&
  row.patientIdentity?.restoredIdentityUnchanged===true,'patient identity changed');
 require(row.final?.atRealSecond>row.initial?.atRealSecond,'native clock never advanced');
 const duration=row.final?.atRealSecond-row.initial?.atRealSecond;
 require(row.final?.died||row.closureReceipt?.closed||row.final?.atRealSecond>=row.horizonRealSeconds-1e-6||
  row.final?.shiftEnded===true&&row.final?.shiftElapsedSeconds===1440,'journey stopped before outcome/horizon');
 const complete=failures.length===0;
 const integrity=assessClinicalCertificationEvidence(row).integrityChecks;
 // Rescue coverage is a clinical opportunity, separate from source/runtime
 // integrity. No episode is invented when a candidate does not emerge.
 for(const key of ['clock','nursing','persistence','sync','performanceXP'])require(integrity[key]===true,'runtime integrity '+key);
 if(row.final?.died||row.closureReceipt?.closed)require(integrity.terminal===true,'runtime integrity terminal');
 const trajectory=row.firstMeaningfulPhysiologicalDelta?'native-change':
  row.source?.nativePolicy==='legacy-native'?'native-invariant':'no-meaningful-delta-observed';
 const acceptedDestination=!!row.closureReceipt?.closed&&!row.final?.died;
 const careChecks=['history','exam','studies','treatment','closure','xp'];
 const integrityPassed=failures.length===0;
 return {complete,integrityPassed,trajectory,durationRealSeconds:duration??null,
  acceptedDestination,carePassed:acceptedDestination&&integrityPassed&&careChecks.every(key=>row.checks?.[key]===true),
  strictCertificatePassed:row.passed===true,outcome:row.outcome??'incomplete',
  rescueOpportunity:row.complicationDefinitions?.length?row.complications?.length?'observed':'not-emerged':'not-authored',
  rescueAssessment:integrity.complicationRescue,failures};
}

export function makeIntegralManifest(cases,{seed='atria55-native-v1',sourceDigest,horizon=1440,profiles=null}={}){
 if(!cases?.length||!sourceDigest||!Number.isFinite(horizon)||horizon<=0||horizon>1440)throw Error('invalid integral manifest');
 const selected=profiles?INTEGRAL_SCENARIOS.filter(x=>profiles.includes(x.label)):INTEGRAL_SCENARIOS;
 if(!selected.length||profiles?.some(x=>!INTEGRAL_SCENARIOS.some(y=>y.label===x)))throw Error('invalid integral profile');
 const configuration={schemaVersion:1,seed,sourceDigest,horizonRealSeconds:horizon,
  caseDefinitions:cases.map(c=>({caseId:c.id,digest:hash(c)})),scenarioDefinitions:copy(selected)};
 const configurationDigest=hash(configuration);
 const scenarios=selected.flatMap((scenario,profileIndex)=>cases.map((c,index)=>{
  const mode=scenario.mode??modes[(index+profileIndex)%modes.length];
  return {scenarioId:c.id+'/'+scenario.label+'/'+mode,caseId:c.id,scenarioProfile:scenario.label,
   profile:scenario.profile,mode,seed:seed+':'+c.id+':'+scenario.label,recovery:true,horizon};
 }));
 return {...configuration,kind:'atria-native-clinical-integral-manifest',configurationDigest,scenarios};
}

function counters(rows){
 const count=predicate=>rows.filter(predicate).length;
 const sum=map=>rows.reduce((n,row)=>n+map(row),0);
 const outcomes=Object.fromEntries(['accepted-destination','native-death','alive-unclosed','incomplete'].map(key=>[key,count(row=>(row.outcome??'incomplete')===key)]));
 const identity=row=>row.patientIdentity?.initial;
 return {executed:rows.length,completed:count(row=>row.integral?.complete),integrityPassed:count(row=>row.integral?.integrityPassed),
  patientCount:new Set(rows.map(row=>row.patientUid).filter(Boolean)).size,
  distinctNames:new Set(rows.map(row=>identity(row)?.name).filter(Boolean)).size,
  personalities:Object.fromEntries([...new Set(rows.map(row=>identity(row)?.personality).filter(Boolean))].sort()
   .map(style=>[style,count(row=>identity(row)?.personality===style)])),
  allergicPatients:count(row=>identity(row)?.allergies?.length>0),
  severeAllergicPatients:count(row=>identity(row)?.severeAllergies?.length>0),
  intolerantPatients:count(row=>identity(row)?.intolerances?.length>0),
  allergyReactions:sum(row=>row.adverseEvents?.filter(event=>/allerg|hypersens/.test(event.kind)).length??0),
  strictCertificates:count(row=>row.passed),carePassed:count(row=>row.integral?.carePassed),acceptedDestinations:outcomes['accepted-destination'],
  nativeDeaths:outcomes['native-death'],nativeInvariance:count(row=>row.integral?.trajectory==='native-invariant'),outcomes,
  administrations:sum(row=>row.administrations?.length??0),nursingConfirmed:sum(row=>row.nursing?.confirmedEventIds?.length??0),
  completedStudies:sum(row=>row.studies?.filter(x=>x.status==='done').length??0),
  complicationEpisodes:sum(row=>row.complications?.length??0),recoveredEpisodes:sum(row=>row.complications?.filter(x=>x.status==='recovered').length??0),
  adverseEvents:sum(row=>row.adverseEvents?.length??0),xp:sum(row=>row.progress?.xp??0)};
}
export function summarizeIntegralRows(rows){
 const group=field=>Object.fromEntries([...new Set(rows.map(row=>row[field]))].sort().map(key=>[key,counters(rows.filter(row=>row[field]===key))]));
 const report={...counters(rows),byProfile:group('scenarioProfile'),byMode:group('mode'),byCase:group('caseId'),
  incomplete:rows.filter(row=>!row.integral?.complete).map(row=>({scenarioId:row.scenarioId,failures:row.integral?.failures,strictFailures:row.failures})),
  integrityFailures:rows.filter(row=>!row.integral?.integrityPassed).map(row=>({scenarioId:row.scenarioId,failures:row.integral?.failures})),
  competentCareFailures:rows.filter(row=>['competent','competent-second-seed'].includes(row.scenarioProfile)&&!row.integral?.carePassed)
   .map(row=>({scenarioId:row.scenarioId,outcome:row.outcome,checks:row.checks,missing:row.readiness?.missing,strictFailures:row.failures}))};
 return report;
}

export function integralSourceIdentity(){
 const dependencies=new Set();
 function visit(path){
  if(dependencies.has(path))return;dependencies.add(path);
  if(!/\.(?:m?js)$/.test(path))return;
  const source=readFileSync(path,'utf8');
  for(const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s*)['"](\.[^'"]+)['"]/g)){
   const target=resolve(dirname(path),match[1]);if(existsSync(target))visit(target);
  }
 }
 visit(self);
 for(const name of ['hospital','beds','cases','therapies','default-doses'])visit(resolve(root,'src/v5/content/'+name+'.json'));
 visit(resolve(root,'package.json'));
 const paths=[...dependencies].sort();
 const sources=paths.map(path=>({path:relative(root,path),sha256:createHash('sha256').update(readFileSync(path)).digest('hex')}));
 const revision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
 return {revision,digest:hash(sources),sources};
}
export async function integralClinicalContent(){
 const additional=[...respiratoryPack.cases,...cardiologyPack.cases,...neurologyPack.cases];
 const content=await clinicalCertificationContent(additional);
 const original=JSON.parse(readFileSync(resolve(root,'src/v5/content/cases.json')));
 const origins=new Map(original.map(c=>[c.id,{path:'src/v5/content/cases.json',catalog:'original-25',sourceDefinitionDigest:hash(c)}]));
 for(const [pack,path] of [[respiratoryPack,'respiratory-pack.js'],[cardiologyPack,'cardiology-pack.js'],[neurologyPack,'neurology-pack.js']])
  for(const c of pack.cases)origins.set(c.id,{path:'src/v5/content/packs/'+path,catalog:pack.packId??pack.id??path,sourceDefinitionDigest:hash(c)});
 return {content,cases:content.cases,origins};
}
const atomicJSON=(path,value)=>{mkdirSync(dirname(path),{recursive:true});const temporary=path+'.tmp-'+process.pid;
 writeFileSync(temporary,JSON.stringify(value,null,2)+'\n');renameSync(temporary,path);};
const rowPath=(directory,index)=>resolve(directory,'rows',String(index).padStart(4,'0')+'.json');
const readJSON=path=>JSON.parse(readFileSync(path));

async function executeShard(manifestPath,workerIndex,workerCount){
 const manifest=readJSON(manifestPath),directory=dirname(manifestPath),identity=integralSourceIdentity();
 if(identity.digest!==manifest.sourceDigest)throw Error('clinical sources changed before worker started; regenerate manifest');
 const {content,cases,origins}=await integralClinicalContent();
 for(let index=workerIndex;index<manifest.scenarios.length;index+=workerCount){
  const scenario=manifest.scenarios[index],path=rowPath(directory,index);
  if(existsSync(path)){
   const previous=readJSON(path);
   if(previous.configurationDigest!==manifest.configurationDigest||previous.scenarioId!==scenario.scenarioId)throw Error('resume row identity mismatch');
   if(previous.integral?.complete){process.send?.({type:'row',index,resumed:true,...brief(previous)});continue;}
  }
  const c=cases.find(c=>c.id===scenario.caseId),startedAt=new Date().toISOString();
  const evidence=await runClinicalCaseScenario(c,{...scenario,content,source:{...origins.get(c.id),
   revision:manifest.revision,sourceDigest:manifest.sourceDigest,configurationDigest:manifest.configurationDigest}});
  const row={...evidence,scenarioId:scenario.scenarioId,scenarioProfile:scenario.scenarioProfile,
   configurationDigest:manifest.configurationDigest,execution:{startedAt,finishedAt:new Date().toISOString()}};
  row.integral=assessIntegralJourney(row);atomicJSON(path,row);process.send?.({type:'row',index,...brief(row)});
 }
 if(integralSourceIdentity().digest!==manifest.sourceDigest)throw Error('clinical sources changed while worker executed; results cannot be combined');
}
function brief(row){return {scenarioId:row.scenarioId,outcome:row.outcome??'incomplete',complete:row.integral?.complete,
 integrity:row.integral?.integrityPassed,carePassed:row.integral?.carePassed,strict:row.passed,xp:row.progress?.xp??0,
 ...(['competent','competent-second-seed'].includes(row.scenarioProfile)&&!row.integral?.carePassed?{failures:row.failures,missing:row.readiness?.missing}:{})};}

/** Each child owns an independent runtime and row. Checkpoints/replays happen
 * inside every journey; resuming skips only verified complete row envelopes. */
export async function runIntegralClinicalMatrix({seed='atria55-native-v1',horizon=1440,concurrency=3,
 caseIds=null,profiles=null,outputRoot=resolve(root,'qa/integral-results'),summaryPath=resolve(root,'docs/qa/2026-10-28-clinical-integral-550.json'),onProgress=()=>{}}={}){
 if(!Number.isInteger(concurrency)||concurrency<1||concurrency>4)throw Error('concurrency must be 1–4');
 const identity=integralSourceIdentity(),loaded=await integralClinicalContent();
 const cases=caseIds?loaded.cases.filter(c=>caseIds.includes(c.id)):loaded.cases;
 if(caseIds?.some(id=>!cases.some(c=>c.id===id)))throw Error('unknown requested case');
 const manifest={...makeIntegralManifest(cases,{seed,sourceDigest:identity.digest,horizon,profiles}),
  revision:identity.revision,sourceFiles:identity.sources};
 const directory=resolve(outputRoot,manifest.configurationDigest),manifestPath=resolve(directory,'manifest.json');
 if(existsSync(manifestPath)&&readJSON(manifestPath).configurationDigest!==manifest.configurationDigest)throw Error('resume manifest mismatch');
 atomicJSON(manifestPath,manifest);
 const errors=[];
 await Promise.all(Array.from({length:Math.min(concurrency,manifest.scenarios.length)},(_,index)=>new Promise(resolveWorker=>{
  const child=fork(self,['--worker',manifestPath,String(index),String(concurrency)],{cwd:root,stdio:['ignore','inherit','inherit','ipc']});
  child.on('message',message=>onProgress(message));
  child.on('error',error=>{errors.push(error.message);resolveWorker();});
  child.on('exit',code=>{if(code!==0)errors.push('worker '+index+' exited '+code);resolveWorker();});
 })));
 const unchanged=integralSourceIdentity().digest===manifest.sourceDigest;
 const rows=manifest.scenarios.flatMap((scenario,index)=>existsSync(rowPath(directory,index))?[readJSON(rowPath(directory,index))]:[]);
 const counts=summarizeIntegralRows(rows);
 const report={schemaVersion:1,kind:'atria-native-clinical-integral-assessment',createdAt:new Date().toISOString(),
  revision:manifest.revision,sourceDigest:manifest.sourceDigest,configurationDigest:manifest.configurationDigest,
  sourceFiles:manifest.sourceFiles,seed,horizonRealSeconds:horizon,caseCount:cases.length,
  expectedExecutions:manifest.scenarios.length,scenarioProfiles:manifest.scenarioDefinitions,
  sourceUnchanged:unchanged,errors,rawEvidenceDirectory:relative(root,directory),...counts,
  evidenceComplete:unchanged&&!errors.length&&counts.completed===manifest.scenarios.length,
  runtimeIntegrityPassed:unchanged&&!errors.length&&counts.integrityPassed===manifest.scenarios.length,
  // This report intentionally never calls all adversarial care successful.
  evidenceRows:rows.map((row,index)=>({scenarioId:row.scenarioId,caseId:row.caseId,scenarioProfile:row.scenarioProfile,
   profile:row.profile,mode:row.mode,patientUid:row.patientUid,seed:row.seed,
   evidenceDigest:row.evidenceDigest??null,rawPath:relative(root,rowPath(directory,index)),...brief(row)}))};
 atomicJSON(summaryPath,report);return report;
}

if(process.argv[1]&&resolve(process.argv[1])===self){
 if(process.argv[2]==='--worker')await executeShard(resolve(process.argv[3]),Number(process.argv[4]),Number(process.argv[5]));
 else{
  const value=flag=>{const index=process.argv.indexOf(flag);return index<0?null:process.argv[index+1];};
  const csv=flag=>value(flag)?.split(',').filter(Boolean)??null;
  const report=await runIntegralClinicalMatrix({seed:value('--seed')??undefined,horizon:Number(value('--horizon')??1440),
   concurrency:Number(value('--concurrency')??3),caseIds:csv('--cases'),profiles:csv('--profiles'),
   outputRoot:value('--output-root')?resolve(value('--output-root')):undefined,
   summaryPath:value('--summary')?resolve(value('--summary')):undefined,
   onProgress:message=>console.log(JSON.stringify(message))});
  console.log('ATRIA_INTEGRAL_SUMMARY='+JSON.stringify({expected:report.expectedExecutions,completed:report.completed,
   integrityPassed:report.integrityPassed,outcomes:report.outcomes,strictCertificates:report.strictCertificates,
   carePassed:report.carePassed,sourceUnchanged:report.sourceUnchanged,errors:report.errors}));
  if(!report.evidenceComplete||!report.runtimeIntegrityPassed)process.exitCode=1;
 }
}
