import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWorld} from '../app/world.js';
import {createGuardSession} from './guard-session.js';

const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')};

/**
 * Read-only baseline for the authored catalog. Every case must be inspectable
 * through the SAME session readiness path used by Vega. Findings are diagnostic:
 * a flagged NPO gate does not establish clinical necessity.
 */
test('every authored case exposes an immutable closure audit through its live guard',async t=>{
 assert(content.cases.length>0,'clinical catalog must not be empty');
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
