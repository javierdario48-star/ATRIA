import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createClinicalContent,previousClinicalContents} from './clinical-content.js';
import {materializeGuardPatient} from './guard-patient-variation.js';
const read=name=>JSON.parse(fs.readFileSync(new URL(name+'.json',import.meta.url)));
const base={cases:read('cases'),therapies:read('therapies'),defaultDoses:read('default-doses')};
test('original cases receive reversible metadata variation without changing their clinical definitions',()=>{
 const before=JSON.stringify(base),content=createClinicalContent(base);
 assert.equal(content.cases.length,25);
 for(const c of content.cases){
  assert(c.variation,c.id+' has no patient variants');
  const {variation,...unchanged}=c;assert.deepEqual(unchanged,base.cases.find(x=>x.id===c.id));
 }
 assert.equal(JSON.stringify(base),before);assert(previousClinicalContents(content).includes(base));
});
test('every original case generates all seven speaking styles and typed reaction variants without rerolling its diagnosis',()=>{
 const content=createClinicalContent(base);let severe=0,intolerances=0;
 for(const c of content.cases){
  const styles=new Set(),names=new Set();
  for(let i=0;i<80;i++){
   const p=materializeGuardPatient({uid:'legacy-'+c.id+':patient-'+(i+1),caseId:c.id},c);
   styles.add(p.personality);names.add(p.name);assert.equal(p.caseId,c.id);
   assert(p.age>=c.variation.ageRange[0]&&p.age<=c.variation.ageRange[1]);
   assert.deepEqual(materializeGuardPatient({uid:p.uid,caseId:c.id},c,{patient:p}),p);
   severe+=p.severeAllergies?.length||0;intolerances+=p.intolerances?.length||0;
  }
  assert.equal(styles.size,7,c.id);assert(names.size>=75,c.id);
 }
 assert(severe>0);assert(intolerances>0);
});
