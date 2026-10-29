import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {clinicalCertificationContent,runClinicalCaseScenario,deriveClinicalCertificationPlan} from '../v5/certify-clinical-cases.mjs';
import {INTEGRAL_SCENARIOS,assessIntegralJourney,makeIntegralManifest,summarizeIntegralRows} from '../v5/clinical-integral-matrix.mjs';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
import {cardiologyPack} from '../../src/v5/content/packs/cardiology-pack.js';
test('a submillisecond horizon advances a real native frame instead of spinning on a rounded zero deadline',()=>{
 const script=`import {clinicalCertificationContent,runClinicalCaseScenario} from './qa/v5/certify-clinical-cases.mjs';
 const content=await clinicalCertificationContent(),c=content.cases.find(x=>x.id==='APP-001');
 const row=await runClinicalCaseScenario(c,{content,profile:'abandon',horizon:.0001});
 console.log(JSON.stringify(row.final));`;
 const final=JSON.parse(execFileSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8',timeout:4000}));
 assert(final.atRealSecond>0&&final.atRealSecond<=1/60+.0001);
 assert(Math.abs(final.atNativeMinute-final.atRealSecond*.12)<1e-6);
});

test('integral matrix schedules ten distinct journeys per authored case',()=>{
 const cases=[{id:'A'},{id:'B'}],manifest=makeIntegralManifest(cases,{seed:'matrix',sourceDigest:'source',horizon:60});
 assert.equal(INTEGRAL_SCENARIOS.length,10);assert.equal(manifest.scenarios.length,20);
 assert.equal(new Set(manifest.scenarios.map(x=>x.scenarioId)).size,20);
 assert.equal(new Set(manifest.scenarios.map(x=>x.seed)).size,20);
 assert.equal(manifest.scenarios.filter(x=>x.profile==='competent').length,4);
 assert(manifest.scenarios.every(x=>x.recovery===true));
 assert.deepEqual(new Set(manifest.scenarios.map(x=>x.mode)),new Set(['solo','apprentice','coop','competitive']));
 assert.notEqual(makeIntegralManifest(cases,{seed:'matrix',sourceDigest:'changed',horizon:60}).configurationDigest,manifest.configurationDigest);
});
test('competent legacy care requests its native handoff after observation without policy-only receipt gates',async()=>{
 const content=await clinicalCertificationContent(),c=content.cases.find(x=>x.id==='CIRR-001');
 const row=await runClinicalCaseScenario(c,{content,seed:'legacy-native-handoff',horizon:180,recovery:true});
 assert(row.closureReceipt?.closed,JSON.stringify({missing:row.readiness?.missing,failures:row.failures}));
 assert.equal(row.xpReceipts.length,1);
 assert.equal(row.checks.treatment,true,'native CIRR completions must expose their real typed receipts');
});
test('a complication requiring receiver surgery allows urgent transfer without claiming postoperative recovery',async()=>{
 const c=cardiologyPack.cases.find(x=>x.id==='CARD-09');
 const row=await runClinicalCaseScenario(c,{seed:'receiver-complication-contract',profile:'complication-rescue',mode:'coop',horizon:400,recovery:true});
 assert(row.complications.some(x=>x.id==='card09-valvular-edema'));
 assert.equal(row.closureReceipt?.destination,'quirofano',JSON.stringify(row.readiness?.missing));
 assert(!row.treatments.some(x=>x.id==='valve_surgery'));
 assert(row.complications.every(x=>x.status!=='recovered'),'handoff is not surgery or postoperative recovery');
});
test('competent legacy workup includes the disease-specific authored bedside questions',()=>{
 const c={id:'HDA-001',vitals:{bp:'110/70',spo2:96},requiredHistory:[],intents:[],keyInterventions:[]};
 const plan=deriveClinicalCertificationPlan(c,{});
 assert(plan.history.some(x=>x.text==='¿Toma ibuprofeno?'));
 assert(plan.history.some(x=>x.text==='¿Tiene deposiciones negras?'));
});
test('native oral lactulose is confirmed by the same physical nurse owner as other administered medicines',async()=>{
 const content=await clinicalCertificationContent(),c=content.cases.find(x=>x.id==='ENCEF-001');
 const row=await runClinicalCaseScenario(c,{content,seed:'native-oral-nurse',horizon:180,recovery:true});
 const dose=row.administrations.find(x=>x.id==='lactulose');assert(dose,'an oral dose must really complete');
 assert(row.nursing.tasks.some(task=>task.eventId===dose.sourceEventId&&task.stage==='confirmed'&&task.nurseId));
 assert.equal(row.integrityChecks.nursing,true);
});
test('an unsafe bot strategy administers its declared command through ordinary nursing rather than injected exposure',async()=>{
 const content=await clinicalCertificationContent(),c=content.cases.find(x=>x.id==='APP-001');
 const row=await runClinicalCaseScenario(c,{content,seed:'declared-unsafe-command',profile:'wrong-medication',
  wrongMedicationCommand:'Enfermera morfina 4 mg',horizon:20,recovery:true});
 assert(row.administrations.some(x=>x.id==='morphine'&&x.sourceEventId&&x.dose.amount===4));
 assert(!row.administrations.some(x=>x.id==='furosemide'));
});

test('an actual native unchanged APP journey preserves strict failure and reports observed invariance separately',async()=>{
 const content=await clinicalCertificationContent(),c=content.cases.find(x=>x.id==='APP-001');
 const row=await runClinicalCaseScenario(c,{content,seed:'integral-native-app',horizon:180,recovery:true});
 assert.equal(row.passed,false);assert.equal(row.checks.trajectory,false);
 const assessment=assessIntegralJourney(row);
 assert.equal(assessment.complete,true,JSON.stringify(assessment));
 assert.equal(assessment.integrityPassed,true,JSON.stringify(assessment));
 assert.equal(assessment.trajectory,'native-invariant');
 assert.equal(assessment.acceptedDestination,true);assert.equal(row.passed,false);
 assert.equal(row.patientIdentity.patientUid,row.patientUid);
 assert.equal(row.source.caseId,'APP-001');assert.match(row.source.caseDefinitionDigest,/^[a-f0-9]{64}$/);
 assert.equal(row.patientIdentity.restoredIdentityUnchanged,true);
});

test('native abandonment is a completed observed failed-care journey with zero manufactured rewards',async()=>{
 const content=await clinicalCertificationContent(),c=content.cases.find(x=>x.id==='APP-001');
 const row=await runClinicalCaseScenario(c,{content,profile:'abandon',seed:'integral-abandon-app',horizon:20,recovery:true});
 const assessment=assessIntegralJourney(row);
 assert.equal(assessment.complete,true,JSON.stringify(assessment));
 assert.equal(assessment.integrityPassed,true,JSON.stringify(assessment));
 assert.equal(assessment.acceptedDestination,false);assert.equal(assessment.carePassed,false);
 assert.equal(assessment.outcome,'alive-unclosed');assert.equal(row.progress.xp,0);
 const summary=summarizeIntegralRows([{scenarioId:'abandon-A',...row,integral:assessment}]);
 assert.equal(summary.completed,1);assert.equal(summary.acceptedDestinations,0);
 assert.equal(summary.strictCertificates,0);assert.equal(summary.outcomes['alive-unclosed'],1);
 assert.equal(summary.nativeInvariance,1);
});

test('incomplete rows cannot count as actual simulations',()=>{
 const assessment=assessIntegralJourney({caseId:'APP-001',profile:'competent',commands:[],passed:true});
 assert.equal(assessment.complete,false);assert.equal(assessment.integrityPassed,false);
 assert.equal(summarizeIntegralRows([{integral:assessment}]).completed,0);
});

test('receiver strategies use authored destination treatment alternatives without inventing definitive procedures',()=>{
 for(const [id,removed,destination,mandatory] of [['CARD-07','pericardial_drainage','uti','iv'],
  ['RESP-07','chest_drainage','uti','needle_decompression'],['RESP-08','chest_drainage','procedimiento','amoxiclav']]){
  const c=[...respiratoryPack.cases,...cardiologyPack.cases].find(x=>x.id===id),plan=deriveClinicalCertificationPlan(c,{});
  assert.equal(plan.destination,destination,id);assert(!plan.treatmentIds.includes(removed),id);
  assert(plan.treatmentIds.includes(mandatory),id);
 }
});
