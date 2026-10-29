import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {clinicalCertificationContent,runClinicalCaseScenario,deriveClinicalCertificationPlan} from '../v5/certify-clinical-cases.mjs';
import {INTEGRAL_SCENARIOS,assessIntegralJourney,makeIntegralManifest,summarizeIntegralRows} from '../v5/clinical-integral-matrix.mjs';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
import {cardiologyPack} from '../../src/v5/content/packs/cardiology-pack.js';

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
