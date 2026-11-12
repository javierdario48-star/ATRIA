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

test('legacy cases with a copied complaint use authored personal history or an honest fallback',()=>{
 const affected=['VARIX','ENCEF','UC-AS','CDI','DIVERT','LGIB','HEPAT','DIARR','FECAL','PUD','CELIAC','ACAL'];
 const expected={VARIX:'Ya me habían hablado de várices esofágicas.',DIVERT:'Ya me habían dicho que tenía divertículos.'};
 const content=createClinicalContent(base);
 for(const id of affected){
  const c=content.cases.find(row=>row.id===id+'-001');
  const histories=c.variation.backgroundHistory;
  assert.equal(histories.length,2,c.id);
  for(const {history} of histories){
   assert(!history.pmh.includes(c.opening),c.id);
   assert(history.pmh.startsWith(expected[id]??'No recuerdo otros antecedentes relevantes.'),c.id);
   assert.match(history.pmh,/fractura de muñeca|esguince de tobillo/,c.id);
  }
 }
});

test('legacy personal history prefers a declared past condition and accepts a distinct summary',()=>{
 const example=base.cases.find(row=>row.id==='VARIX-001');
 const declared={...example,history:{pmh:'Tengo presión alta desde hace años.'}};
 const withSummary={...example,intents:example.intents.filter(i=>i.id!=='prior'),
  anamnesis:{...example.anamnesis,historySummary:'Me trataron por una enfermedad del hígado hace años.'}};
 const content=createClinicalContent({...base,cases:[declared,{...withSummary,id:'summary-case'}]});
 assert.match(content.cases[0].variation.backgroundHistory[0].history.pmh,/^Tengo presión alta desde hace años\./);
 assert.match(content.cases[1].variation.backgroundHistory[0].history.pmh,/^Me trataron por una enfermedad del hígado hace años\./);
});
