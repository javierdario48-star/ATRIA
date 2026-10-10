import assert from 'node:assert/strict';
import './native-default-doses-487.test.js';
import vm from 'node:vm';
import {csSecondaryBridgeEvidence487,csSecondaryBridgePhysiology487} from './secondary-sepsis-bridge-487.js';
import {applySecondaryBridge487} from '../integration/secondary-sepsis-bridge-487.js';
const C={id:'PERI-SEC-001',vitals:{spo2:92},physiology:{sourceControlRequired:true}};
function fixture(){
 const p={inflammation:.78,effectiveVolume:.6,svr:.68,contractility:.88,sourceControlled:false};
 return {playMode:'solo',caseEnded:false,patientDied:false,gameMinute:0,phys:{...p},
  physLastMinute:0,liveVitals:{sys:86,dia:50,spo2:92,hr:128},venousAccessCount:1,
  monitorTherapies:new Map(),administrationLog:[],therapyTotals:{fluidMl:0},events:[],
  consults:new Map(),patientInstance:{uid:'elena'}};
}
function admin(s,id,amount,display){
 s.monitorTherapies.set(id,{id,dose:{amount,display,defaultApplied:true},startedAt:s.gameMinute});
 s.administrationLog.push({id,doseDisplay:display,defaultApplied:true,m:s.gameMinute});
 if(id==='fluid')s.therapyTotals.fluidMl+=amount;
}
function treat(s){
 admin(s,'oxygen',4,'4 L/min');
 admin(s,'fluid',500,'500 ml');
 admin(s,'ceftriaxone',1000,'1 g');
 admin(s,'metronidazole',500,'500 mg');
 s.consults.set('cirugia',{status:'done',accepted:true});
}
const untreated=fixture(),treated=fixture(),ordered=fixture();
treat(treated);
ordered.monitorTherapies.set('fluid',{id:'fluid'});
ordered.csPhase4Pending487=[{id:'ceftriaxone'},{id:'metronidazole'}];
ordered.consults.set('cirugia',{status:'done',accepted:true});
assert.equal(csSecondaryBridgeEvidence487(untreated,C).ready,false);
assert.equal(csSecondaryBridgeEvidence487(ordered,C).ready,false,'orders without administration are never sufficient');
assert.equal(csSecondaryBridgeEvidence487(treated,C).ready,true);
assert.equal(treated.administrationLog.every(x=>x.defaultApplied),true,'default doses count');
function nativeMinute(s){
 const p=s.phys,before={inflammation:p.inflammation,effectiveVolume:p.effectiveVolume};
 p.inflammation+=.079;p.effectiveVolume-=.024;p.svr-=.009;p.contractility-=.006;
 return before;
}
const u=nativeMinute(untreated),t=nativeMinute(treated);
assert.equal(csSecondaryBridgePhysiology487(untreated,C,u,1).applied,false);
assert.equal(csSecondaryBridgePhysiology487(treated,C,t,1).applied,true);
assert(treated.phys.inflammation<untreated.phys.inflammation,'slower infection growth');
assert(treated.phys.effectiveVolume>untreated.phys.effectiveVolume,'measurable effective perfusion volume');
assert(treated.phys.svr>untreated.phys.svr,'physiological shock compensation');
assert.equal(treated.phys.sourceControlled,false,'antibiotics do not simulate surgery');
const before={...treated.phys};treated.consults.get('cirugia').status='pending';
assert.equal(csSecondaryBridgePhysiology487(treated,C,before,1).applied,false,'no unaccepted consultation bonus');
treat(treated);
treated.phys.sourceControlled=true;
assert.equal(csSecondaryBridgePhysiology487(treated,C,before,1).applied,false,'already controlled source uses the normal recovery motor');
const compiled=applySecondaryBridge487('<body></body>');
const body=compiled.split('<script id="atria-secondary-sepsis-bridge-487">')[1].split('</script>')[0];
new vm.Script(body,{filename:'secondary-sepsis-adapter'});
let sim=fixture(),time=0;
treat(sim);
const notifications=[],timers=[],dispositions=[],calls=[];
const ctx={sim,C,selectedPlayMode:'solo',window:{__csSecondaryBridge487:false,
 csPeritonitisAssessment487:()=>({ready:true,action:'quirofano',missing:[]}),
 csSetDisposition:id=>{dispositions.push(id);sim.disposition={id};return true},
 csWithPatientStateV203:(target,id,fn)=>fn()},nurseSay:x=>notifications.push(x),
 setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},
 updatePhysiologyState(){const p=ctx.sim.phys;ctx.sim.physLastMinute=ctx.sim.gameMinute;
  p.inflammation+=.079;p.effectiveVolume-=.024;p.svr-=.009;},
 updateSimulation(dt){calls.push(dt);ctx.sim.gameMinute+=1;ctx.updatePhysiologyState();return true},
 finishCase:()=>{ctx.sim.caseEnded=true}};
vm.runInNewContext(body,ctx,{timeout:4000});
const pre={...sim.phys};ctx.updateSimulation(1);
assert(sim.phys.inflammation-pre.inflammation<.079,'real updateSimulation bridge limits source growth');
assert.equal(timers.length,1,'accepted Surgery schedules precisely one transfer');
assert.equal(timers[0].ms,3200);
ctx.updateSimulation(1);ctx.updateSimulation(1);
assert.equal(timers.length,1,'polling does not duplicate surgical arrival');
assert.equal(sim.caseEnded,false,'transfer is not silently completed at consultation');
timers.shift().fn();
assert.deepEqual(dispositions,['quirofano']);
assert.equal(sim.caseEnded,true);
assert.equal(sim.phys.sourceControlled,false,'no imaginary surgery at transfer');
assert(notifications.some(x=>/equipo de Cirug[ií]a recibi[oó]/.test(x)),'actual handoff notification');
const noCare=fixture();ctx.sim=noCare;ctx.updateSimulation(1);
assert.equal(timers.length,0,'untreated patient cannot auto-transfer');
const noConsult=fixture();treat(noConsult);noConsult.consults.get('cirugia').status='pending';
ctx.sim=noConsult;ctx.updateSimulation(1);
assert.equal(timers.length,0,'unaccepted surgery cannot auto-transfer');
console.log('SECONDARY SEPSIS BRIDGE BOTS PASS',JSON.stringify({
 defaultDoseEntries:4,hemodynamicResponse:true,sourceStillUncontrolled:true,
 transferOnce:true,transferredInMs:3200,untreatedBlocked:true,pendingConsultBlocked:true,
 androidPhysical:false}));
