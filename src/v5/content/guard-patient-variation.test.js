import test from 'node:test';
import assert from 'node:assert/strict';
import {materializeGuardPatient} from './guard-patient-variation.js';
const profile={ageRange:[18,65],firstNames:['Ana','Luz'],lastNames:['Paz','Ríos'],personalities:['serena','ansiosa'],openings:['Me falta el aire'],allergies:[{id:'pen',drugId:'ampicillin',probability:1,historyDisclosure:'Tuve urticaria'}],complications:[{id:'fatigue',probability:1,rationale:'Agotamiento ventilatorio',progressionId:'fatigue',rescueId:'ventilation'}]};
const patient={uid:'patient-42',caseId:'RESP-04'};
test('reproduces identity and retains existing allergies',()=>{const p=materializeGuardPatient({...patient,allergies:['ceftriaxone']},{id:'RESP-04',variation:profile});const again=materializeGuardPatient({...patient,allergies:['ceftriaxone']},{id:'RESP-04',variation:profile});assert.deepEqual(p,again);assert.deepEqual(p.allergies.sort(),['ampicillin','ceftriaxone']);});
test('old cases and checkpoints are untouched',()=>{assert.strictEqual(materializeGuardPatient(patient,{id:'RESP-04'}),patient);assert.strictEqual(materializeGuardPatient(patient,{id:'RESP-04',variation:profile},{schemaVersion:1}),patient);});
test('complication is metadata, not a physiological event',()=>{const p=materializeGuardPatient(patient,{id:'RESP-04',variation:profile});assert.equal(p.variation.complicationCandidates[0].progressionId,'fatigue');assert.equal(p.vitals,undefined);});
test('case mismatch is rejected',()=>assert.throws(()=>materializeGuardPatient(patient,{id:'RESP-05',variation:profile}),/mismatch/));
