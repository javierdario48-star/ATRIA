// Native independent admission, paired seeds, and shared eligibility review.
// Pure boundary checks below are unit fixtures, NOT clinical trajectories.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {clinicalContent} from '../../src/v5/server/content.js';
import {neur01V2Candidate as v2} from '../../src/v5/content/packs/neur01-v2-candidate.js';
import {generatePatientVariation} from '../../src/v5/content/patient-variation.js';
import {createClinicalGraphObserver} from '../../src/v5/clinical/clinical-graph-observer.js';
import {clinicalInterventionEligibility,clinicalInterventionCapability} from '../../src/v5/clinical/native-medication-eligibility.js';
import {runClinicalCaseScenario,treatmentCommand} from './certify-clinical-cases.mjs';
const mode=process.env.NEUR01_QA_MODE;
assert(['solo','apprentice','coop','competitive'].includes(mode));
const v1=clinicalContent.cases.find(c=>c.id===v2.id);
assert(v1&&!v1.clinicalGraph);
const {escalationDestinations,...closure}=v2.clinicalPolicy.closure;
assert.deepEqual(escalationDestinations,['uti']);
assert.deepEqual({...v2.clinicalPolicy,closure},v1.clinicalPolicy,'only explicit ICU escalation indication may differ from V1');
const staged={...clinicalContent,cases:clinicalContent.cases.map(c=>c.id===v2.id?v2:c)};
assert.equal(new Set(staged.cases.map(c=>c.id)).size,55);
const out='qa/v5-neur01-v2-'+mode;await mkdir(out,{recursive:true});
const names=new Set(),personalities=new Set(),backgrounds=new Set();let draws=0;
for(let i=0;i<256;i++){
 const guardSeed='neur01-paired-'+mode+'-'+i,seed=guardSeed+':patient:'+v2.id,context={guardSeed,patientIndex:0};
 const a=generatePatientVariation(v1.variation,seed,context),z=generatePatientVariation(v2.variation,seed,context);
 for(const key of ['name','age','personality','opening','behavior','allergies','backgroundHistory'])
  assert.deepEqual(z[key],a[key],'variation drift '+key);
 names.add(z.name);personalities.add(z.personality);backgrounds.add(z.backgroundHistory?.id);
 if(z.complicationCandidates.length)draws++;
}
assert(personalities.size===7&&names.size>=20&&backgrounds.size>=2);
assert(draws>5&&draws<80,'seeded game draw not plausible');
const cases=[
 {name:'early-ward',profile:'competent',destination:'sala'},
 {name:'stable-icu-review',profile:'competent',destination:'uti',stableRejection:true},
 {name:'airway-rescue',profile:'complication-rescue',destination:'uti'},
 {name:'slow',profile:'slow',destination:'sala'},
 {name:'wrong-medication',profile:'wrong-medication',destination:'sala'},
 {name:'abandon',profile:'abandon',destination:'sala'},
 {name:'paired-v1',profile:'competent',destination:'sala',legacy:true}
];
const findings=[],results=[];
for(const scenario of cases){
 const c=scenario.legacy?v1:v2,content=scenario.legacy?clinicalContent:staged,graph=scenario.legacy?null:createClinicalGraphObserver(v2.clinicalGraph);
 const seed='neur01-admission:'+mode+':'+(scenario.legacy?'early-ward':scenario.name);
 try{
  const run=await runClinicalCaseScenario(c,{content,mode,profile:scenario.profile,seed,horizon:720,recovery:true,
   preferredDestination:scenario.destination,wrongMedicationCommand:treatmentCommand(c,content,'furosemide'),
   onObservation:graph?s=>graph.observe(s):null,source:{kind:'neur01-isolated-admission',scenario:scenario.name}});
  await writeFile(out+'/'+scenario.name+'.json',JSON.stringify({...run,graphCoverage:graph?.read()},null,2)+'\n');
  assert(run.integrityChecks&&Object.values(run.integrityChecks).every(v=>v!==false),JSON.stringify(run.failures));
  assert.equal(run.patientIdentity?.identityUnchanged,true);assert.equal(run.patientIdentity?.restoredIdentityUnchanged,true);
  if(scenario.stableRejection){
   if(run.outcome==='accepted-destination'){
    assert(run.complicationObservations?.length,'stable ICU closure without manifested complication');
    assert.equal(run.closureReceipt?.destination,'uti');assert.equal(run.xpReceipts?.length,1);
   }else{
    assert.equal(run.xpReceipts?.length,0);
    assert(run.consultations.some(x=>x.id==='uti'&&x.status==='rejected'),'receiver refusal was not actually observed');
   }
  }else if(['competent','slow','complication-rescue'].includes(scenario.profile)){
   assert.equal(run.passed,true,JSON.stringify(run.failures));assert.equal(run.outcome,'accepted-destination');
   assert.equal(run.closureReceipt?.destination,scenario.destination);assert.equal(run.xpReceipts?.length,1);
   const lysis=run.administrations.find(x=>x.id==='alteplase_stroke'&&x.sourceEventId&&x.dose?.amount>0);
   assert(lysis,'no actual thrombolytic receipt');
   assert(lysis.administeredAtNativeMinute+80<=270,'competent bot outside clinical window');
   for(const id of ['g_neur01_ct','g_neur01_glucose']){
    const study=run.studies.find(x=>x.id===id&&x.status==='done'&&x.patientUid===run.patientUid&&x.sourceEventId&&x.result);
    assert(study,'required imaging/glucose evidence absent');
    assert(study.readyAtMinute<=run.final.atRealSecond);
   }
   assert(!run.administrations.some(x=>['aspirin','clopidogrel','heparin_therapeutic','enoxaparin'].includes(x.id)),
    'prevention plan cannot administer early antithrombotics');
   assert(run.consultations.some(x=>x.id===(scenario.destination==='sala'?'neurology':'uti')&&x.accepted&&x.status==='done'));
   if(scenario.profile==='complication-rescue'){
    assert(run.complicationObservations.length,'selected airway episode must actually manifest');
    assert.equal(run.integrityChecks.complicationRescue,true);
    assert(graph.read().covered.includes('rescue'),'native rescue not observed');
   }
  }else{
   assert.notEqual(run.outcome,'accepted-destination');assert.equal(run.xpReceipts?.length,0);
   if(scenario.profile==='abandon')assert.equal(run.administrations.length,0);
   else assert(run.administrations.some(x=>x.id==='furosemide'&&x.sourceEventId));
  }
  results.push({scenario:scenario.name,passed:true,outcome:run.outcome,identity:run.patientIdentity.initial,edges:graph?.read().covered});
 }catch(error){findings.push({scenario:scenario.name,error:String(error.stack||error)});results.push({scenario:scenario.name,passed:false});}
 console.log('NEUR01_PATH '+JSON.stringify({scenario:scenario.name,passed:results.at(-1).passed,error:findings.find(x=>x.scenario===scenario.name)?.error}));
}
// Same pure shared eligibility used by clinical review: exact boundary,
// missing data, other-patient evidence, pressure and contraindication.
// Do not interpret these constructed states as delivered treatment.
const base={uid:'fixture',caseId:v2.id,liveVitals:{sys:185,dia:110,hr:92,rr:20,spo2:96},
 neurology:{nihss:8},intentHistory:['onset','meds','risk'].map(id=>({id,patientUid:'fixture'})),
 orders:v2.studies.filter(s=>['g_neur01_glucose','g_neur01_ct'].includes(s.id)).map(s=>({...s,status:'done',patientUid:'fixture',sourceEventId:'fixture-'+s.id,readyAtMinute:1}))};
const check=(p,minute)=>clinicalInterventionEligibility(p,v2,'alteplase_stroke',{nativeMinute:minute,clinicalMinute:1000});
assert.equal(check(base,190),null);assert.equal(check(base,190.01)?.reason,'clinical-onset-window-exceeded');
assert.equal(check({...base,liveVitals:{...base.liveVitals,sys:186}},10)?.reason,'clinical-blood-pressure-limit');
assert.equal(check({...base,liveVitals:{...base.liveVitals,dia:111}},10)?.reason,'clinical-blood-pressure-limit');
assert.equal(check({...base,clinicalTraits:['therapeuticAnticoagulation']},10)?.reason,'clinical-contraindication');
assert.equal(check({...base,clinicalTraits:['intracranialBleed']},10)?.reason,'clinical-contraindication');
assert.equal(check({...base,orders:base.orders.slice(0,1)},10)?.reason,'clinical-evidence-required');
assert.equal(check({...base,orders:base.orders.map(o=>({...o,patientUid:'other'}))},10)?.reason,'clinical-evidence-required');
assert.equal(check({...base,intentHistory:[]},10)?.reason,'clinical-evidence-required');
assert.equal(check({...base,neurology:{nihss:0}},10)?.reason,'clinical-contraindication');
assert.equal(clinicalInterventionCapability({...base,clinicalTraits:['intracranialBleed']},v2,'alteplase_stroke',{nativeMinute:191}),null,
 'clinical appropriateness is not a technical blocker');
const report={sourceSha:process.env.GITHUB_SHA||null,mode,seedAudit:{count:256,names:names.size,personalities:personalities.size,backgrounds:backgrounds.size,draws},
 results,findings,passed:findings.length===0&&results.every(x=>x.passed),boundaryChecks:'pure shared advisory unit fixtures; not native trajectory count'};
await writeFile(out+'/summary.json',JSON.stringify(report,null,2)+'\n');
console.log('NEUR01_ADMISSION '+JSON.stringify({mode,passed:report.passed,scenarios:results.length,seedAudit:report.seedAudit,findings}));
if(!report.passed)process.exitCode=1;
