import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generatePatientVariation,validateVariation,DEFAULT_PATIENT_VARIATION,discloseAllergies} from '../../src/v5/content/patient-variation.js';
import {materializeGuardPatient} from '../../src/v5/content/guard-patient-variation.js';
import {respiratoryPack} from '../../src/v5/content/packs/respiratory-pack.js';
import {cardiologyPack} from '../../src/v5/content/packs/cardiology-pack.js';
import {neurologyPack} from '../../src/v5/content/packs/neurology-pack.js';
const base=JSON.parse(readFileSync(new URL('../../src/v5/content/cases.json',import.meta.url)));
const cases=[...base,...respiratoryPack.cases,...cardiologyPack.cases,...neurologyPack.cases];
const RUNS=40;
test('55 authored cases exercise forty deterministic patient admissions each',()=>{
 assert.equal(cases.length,55);
 const ids=new Set();
 let allergicCases=0,allergicPatients=0,distinctNames=0,distinctPersonalities=0;
 for(const c of cases){
  assert(!ids.has(c.id),'duplicate case '+c.id);ids.add(c.id);
  const profile=c.variation===true?DEFAULT_PATIENT_VARIATION:c.variation;
  assert(profile,'case lacks identity variation '+c.id);
  assert.deepEqual(validateVariation(profile),[],c.id);
  const patients=Array.from({length:RUNS},(_,i)=>{
   const uid='qa-'+c.id+':patient-'+(i+1),seed='qa-'+c.id+':'+i;
   const generated=generatePatientVariation(profile,seed,{guardSeed:'qa-'+c.id,patientIndex:i});
   const patient=materializeGuardPatient({uid,caseId:c.id,variation:{seed}},c,null,{guardSeed:'qa-'+c.id,patientIndex:i});
   assert.equal(patient.name,generated.name,c.id);
   assert.equal(patient.personality,generated.personality,c.id);
   assert.deepEqual(materializeGuardPatient(patient,c),patient,'repeat materialization must not reroll '+c.id);
   assert.deepEqual(discloseAllergies(patient,false),[],'no unsolicited allergy '+c.id);
   assert.equal(discloseAllergies(patient,true).length,patient.allergyHistory.length,'allergy history disclosed '+c.id);
   assert.deepEqual(materializeGuardPatient({uid,caseId:c.id,variation:{seed}},c,{patient}),patient,'checkpoint restores identity '+c.id);
   return patient;
  });
  const names=new Set(patients.map(p=>p.name)),personalities=new Set(patients.map(p=>p.personality));
  assert(names.size>=35,c.id+' lacks name diversity');
  assert(personalities.size>=3,c.id+' lacks personality diversity');
  distinctNames+=names.size;distinctPersonalities+=personalities.size;
  const allergies=patients.filter(p=>p.allergyHistory.length>0);
  if((profile.allergies||[]).some(a=>a.probability>0)){
   allergicCases++;
   assert(allergies.length>0,c.id+' authored allergy never materializes');
  }
  allergicPatients+=allergies.length;
 }
 assert(allergicCases>0,'no cases contain probabilistic allergy variants');
 assert(allergicPatients>0,'no allergic patients observed');
 console.log(JSON.stringify({caseCount:cases.length,admissions:cases.length*RUNS,distinctNames,distinctPersonalities,allergicCases,allergicPatients}));
});
