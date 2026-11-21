import test from 'node:test';
import assert from 'node:assert/strict';
import {resp01V2Candidate} from './respiratory-v2-candidate.js';
import {clinicalCertificationContent,runClinicalCaseScenario}
 from '../../../../qa/v5/certify-clinical-cases.mjs';

test('RESP-01 V2: formal observation closes when genuinely indicated and prepared; no Vega reprimand',async()=>{
 const candidate=resp01V2Candidate;
 assert(candidate.clinicalPolicy.closure.destinations.includes('observacion'));
 const c=await clinicalCertificationContent([candidate]);
 const run=await runClinicalCaseScenario(candidate,{
  content:c,mode:'solo',profile:'competent',
  seed:'resp01:paired:v2:2026:competent:solo',
  preferredDestination:'observacion',
  horizon:240,recovery:true,traceEvery:10,
  source:{test:'legal-observation',staging:true}
 });
 assert.equal(run.passed,true,JSON.stringify(run.failures));
 assert.equal(run.final?.destination,'observacion','an authorized observation is a legal closure');
 assert.equal(run.final?.closed,true);
 assert.equal(run.final?.died,false);
 assert(run.final?.xp>0,'authorized observation earns experience, unlike unsafe observation');
 assert.equal(run.closureReceipt?.destination,'observacion');
 const bad=(run.commands||[]).flatMap(c=>c.clinical||[])
  .filter(c=>c.receipt?.disposition?.kind==='clinical.unsafe-observation');
 assert.equal(bad.length,0,'competent physician should not get Vega reprimands on a valid observation');
});
