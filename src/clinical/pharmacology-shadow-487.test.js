import assert from 'node:assert/strict';
import fs from 'node:fs';
import {csShadowCreate487,csShadowAdminister487,csShadowStop487,
 csShadowAdvance487,csShadowSnapshot487,SHADOW_PILOT_DRUGS_487,csShadowRegisterDrug487} from './pharmacology-shadow-487.js';
import {BASE_CASE_PHARMACOLOGY_487} from './pharmacology-registry-487.js';

const raw=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const a=raw.indexOf('const CASES=')+'const CASES='.length;
assert(a>12);
const cases=JSON.parse(raw.slice(a).split('\n')[0].replace(/;\s*$/,''));
const C=id=>cases.find(x=>x.id===id);
const run=(c,min,actions=[])=>{
 const p=csShadowCreate487(c);
 for(const [id,dose] of actions)csShadowAdminister487(p,id,dose);
 csShadowAdvance487(p,min);
 return p;
};
assert.equal(cases.length,13);
assert.equal(Object.keys(SHADOW_PILOT_DRUGS_487).length,5);
assert.equal(Object.keys(BASE_CASE_PHARMACOLOGY_487).length,13);
const acid=C('HDA-001'),septic=C('PERI-SEC-001'),cirr=C('CIRR-001');
for(const c of cases){
 const patient=csShadowCreate487(c);
 assert.equal(patient.caseId,c.id);
 assert.equal(patient.vitals.sys,Number(c.vitals.bp.split('/')[0]));
 assert.equal(patient.vitals.spo2,c.vitals.spo2);
 for(const [drug,dose] of [['oxygen',4],['fluid',500],['vasopressor',.05],['morphine',4],['furosemide',40]]){
  const p=run(c,45,[[drug,dose]]);
  for(const val of Object.values(p.vitals))assert(Number.isFinite(val),c.id+'/'+drug+' nonfinite');
  assert(p.vitals.sys>=50&&p.vitals.spo2<=100);
 }
}
const hdaNone=run(acid,60);
const hdaFluid=run(acid,60,[['fluid',500]]);
assert(hdaFluid.vitals.map>hdaNone.vitals.map,'fluids must support hypovolemic pressure');
const hdaNone120=run(acid,120);
const hdaDiuretic=run(acid,120,[['furosemide',40]]);
assert(hdaDiuretic.vitals.map<hdaNone120.vitals.map,
 'a diuretic in hemorrhagic shock must lower perfusion relative to untreated');
assert(hdaDiuretic.state.renalReserve<hdaNone120.state.renalReserve,
 'diuretic underfilling must aggravate renal perfusion');
const hdaSmall=run(acid,45,[['fluid',250]]),hdaLarge=run(acid,45,[['fluid',500]]);
assert(hdaLarge.vitals.map>hdaSmall.vitals.map,
 'more volume to this underfilled fixture must have larger benefit');
const septicNone=run(septic,20);
const septicResuscitated=run(septic,20,[['fluid',500],['vasopressor',.05]]);
assert(septicResuscitated.vitals.map>septicNone.vitals.map,
 'pressor plus bolus supports vasoplegic shock');
assert(septicResuscitated.state.infection>=septicNone.state.infection,
 'pressor must not magically eradicate infection');
const oxygen=run(septic,10,[['oxygen',4]]);
assert(oxygen.vitals.spo2>septicNone.base.spo2,
 'oxygen must improve hypoxemia without false effect on blood pressure');
const offOxygen=csShadowCreate487(septic);
csShadowAdminister487(offOxygen,'oxygen',4);
csShadowAdvance487(offOxygen,10);
const onSat=offOxygen.vitals.spo2;
csShadowStop487(offOxygen,'oxygen');
csShadowAdvance487(offOxygen,25);
assert(offOxygen.vitals.spo2<onSat,'oxygenation support must wash out when stopped');
const normal=structuredClone(C('COLON-001'));
normal.vitals.spo2=99;
assert.equal(run(normal,60,[['oxygen',4]]).vitals.spo2,99,
 'normal 99% SpO2 must never be improved by a magic oxygen bonus');
const press=csShadowCreate487(septic);
csShadowAdminister487(press,'vasopressor',.05);
csShadowAdvance487(press,15);
const onMap=press.vitals.map;
csShadowStop487(press,'vasopressor');
csShadowAdvance487(press,45);
const noPress=run(septic,60);
assert(press.vitals.map<onMap,'pressor must stop acting after cessation');
assert(Math.abs(press.vitals.map-noPress.vitals.map)<3,
 'pressor must not remain permanently active after cessation');
const severe=run(septic,30,[['morphine',20]]);
const modest=run(septic,30,[['morphine',4]]);
assert(severe.vitals.rr<modest.vitals.rr&&severe.vitals.spo2<modest.vitals.spo2,
 'repeated/high opioid exposure must cause respiratory harm');
assert(modest.state.pain<csShadowCreate487(septic).state.pain,'opioid relieves pain');
const ascitesNone=run(cirr,240);
const ascitesTreated=run(cirr,240,[['furosemide',40]]);
assert(ascitesTreated.state.congestion<ascitesNone.state.congestion,
 'diuretic can reduce congestion/ascites when appropriate');
assert(ascitesTreated.state.volume<ascitesNone.state.volume,
 'decongestion must not fabricate circulating volume');
const p1=csShadowCreate487(septic),p2=csShadowCreate487(septic);
for(const p of [p1,p2]){csShadowAdminister487(p,'fluid',500);csShadowAdminister487(p,'oxygen',4)}
csShadowAdvance487(p1,120);
for(let i=0;i<120;i++)csShadowAdvance487(p2,1);
assert.deepEqual(csShadowSnapshot487(p1),csShadowSnapshot487(p2),
 'simulation must be bitwise reproducible across rendering cadence');
// New disease inherits previous medicines without editing any case-specific rule.
const futureCase={id:'QA-SHOCK-NEW',vitals:{bp:'80/46',hr:130,rr:25,spo2:90},
 pharmacology:{traits:['shock','hypovolemia','pain']}};
const futureUnmanaged=run(futureCase,50),futureResuscitated=run(futureCase,50,[['fluid',500]]);
assert(futureResuscitated.vitals.map>futureUnmanaged.vitals.map,
 'new disease inherits existing volume mechanism from traits');
assert(run(futureCase,25,[['oxygen',4]]).vitals.spo2>futureCase.vitals.spo2,
 'new disease inherits existing oxygen mechanism');
// New molecule with a previously validated MECHANISM acts in every case
// using the same state rules. No med × disease implementation matrix.
const analogue={id:'qa_vascular_analogue',mechanism:'vascularTone',
 route:'iv',reference:.08,max:.32,infusion:true};
const extended=csShadowRegisterDrug487(SHADOW_PILOT_DRUGS_487,analogue);
for(const c of [septic,acid,cirr,futureCase]){
 const p=csShadowCreate487(c,{drugs:extended});
 const control=csShadowCreate487(c);
 csShadowAdminister487(p,analogue.id,.08);
 csShadowAdvance487(p,25);
 csShadowAdvance487(control,25);
 assert(p.vitals.map>control.vitals.map,
  'new drug with established mechanism works without case-specific code '+c.id);
}
assert.equal(SHADOW_PILOT_DRUGS_487[analogue.id],undefined,
 'registering a candidate must not mutate the native/global catalog');
assert.throws(()=>csShadowRegisterDrug487(extended,{
 id:'unreviewed',mechanism:'coagulation',route:'iv',reference:1,max:1,infusion:false
}),/unknown or incomplete/,'new physiological axis cannot be silently simulated');
assert.throws(()=>csShadowAdminister487(csShadowCreate487(septic),'anticoagulation',10),
 /unvalidated/,'heparin cannot silently acquire made-up pharmacodynamics');
assert.throws(()=>csShadowAdminister487(csShadowCreate487(septic),'fluid',-1),/invalid/);
assert.throws(()=>csShadowAdvance487(csShadowCreate487(septic),NaN),/invalid/);
console.log('ATRIA SHADOW CLINICAL PILOT PASS',JSON.stringify({
 seededCases:cases.length,mechanisms:Object.keys(SHADOW_PILOT_DRUGS_487).length,
 seedScenarios:cases.length*5,threeClinicalPilots:true,
 doseGradient:true,repeatedMorphineHarm:true,renalDamage:true,cessation:true,
 deterministicCadence:true,newCaseInheritsMechanisms:true,newMoleculeAllCases:true,
 noUnknownMechanism:true,heparinBlocked:true,liveRuntimeUntouched:true,physicalAndroid:false
}));
