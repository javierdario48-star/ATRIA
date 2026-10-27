import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVariation,generatePatientVariation,discloseAllergies} from './patient-variation.js';
const v={ageRange:[18,65],firstNames:['Ana','Luz'],lastNames:['Paz','Ríos'],personalities:['ansiosa','serena'],openings:['Me cuesta respirar','Tengo falta de aire'],allergies:[{id:'a',drugId:'ampicillin',probability:1,historyDisclosure:'Me dio urticaria'}],complications:[{id:'fatigue',probability:1,rationale:'Agotamiento respiratorio posible',progressionId:'asthma-fatigue',rescueId:'ventilation'}]};
test('same seed reproduces patient',()=>assert.deepEqual(generatePatientVariation(v,'guard:1'),generatePatientVariation(v,'guard:1')));
test('variations change across seeds',()=>assert.ok(new Set(Array.from({length:30},(_,i)=>generatePatientVariation(v,i).name)).size>1));
test('allergies are only disclosed on history',()=>{const p=generatePatientVariation(v,1);assert.equal(discloseAllergies(p,false).length,0);assert.equal(discloseAllergies(p,true)[0].drugId,'ampicillin');});
test('complication is candidate, not automatic vital change',()=>{const p=generatePatientVariation(v,2);assert.equal(p.complicationCandidates.length,1);assert.equal(p.liveVitals,undefined);});
test('invalid range and missing rescue rejected',()=>{assert.ok(validateVariation({...v,ageRange:[65,18]}).length);assert.ok(validateVariation({...v,complications:[{id:'x',probability:1}]}).length);});
