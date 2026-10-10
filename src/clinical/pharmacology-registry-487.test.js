import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {PHARMA_RULES_487,BASE_CASE_PHARMACOLOGY_487,csBuildPharmRegistry487,
 csValidateDrug487,csCasePharmProfile487,csPharmResponse487} from './pharmacology-registry-487.js';
const html=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const a=html.indexOf('const MONITOR_THERAPY_CATALOG=['),b=html.indexOf('function findMonitorTherapy(',a);
assert(a>=0&&b>a);const meds=vm.runInNewContext(html.slice(a,b)+';MONITOR_THERAPY_CATALOG');
const p=html.indexOf('const CASES=');assert(p>=0);
const cases=JSON.parse(html.slice(p+'const CASES='.length).split('\n')[0].replace(/;\s*$/,''));
assert.equal(cases.length,Object.keys(BASE_CASE_PHARMACOLOGY_487).length);
const all=csBuildPharmRegistry487(meds,cases);
assert.equal(all.drugs.length,meds.length);
assert.equal(all.profiles.length,cases.length);
assert.equal(Object.keys(PHARMA_RULES_487).length,meds.length);
let matrix=0;
for(const c of cases){
 const sample={liveVitals:{sys:90,dia:50,spo2:92},monitorTherapies:new Map(),therapyTotals:{fluidMl:500}};
 for(const med of all.drugs){
  const effect=csPharmResponse487(med.id,c,sample,200);
  assert.equal(effect.known,true,c.id+'/'+med.id+' missing pharmacology');
  for(const value of Object.values(effect.offsets))assert(Number.isFinite(value),'nonfinite '+med.id);
  matrix++;
 }
}
assert.equal(matrix,13*meds.length);
// Rules are conditional rather than granting universal healing.
const septic=cases.find(x=>x.id==='PERI-SEC-001'),cirr=cases.find(x=>x.id==='CIRR-001');
const shockPatient={liveVitals:{sys:65,dia:30,spo2:86},phys:{effectiveVolume:.42,renalReserve:.4}};
const after=(id,caseDef=septic)=>csPharmResponse487(id,caseDef,shockPatient,250);
assert(after('oxygen').offsets.spo2>0,'oxygen must raise low SpO2');
assert(after('vasopressor').offsets.sys>0,'pressor must raise pressure in septic shock');
assert(after('furosemide').offsets.sys<0,'diuretic in shock must worsen pressure');
assert(after('beta_blocker').offsets.sys<0,'beta blocker can worsen shock');
assert(after('morphine').warnings.includes('opioid-hypotension'),'opioid should expose hypotension risk');
assert.equal(after('transfusion',cirr).offsets.spo2,0,'transfusion affects Hb content, not SpO2');
const normal={liveVitals:{sys:120,dia:75,spo2:99}};
assert.equal(csPharmResponse487('oxygen',cirr,normal,250).offsets.spo2,0,
 'already normal oxygenation must not get +6 points');
assert.equal(csPharmResponse487('aza',cases.find(x=>x.id==='CROHN-001'),normal,60).phase,0,
 'azathioprine must not heal in the first game hour');
assert.equal(csPharmResponse487('ceftriaxone',septic,shockPatient,250).offsets.sys,0,
 'antibiotics cannot directly grant blood pressure');
assert.throws(()=>csCasePharmProfile487({id:'NEW-NO-PROFILE'}),/requires explicit/);
assert.throws(()=>csValidateDrug487('foo',{classId:'antibiotic'}),/incomplete/);
const custom={id:'experimental_agent',label:'Experimental in-game agent',aliases:['agente experimental'],
 pharmacology:{classId:'experimental',route:'iv',onsetMin:5,peakMin:20,
  indications:['vasoplegia'],hazards:['hypotension'],mechanism:'custom',response:{sys:4,dia:2},
  defaultDose:{amount:5,unit:'mg',display:'5 mg'}}};
const newCase={id:'QA-NEW',vitals:{bp:'110/70',spo2:97},
 pharmacology:{traits:['vasoplegia','infection'],newDrugs:[custom]}};
const extended=csBuildPharmRegistry487(meds,[...cases,newCase]);
assert.equal(extended.drugs.length,meds.length+1,'new case must register its new drug globally');
assert.equal(extended.profiles.length,cases.length+1);
for(const c of [...cases,newCase]){
 const x=csPharmResponse487(custom.id,c,normal,45,{},extended.drugs);
 assert(x.known,'new drug missing for existing/new case '+c.id);
 assert.equal(x.offsets.sys,c.id==='QA-NEW'||c.id==='PERI-SEC-001'||c.id==='PERI-TER-001'||c.id==='CHOLANG-001'?4:0,
  'new drug indication depends on patient case rather than granting universal benefit '+c.id);
}
assert.throws(()=>csBuildPharmRegistry487(meds,[...cases,
 {id:'QA-BAD',pharmacology:{traits:['shock'],newDrugs:[{id:'unreviewed',label:'Bad',aliases:['bad']}]}}]),
 /incomplete/,'new drug cannot be added without rules');
console.log('CASE-AWARE GLOBAL PHARMACOLOGY REGISTRY PASS',JSON.stringify({
 nativeDrugs:meds.length,cases:cases.length,crossProduct:matrix,newDrugAllCases:true,
 oxygenContext:true,shockedDiureticHarm:true,lateAzathioprine:true,missingCaseRejected:true,
 missingDrugRulesRejected:true,noRealClinicalDosing:true}));
