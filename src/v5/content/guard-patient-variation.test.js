import test from 'node:test';
import assert from 'node:assert/strict';
import {materializeGuardPatient} from './guard-patient-variation.js';
import * as variation from './patient-variation.js';
const profile={ageRange:[18,65],firstNames:['Ana','Luz'],lastNames:['Paz','Ríos'],personalities:['serena','ansiosa'],openings:['Me falta el aire'],allergies:[{id:'pen',drugId:'ampicillin',probability:1,historyDisclosure:'Tuve urticaria'}],complications:[{id:'fatigue',probability:1,rationale:'Agotamiento ventilatorio',progressionId:'fatigue',rescueId:'ventilation'}]};
const patient={uid:'patient-42',caseId:'RESP-04'};
test('reproduces identity and retains existing allergies',()=>{const p=materializeGuardPatient({...patient,allergies:['ceftriaxone']},{id:'RESP-04',variation:profile});const again=materializeGuardPatient({...patient,allergies:['ceftriaxone']},{id:'RESP-04',variation:profile});assert.deepEqual(p,again);assert.deepEqual(p.allergies.sort(),['ampicillin','ceftriaxone']);});
test('old cases and checkpoints are untouched',()=>{assert.strictEqual(materializeGuardPatient(patient,{id:'RESP-04'}),patient);assert.strictEqual(materializeGuardPatient(patient,{id:'RESP-04',variation:profile},{schemaVersion:1}),patient);});
test('complication is metadata, not a physiological event',()=>{const p=materializeGuardPatient(patient,{id:'RESP-04',variation:profile});assert.equal(p.variation.complicationCandidates[0].progressionId,'fatigue');assert.equal(p.vitals,undefined);});
test('case mismatch is rejected',()=>assert.throws(()=>materializeGuardPatient(patient,{id:'RESP-05',variation:profile}),/mismatch/));

test('identity remains stable for the same patient across re-entry',()=>{const first=materializeGuardPatient(patient,{id:'RESP-04',variation:profile});const again=materializeGuardPatient(patient,{id:'RESP-04',variation:profile});assert.equal(first.name,again.name);assert.equal(first.age,again.age);assert.equal(first.personality,again.personality);assert.equal(first.variation.seed,again.variation.seed);});

test('a materialized checkpoint restores identity and variation metadata without replaying a changed profile',()=>{
 const first=materializeGuardPatient(patient,{id:'RESP-04',variation:profile});
 const checkpoint=JSON.parse(JSON.stringify({schemaVersion:1,patient:first}));
 const changed={...profile,firstNames:['Otra'],lastNames:['Persona'],ageRange:[90,90],allergies:[]};
 const restored=materializeGuardPatient({...patient,liveVitals:{hr:75}},{id:'RESP-04',variation:changed},checkpoint);
 assert.equal(restored.name,first.name);assert.equal(restored.age,first.age);
 assert.equal(restored.personality,first.personality);assert.deepEqual(restored.variation,first.variation);
 assert.deepEqual(restored.liveVitals,{hr:75},'identity materialization cannot restore or alter physiology');
 assert.throws(()=>materializeGuardPatient(patient,{id:'RESP-04',variation:profile},
  {patient:{...first,uid:'someone-else'}}),/mismatch/);
});

test('restored variation metadata survives re-entry even if the case no longer declares variation',()=>{
 const first=materializeGuardPatient(patient,{id:'RESP-04',variation:profile});
 const restored=materializeGuardPatient(patient,{id:'RESP-04'},{patient:first});
 assert.equal(restored.name,first.name);assert.deepEqual(restored.variation,first.variation);
});

test('legacy cases stay untouched and new cases may opt into the global default',()=>{
 assert.strictEqual(materializeGuardPatient(patient,{id:'RESP-04'}),patient);
 const p=materializeGuardPatient(patient,{id:'RESP-04',variation:true});
 assert(p.name);assert(Number.isInteger(p.age));assert(variation.PATIENT_PERSONALITIES.includes(p.personality));
});

test('guard UIDs allocate unique names across cases and replace only case demo placeholders',()=>{
 assert(variation.DEFAULT_PATIENT_VARIATION);
 const patients=Array.from({length:1200},(_,i)=>{
  const caseId=i%2?'NEW-A':'NEW-B';
  return materializeGuardPatient({uid:'guard-names:patient'+(i?'-'+(i+1):''),caseId,name:'Demo'},
   {id:caseId,demo:'Demo',variation:true});
 });
 assert.equal(new Set(patients.map(p=>p.name)).size,1200);
 const initial=patients[0];
 assert.equal(materializeGuardPatient({...initial,name:'Nombre elegido'},{id:initial.caseId,variation:true}).name,'Nombre elegido');
 assert.equal(materializeGuardPatient({uid:'guard-names:patient',caseId:'NEW-B'},
  {id:'NEW-B',variation:true}).name,initial.name);
});

test('typed reaction histories remain available on request without upgrading intolerance into allergy',()=>{
 const p=materializeGuardPatient({...patient,intentHistory:[],clinicalFlags:{drugAllergies:['piptazo']},liveVitals:{hr:91}},
  {id:'RESP-04',variation:{...profile,allergies:[
   {id:'a',drugId:'morphine',type:'intolerance',probability:1,historyDisclosure:'Me da náuseas.'},
   {id:'b',drugId:'ceftriaxone',type:'hypersensitivity',severity:'severe',probability:1,historyDisclosure:'Se me cerró la garganta.'}
  ]}});
 assert.deepEqual(p.allergies,['piptazo','ceftriaxone']);
 assert.deepEqual(p.intolerances,['morphine']);assert.deepEqual(p.severeAllergies,['ceftriaxone']);
 assert.equal(p.allergyHistory[0].type,'intolerance');assert.equal(p.allergyHistory[1].historyDisclosure,'Se me cerró la garganta.');
 assert.deepEqual(p.intentHistory,[]);assert.deepEqual(p.liveVitals,{hr:91});
 assert.equal(p.allergyHistoryAnswer,undefined,'materialization must not generate an unsolicited history answer');
});

test('preexisting typed reaction facts retain their severity and intolerance classification',()=>{
 const reactions=[
  {drugId:'ampicillin',type:'hypersensitivity',severity:'severe',historyDisclosure:'Necesité una inyección por la reacción.'},
  {drugId:'morphine',type:'intolerance',historyDisclosure:'Me produce náuseas.'}
 ];
 const input={...patient,allergies:reactions};
 const before=structuredClone(input);
 const p=materializeGuardPatient(input,{id:'RESP-04',variation:{...profile,allergies:[]}});
 assert.deepEqual(p.allergies,['ampicillin']);
 assert.deepEqual(p.severeAllergies,['ampicillin']);
 assert.deepEqual(p.intolerances,['morphine']);
 assert.deepEqual(p.allergyHistory,reactions);
 assert.deepEqual(input,before);
});

test('materialized reaction facts have one authoritative history rather than duplicated variation metadata',()=>{
 const p=materializeGuardPatient(patient,{id:'RESP-04',variation:profile});
 assert.equal(p.variation.allergies,undefined,'hidden reaction histories do not belong in identity/seed metadata');
 assert.deepEqual(p.allergyHistory,[{id:'pen',drugId:'ampicillin',historyDisclosure:'Tuve urticaria'}]);
 assert.deepEqual(p.allergies,['ampicillin']);
});

test('reentry preserves materialized identity and facts when the content profile changes without a checkpoint',()=>{
 const first=materializeGuardPatient(patient,{id:'RESP-04',variation:profile});
 const changed={...profile,firstNames:['Otra'],lastNames:['Persona'],ageRange:[90,90],
  allergies:[{id:'new',drugId:'ceftriaxone',probability:1,historyDisclosure:'Otra reacción.'}],complications:[]};
 const restored=materializeGuardPatient(first,{id:'RESP-04',variation:changed});
 assert.deepEqual(restored,first,'existing patient facts cannot be regenerated from a new profile');
});

test('a fresh patient can supply a reproducible seed before its identity and history are materialized',()=>{
 const initial={...patient,variation:{seed:'explicit-patient-seed'},allergyHistory:[]};
 const p=materializeGuardPatient(initial,{id:'RESP-04',variation:profile});
 assert(p.name&&Number.isInteger(p.age)&&p.personality&&p.opening);
 assert.equal(p.variation.seed,'explicit-patient-seed');
 assert.deepEqual(p.allergies,['ampicillin']);
 assert.deepEqual(materializeGuardPatient(initial,{id:'RESP-04',variation:profile}),p);
});

test('selected authored background is an owner fact that survives checkpoint and profile removal',()=>{
 const backgroundHistory=[{id:'old-fracture',history:{pmh:'Tuve una fractura que ya curó.'}}];
 const first=materializeGuardPatient(patient,{id:'RESP-04',variation:{...profile,backgroundHistory}});
 assert.deepEqual(first.backgroundHistory,backgroundHistory[0]);
 const restored=materializeGuardPatient({...patient,liveVitals:{hr:75}},{id:'RESP-04'},
  JSON.parse(JSON.stringify({patient:first})));
 assert.deepEqual(restored.backgroundHistory,{id:'old-fracture',history:{pmh:'Tuve una fractura que ya curó.'}});
 assert.deepEqual(restored.liveVitals,{hr:75});
});
