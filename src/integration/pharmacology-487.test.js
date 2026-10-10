import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import {apply487} from './apply-487.js';
const golden=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const integrated=apply487(golden);
const marker='<script id="atria-case-aware-pharmacology-487">';
assert.equal(integrated.split(marker).length,2,'pharmacology must inject once only');
const source=integrated.split(marker)[1].split('</script>')[0];
new vm.Script(source);
const a=golden.indexOf('const CASES=')+'const CASES='.length;
const cases=JSON.parse(golden.slice(a).split('\n')[0].replace(/;\s*$/,''));
const x=golden.indexOf('const MONITOR_THERAPY_CATALOG=['),y=golden.indexOf('function findMonitorTherapy(',x);
const native=vm.runInNewContext(golden.slice(x,y)+';MONITOR_THERAPY_CATALOG');
function patient(uid,vals={sys:112,dia:72,spo2:98}){
 return {patientInstance:{uid},liveVitals:vals,monitorTherapies:new Map(),administrationLog:[],
 therapyExposure:new Map(),therapyTotals:{fluidMl:0},interventions:new Set(),
 adverseEvents:[],events:[],gameMinute:350,caseEnded:false};
}
const cirr=cases.find(c=>c.id==='CIRR-001'),septic=cases.find(c=>c.id==='PERI-SEC-001'),bleed=cases.find(c=>c.id==='HDA-001');
const messages=[];
const ctx={
 window:{},CASES:cases.slice(),MONITOR_THERAPY_CATALOG:native.slice(),
 C:cirr,sim:patient('cirr',{sys:110,dia:70,spo2:99}),
 nurseSay:t=>messages.push(t),
 defaultDoseForTherapy:()=>({amount:1,unit:'dosis',display:'1 dosis',defaultApplied:true}),
 therapyEffectTotals:function(){
  const offsets={temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0};
  for(const x of ctx.sim.monitorTherapies.values())for(const [k,v] of Object.entries(x.effects||{}))
   offsets[k]=(offsets[k]||0)+v;
  return offsets;
 },
 addMonitorTherapy:function(text){
  const t=ctx.MONITOR_THERAPY_CATALOG.find(x=>x.aliases?.some(a=>text.toLowerCase().includes(a.toLowerCase())));
  if(!t)return false;
  const dose=ctx.defaultDoseForTherapy(t,text);
  const row={id:t.id,label:t.label,doseDisplay:dose.display};
  ctx.sim.administrationLog.push(row);
  ctx.sim.monitorTherapies.set(t.id,{...t,startedAt:2,dose});
  return true;
 }
};
vm.createContext(ctx);
vm.runInContext(source,ctx,{timeout:5000});
assert.deepEqual(JSON.parse(JSON.stringify(ctx.window.csPharm487.summary())),{cases:13,drugs:native.length});
assert(ctx.window.csPharm487.drugs().some(x=>x.id==='furosemide'));
assert.equal(ctx.window.csPharm487.requiresIV('cefepime'),true);
// The actual installed monitor wrapper, not merely a pure scientific estimate.
const oxygen=native.find(x=>x.id==='oxygen');
ctx.sim.monitorTherapies.set('oxygen',{...oxygen,startedAt:2,dose:{amount:4}});
assert.equal(ctx.therapyEffectTotals().spo2,0,
 'normal 99% SpO2 must no longer rise 6 points just for oxygen in cirrhosis');
ctx.C=bleed;ctx.sim=patient('bleed',{sys:83,dia:45,spo2:96});
const fluid=native.find(x=>x.id==='fluid');
ctx.sim.monitorTherapies.set('fluid',{...fluid,startedAt:2,dose:{amount:500}});
const f=ctx.therapyEffectTotals();
assert(f.sys>0&&f.sys<14,'bleeding/hypovolemia should receive a conditional, not flat +14 systolic bonus');
assert(f.hr<0,'volume responds with expected compensatory tachycardia reduction');
ctx.sim.monitorTherapies.get('fluid').dose.amount=250;
const smaller=ctx.therapyEffectTotals();
assert(smaller.sys>0&&smaller.sys<f.sys,'250ml must have a smaller simulated benefit than 500ml');
const blood=native.find(x=>x.id==='transfusion');
ctx.sim.monitorTherapies.set('transfusion',{...blood,startedAt:2,dose:{amount:1}});
assert.equal(ctx.therapyEffectTotals().spo2,0,'transfusion cannot directly increase pulse-ox saturation');
ctx.C=septic;ctx.sim=patient('sepsis',{sys:60,dia:35,spo2:85});
ctx.sim.monitorTherapies.set('oxygen',{...oxygen,startedAt:2,dose:{amount:4}});
assert.equal(ctx.therapyEffectTotals().spo2,6,'native septic oxygen-rescue target remains intact');
assert(ctx.window.csPharm487.preview('furosemide',septic.id,ctx.sim).offsets.sys<0);
assert(ctx.window.csPharm487.preview('vasopressor',septic.id,ctx.sim).offsets.sys>0);
// New case brings its globally available drug with a mandatory pharmacology
// mechanism; existing cases automatically inherit that rule without editing.
const novel={id:'qa_novel_drug',label:'In-game experimental agent',
 aliases:['experimental agent'],effects:{},
 pharmacology:{classId:'test',route:'iv',onsetMin:1,peakMin:10,
 indications:['vasoplegia'],hazards:['hypotension'],
 mechanism:'custom',response:{sys:4,dia:2},
 defaultDose:{amount:5,unit:'mg',display:'5 mg'}}};
ctx.sim=null;
assert.throws(()=>ctx.window.csPharm487.registerCase({id:'BAD-NO-PHARMACOLOGY'}),
 /requires explicit/);
const newCase={id:'FUTURE-001',vitals:{bp:'105/70',spo2:97},
 pharmacology:{traits:['vasoplegia','infection'],newDrugs:[novel]}};
const updated=ctx.window.csPharm487.registerCase(newCase);
assert.equal(updated.cases,14);assert.equal(updated.drugs,native.length+1);
assert.equal(ctx.MONITOR_THERAPY_CATALOG.filter(x=>x.id===novel.id).length,1);
assert(ctx.window.csPharm487.requiresIV(novel.id));
assert.equal(ctx.defaultDoseForTherapy(ctx.MONITOR_THERAPY_CATALOG.at(-1),'experimental agent').amount,5);
assert.equal(ctx.window.csPharm487.preview(novel.id,'CIRR-001',patient('cirr'),100).offsets.sys,0,
 'a newly introduced drug must not give beneficial effect to unrelated existing cases');
assert.equal(ctx.window.csPharm487.preview(novel.id,'FUTURE-001',patient('future'),100).offsets.sys,4);
assert.equal(ctx.window.csPharm487.preview(novel.id,'PERI-SEC-001',patient('sepsis'),100).offsets.sys,4);
ctx.C=newCase;ctx.sim=patient('future');
assert(ctx.addMonitorTherapy('experimental agent'));
assert.equal(ctx.sim.administrationLog[0].id,novel.id);
assert.equal(ctx.sim.administrationLog[0].doseDisplay,'5 mg');
assert.equal(ctx.therapyEffectTotals().sys,4,
 'new drug acts in the live monitor on a case requiring the targeted mechanism');
assert(!ctx.sim.patientDied,'no new mortality path');
console.log('DYNAMIC PHARMACOLOGY MONITOR INTEGRATION PASS',JSON.stringify({
 injected:true,nativeCatalog:native.length,nativeCases:cases.length,
 existingShockResponse:true,normalOxygenNoFakeGain:true,transfusionNoFakeSpo2:true,
 sepsisRescuePreserved:true,futureDrugAllCases:true,futureDrugRealMonitor:true,
 reviewedDefaultDose:true,clinicalDeathSubsystemUnchanged:true,physicalAndroid:false
}));
