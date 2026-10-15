import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const reference=JSON.parse(fs.readFileSync(new URL('../../../qa/v5/fixtures/cirr-native-reference.json',import.meta.url)));
const c=JSON.parse(fs.readFileSync(new URL('../content/cases.json',import.meta.url))).find(c=>c.id==='CIRR-001');
async function api(){assert(fs.existsSync(new URL('./native-cirr.js',import.meta.url)),'C2 native CIRR migration missing');return import('./native-cirr.js');}

test('native oral dose preserves the original 100mg default and gram conversion',async()=>{
 const {parseCirrDose}=await api();
 for(const scenario of reference.scenarios.slice(0,3))assert.deepEqual(parseCirrDose(scenario.text),scenario.dose);
 for(const text of ['espironolactona 0 mg','espironolactona -100 mg','espironolactona 100 ml','espironolactona 100 mg IV',
  'espironolactona 50 mg','espironolactona 100 mg y 200 mg','espironolactona 100 mg 50 ml',
  'espironolactona 100 mg y 50','espironolactona 100 mg ml'])assert.throws(()=>parseCirrDose(text),/dose|route/i,text);
});

test('migrated original CIRR target/smoothing matches every characterized trajectory',async()=>{
 const {initialCirrVitals,advanceCirrVitals}=await api();
 for(const scenario of reference.scenarios){
  const p={liveVitals:initialCirrVitals(c),treatments:[]};let real=0;
  for(const point of scenario.points){
   while(real<point.realSeconds-1e-10){
    const dt=Math.min(1/60,point.realSeconds-real,.55>real+1e-10?.55-real:Infinity);
    advanceCirrVitals(p,c,dt);real+=dt;
    if(real>=.55-1e-10&&!p.treatments.length)p.treatments.push({id:scenario.id});
   }
   for(const key of Object.keys(point.vitals))assert(Math.abs(p.liveVitals[key]-point.vitals[key])<1e-8,scenario.id+' '+point.realSeconds+' '+key);
  }
 }
});

test('spironolactone preserves native stable vitals; native paracentesis alone has real vital effects',async()=>{
 const {initialCirrVitals,advanceCirrVitals}=await api();
 const p={liveVitals:initialCirrVitals(c),treatments:[{id:'espironolactona'}]};
 advanceCirrVitals(p,c,20);assert.deepEqual(p.liveVitals,initialCirrVitals(c));
 p.treatments.push({id:'paracentesis_ter'});advanceCirrVitals(p,c,1);
 assert(p.liveVitals.hr<94&&p.liveVitals.rr<20);assert.equal(p.liveVitals.sys,108);
});
