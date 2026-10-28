import test from 'node:test';
import assert from 'node:assert/strict';
import {validateVariation,generatePatientVariation,discloseAllergies} from './patient-variation.js';
import * as variation from './patient-variation.js';
const v={ageRange:[18,65],firstNames:['Ana','Luz'],lastNames:['Paz','Ríos'],personalities:['ansiosa','serena'],openings:['Me cuesta respirar','Tengo falta de aire'],allergies:[{id:'a',drugId:'ampicillin',probability:1,historyDisclosure:'Me dio urticaria'}],complications:[{id:'fatigue',probability:1,rationale:'Agotamiento respiratorio posible',progressionId:'asthma-fatigue',rescueId:'ventilation'}]};
test('same seed reproduces patient',()=>assert.deepEqual(generatePatientVariation(v,'guard:1'),generatePatientVariation(v,'guard:1')));
test('variations change across seeds',()=>assert.ok(new Set(Array.from({length:30},(_,i)=>generatePatientVariation(v,i).name)).size>1));
test('allergies are only disclosed on history',()=>{const p=generatePatientVariation(v,1);assert.equal(discloseAllergies(p,false).length,0);assert.equal(discloseAllergies(p,true)[0].drugId,'ampicillin');});
test('complication is candidate, not automatic vital change',()=>{const p=generatePatientVariation(v,2);assert.equal(p.complicationCandidates.length,1);assert.equal(p.liveVitals,undefined);});
test('invalid range and missing rescue rejected',()=>{assert.ok(validateVariation({...v,ageRange:[65,18]}).length);assert.ok(validateVariation({...v,complications:[{id:'x',probability:1}]}).length);});

test('bank references replace duplicated case-local name arrays while small legacy arrays still work',()=>{
 const profile={...v,nameBankId:'latin-america-v1'};delete profile.firstNames;delete profile.lastNames;
 assert.deepEqual(validateVariation(profile),[]);
 assert.match(generatePatientVariation(profile,'bank-ref').name,/\p{L}+ \p{L}+/u);
 assert.deepEqual(validateVariation({...profile,nameBankId:'missing-bank'}),['unknown nameBankId']);
 assert.deepEqual(validateVariation(v),[]);
});

test('the opt-in global default covers exactly seven non-clinical personality types',()=>{
 assert(variation.DEFAULT_PATIENT_VARIATION,'future cases need an explicit reusable default');
 assert.deepEqual(validateVariation(variation.DEFAULT_PATIENT_VARIATION),[]);
 const patients=Array.from({length:400},(_,i)=>generatePatientVariation(variation.DEFAULT_PATIENT_VARIATION,'default:'+i));
 assert.deepEqual([...new Set(patients.map(p=>p.personality))].sort(),
  ['anxious','calm','irritable','reserved','scared','talkative','uncooperative']);
 for(const personality of ['confused','confusa','desorientado'])
  assert(validateVariation({...v,personalities:[personality]}).includes('invalid personalities'));
});

test('guard index allocation avoids repeated full names without depending on call order',()=>{
 assert(variation.DEFAULT_PATIENT_VARIATION);
 const make=i=>generatePatientVariation(variation.DEFAULT_PATIENT_VARIATION,'guard-a:patient-'+i,
  {guardSeed:'guard-a',patientIndex:i});
 const patients=Array.from({length:3000},(_,i)=>make(i));
 assert.equal(new Set(patients.map(p=>p.name)).size,3000);
 assert.deepEqual(make(17),patients[17]);
 assert.equal(make(250).name,generatePatientVariation(variation.DEFAULT_PATIENT_VARIATION,'other-uid',
  {guardSeed:'guard-a',patientIndex:250}).name,'name allocation is shared across case seeds');
 assert.throws(()=>generatePatientVariation(variation.DEFAULT_PATIENT_VARIATION,'x',{guardSeed:'guard',patientIndex:-1}),/patientIndex/);
});

test('allergy generation retains intolerance, hypersensitivity and severe reaction history verbatim',()=>{
 const allergies=[
  {id:'nausea',drugId:'morphine',type:'intolerance',probability:1,historyDisclosure:'Me dio náuseas, sin ronchas.'},
  {id:'rash',drugId:'ampicillin',type:'hypersensitivity',severity:'mild',probability:1,historyDisclosure:'Me salieron ronchas.'},
  {id:'shock',drugId:'ceftriaxone',type:'hypersensitivity',severity:'severe',probability:1,historyDisclosure:'Se me cerró la garganta.'}
 ];
 const p=generatePatientVariation({...v,allergies},'typed-reactions');
 assert.deepEqual(p.allergies,allergies.map(({probability,...entry})=>entry));
 assert.deepEqual(discloseAllergies(p,false),[]);
 assert.deepEqual(discloseAllergies(p,true).map(x=>[x.drugId,x.type,x.severity,x.answer]),[
  ['morphine','intolerance',undefined,'Me dio náuseas, sin ronchas.'],
  ['ampicillin','hypersensitivity','mild','Me salieron ronchas.'],
  ['ceftriaxone','hypersensitivity','severe','Se me cerró la garganta.']
 ]);
 assert.deepEqual(discloseAllergies({allergies:['legacy-id']},true),[],'unknown disclosure must not be fabricated');
});

test('authored background alternatives are selected reproducibly without changing existing reaction draws',()=>{
 const backgroundHistory=[{id:'remote-injury',history:{pmh:'Tengo presión alta; tuve una fractura de brazo que ya curó.'}},
  {id:'remote-infection',history:{pmh:'Tengo presión alta; tuve una infección de oído de chico que ya curó.'}}];
 const profile={...v,backgroundHistory},before=structuredClone(profile);
 const first=generatePatientVariation(profile,'background:1');
 assert(backgroundHistory.some(x=>x.id===first.backgroundHistory?.id),'one complete authored alternative must be selected');
 assert.deepEqual(first.backgroundHistory,backgroundHistory.find(x=>x.id===first.backgroundHistory.id));
 assert.deepEqual(generatePatientVariation(profile,'background:1'),first);
 assert.equal(new Set(Array.from({length:60},(_,i)=>generatePatientVariation(profile,'background:'+i).backgroundHistory.id)).size,2);
 const legacy=generatePatientVariation(v,'background:1');
 assert.deepEqual(first.allergies,legacy.allergies,'adding non-clinical history options must not reroll reaction facts');
 first.backgroundHistory.history.pmh='Edited patient history';
 assert.deepEqual(profile,before,'patient facts must not mutate shared content');
});

test('malformed background histories cannot enter the deterministic patient state',()=>{
 for(const backgroundHistory of [true,[null],[{id:'empty',history:{}}],
  [{id:'blank',history:{pmh:' '}}],[{id:'duplicate',history:{pmh:'A'}},{id:'duplicate',history:{pmh:'B'}}]])
  assert(validateVariation({...v,backgroundHistory}).includes('invalid backgroundHistory'));
});
