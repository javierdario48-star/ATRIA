import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487,serializeNativePatient487} from '../../qa/physiology-live/native-journey-487.mjs';
const module=await import('./physiology-ringer-owner-487.js').catch(()=>({}));
assert.equal(typeof module.installRingerPhysiologyQA487,'function','a limited Ringer owner must exist');
function port(r){const c=r.ctx;return {
 read:()=>({patient:c.sim,caseDef:c.C,mode:c.selectedPlayMode,hidden:false,shiftActive:!!c.shiftSession?.active,
  nursingBusy:!!c.nurse?.task||!!c.nurse?.queue?.length,nativeRate:c.document.activeElement?.id==='dieInput'?.03:.12}),
 getAdministration:()=>c.recordAdministration,setAdministration:f=>{c.recordAdministration=f;},
 getImmediate:()=>c.applyImmediatePhysiology,setImmediate:f=>{c.applyImmediatePhysiology=f;},
 getPhysiology:()=>c.updatePhysiologyState,setPhysiology:f=>{c.updatePhysiologyState=f;},
 getProgression:()=>c.progressionOffsets,setProgression:f=>{c.progressionOffsets=f;}
 ,getNursing:()=>c.nurseNatural,setNursing:f=>{c.nurseNatural=f;},parseNursing:text=>c.window.csNurseVoice487.parse(text)
 ,getDelivery:()=>c.addMonitorTherapy,setDelivery:f=>{c.addMonitorTherapy=f;},
 resolveDelivery:text=>{const t=c.findMonitorTherapy(text);if(t)t.dose=c.parseTherapyOrder(text,t);return t;},
 rejectDelivery:reason=>c.nurseSay(reason)
};}
function experiment({volume}={}){
 const r=createLiveNativeJourney487('PERI-SEC-001');
 if(volume!==undefined)r.ctx.sim.phys.effectiveVolume=volume;
 const owner=module.installRingerPhysiologyQA487(port(r));
 r.ctx.window.csPhysiologyQA487={ownsRinger:owner.owns,ringerCompletionAllowed:owner.completionAllowed};
 return {r,owner};
}
const order=(r,ml)=>r.ctx.nurseNatural('enfermera Ringer '+ml+' ml IV');
const advance=(r,s)=>advanceLiveNativeJourney487(r,s);
const writes=r=>{const list=[],p=r.ctx.sim.phys;let v=p.effectiveVolume;
 Object.defineProperty(p,'effectiveVolume',{enumerable:true,configurable:true,get:()=>v,set:n=>{list.push({before:v,after:n,stack:new Error().stack});v=n;}});return list;};
let checks=0;function check(name,fn){fn();checks++;console.log('RINGER OWNER PASS',name);}
check('pending Ringer has no receipt, volume or protection credit',()=>{
 const {r,owner}=experiment();order(r,500);advance(r,.5);
 assert.equal(r.ctx.sim.administrationLog.length,0);assert.equal(owner.report().state.administeredFluidMl,0);
 assert.equal(owner.report().applications,0);
});
check('one actual nurse dose invokes B1 once and suppresses legacy fluid writers',()=>{
 const {r,owner}=experiment(),trace=writes(r);
 order(r,500);advance(r,1);
 const report=owner.report();assert.equal(report.applications,1);
 assert.equal(report.state.administeredFluidMl,500);assert(report.state.interstitialFluidMl>360&&report.state.interstitialFluidMl<375,'attributed fluid load begins decaying without a second effect writer');
 const bolus=trace.filter(x=>x.stack.includes('applyRingerReceipt487'));
 assert.equal(bolus.length,1);assert(Math.abs(bolus[0].after-bolus[0].before-.025)<1e-12);
 assert(!trace.some(x=>x.after>x.before&&x.stack.includes('csCriticalRescuePhysiology487')));
 assert.equal(r.ctx.sim.therapyTotals.fluidMl,500);assert.equal(r.ctx.sim.administrationLog.length,1);
 assert.equal(r.ctx.sim.administrationLog[0].pharmacology487.route,'iv');
 assert.equal(r.ctx.sim.administrationLog[0].pharmacology487.schemaVersion,2);
 assert.equal(r.ctx.sim.phys.sourceControlled,false);
 const before=serializeNativePatient487(r.ctx.sim);
 r.ctx.applyImmediatePhysiology(r.ctx.sim.monitorTherapies.get('fluid'));
 assert.equal(serializeNativePatient487(r.ctx.sim),before,'the same administration cannot be applied twice');
});
check('repeat doses use current circulation and retain individual native evidence',()=>{
 const {r,owner}=experiment();order(r,500);advance(r,30);order(r,500);advance(r,1);
 assert.equal(owner.report().applications,2);assert(owner.report().state.interstitialFluidMl>375&&owner.report().state.interstitialFluidMl<750,'older bolus load fades; repeated bolus adds only its new share');
 assert.equal(r.ctx.sim.administrationLog.length,2);assert.equal(r.ctx.sim.therapyTotals.fluidMl,1000);
});
check('native fluid toxicity is replaced by physiology-derived B1 overload once',()=>{
 const {r,owner}=experiment({volume:1.05});order(r,3000);advance(r,1);
 assert(owner.report().state.fluidOverloadRisk>0.5);
 const tox=r.ctx.medicationSafetyOffsets();assert.equal(tox.spo2,0);assert.equal(tox.rr,0);assert.equal(tox.sys,0);
 const o=r.ctx.progressionOffsets();assert(o.spo2<0);assert(o.rr>0);
});
check('pulmonary complications require actual congestion, not just recorded bolus volume',()=>{
 const deficit=experiment({volume:.45}),replete=experiment({volume:1.05});
 order(deficit.r,3000);order(replete.r,3000);advance(deficit.r,10);advance(replete.r,10);
 assert.equal(deficit.owner.report().state.fluidOverloadRisk,0,'deep deficit is not pulmonary edema by counting historic tissue fluid');
 assert(replete.owner.report().state.fluidOverloadRisk>.5,'large fluid load in a replete patient retains a relevant complication risk');
 assert(replete.r.ctx.progressionOffsets().spo2<deficit.r.ctx.progressionOffsets().spo2);
 const first=replete.owner.report().state.interstitialFluidMl;
 advance(replete.r,50);
 assert(replete.owner.report().state.interstitialFluidMl<first,'retained dose load has deterministic time-dependent turnover');
 assert.equal(replete.r.ctx.sim.phys.sourceControlled,false,'bolus never controls the infection source');
});
check('unmigrated disease and zero-dose trajectory retain exact native behavior',()=>{
 const a=createLiveNativeJourney487('PERI-SEC-001'),{r:b,owner}=experiment();advance(a,30);advance(b,30);
 const copy=structuredClone(b.ctx.sim);delete copy.csRinger487;
 assert.equal(serializeNativePatient487(copy),serializeNativePatient487(a.ctx.sim));
 assert.equal(owner.report().applications,0);
});
check('rollback is allowed before admission runs and refused during an active patient',()=>{
 const {r,owner}=experiment();assert.equal(owner.rollback().status,'disabled');
 assert.equal(r.ctx.sim.csRinger487,undefined);
 const second=experiment();order(second.r,500);advance(second.r,1);
 assert.equal(second.owner.rollback().status,'blocked-active-patient');
 assert.equal(second.r.ctx.sim.csRinger487.owner,'b1-volume-v2');
});
check('incompatible fluid, route, rate and stop orders are rejected before preparation',()=>{
 for(const raw of ['Ringer 500 ml oral','Ringer 500 ml IM','suero fisiológico 500 ml IV','cristaloides 500 ml',
  'Ringer 500 ml rectal','Ringer 500 ml subcutaneo','Ringer 500 ml via desconocida','Ringer 500 ml por hora',
  'Ringer 0 ml IV','Ringer -500 ml IV','Ringer 500 ml/h IV','suspender Ringer','titular Ringer 500 ml']){
  const {r,owner}=experiment();
  assert.equal(r.ctx.addMonitorTherapy(raw),false,raw);
  assert.equal(r.ctx.sim.pendingTherapies?.size||0,0);advance(r,1);
  assert.equal(r.ctx.sim.administrationLog.length,0);assert.equal(owner.report().applications,0);
 }
});
check('original nursing text cannot lose an unknown route or counterfeit a generic fluid identity',()=>{
 for(const raw of ['enfermera Ringer 500 ml via desconocida','enfermera expansión 500 ml','enfermera cristaloides 500 ml']){
  const {r,owner}=experiment();r.ctx.nurseNatural(raw);advance(r,1);
  assert.equal(r.ctx.sim.administrationLog.length,0,raw);assert.equal(owner.report().applications,0);
 }
 const {r,owner}=experiment();r.ctx.nurseNatural('enfermera Ringer 500 ml IV y oxigeno 4 L/min y ceftriaxona 1 g y metronidazol 500 mg');advance(r,3);
 assert.equal(owner.report().applications,1);assert.equal(r.ctx.sim.administrationLog.length,4);
});
check('unsupported context changes reject new delivery while retaining the admitted owner',()=>{
 for(const change of [r=>{r.ctx.selectedPlayMode='coop';},r=>{r.ctx.sim.patientInstance.uid='different-id';},
  r=>{r.ctx.applyImmediatePhysiology=()=>{};}]){
  const {r,owner}=experiment();change(r);
  assert.equal(r.ctx.addMonitorTherapy('Ringer 500 ml IV'),false);
  assert.equal(r.ctx.sim.administrationLog.length,0);assert.equal(owner.report().applications,0);
  assert.equal(owner.owns(r.ctx.sim,r.ctx.C),true,'unsafe context must never re-enable a legacy fluid writer');
  assert.match(owner.report().blockedReason,/context|identity|endpoint/);
 }
});
check('a context change during nursing preparation cancels delivery without a ghost receipt',()=>{
 const {r,owner}=experiment();order(r,500);advance(r,.4);r.ctx.selectedPlayMode='coop';
 assert.doesNotThrow(()=>advance(r,1));assert.equal(r.ctx.sim.administrationLog.length,0);
 assert.equal(owner.report().applications,0);assert.equal(r.ctx.sim.pendingTherapies.size,0);
 assert.equal(owner.owns(r.ctx.sim,r.ctx.C),true);
});
check('a case discontinuity cannot reactivate old fluid writers on the already admitted patient',()=>{
 const {r,owner}=experiment();order(r,500);advance(r,1);
 r.ctx.C=r.ctx.CASES.find(x=>x.id==='PERI-TER-001');
 assert.equal(owner.owns(r.ctx.sim,r.ctx.C),true,'owner follows the patient even when its context becomes invalid');
 assert.equal(r.ctx.addMonitorTherapy('Ringer 500 ml IV'),false,'changed case rejects delivery before preparation');
 const trace=writes(r);advance(r,.1);
 assert(!trace.some(x=>x.after>x.before&&x.stack.includes('csCriticalRescuePhysiology487')),'old rescue volume must stay excluded');
 assert.equal(owner.report().applications,1);assert.equal(r.ctx.sim.administrationLog.length,1);
});
check('native rescue retains its explicit Ringer order and prospectively selects the IV default',()=>{
 const {r,owner}=experiment();assert.equal(r.ctx.addMonitorTherapy('Ringer 500 ml'),true);advance(r,1);
 assert.equal(owner.report().applications,1);assert.equal(r.ctx.sim.administrationLog[0].pharmacology487.route,'iv');
 assert.equal(r.ctx.sim.monitorTherapies.get('fluid').execution487.formulation.id,'fluid');
});
check('rollback cannot change the owner after a completed dose even at native minute zero',()=>{
 const {r,owner}=experiment(),t=r.ctx.findMonitorTherapy('Ringer 500 ml IV');t.dose=r.ctx.parseTherapyOrder(t.raw,t);
 r.ctx.recordAdministration(t);r.ctx.applyImmediatePhysiology(t);
 assert.equal(r.ctx.sim.gameMinute,0);assert.equal(owner.rollback().status,'blocked-active-patient');
});
console.log('RINGER OWNER SUMMARY',JSON.stringify({checks,domain:'local fresh PERI-SEC/Ringer only',default:'shadow',clinicalValidation:false}));
