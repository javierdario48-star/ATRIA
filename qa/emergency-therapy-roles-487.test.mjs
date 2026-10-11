import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {PHARMA_RULES_487,BASE_CASE_PHARMACOLOGY_487,csPharmResponse487,csBuildPharmRegistry487} from '../src/clinical/pharmacology-registry-487.js';
import {csPharmOutcomes487} from '../src/clinical/pharmacology-outcomes-487.js';

const doc=fs.readFileSync('qa/ATRIA_487_EMERGENCY_THERAPY_ROLES_30.md','utf8');
const matches=[...doc.matchAll(/^\|\s*(\d{1,2})\s*\|\s*([a-z0-9_]+)\s*\|\s*([DC])\s*\|/gm)];
assert.equal(matches.length,30,'every executable therapy gets one reviewed care role');
const ids=matches.map(x=>x[2]);
assert.equal(new Set(ids).size,30,'no duplicate care role');
assert.deepEqual([...ids].sort(),[...Object.keys(PHARMA_RULES_487),'anticoagulation'].sort(),
 'role registry must match existing 29 declarations plus V19 heparin');
assert.deepEqual(matches.map(x=>Number(x[1])),Array.from({length:30},(_,i)=>i+1));
assert.equal(matches.filter(x=>x[3]==='D').length,11);
assert.equal(matches.filter(x=>x[3]==='C').length,19);
const requiredRisk=['amikacin','gentamicin','amphotericin','furosemide','espironolactona'];
for(const id of requiredRisk){
 const line=doc.split('\n').find(x=>new RegExp('^\\|\\s*\\d+\\s*\\|\\s*'+id+'\\s*\\|').test(x));
 assert(line&&/renal|nefro/i.test(line),'renal exception cannot be omitted '+id);
}
const html=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const a=html.indexOf('const MONITOR_THERAPY_CATALOG=['),b=html.indexOf('function findMonitorTherapy(',a);
const literal=vm.runInNewContext(html.slice(a,b)+';MONITOR_THERAPY_CATALOG');
assert.equal(literal.length,29);
const cstart=html.indexOf('const CASES=')+'const CASES='.length;
const cases=JSON.parse(html.slice(cstart).split('\n')[0].replace(/;\s*$/,''));
assert.equal(cases.length,13);
const registry=csBuildPharmRegistry487(literal,cases);
for(const id of Object.keys(BASE_CASE_PHARMACOLOGY_487))
 assert(doc.includes('| '+id+' |'),'case must be reviewed in emergency scope '+id);
const byId=id=>cases.find(c=>c.id===id);
const patient=(minute=0,renal=.8)=>({gameMinute:minute,monitorTherapies:new Map(),administrationLog:[],
 therapyTotals:{fluidMl:0},phys:{sourceControlled:false,renalReserve:renal}});
const give=(p,id)=>{p.monitorTherapies.set(id,{id,startedAt:p.gameMinute});
 p.administrationLog.push({id,m:p.gameMinute});};
const app=byId('APP-001'),p=patient();
assert.equal(csPharmOutcomes487(app,p,registry.drugs).coverageComplete,false);
give(p,'ceftriaxone');
assert.equal(csPharmOutcomes487(app,p,registry.drugs).coverageComplete,false);
give(p,'metronidazole');
const covered=csPharmOutcomes487(app,p,registry.drugs);
assert.equal(covered.coverageComplete,true,
 'properly confirmed initial antibiotic regimen satisfies care requirement immediately');
assert.equal(covered.infectionBurdenIndex,1,
 'treatment receipt must not instantly cure infection');
assert.equal(covered.sourceControlled,false,
 'antibiotics are not procedure execution');
p.phys.sourceControlled=true;
assert.equal(csPharmOutcomes487(app,p,registry.drugs).sourceControlled,true,
 'actual recorded source control differs from consult/order');
const peri=byId('PERI-PBE-001'),v=patient(0,.45);
give(v,'gentamicin');
const before=v.phys.renalReserve,renal=csPharmOutcomes487(peri,v,registry.drugs);
assert(renal.renalInjuryIndex>0,'existing index flags risk in vulnerable patient');
assert.equal(v.phys.renalReserve,before,
 'a single aminoglycoside administration cannot silently cause immediate renal function loss');
const abx=['ceftriaxone','metronidazole','imipenem','ceftazidime','cefoperazone','cefepime',
 'piptazo','ampicillin','amikacin','gentamicin','fluconazole','amphotericin'];
for(const c of cases)for(const id of abx){
 const response=csPharmResponse487(id,c,{liveVitals:{sys:76,dia:43,spo2:87},
  phys:{effectiveVolume:.45,renalReserve:.42}},240);
 assert.equal(response.offsets.sys,0,id+' must not directly raise BP in '+c.id);
 assert.equal(response.offsets.spo2,0,id+' must not directly raise SpO2 in '+c.id);
}
assert.equal(csPharmResponse487('anticoagulation',app,p,240).known,false,
 'heparin missing contract remains blocked; no synthetic clinical success');
console.log('ATRIA EMERGENCY ROLES QA PASS',JSON.stringify({
 roles:matches.length,dynamic:11,requirements:19,cases:cases.length,
 noInstantAntibioticCure:true,noAutomaticAminoglycosideRenalDamage:true,
 antimicrobialsNoDirectVitals:true,heparinContractBlocked:true,
 runtimeUnchanged:true,physicalDevice:false
}));
