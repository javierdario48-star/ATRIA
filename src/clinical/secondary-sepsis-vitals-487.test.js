import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {csSecondaryBridgePhysiology487} from './secondary-sepsis-bridge-487.js';
const native=fs.readFileSync('vendor/atria-4.8.6/index.html','utf8');
const part=(a,b)=>{const x=native.indexOf(a),y=native.indexOf(b,x+a.length);
 assert(x>=0&&y>x,a+' must be in golden master');return native.slice(x,y);};
const nativePhys=part('function therapyActive(id){','const DEFAULT_THERAPY_DOSES={')+
 part('function doseAdequacy(id){','function applyImmediatePhysiology(t){')+
 part('function therapyEffectTotals(){','function setMonitorFeedback(msg,kind');
const C={id:'PERI-SEC-001',vitals:{bp:'86/50',spo2:92},
 physiology:{engine:'peritonitis',sourceControlRequired:true,
  inflammationGrowth:.044,sourceGrowth:.035,thirdSpaceRate:.017,fluidResponsiveness:.86,
  coverageSets:[['ceftriaxone','metronidazole']],doseRules:{ceftriaxone:{amount:1000},metronidazole:{amount:500}}}};
function sim(treated){
 const baseline={inflammation:.78,effectiveVolume:.6,svr:.68,contractility:.88,oxygenation:.90,renalReserve:.70,renalStress:0,sourceControlled:false};
 const s={phys:{...baseline},physBaseline:{...baseline},physLastMinute:0,gameMinute:0,
  liveVitals:{temp:38.9,hr:128,rr:30,sys:86,dia:50,spo2:92},monitorTherapies:new Map(),
  interventions:new Set(),interventionTimes:new Map(),therapyTotals:{fluidMl:0},
  administrationLog:[],adverseEvents:[],consults:new Map(),venousAccessCount:1};
 if(treated){
  s.therapyTotals.fluidMl=500;
  s.phys.effectiveVolume+=.065*.86;
  for(const [id,amount] of [['oxygen',4],['fluid',500],['ceftriaxone',1000],['metronidazole',500]]){
   s.monitorTherapies.set(id,{id,dose:{amount},startedAt:0});s.administrationLog.push({id,m:0});
  }
  s.consults.set('cirugia',{status:'done',accepted:true});
 }
 return s;
}
function run(treated){
 const s=sim(treated),ctx={sim:s,C,window:{nsApplyRecoveryTarget:()=>{}},
  initialLiveVitals:()=>({temp:38.9,hr:128,rr:30,sys:86,dia:50,spo2:92}),
  medicationSafetyOffsets:()=>({temp:0,hr:0,rr:0,sys:0,dia:0,spo2:0})};
 vm.createContext(ctx);vm.runInContext(nativePhys,ctx,{timeout:5000});
 const original=ctx.updatePhysiologyState;
 ctx.updatePhysiologyState=()=>{
  const at=ctx.sim.gameMinute,previousMinute=ctx.sim.physLastMinute,
  before={inflammation:ctx.sim.phys.inflammation,effectiveVolume:ctx.sim.phys.effectiveVolume};
  const output=original();
  csSecondaryBridgePhysiology487(ctx.sim,C,before,at-previousMinute);
  return output;
 };
 const result=[{m:0,sys:s.liveVitals.sys,spo2:s.liveVitals.spo2,volume:s.phys.effectiveVolume}];
 for(let i=1;i<=100;i++){
  s.gameMinute=i*.10;ctx.updateLiveVitals(.30);
  if([10,30,60,100].includes(i))result.push({m:s.gameMinute,sys:s.liveVitals.sys,
   spo2:s.liveVitals.spo2,volume:s.phys.effectiveVolume});
 }
 return {s,result};
}
const good=run(true),bad=run(false);
assert(good.s.liveVitals.spo2>bad.s.liveVitals.spo2+3,
 'native live monitor SpO2 must improve with oxygen');
assert(good.s.liveVitals.sys>bad.s.liveVitals.sys+7,
 'native live BP must reflect effective fluid+septic support');
assert(good.s.phys.effectiveVolume>bad.s.phys.effectiveVolume);
assert.equal(good.s.phys.sourceControlled,false,'surgical handoff is not automatic source control');
assert(good.s.phys.inflammation>good.s.physBaseline.inflammation,
 'active infection does not vanish before surgery');
console.log('NATIVE SEPSIS LIVE VITALS PASS',JSON.stringify({
 treated:good.result,untreated:bad.result,sourceControlInvented:false}));
