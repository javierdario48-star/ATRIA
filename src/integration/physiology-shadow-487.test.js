import assert from 'node:assert/strict';
import fs from 'node:fs';
assert(fs.existsSync(new URL('./physiology-shadow-487.js',import.meta.url)),
 'B1 shadow observer must exist and never own the native patient');
const {createPhysiologyShadow487,samplePhysiologyShadow487}=await import('./physiology-shadow-487.js');
const {createNativeReferenceRuntime487,orderNativeReference487,advanceNativeReference487}=
 await import('../../qa/physiology-pilot/native-reference-487.mjs');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const fixture=()=>({gameMinute:0,patientInstance:{uid:'shadow-test'},
 liveVitals:{sys:94,dia:58,hr:118,rr:22,spo2:97,temp:36.6},phys:null,
 administrationLog:[],monitorTherapies:new Map(),pendingTherapies:new Map([['fluid',{dose:{amount:500,unit:'ml'}}]])});
const caseDef={id:'HDA-001',initial:{sys:94,dia:58,hr:118,rr:22,spo2:97,temp:36.6}};
const clock={mode:'native-no-typing',nativeMinutesPerClinicalMinute:.12};
const row=(id='fluid',count=1,m=.096,doseDisplay='500 ml')=>({id,count,m,doseDisplay,defaultApplied:false});
let checks=0;
const check=(name,fn)=>{try{fn();checks++;}catch(e){e.message=name+': '+e.message;throw e;}};

check('pure observer accepts deeply frozen patient and ignores pending/current-map treatments',()=>{
 const p=freeze(fixture()),s=createPhysiologyShadow487(caseDef,p,{clock});
 const a=samplePhysiologyShadow487(s,p,{typing:false});
 assert.equal(a.state.administeredFluidMl,0);assert.equal(a.samples.length,1);
 assert.equal(p.administrationLog.length,0);assert.equal(p.pendingTherapies.size,1);
 assert.equal(s.samples.length,0);assert.equal(s.state.requestedClinicalMinute,0);
});
check('confirmed ledger doses act once and historical doses never come from latest active map',()=>{
 const p=fixture(),s=createPhysiologyShadow487(caseDef,p,{clock});
 p.gameMinute=1;p.administrationLog=[row()];p.monitorTherapies.set('fluid',{dose:{amount:3000,unit:'ml'}});
 const original=JSON.stringify(p),a=samplePhysiologyShadow487(freeze(s),freeze(p),{typing:false});
 assert.equal(a.state.administeredFluidMl,500);assert.equal(JSON.stringify(p),original);
 const b=samplePhysiologyShadow487(a,p,{typing:false});assert.equal(b.state.administeredFluidMl,500);
 assert.equal(a.state.requestedClinicalMinute,1/.12);
 assert.equal(a.samples[0].delta.sys,a.samples[0].experimental.sys-p.liveVitals.sys);
 assert.equal(a.samples[0].nativePhysiology,null);
});
check('wrong/missing patient and untracked initial treatment history reject',()=>{
 const p=fixture(),s=createPhysiologyShadow487(caseDef,p,{clock});
 assert.throws(()=>samplePhysiologyShadow487(s,{...p,patientInstance:{uid:'other'}},{typing:false}),/patient/i);
 assert.throws(()=>createPhysiologyShadow487(caseDef,{...p,gameMinute:1},{clock}),/initial|checkpoint/i);
 assert.throws(()=>createPhysiologyShadow487(caseDef,{...p,administrationLog:[row()]},{clock}),/initial|history/i);
});
check('clock mapping is explicit; typing and reverse clock cannot be silently converted',()=>{
 const p=fixture();assert.throws(()=>createPhysiologyShadow487(caseDef,p),/clock/i);
 const s=createPhysiologyShadow487(caseDef,p,{clock});
 assert.throws(()=>samplePhysiologyShadow487(s,p,{typing:true}),/typing/i);
 const a=samplePhysiologyShadow487(s,{...p,gameMinute:1},{typing:false});
 assert.throws(()=>samplePhysiologyShadow487(a,p,{typing:false}),/clock|reverse/i);
});
check('unsupported catalogue treatments are reported without invented effect',()=>{
 const p=fixture(),s=createPhysiologyShadow487(caseDef,p,{clock});
 p.gameMinute=1;p.administrationLog=[row('anticoagulation',1,.1,'5000 UI')];
 const a=samplePhysiologyShadow487(s,p,{typing:false});
 assert.equal(Object.keys(a.state.seenEvents).length,0);
 assert(a.issues.some(x=>x.drugId==='anticoagulation'&&x.code==='unsupported-by-pilot'));
});
check('malformed legacy dose and missing or conflicting history reject explicitly',()=>{
 const p=fixture(),s=createPhysiologyShadow487(caseDef,p,{clock});p.gameMinute=1;
 for(const entry of [row('fluid',1,.1,'500 mg'),row('fluid',1,.1,'administrado'),row('fluid',2,.1,'500 ml')]){
  p.administrationLog=[entry];assert.throws(()=>samplePhysiologyShadow487(s,p,{typing:false}),/dose|unit|history/i);
 }
 p.administrationLog=[row()];const a=samplePhysiologyShadow487(s,p,{typing:false});
 p.administrationLog=[row('fluid',1,.096,'1000 ml')];
 assert.throws(()=>samplePhysiologyShadow487(a,p,{typing:false}),/conflict/i);
});
check('typed administration events preserve route, explicit time, status and stops',()=>{
 const p=fixture(),s=createPhysiologyShadow487(caseDef,p,{clock:{mode:'clinical'}});
 p.administrationLog=[{eventId:'o',patientId:'shadow-test',drugId:'oxygen',status:'pending',
  action:'start',route:'inhaled',dose:{amount:4,unit:'L/min'},atClinicalMinute:0}];
 const pending=samplePhysiologyShadow487(s,p,{atClinicalMinute:2});assert.equal(pending.state.oxygenFlowLpm,0);
 p.administrationLog=[{...p.administrationLog[0],status:'administered',atClinicalMinute:2}];
 const started=samplePhysiologyShadow487(pending,p,{atClinicalMinute:5});assert.equal(started.state.oxygenFlowLpm,4);
 p.administrationLog.push({eventId:'o-stop',patientId:'shadow-test',drugId:'oxygen',status:'administered',
  action:'stop',route:'inhaled',atClinicalMinute:5,sequence:1});
 const ended=samplePhysiologyShadow487(started,p,{atClinicalMinute:8});assert.equal(ended.state.oxygenFlowLpm,0);
 assert(ended.state.oxygenSupport<.001);
});
check('actual native asynchronous administration and endpoints remain untouched',()=>{
 const r=createNativeReferenceRuntime487({caseId:'HDA-001'}),p=r.ctx.sim;
 const names=['addMonitorTherapy','updateSimulation','therapyEffectTotals','applyImmediatePhysiology'];
 const functions=names.map(k=>r.ctx[k]);
 let shadow=createPhysiologyShadow487(r.ctx.C,p,{clock});
 orderNativeReference487(r,{id:'fluid',text:'Ringer 500 ml'});
 shadow=samplePhysiologyShadow487(shadow,p,{typing:false});assert.equal(shadow.state.administeredFluidMl,0);
 advanceNativeReference487(r,.096);
 const before=JSON.stringify(p),maps=[p.monitorTherapies,p.pendingTherapies];
 shadow=samplePhysiologyShadow487(shadow,p,{typing:false});
 assert.equal(shadow.state.administeredFluidMl,0,'receipt waits at most one fixed-grid quantum');
 assert.equal(shadow.state.pendingEvents.length,1);assert.equal(JSON.stringify(p),before);
 assert.equal(p.monitorTherapies,maps[0]);assert.equal(p.pendingTherapies,maps[1]);
 names.forEach((k,i)=>assert.equal(r.ctx[k],functions[i]));
 advanceNativeReference487(r,.12);
 shadow=samplePhysiologyShadow487(shadow,p,{typing:false});
 assert.equal(shadow.state.administeredFluidMl,500);
 assert.equal(r.ctx.window.csPharm487Boot.status,'rejected');
});
console.log('PHYSIOLOGY SHADOW487 PASS',JSON.stringify({checks,nativeWrites:0,runtimeHooks:0,unsupportedHeparin:'reported-only'}));
