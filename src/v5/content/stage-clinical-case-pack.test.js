import test from 'node:test';import assert from 'node:assert/strict';
import {stageClinicalCasePack} from './stage-clinical-case-pack.js';
const variation={ageRange:[18,60],firstNames:['Ana'],lastNames:['Paz'],personalities:['serena'],openings:['Dolor'],allergies:[],complications:[]};
const c={id:'RESP-04',clinicalExecutorId:'resp',closurePolicyId:'resp-close',studyPolicyId:'resp-study',examPolicyId:'resp-exam',variation};
const registries={executorIds:['resp'],closurePolicyIds:['resp-close'],studyPolicyIds:['resp-study'],examPolicyIds:['resp-exam'],drugIds:[],progressionIds:[],rescueIds:[],existingCaseIds:[]};
test('complete registries stage a detached snapshot, not a live case',()=>{const p={schemaVersion:1,cases:[c]};const result=stageClinicalCasePack(p,registries);assert.equal(result.status,'staged');p.cases[0].id='MUTATED';assert.equal(result.cases[0].id,'RESP-04');});
test('unknown executor prevents staging',()=>{const r=stageClinicalCasePack({schemaVersion:1,cases:[c]},{...registries,executorIds:['other']});assert.equal(r.status,'rejected');assert.deepEqual(r.cases,[]);assert.match(r.errors.join(' '),/unregistered clinicalExecutorId/);});
test('missing closure registry fails closed',()=>assert.throws(()=>stageClinicalCasePack({schemaVersion:1,cases:[c]},{...registries,closurePolicyIds:[]}),/missing clinical registry closurePolicyIds/));
test('missing registry is an integration error',()=>assert.throws(()=>stageClinicalCasePack({schemaVersion:1,cases:[c]},{}),/missing clinical registry/));

test('strict staging requires playable content and does not mutate registry maps', async () => {
 const {casePack, playableCase, executableRegistries} = await import('./clinical-case-pack.test-helpers.js');
 const registries = executableRegistries();
 const pack = casePack();
 const staged = stageClinicalCasePack(pack, registries, {strict: true});
 assert.equal(staged.status, 'staged');
 assert.equal(staged.cases[0].id, 'RESP-101');
 assert.equal(registries.executors.size, 1);
 pack.cases[0].chief = 'Changed after stage';
 assert.equal(staged.cases[0].chief, 'Disnea y fiebre.');
 assert.throws(() => { staged.cases.push(playableCase('RESP-102')); }, TypeError);
 const minimal = {id: 'RESP-999', clinicalExecutorId: 'acute-policy-v1', closurePolicyId: 'policy-closure-v1', studyPolicyId: 'case-studies-v1', examPolicyId: 'case-exam-v1', variation: playableCase().variation};
 assert.equal(stageClinicalCasePack(casePack([minimal]), registries, {strict: true}).status, 'rejected');
});
