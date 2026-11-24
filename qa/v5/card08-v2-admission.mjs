// Native, isolated surgical-receiver admission gate. No clinical state injection.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {clinicalContent} from '../../src/v5/server/content.js';
import {generatePatientVariation} from '../../src/v5/content/patient-variation.js';
import {createClinicalGraphObserver} from '../../src/v5/clinical/clinical-graph-observer.js';
import {card08V2Candidate as v2} from '../../src/v5/content/packs/card08-v2-candidate.js';
import {runClinicalCaseScenario} from './certify-clinical-cases.mjs';
const mode=process.env.CARD08_QA_MODE;
assert(['solo','apprentice','coop','competitive'].includes(mode));
const v1=clinicalContent.cases.find(c=>c.id===v2.id);
assert(v1&&!v1.clinicalGraph);
const staged={...clinicalContent,cases:clinicalContent.cases.map(c=>c.id===v2.id?v2:c)};
assert.equal(staged.cases.length,55);
assert.equal(new Set(staged.cases.map(c=>c.id)).size,55);
const out='qa/v5-card08-v2-'+mode;await mkdir(out,{recursive:true});
const results=[],failures=[];
const names=new Set(),personalities=new Set(),backgrounds=new Set();
let draws=0;
for(let i=0;i<256;i++){
 const guardSeed='card08-paired-'+mode+'-'+i,seed=guardSeed+':patient:'+v2.id;
 const context={guardSeed,patientIndex:0};
 const previous=generatePatientVariation(v1.variation,seed,context),current=generatePatientVariation(v2.variation,seed,context);
 for(const key of ['name','age','personality','opening','behavior','allergies','backgroundHistory'])
  assert.deepEqual(current[key],previous[key],'paired variation drift '+key);
 names.add(current.name);personalities.add(current.personality);backgrounds.add(current.backgroundHistory?.id);
 if(current.complicationCandidates.some(x=>x.id==='card08-aortic-leak'))draws++;
}
assert(personalities.size===7&&names.size>=20&&backgrounds.size>=2);
assert(draws/256>.05&&draws/256<.35,'seeded game draw implausible');
const definition=v2.clinicalPolicy.complications.find(x=>x.id==='card08-aortic-leak');
const alternatives=v2.clinicalPolicy.closure.study.flat();
const groups=v2.clinicalPolicy.closure.treatment;
const scenarios=[
 ...groups.flatMap((group,index)=>alternatives.map(study=>({name:'alternative-'+index+'-'+study,profile:'competent',index,study,group}))),
 {name:'manifested-receiver',profile:'complication-rescue',index:0,study:alternatives[0],group:groups[0]},
 {name:'paired-v1',profile:'competent',index:0,study:alternatives[0],group:groups[0],legacy:true}
];
for(const s of scenarios){
 const c=s.legacy?v1:v2,content=s.legacy?clinicalContent:staged;
 const observer=s.legacy?null:createClinicalGraphObserver(v2.clinicalGraph);
 const seed='card08-admission:'+mode+':'+(s.legacy?'alternative-0-'+alternatives[0]:s.name);
 try{
  const run=await runClinicalCaseScenario(c,{content,mode,profile:s.profile,seed,horizon:720,recovery:true,
   preferredDestination:'quirofano',preferredTreatmentGroupIndex:s.index,preferredStudyId:s.study,
   onObservation:observer?state=>observer.observe(state):null,source:{kind:'card08-isolated-admission',scenario:s.name}});
  await writeFile(out+'/'+s.name+'.json',JSON.stringify({...run,graphCoverage:observer?.read()},null,2)+'\n');
  assert.equal(run.outcome,'accepted-destination',JSON.stringify(run.failures));
  assert.equal(run.passed,true,JSON.stringify(run.failures));
  assert.equal(run.closureReceipt?.destination,'quirofano');
  assert.equal(run.xpReceipts?.length,1);
  assert.equal(run.patientIdentity?.identityUnchanged,true);
  assert.equal(run.patientIdentity?.restoredIdentityUnchanged,true);
  assert(run.studies.some(x=>x.id===s.study&&x.status==='done'&&x.sourceEventId&&x.result));
  assert(!run.studies.some(x=>alternatives.includes(x.id)&&x.id!==s.study),'unselected alternative ordered');
  assert(s.group.every(id=>run.administrations.some(x=>x.id===id&&x.sourceEventId&&x.dose?.amount>0)));
  assert(!run.administrations.some(x=>x.id==='aortic_surgery'));
  assert(!run.treatments.some(x=>x.id==='aortic_surgery'));
  assert(run.consultations.some(x=>x.id==='cardiovascular'&&x.status==='done'&&x.accepted===true&&x.patientUid===run.patientUid));
  if(s.profile==='complication-rescue'){
   assert(run.complicationObservations.some(x=>x.id===definition.id),'manifested aortic episode not observed');
   assert.equal(run.integrityChecks.complicationRescue,true,'receiver continuation must be proven, not presumed');
   assert(observer.read().covered.includes('deterioration'));
   assert(!observer.read().covered.includes('rescue'),'receiver handoff cannot count as performed surgical rescue');
  }
  if(observer)assert(observer.read().covered.includes('close-surgery'));
  results.push({scenario:s.name,passed:true,outcome:run.outcome,graph:observer?.read().covered,identity:run.patientIdentity.initial});
 }catch(error){failures.push({scenario:s.name,error:String(error.stack||error)});results.push({scenario:s.name,passed:false});}
 console.log('CARD08_PATH '+JSON.stringify({scenario:s.name,passed:results.at(-1).passed,error:failures.find(x=>x.scenario===s.name)?.error}));
}
const v1row=results.find(x=>x.scenario==='paired-v1'),v2row=results.find(x=>x.scenario==='alternative-0-'+alternatives[0]);
if(v1row?.passed&&v2row?.passed){
 for(const key of ['name','age','personality','opening','allergies','backgroundHistory']){
  const a=v1row.identity?.variation?.[key],b=v2row.identity?.variation?.[key];
  if(JSON.stringify(a)!==JSON.stringify(b))failures.push({scenario:'paired-identity',error:'identity differs '+key});
 }
}
const report={mode,sourceSha:process.env.GITHUB_SHA||'local',seedAudit:{count:256,names:names.size,personalities:personalities.size,backgrounds:backgrounds.size,draws},
 results,failures,passed:failures.length===0&&results.every(x=>x.passed)};
await writeFile(out+'/summary.json',JSON.stringify(report,null,2)+'\n');
console.log('CARD08_ADMISSION '+JSON.stringify({mode,seedAudit:report.seedAudit,passed:report.passed,scenarios:results.length,failures}));
if(!report.passed)process.exitCode=1;
