import test from 'node:test';import assert from 'node:assert/strict';
import {stageClinicalCasePack} from './stage-clinical-case-pack.js';
const variation={ageRange:[18,60],firstNames:['Ana'],lastNames:['Paz'],personalities:['serena'],openings:['Dolor'],allergies:[],complications:[]};
const c={id:'RESP-04',clinicalExecutorId:'resp',closurePolicyId:'resp-close',studyPolicyId:'resp-study',examPolicyId:'resp-exam',variation};
const registries={executorIds:['resp'],closurePolicyIds:['resp-close'],studyPolicyIds:['resp-study'],examPolicyIds:['resp-exam'],drugIds:[],progressionIds:[],rescueIds:[],existingCaseIds:[]};
test('complete registries stage a detached snapshot, not a live case',()=>{const p={schemaVersion:1,cases:[c]};const result=stageClinicalCasePack(p,registries);assert.equal(result.status,'staged');p.cases[0].id='MUTATED';assert.equal(result.cases[0].id,'RESP-04');});
test('unknown executor prevents staging',()=>{const r=stageClinicalCasePack({schemaVersion:1,cases:[c]},{...registries,executorIds:['other']});assert.equal(r.status,'rejected');assert.deepEqual(r.cases,[]);assert.match(r.errors.join(' '),/unregistered clinicalExecutorId/);});
test('missing closure registry fails closed',()=>assert.throws(()=>stageClinicalCasePack({schemaVersion:1,cases:[c]},{...registries,closurePolicyIds:[]}),/missing clinical registry closurePolicyIds/));
test('missing registry is an integration error',()=>assert.throws(()=>stageClinicalCasePack({schemaVersion:1,cases:[c]},{}),/missing clinical registry/));
