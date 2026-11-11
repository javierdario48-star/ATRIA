import test from 'node:test';
import assert from 'node:assert/strict';
import {createWorld} from '../app/world.js';
import {clinicalContent as content} from '../server/content.js';
import {createGuardSession} from './guard-session.js';
import {clinicalHintCoverage} from './clinical-hints.js';
import {clinicalClosureRule} from './clinical-hint-requirements.js';

/**
 * Read-only baseline for the authored catalog. Every case must be inspectable
 * through the SAME session readiness path used by Vega. Findings are diagnostic:
 * a flagged NPO gate does not establish clinical necessity.
 */
test('all 55 playable cases expose an immutable closure audit through their live guards',async t=>{
 assert.equal(content.cases.length,55,'include both the historical catalog and the certified specialty packs');
 const seen=new Set();
 for(const caseData of content.cases){
  await t.test(caseData.id,()=>{
   assert(!seen.has(caseData.id),'duplicate clinical case ID');
   seen.add(caseData.id);
   const world=createWorld(content,{name:'Closure Audit QA',scrubColor:'navy'});
   let session;
   try{
    world.enterLobby();
    world.enterGuard({mode:'solo',caseId:caseData.id});
    const patient=world.snapshot().patients[0];
    assert(patient?.uid,'case must create a patient');
    session=createGuardSession({
     roomId:'AUDIT-'+caseData.id,mode:'solo',actorId:'audit-doctor',
     actorName:'Audit Doctor',patient,content,
     resolveContext:()=>({patientUid:patient.uid})
    });
    const before=session.read();
    const audit=session.auditClosureRequirements();
    assert.equal(audit.caseId,caseData.id);
    assert.equal(typeof audit.ready,'boolean');
    assert(Array.isArray(audit.missing));
    // read().closure can use a different destination from Vega's hintDestination.
    // Do not compare two independent destination verdicts as if identical.
    assert(Array.isArray(audit.issues));
    for(const issue of audit.issues){
     assert.equal(typeof issue.code,'string');
     if(issue.code==='npo-necessity-review')
      assert.equal(typeof issue.unavoidable,'boolean');
    }
    const hint=session.clinicalHint();
    assert(hint===null||typeof hint==='object','Vega must return a hint descriptor or null');
    const destinations=clinicalClosureRule(caseData)?.destinations||[];
    for(const destination of destinations){
     const byDestination=session.auditClosureRequirements(destination);
     assert.equal(byDestination.caseId,caseData.id);
     assert.equal(byDestination.destination,destination);
     assert.equal(typeof byDestination.ready,'boolean');
     assert(Array.isArray(byDestination.missing));
     assert(Array.isArray(byDestination.issues));
     t.diagnostic(JSON.stringify({kind:'destination-audit',caseId:caseData.id,
      destination,ready:byDestination.ready,missing:byDestination.missing,
      issues:byDestination.issues}));
    }
    if(destinations.length){
     assert.throws(()=>session.auditClosureRequirements('__invalid__'),
      /unsupported audit destination/);
    }
    assert.deepEqual(session.read(),before,'auditing and Vega must not mutate clinical state');
    // Report every initial state for offline review, not a clinical pass/fail.
    t.diagnostic(JSON.stringify({
     caseId:caseData.id,destination:audit.destination,ready:audit.ready,
     missing:audit.missing,issues:audit.issues,
     hint:hint?{requirement:hint.requirement,action:hint.action?{
      kind:hint.action.kind,id:hint.action.id}:null,error:hint.error||null}:null
    }));
   }finally{
    session?.dispose();
    world.enterLobby();
   }
  });
 }
 assert.equal(seen.size,content.cases.length);
});

test('catalog action descriptors use existing Vega coverage registry',t=>{
 const coverage=clinicalHintCoverage(content);
 assert.equal(coverage.cases.length,content.cases.length);
 assert.deepEqual(coverage.errors,[]);
 t.diagnostic(JSON.stringify({kind:'vega-action-coverage',
  caseCount:coverage.cases.length,missingActionDescriptors:coverage.errors}));
});
