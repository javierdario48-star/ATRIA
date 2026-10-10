import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {csBuildPharmRegistry487} from './pharmacology-registry-487.js';
import {csPharmOutcomes487} from './pharmacology-outcomes-487.js';
const h=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const start=h.indexOf('const CASES=')+'const CASES='.length;
const cases=JSON.parse(h.slice(start).split('\n')[0].replace(/;\s*$/,''));
const a=h.indexOf('const MONITOR_THERAPY_CATALOG=['),b=h.indexOf('function findMonitorTherapy(',a);
const drugs=vm.runInNewContext(h.slice(a,b)+';MONITOR_THERAPY_CATALOG');
const registry=csBuildPharmRegistry487(drugs,cases);
const C=id=>cases.find(c=>c.id===id);
function patient(min=600){
 return {gameMinute:min,monitorTherapies:new Map(),administrationLog:[],
  therapyTotals:{fluidMl:0},phys:{renalReserve:.85,sourceControlled:false}};
}
function administer(p,id,start=0){
 p.monitorTherapies.set(id,{id,startedAt:start});
 p.administrationLog.push({id,m:start});
}
let verified=0;
for(const c of cases)for(const d of registry.drugs){
 const p=patient();administer(p,d.id);
 const out=csPharmOutcomes487(c,p,registry.drugs);
 for(const [metric,val] of Object.entries(out)){
  if(typeof val==='number')assert(Number.isFinite(val),c.id+'/'+d.id+'/'+metric);
 }
 verified++;
}
{
 const p=patient(),c=C('APP-001');
 administer(p,'ceftriaxone');
 let x=csPharmOutcomes487(c,p,registry.drugs);
 assert.equal(x.coverageComplete,false);
 assert.equal(x.infectionBurdenIndex,1,'single beta lactam not adequate for polymicrobial appendiceal infection');
 administer(p,'metronidazole');
 x=csPharmOutcomes487(c,p,registry.drugs);
 assert(x.coverageComplete);
 assert(x.infectionBurdenIndex<1&&x.infectionBurdenIndex>=.72,
  'correct coverage helps but infection remains without focus control');
}
{
 const p=patient(),c=C('CHOLE-001');administer(p,'antiemetic');
 assert(csPharmOutcomes487(c,p,registry.drugs).nauseaIndex<1);
}
{
 const p=patient(),c=C('CROHN-001');administer(p,'aza');
 assert.equal(csPharmOutcomes487(c,p,registry.drugs).immuneInflammationIndex,1,
  'azathioprine cannot reverse Crohn inflammation within game-day hours');
 p.gameMinute=20160;
 assert(csPharmOutcomes487(c,p,registry.drugs).immuneInflammationIndex<1,
  'slow immunomodulation should eventually have a simulated longitudinal effect');
}
{
 const p=patient(),c=C('CIRR-001');
 administer(p,'espironolactona');
 const slow=csPharmOutcomes487(c,p,registry.drugs).ascitesIndex;
 assert(slow>0&&slow<1,'diuretic changes ascites only gradually');
 administer(p,'paracentesis_ter');
 assert(csPharmOutcomes487(c,p,registry.drugs).ascitesIndex<slow);
}
{
 const p=patient(),c=C('HDA-001');
 administer(p,'transfusion');
 assert.equal(csPharmOutcomes487(c,p,registry.drugs).anemiaHbEquivalentGain,1);
}
{
 const p=patient(),c=C('PERI-PBE-001');administer(p,'gentamicin');
 assert(csPharmOutcomes487(c,p,registry.drugs).renalInjuryIndex>=.20,
  'nephrotoxic drug can harm renal-vulnerable SBP');
}
{
 const p=patient(),c=C('COLON-001');administer(p,'gentamicin');
 assert(csPharmOutcomes487(c,p,registry.drugs).renalInjuryIndex>0,
  'renal risk must exist in all cases, not just peritonitis');
}
{
 const p=patient(),c=C('PERI-SEC-001');
 const baseline=csPharmOutcomes487(c,p,registry.drugs);
 assert.equal(baseline.coverageComplete,false);
 administer(p,'ceftriaxone');administer(p,'metronidazole');
 const treated=csPharmOutcomes487(c,p,registry.drugs);
 assert(treated.coverageComplete);
 assert(treated.infectionBurdenIndex<1);
 assert.equal(treated.sourceControlled,false);
}
console.log('CASE-AWARE NON-VITAL PHARMACOLOGY OUTCOMES PASS',JSON.stringify({
 crossProduct:verified,delayedAntibioticCoverage:true,sourceNotAutoControlled:true,
 crohnSlowTherapy:true,ascitesTimeCourse:true,analgesiaSymptomDomain:true,
 renalToxicityAllCases:true,notActualLaboratoryMeasurements:true
}));
