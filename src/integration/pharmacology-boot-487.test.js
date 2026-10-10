import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {apply487} from './apply-487.js';
import {PHARMA_RULES_487} from '../clinical/pharmacology-registry-487.js';

const golden=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const integrated=apply487(golden);
function script(id){
 const marker='<script id="'+id+'">';
 assert.equal(integrated.split(marker).length,2,'one generated '+id+' script');
 return integrated.split(marker)[1].split('</script>')[0];
}
function between(start,end){
 const a=integrated.indexOf(start),b=integrated.indexOf(end,a+start.length);
 assert(a>=0&&b>a,'native source boundaries: '+start);
 return integrated.slice(a,b);
}
const caseStart=integrated.indexOf('const CASES=')+'const CASES='.length;
const seeds=JSON.parse(integrated.slice(caseStart).split('\n')[0].replace(/;\s*$/,''));
const native=vm.runInNewContext(between('const MONITOR_THERAPY_CATALOG=[','function findMonitorTherapy(')+';MONITOR_THERAPY_CATALOG');
const pharmacology=script('atria-case-aware-pharmacology-487');
const nativeFindIntervention=integrated.match(/^function findIntervention\(text\)\{.*\}$/m)?.[0];
assert(nativeFindIntervention,'native case-intervention lookup exists');
// Execute the actual immediate clinical-content initializer, including its
// heparin mutation. The later DOM/ward/variant sections are outside this test.
const v19=script('cs-safe-v0190'),boundary=v19.indexOf('// 2) CASE VARIABILITY');
assert(boundary>0,'V19 content/variant boundary exists');
const prefix=v19.slice(0,boundary);
const contentBootstrap=prefix.slice(0,prefix.lastIndexOf('// ============================================================'))+'\n})();';
new vm.Script(contentBootstrap);
const endpointNames=['defaultDoseForTherapy','therapyEffectTotals','updateSimulation','addMonitorTherapy'];
function runtime({bootstrap=true}={}){
 const ctx={window:{},CASES:structuredClone(seeds),MONITOR_THERAPY_CATALOG:structuredClone(native),
  document:{getElementById:()=>null,activeElement:null,body:{classList:{contains:()=>false}}},
  performance:{now:()=>0},selectedPlayMode:'solo',shiftSession:null,sheetOpen:false,floatMode:null,
  norm:x=>String(x).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''),
  complete:()=>{},nurseSay:()=>{},updateHud:()=>{},updateMonitorDOM:()=>{},mentorReactToAdministration:()=>false};
 ctx.vitalsNow=()=>ctx.sim.liveVitals;
 vm.createContext(ctx);
 vm.runInContext(nativeFindIntervention,ctx);
 vm.runInContext(between('function initialLiveVitals(){','function addGlobalChat('),ctx);
 vm.runInContext(between('function findMonitorTherapy(','function missingAlgorithmInterventions('),ctx);
 vm.runInContext(between('function updateOrders(){','function finishCase('),ctx);
 if(bootstrap)vm.runInContext(contentBootstrap,ctx,{timeout:5000});
 ctx.C=ctx.CASES.find(x=>x.id==='PERI-SEC-001');ctx.sim=ctx.freshSim();
 return ctx;
}
function saved(ctx){return {functions:endpointNames.map(k=>ctx[k]),catalog:JSON.stringify(ctx.MONITOR_THERAPY_CATALOG),
 cases:JSON.stringify(ctx.CASES),flag:ctx.window.__csPharmacology487,api:ctx.window.csPharm487};}
function unchanged(ctx,before){
 endpointNames.forEach((k,i)=>assert.equal(ctx[k],before.functions[i],k+' unchanged after rejection'));
 assert.equal(JSON.stringify(ctx.MONITOR_THERAPY_CATALOG),before.catalog,'rejection must not append even one future drug');
 assert.equal(JSON.stringify(ctx.CASES),before.cases,'rejection must not append a case');
 assert.equal(ctx.window.__csPharmacology487,before.flag,'installed flag unchanged');
 assert.equal(ctx.window.csPharm487,before.api,'public API unchanged');
}
function install(ctx){assert.doesNotThrow(()=>vm.runInContext(pharmacology,ctx,{timeout:5000}),
 'incomplete registry must reject cleanly before installing any wrapper');}
function advance(ctx){
 assert(ctx.addMonitorTherapy('Ringer 500 ml'),'native dose actually administered');
 assert.equal(ctx.sim.administrationLog.length,1);
 for(let i=0;i<120;i++)ctx.updateSimulation(1/60);
 return JSON.stringify({minute:ctx.sim.gameMinute,phys:ctx.sim.phys,vitals:ctx.sim.liveVitals,
  administrations:ctx.sim.administrationLog,totals:ctx.sim.therapyTotals});
}

// This is the real post-initializer catalogue, not the initial 29-entry literal.
const real=runtime(),beforeReal=saved(real);
assert(real.MONITOR_THERAPY_CATALOG.some(x=>x.id==='anticoagulation'),'actual initializer adds heparin');
const missing=real.MONITOR_THERAPY_CATALOG.filter(x=>!PHARMA_RULES_487[x.id]&&!x.pharmacology).map(x=>x.id);
install(real);
if(missing.length){
 unchanged(real,beforeReal);
 assert.equal(real.window.csPharm487Boot?.status,'rejected');
 assert.equal(real.window.csPharm487Boot.catalogCompatible,false);
 assert(real.window.csPharm487Boot.error.includes(missing[0]));
 assert.equal(advance(real),advance(runtime()),'rejected layer preserves actual native administration and clinical tick');
 install(real);unchanged(real,beforeReal);
}else{
 assert.equal(real.window.csPharm487Boot?.status,'installed');
 assert.equal(real.window.csPharm487Boot.catalogCompatible,true);
}

const future={id:'qa_boot_agent',label:'QA synthetic agent',aliases:['qa boot agent'],
 pharmacology:{classId:'test',route:'iv',onsetMin:1,peakMin:10,indications:['vasoplegia'],hazards:[],
  mechanism:'custom',response:{sys:4},defaultDose:{amount:5,unit:'mg',display:'5 mg'}}};
const incomplete={id:'qa_boot_procedure',label:'QA synthetic procedure',aliases:['qa boot procedure'],
 pharmacology:{classId:'test',route:'procedure',onsetMin:0,peakMin:1,indications:[],hazards:[],mechanism:'none'}};
const draft={id:'QA-BOOT-001',pharmacology:{traits:['vasoplegia'],newDrugs:[future,incomplete]}};
// Late integration validation must inspect ALL additions before publishing any.
const partial=runtime({bootstrap:false});partial.CASES.push(structuredClone(draft));
const beforePartial=saved(partial);install(partial);unchanged(partial,beforePartial);
assert.equal(partial.window.csPharm487Boot?.status,'rejected');
assert.match(partial.window.csPharm487Boot.error,/unreviewed future drug qa_boot_procedure/);

// Positive control uses an explicitly compatible fixture, not a fake heparin rule.
const valid=runtime({bootstrap:false});install(valid);
assert.equal(valid.window.__csPharmacology487,true);
assert.equal(valid.window.csPharm487Boot?.status,'installed');
assert.equal(valid.window.csPharm487Boot.catalogCompatible,true);
const afterInstall=saved(valid);install(valid);
endpointNames.forEach((k,i)=>assert.equal(valid[k],afterInstall.functions[i],'repeat install does not nest '+k));
assert.equal(valid.window.csPharm487,afterInstall.api);
valid.sim=null;
const beforeRegistration=saved(valid),summary=JSON.stringify(valid.window.csPharm487.summary());
assert.throws(()=>valid.window.csPharm487.registerCase(structuredClone(draft)),/unreviewed future drug/);
unchanged(valid,beforeRegistration);
assert.equal(JSON.stringify(valid.window.csPharm487.summary()),summary,'failed registration retains the registry');
const accepted={...structuredClone(draft),pharmacology:{traits:['vasoplegia'],newDrugs:[structuredClone(future)]}};
assert.equal(valid.window.csPharm487.registerCase(accepted).drugs,native.length+1);
assert.equal(valid.MONITOR_THERAPY_CATALOG.filter(x=>x.id===future.id).length,1);
assert.equal(valid.window.csPharm487.requiresIV(future.id),true);
assert.equal(valid.defaultDoseForTherapy(valid.MONITOR_THERAPY_CATALOG.at(-1),'qa boot agent').amount,5);

const result={postBootstrapCatalog:real.MONITOR_THERAPY_CATALOG.length,missingDefinitions:missing,
 actualCatalogCompatible:real.window.csPharm487Boot.catalogCompatible,
 safeRejection:true,nativeAdministrationAndTick:true,noPartialFutureRegistration:true,
 compatibleFixtureInstallsOnce:true,physicalAndroid:false,fullBrowserBoot:false};
console.log('PHARMACOLOGY ATOMIC BOOT REGRESSION PASS',JSON.stringify(result));
// Separate readiness gate: passing the safe-fallback regression is NOT readiness.
if(process.argv.includes('--require-compatible')&&!result.actualCatalogCompatible){
 console.error('PHARMACOLOGY CATALOG PROMOTION BLOCKED: '+real.window.csPharm487Boot.error);
 process.exitCode=1;
}
