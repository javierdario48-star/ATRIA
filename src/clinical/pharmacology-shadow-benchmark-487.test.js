import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';
import {csShadowCreate487,csShadowAdminister487,csShadowAdvance487,
 csShadowSnapshot487,csShadowRegisterDrug487,SHADOW_PILOT_DRUGS_487} from './pharmacology-shadow-487.js';
const html=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const a=html.indexOf('const CASES=')+'const CASES='.length;
const cases=JSON.parse(html.slice(a).split('\n')[0].replace(/;\s*$/,''));
let extended=SHADOW_PILOT_DRUGS_487;
for(let i=0;i<120;i++)extended=csShadowRegisterDrug487(extended,{
 id:'qa_inactive_drug_'+i,mechanism:'diuresis',route:'iv',
 reference:20,max:200,infusion:false
});
assert.equal(Object.keys(extended).length,125);
const c=cases.find(x=>x.id==='PERI-SEC-001');
const original=csShadowCreate487(c),largeCatalog=csShadowCreate487(c,{drugs:extended});
for(const p of [original,largeCatalog]){
 csShadowAdminister487(p,'oxygen',4);
 csShadowAdminister487(p,'vasopressor',.05);
 csShadowAdminister487(p,'fluid',500);
 csShadowAdvance487(p,240);
}
assert.deepEqual(csShadowSnapshot487(original),csShadowSnapshot487(largeCatalog),
 '120 additional INACTIVE drug definitions cannot change the patient evolution');
const measures=[];
for(const n of [1,5,20]){
 const patients=Array.from({length:n},(_,i)=>csShadowCreate487(cases[i%cases.length],{drugs:extended}));
 const start=performance.now();
 for(const p of patients){
  csShadowAdminister487(p,'oxygen',4);
  csShadowAdminister487(p,'fluid',500);
  csShadowAdminister487(p,'vasopressor',.05);
  csShadowAdvance487(p,240);
 }
 const ms=performance.now()-start;
 assert(Number.isFinite(ms)&&ms>=0);
 assert(patients.every(p=>p.minute===240&&p.events.length===3));
 measures.push({patients:n,gameMinutesPerPatient:240,
  nodeElapsedMs:Math.round(ms*100)/100,
  msPerPatientGameMinute:Math.round(ms/(n*240)*100000)/100000});
}
console.log('ATRIA SHADOW NODE PERFORMANCE REFERENCE PASS',JSON.stringify({
 catalogDefinitions:Object.keys(extended).length,activePerPatient:3,
 inactiveCatalogInvariant:true,measurements:measures,
 mobileMeasurement:false,noHardcodedNodeSpeedGate:true
}));
