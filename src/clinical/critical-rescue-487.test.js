import assert from 'node:assert/strict';
import vm from 'node:vm';
import {csCriticalRescueEvidence487,csCriticalRescuePhysiology487,csCriticalRescueWindow487} from './critical-rescue-487.js';
import {applyCriticalRescue487} from '../integration/critical-rescue-487.js';
const c={id:'PERI-SEC-001',risk:'shock',physiology:{engine:'peritonitis',fluidOverloadThresholdMl:2800}};
function patient(){
 return {caseEnded:false,patientDied:false,gameMinute:0,patientInstance:{uid:'e1'},
  phys:{effectiveVolume:.34,svr:.5,oxygenation:.67},
  physLastMinute:0,liveVitals:{sys:56,dia:30,hr:158,spo2:77},
  venousAccessCount:2,therapyTotals:{fluidMl:0},monitorTherapies:new Map(),
  administrationLog:[],consults:new Map(),events:[]};
}
const fatal={sys:56,dia:30,hr:158,spo2:77};
const s=patient();
assert.equal(csCriticalRescueEvidence487(s,c,fatal).supported,false);
s.monitorTherapies.set('fluid',{id:'fluid'});
assert.equal(csCriticalRescueEvidence487(s,c,fatal).supported,false,'an unadministered plan provides no rescue');
s.administrationLog.push({id:'fluid',m:0});s.therapyTotals.fluidMl=500;
assert.equal(csCriticalRescueEvidence487(s,c,fatal).supported,false,'untreated hypoxia needs real oxygen');
s.monitorTherapies.set('oxygen',{id:'oxygen'});s.administrationLog.push({id:'oxygen',m:0});
assert.equal(csCriticalRescueEvidence487(s,c,fatal).supported,true);
assert.equal(csCriticalRescueWindow487(s,c,fatal,30).protected,false,'rescue does not start until registered as a distinct event');
s._criticalSupport487={startedAtSec:2,elapsedSeconds:10};
assert.equal(csCriticalRescueWindow487(s,c,fatal,40).protected,true);
assert.equal(csCriticalRescueWindow487(s,c,fatal,67).protected,false,'no indefinite protection');
const before={...s.phys};
assert.equal(csCriticalRescuePhysiology487(s,c,.5),true);
assert(s.phys.effectiveVolume>before.effectiveVolume,'actual fluid must increase effective volume');
assert(s.phys.oxygenation>before.oxygenation,'oxygen must improve oxygenation');
assert.equal(s.phys.sourceControlled,undefined);
const fake=patient();fake.monitorTherapies.set('fluid',{id:'fluid'});fake.monitorTherapies.set('vasopressor',{id:'vasopressor'});
const state=JSON.stringify(fake.phys);
assert.equal(csCriticalRescuePhysiology487(fake,c,.5),false);
assert.equal(JSON.stringify(fake.phys),state,'marked active therapies without any dose do nothing');
s.gameMinute=7;
const aged={...s.phys};
assert.equal(csCriticalRescuePhysiology487(s,c,1),false,'a stale dose does not continuously generate extra volume');
assert.equal(JSON.stringify(s.phys),JSON.stringify(aged));
s.gameMinute=1;s.therapyTotals.fluidMl=3000;
assert.equal(csCriticalRescuePhysiology487(s,c,.5),true,'non-fluid oxygen support remains possible after fluid overload');
assert.equal(s.phys.effectiveVolume,aged.effectiveVolume,'fluid overload cannot create beneficial volume');
const injected=applyCriticalRescue487('<body></body>');
const source=injected.split('<script id="atria-critical-rescue-487">')[1].split('</script>')[0];
new vm.Script(source,{filename:'critical-rescue-487-runtime.js'});
const simulated=patient(),said=[],stats=[];
let sec=0;
const ctx={window:{},sim:simulated,C:c,nurseSay:x=>said.push(x),
 updatePhysiologyState:()=>{},
 csDeathRescueMissing:()=>true,
 updateSimulation(dt){
  const v=ctx.sim.liveVitals,map=(v.sys+2*v.dia)/3;
  // Same threshold/predicate from ATRIA's native fatal exposure.
  if((map<45||v.spo2<80||v.sys<=58&&v.hr>=150)&&ctx.csDeathRescueMissing(v,map))
    ctx.sim._fatalExposure=(ctx.sim._fatalExposure||0)+dt*.20;
  else ctx.sim._fatalExposure=Math.max(0,(ctx.sim._fatalExposure||0)-dt*.14);
 }};
vm.runInNewContext(source,ctx,{timeout:5000});
function advance(n){for(let i=0;i<n*4;i++){sec+=.25;ctx.updateSimulation(.25)}}
advance(5);
assert(simulated._fatalExposure>=.9,'untreated extreme shock accumulates critical injury');
ctx.sim=patient();let treated=ctx.sim;
treated.monitorTherapies.set('fluid',{id:'fluid'});treated.monitorTherapies.set('oxygen',{id:'oxygen'});
treated.administrationLog.push({id:'fluid',m:0},{id:'oxygen',m:0});treated.therapyTotals.fluidMl=500;
advance(8);
assert.equal(treated._fatalExposure||0,0,'actual fluid and oxygen open a bounded recovery window');
assert.equal(said.length,1,'one clinical acknowledgement');
const anchor=treated._criticalSupport487.startedAtSec;
treated.administrationLog.push({id:'fluid',m:1},{id:'oxygen',m:1});
advance(30);
assert.equal(treated._criticalSupport487.startedAtSec,anchor,'redosing never resets a rescue interval');
assert.equal(treated._fatalExposure||0,0);
treated.liveVitals={sys:86,dia:54,hr:116,spo2:91};
advance(40);
assert.equal(treated._fatalExposure||0,0,'actual vital recovery prevents death without permanent grace');
treated.liveVitals={...fatal};advance(10);
assert(treated._fatalExposure>0,'persistent recurrent lethal shock can deteriorate AFTER finite window');
const second=patient();ctx.sim=second;advance(3);
assert(second._fatalExposure>0,'no rescue awarded to a second untreated patient');
console.log('CRITICAL RESCUE POLICY BOTS PASS',JSON.stringify({
 fatalInitial:true,pendingNoRescue:true,requiresOxygenWhenHypoxic:true,
 improvesVolume:true,noMedicationFabrication:true,repeatedDosesNoReset:true,
 fullResponseSurvives:true,lateDeteriorationPossible:true,sharedPatientClock:false}));
