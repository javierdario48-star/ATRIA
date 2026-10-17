// Pharmacology review for ATRIA 5.0: exercise the ACTUAL PURE 4.8.7
// case-aware catalogue directly. This does not install the legacy HTML wrappers,
// experimental B1 shadow, or another physiological writer in V5.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PHARMA_RULES_487,csPharmResponse487} from '../../clinical/pharmacology-registry-487.js';
import {csPharmOutcomes487} from '../../clinical/pharmacology-outcomes-487.js';
import {initialAppVitals,advanceAppVitals} from './native-app.js';
import {initialCirrVitals,advanceCirrVitals} from './native-cirr.js';

const cases=JSON.parse(readFileSync(new URL('../content/cases.json',import.meta.url)));
const choose=id=>{const c=cases.find(x=>x.id===id);assert(c,'missing migrated clinical seed '+id);return c;};
const patient=(vitals,more={})=>({
 liveVitals:{...vitals},phys:{effectiveVolume:1,renalReserve:1,sourceControlled:false,...more.phys},
 therapyTotals:{fluidMl:0,...more.therapyTotals},
 administrationLog:more.administrationLog||[],monitorTherapies:more.monitorTherapies||new Map(),
 gameMinute:more.gameMinute||0
});
const evalDrug=(drug,c,v,minute=240,opts={})=>csPharmResponse487(drug,choose(c),patient(v,opts),minute);
const drugs=Object.entries(PHARMA_RULES_487).map(([id,pharmacology])=>({id,pharmacology}));
const near=(a,b,epsilon=1e-9)=>assert(Math.abs(a-b)<epsilon, String(a)+' != '+String(b));

test('Legacy: current monitor matters more than diagnosis label for oxygen and vasopressor',()=>{
 const c='PERI-SEC-001';
 const hypoxic=evalDrug('oxygen',c,{sys:84,dia:46,spo2:85});
 const normal=evalDrug('oxygen',c,{sys:118,dia:75,spo2:98});
 assert(hypoxic.offsets.spo2>0&&hypoxic.offsets.spo2<=7);
 assert.equal(normal.offsets.spo2,0,'normal oxygenation is not a free +SpO2 bonus');
 const shock=evalDrug('vasopressor',c,{sys:74,dia:38,spo2:90});
 const stable=evalDrug('vasopressor',c,{sys:125,dia:80,spo2:97});
 assert(shock.offsets.sys>stable.offsets.sys);
 assert(shock.offsets.dia>stable.offsets.dia);
 assert(stable.warnings.includes('pressor-without-shock'));
 assert.equal(shock.offsets.spo2,0,'pressor must not magically increase SpO2');
});
test('Legacy: hypovolemia improves after volume, but repeated fluid and congestion are not free',()=>{
 const dehydrated=evalDrug('fluid','HDA-001',{sys:76,dia:43,hr:131,spo2:95});
 assert(dehydrated.offsets.sys>0&&dehydrated.offsets.hr<0);
 const cirr=choose('CIRR-001');
 const baseline=initialCirrVitals(cirr);
 const fluid=patient(baseline),untreated=patient(baseline);
 fluid.uid='CIRR-v5';untreated.uid='CIRR-control';
 // Native V5 and legacy are different writers: only compare clinical direction
 // of a CONFIRMED large exposure, never add these two models together.
 fluid.administrationLog=Array.from({length:8},(_,i)=>({id:'fluid',
  patientUid:'CIRR-v5',sourceEventId:'confirmed-'+i,
  dose:{amount:500,unit:'ml'}}));
 fluid.treatments=fluid.administrationLog;
 untreated.treatments=[];
 advanceCirrVitals(fluid,cirr,50);advanceCirrVitals(untreated,cirr,50);
 assert(fluid.liveVitals.rr>untreated.liveVitals.rr);
 assert(fluid.liveVitals.spo2<untreated.liveVitals.spo2);
 assert.equal(fluid.liveVitals.sys,untreated.liveVitals.sys,
  'stable cirrhosis must not receive the old unsupported positive-Ringer pressure bonus');
});
test('Legacy: opioids reduce distress but can worsen low BP; diuretic can harm a shocked patient',()=>{
 const morphine=evalDrug('morphine','PANC-001',{sys:80,dia:48,hr:115,spo2:96});
 assert(morphine.offsets.hr<0&&morphine.offsets.sys<0);
 assert(morphine.warnings.includes('opioid-hypotension'));
 const diuretic=evalDrug('furosemide','HDA-001',{sys:74,dia:42,spo2:95});
 assert(diuretic.offsets.sys<0);
 assert(diuretic.warnings.includes('diuretic-in-shock'));
 const overload=evalDrug('furosemide','CIRR-001',{sys:124,dia:81,spo2:89},
  240,{therapyTotals:{fluidMl:3600}});
 assert(overload.offsets.rr<0&&overload.offsets.spo2>0);
});
test('Legacy: antimicrobial coverage depends on administered regimen, elapsed time, and source control',()=>{
 const c=choose('APP-001');
 const state=patient(initialAppVitals(c),{gameMinute:180});
 const baseline=csPharmOutcomes487(c,state,drugs);
 assert.equal(baseline.coverageComplete,false);
 assert.equal(baseline.infectionBurdenIndex,1);
 state.monitorTherapies=new Map([
  ['ceftriaxone',{id:'ceftriaxone',startedAt:0}],
  ['metronidazole',{id:'metronidazole',startedAt:0}]
 ]);
 // Orders by themselves are not real administrations.
 assert.equal(csPharmOutcomes487(c,state,drugs).coverageComplete,false);
 state.administrationLog.push({id:'ceftriaxone',sourceEventId:'a'});
 assert.equal(csPharmOutcomes487(c,state,drugs).coverageComplete,false);
 state.administrationLog.push({id:'metronidazole',sourceEventId:'b'});
 const treated=csPharmOutcomes487(c,state,drugs);
 assert.equal(treated.coverageComplete,true);
 assert(treated.infectionBurdenIndex<baseline.infectionBurdenIndex);
 assert(treated.infectionBurdenIndex>0,'antibiotics without appendectomy cannot immediately erase disease');
 state.phys.sourceControlled=true;
 const controlled=csPharmOutcomes487(c,state,drugs);
 assert(controlled.infectionBurdenIndex<treated.infectionBurdenIndex);
 assert.equal(evalDrug('ceftriaxone','APP-001',{sys:90,dia:55,spo2:94}).offsets.sys,0);
 assert.equal(evalDrug('metronidazole','APP-001',{sys:90,dia:55,spo2:94}).offsets.spo2,0);
});
test('Legacy: delayed therapy and native APP baseline do not fake an early antibiotic improvement',()=>{
 const baseline=evalDrug('furosemide','CIRR-001',{sys:120,dia:78,spo2:92},0);
 const late=evalDrug('furosemide','CIRR-001',{sys:120,dia:78,spo2:92},240);
 assert.equal(baseline.phase,0);assert(late.phase>0);
 const c=choose('APP-001'),plain={liveVitals:initialAppVitals(c),treatments:[]};
 const antibiotics={liveVitals:initialAppVitals(c),treatments:[{id:'ceftriaxone'},{id:'metronidazole'}]};
 advanceAppVitals(plain,c,6);advanceAppVitals(antibiotics,c,6);
 assert.deepEqual(antibiotics.liveVitals,plain.liveVitals,
  'antibiotics are meaningful case-compliance and later infection signals, not an instant BP improvement');
});
test('Legacy general catalogue: every documented case-drug response remains finite and bounded under dynamic vital changes',()=>{
 let checks=0;
 for(const c of cases)for(const id of Object.keys(PHARMA_RULES_487)){
  for(const vitals of [
   {sys:76,dia:43,hr:135,rr:32,spo2:82,temp:39},
   {sys:125,dia:81,hr:83,rr:18,spo2:98,temp:37},
   {sys:105,dia:65,hr:112,rr:25,spo2:91,temp:38}
  ])for(const time of [0,30,240]){
   const result=csPharmResponse487(id,c,patient(vitals),time);
   assert.equal(result.known,true,id+'/'+c.id);
   assert(result.phase>=0&&result.phase<=1);
   for(const [axis,value] of Object.entries(result.offsets)){
    assert(Number.isFinite(value),c.id+'/'+id+'/'+axis+' is not finite');
    assert(Math.abs(value)<=50,c.id+'/'+id+'/'+axis+' implausibly large simulated offset');
   }
   checks++;
  }
 }
 assert(checks>2500,'every existing case and drug is covered');
});
test('Calibration warning: isolated V4 volume lookup is overly pessimistic in stable CIRR',()=>{
 // This is a known weakness of the historical generic coefficient lookup:
 // CIRR starts with a congestion *trait*, so it forecasts low SpO2 from
 // fluid before any accumulated fluid overload. The native V5 owner correctly
 // waits for CONFIRMED large volume. Never stack the two effects.
 const stable=evalDrug('fluid','CIRR-001',{sys:115,dia:72,spo2:97},
  240,{therapyTotals:{fluidMl:0}});
 assert(stable.offsets.spo2<0&&stable.offsets.rr>0);
 const severe=evalDrug('fluid','CIRR-001',{sys:115,dia:72,spo2:91},
  240,{therapyTotals:{fluidMl:4000}});
 assert(severe.warnings.includes('volume-overload'));
 const c=choose('CIRR-001'),native={uid:'CIRR-safe',liveVitals:initialCirrVitals(c),
  treatments:[{id:'fluid'}],administrationLog:[{id:'fluid',patientUid:'CIRR-safe',
   sourceEventId:'1',dose:{amount:500,unit:'ml'}}]};
 advanceCirrVitals(native,c,20);
 near(native.liveVitals.spo2,c.vitals.spo2);
});
