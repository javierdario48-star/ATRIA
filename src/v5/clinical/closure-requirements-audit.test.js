import test from 'node:test';
import assert from 'node:assert/strict';
import {auditClosureRequirements} from './clinical-hint-requirements.js';

test('audit reports blockers with no Vega requirement without changing closure verdict',()=>{
 const verdict={ready:false,missing:['Clinical condition remains unresolved']};
 const original=structuredClone(verdict);
 const result=auditClosureRequirements(verdict,[]);
 assert.deepEqual(result.issues,[{code:'unrepresented-blockers',count:1}]);
 assert.deepEqual(verdict,original);
});

test('audit identifies requirements without actionable alternatives',()=>{
 const result=auditClosureRequirements({ready:false,missing:['Treatment required']},[
  {type:'treatment',anyOf:[]},{type:'study',anyOf:[[]]},
  {type:'closure'},{type:'vitals'},{}]);
 assert.deepEqual(result.issues.map(x=>x.code),[
  'missing-action-alternatives','missing-action-alternatives',
  'missing-destination','untyped-gate']);
});

test('NPO blocking requirement is flagged for clinical review, not silently removed',()=>{
 const requirements=[{type:'treatment',anyOf:[['npo'],['fluid']]}];
 const before=structuredClone(requirements);
 const result=auditClosureRequirements({ready:false,missing:['Treatment required']},requirements);
 assert.deepEqual(result.issues,[{code:'npo-necessity-review',index:0,unavoidable:false}]);
 assert.deepEqual(requirements,before);
});

test('valid alternative actions are not reported as absent',()=>{
 const result=auditClosureRequirements({ready:false,missing:['Treat']},[
  {type:'treatment',anyOf:[['ceftriaxone'],['ampicillin','gentamicin']]},
  {type:'closure',destination:'uti'}]);
 assert.deepEqual(result.issues,[]);
});

test('NPO is unavoidable only when every valid treatment alternative contains it',()=>{
 const result=auditClosureRequirements({ready:false,missing:['Treatment required']},[
  {type:'treatment',anyOf:[['npo','fluid'],['npo','antibiotic']]},
  {type:'treatment',anyOf:[['npo'],['antibiotic']]}]);
 assert.deepEqual(result.issues,[
  {code:'npo-necessity-review',index:0,unavoidable:true},
  {code:'npo-necessity-review',index:1,unavoidable:false}]);
});

test('malformed NPO alternatives do not crash the audit',()=>{
 const result=auditClosureRequirements({ready:false,missing:['Treatment required']},[
  {type:'treatment',anyOf:[null,['npo']]},
  {type:'treatment',anyOf:'npo'}]);
 assert.deepEqual(result.issues,[
  {code:'npo-necessity-review',index:0,unavoidable:true},
  {code:'missing-action-alternatives',index:1,type:'treatment'}]);
});
