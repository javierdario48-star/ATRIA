import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {csCriticalRescuePhysiology487} from './critical-rescue-487.js';
const native=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const part=(a,b)=>{const i=native.indexOf(a),j=native.indexOf(b,i+a.length);
 assert(i>=0&&j>i,'native block absent '+a);return native.slice(i,j)};
const clinical=part('function therapyActive(id){','const DEFAULT_THERAPY_DOSES={')+
 part('function doseAdequacy(id){','function applyImmediatePhysiology(t){')+
 part('function therapyEffectTotals(){','function setMonitorFeedback(msg,kind');
const C={id:'PERI-SEC-001',risk:'shock',vitals:{bp:'56/32',spo2:75},
 physiology:{engine:'peritonitis',sourceControlRequired:true,
  inflammationGrowth:.044,sourceGrowth:.035,thirdSpaceRate:.017,fluidResponsiveness:.86,
  coverageSets:[['ceftriaxone','metronidazole']],
  doseRules:{ceftriaxone:{amount:1000},metronidazole:{amount:500}}}};
const startVitals={temp:39.2,hr:160,rr:34,sys:56,dia:32,spo2:75};
function create(treat){
 const base={inflammation:.93,effectiveVolume:.37,svr:.48,contractility:.72,
  oxygenation:.69,renalReserve:.60,renalStress:.09,sourceControlled:false};
 const s={phys:{...base},physBaseline:{...base},physLastMinute:0,gameMinute:0,
  liveVitals:{...startVitals},monitorTherapies:new Map(),interventions:new Set(),
  interventionTimes:new Map(),adverseEvents:[],therapyTotals:{fluidMl:0},
  administrationLog:[],venousAccessCount:2};
 if(treat){
  const drugs=[['fluid',1000],['oxygen',4],['vasopressor',.05],['ceftriaxone',1000],['metronidazole',500]];
  for(const [id,amount]of drugs){s.monitorTherapies.set(id,{id,dose:{amount},startedAt:0});
    s.administrationLog.push({id,m:0,doseDisplay:String(amount)});
  }
  s.therapyTotals.fluidMl=1000;
  s.phys.effectiveVolume+=.065*2*C.physiology.fluidResponsiveness;
 }
 return s;
}
function run(treat){
 const sim=create(treat),ctx={sim,C,window:{nsApplyRecoveryTarget:()=>{}},
  initialLiveVitals:()=>({...startVitals}),
  medicationSafetyOffsets:()=>({temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0})};
 vm.createContext(ctx);vm.runInContext(clinical,ctx,{timeout:5000});
 const old=ctx.updatePhysiologyState;
 ctx.updatePhysiologyState=function(){
  const at=sim.gameMinute,prior=sim.physLastMinute;
  old();
  csCriticalRescuePhysiology487(sim,C,at-prior);
 };
 for(let i=1;i<=120;i++){
  sim.gameMinute=i*.1;ctx.updateLiveVitals(.30);
 }
 const v=sim.liveVitals;
 return {sys:v.sys,dia:v.dia,map:(v.sys+2*v.dia)/3,
  spo2:v.spo2,hr:v.hr,inflammation:sim.phys.inflammation,
  volume:sim.phys.effectiveVolume,source:sim.phys.sourceControlled};
}
const untreated=run(false),treated=run(true);
console.log('EXTREME SHOCK OBSERVED',JSON.stringify({treated,untreated}));
assert(treated.sys>75&&treated.map>45,'severely shocked patient becomes hemodynamically recoverable');
assert(treated.spo2>80,'severe hypoxemia responds to actually administered oxygen');
assert(treated.sys>untreated.sys+15,'treatment changes native blood pressure, not only a fatal flag');
assert(treated.spo2>untreated.spo2+4,'actual oxygen raises native saturation');
assert.equal(treated.source,false,'physiology never performs surgery');
assert(treated.inflammation>0,'infection not cleared by arbitrary resuscitation');
assert(untreated.map<45,'untreated refractory shock remains dangerous');
console.log('EXTREME SHOCK NATIVE VITALS PASS',JSON.stringify({treated,untreated}));
