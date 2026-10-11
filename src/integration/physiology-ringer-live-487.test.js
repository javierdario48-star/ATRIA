/** Generated native clinical/nursing chain + real opt-in API. No physical
 * browser/device claim. Policy stress tests force observed refractory vitals;
 * the physiology, queues, evidence, clocks, eligibility and death are native. */
import assert from 'node:assert/strict';
import {createLiveNativeJourney487,advanceLiveNativeJourney487,serializeNativePatient487} from '../../qa/physiology-live/native-journey-487.mjs';
import {enableNativeRinger487,nativeRingerPort487} from '../../qa/physiology-live/ringer-journey-487.mjs';
import {installPhysiologyQABootstrap487} from './physiology-qa-bootstrap-487.js';
import * as ownerModule from './physiology-ringer-owner-487.js';
import * as observerModule from './physiology-qa-observer-487.js';
import {csGraceState487} from '../clinical/grace-survival-487.js';
const stable={sys:120,dia:75,hr:90,rr:18,spo2:98,temp:37};
const fatal={sys:56,dia:30,hr:158,rr:34,spo2:77,temp:39.2};
const advance=(r,s,options)=>advanceLiveNativeJourney487(r,s,options);
const order=(r,text)=>r.ctx.nurseNatural('enfermera '+text);
async function experiment({volume,caseId='PERI-SEC-001'}={}){
 const r=createLiveNativeJourney487(caseId);if(volume!==undefined)r.ctx.sim.phys.effectiveVolume=volume;
 const api=await enableNativeRinger487(r);return {r,api};
}
function stress(r){
 const native=r.ctx.updateLiveVitals;let observed=stable;
 r.ctx.updateLiveVitals=function(){const out=native.apply(this,arguments);Object.assign(r.ctx.sim.liveVitals,observed);return out;};
 r.setVitals=v=>{observed=v;Object.assign(r.ctx.sim.liveVitals,v);};
 r.ctx.finishCase=reason=>{r.closed=reason;r.ctx.sim.caseEnded=true;};
}
const clinical=r=>{const s=structuredClone(r.ctx.sim);delete s.csRinger487;return serializeNativePatient487(s);};
const sample=r=>({volume:r.ctx.sim.phys.effectiveVolume,sys:r.ctx.sim.liveVitals.sys,hr:r.ctx.sim.liveVitals.hr,
 rr:r.ctx.sim.liveVitals.rr,spo2:r.ctx.sim.liveVitals.spo2,sourceControlled:r.ctx.sim.phys.sourceControlled});
let checks=0;const evidence={};
async function check(name,fn){await fn();checks++;console.log('LIVE RINGER PASS',name);}

await check('actual bootstrap allows only a fresh local single-case admission',async()=>{
 for(const caseId of ['HDA-001','CIRR-001'])await assert.rejects(experiment({caseId}),/PERI-SEC/);
 for(const field of ['late','coop','ward','hidden']){
  const r=createLiveNativeJourney487('PERI-SEC-001'),before=r.ctx.recordAdministration;
  if(field==='late')advance(r,1);if(field==='coop')r.ctx.selectedPlayMode='coop';
  if(field==='ward')r.ctx.shiftSession={active:true};if(field==='hidden')r.ctx.document.visibilityState='hidden';
  await assert.rejects(enableNativeRinger487(r),/fresh|local/);assert.equal(r.ctx.recordAdministration,before);
 }
});
await check('native encounter demographics and canonical completion binding share one physiological owner',async()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),canonical=r.ctx.C;
 // v39EnsureEncounter clones C for patient demographics. Native V203 completion
 // temporarily binds the catalogue case, then restores this encounter object.
 r.ctx.C={...canonical,demo:'Mujer, 64 años',common:{...canonical.common,name:'QA native encounter',age:'64',arrival:'En ambulancia'}};
 const encounter=r.ctx.C,api=await enableNativeRinger487(r);
 order(r,'Ringer 500 ml');assert.doesNotThrow(()=>advance(r,1));
 assert.equal(r.ctx.C,encounter);assert.equal(api.reportRinger().applications,1);
 assert.equal(r.ctx.sim.administrationLog[0].pharmacology487.schemaVersion,2);
 r.ctx.C={...encounter,physiology:{...encounter.physiology,fluidResponsiveness:.01}};
 assert.equal(r.ctx.addMonitorTherapy('Ringer 500 ml'),false,'a changed physiological definition requires a new admission');
 assert.equal(api.ownsRinger(r.ctx.sim,r.ctx.C),true,'definition drift must not re-enable legacy fluid writers');
});
await check('pre-existing Phase4 work cannot be reclassified as a new strict execution receipt',async()=>{
 for(const text of ['Ringer 500 ml via desconocida','Ringer 500 ml']){
  const r=createLiveNativeJourney487('PERI-SEC-001',{confirmedIV:0}),native=createLiveNativeJourney487('PERI-SEC-001',{confirmedIV:0}),original=r.ctx.recordAdministration;
  order(native,text);
  order(r,text);assert(r.ctx.sim.csPhase4Pending487.length>0);assert(r.ctx.sim.csNurse487History.length>0);
  await assert.rejects(enableNativeRinger487(r),/fresh untreated/);assert.equal(r.ctx.recordAdministration,original);
  assert.equal(r.ctx.sim.csRinger487,undefined);advance(r,5);advance(native,5);
  assert.equal(serializeNativePatient487(r.ctx.sim),serializeNativePatient487(native.ctx.sim),'the original native queue and evidence remain intact');
  for(const row of r.ctx.sim.administrationLog)assert.equal(row.pharmacology487,undefined,'old parsed work is never promoted to V2');
 }
 const r=createLiveNativeJourney487('PERI-SEC-001');r.ctx.nurse.task={kind:'monitor'};
 await assert.rejects(enableNativeRinger487(r),/fresh untreated/);
});
await check('duration and interval qualifiers are refused before native nursing can reduce them to a bolus',async()=>{
 for(const text of ['pasar Ringer 500 ml en 30 minutos','Ringer 500 ml durante 1 hora','Ringer 500 ml cada 6 horas',
  'Ringer 500 ml en 2 horas','Ringer 500 ml en 30min','Ringer 500 ml a lo largo de una hora']){
  const {r,api}=await experiment();order(r,text);advance(r,1);
  assert.equal(r.ctx.sim.administrationLog.length,0,text);assert.equal(api.reportRinger().applications,0,text);
  assert.equal(r.ctx.sim.pendingTherapies?.size||0,0,text);
  assert.equal(r.ctx.addMonitorTherapy(text),false,'direct monitor route: '+text);
 }
});
await check('delayed module loading never installs on a different patient',async()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),port=nativeRingerPort487(r);let resolve;
 const api=installPhysiologyQABootstrap487(r.ctx.window,port,async()=>observerModule,()=>new Promise(done=>{resolve=done;}));
 const start=api.enableRinger();r.ctx.sim=r.ctx.freshSim();r.ctx.sim.patientInstance={uid:'other-during-import'};
 resolve(ownerModule);await assert.rejects(start,/admission changed/);assert.equal(r.ctx.sim.csRinger487,undefined);
 assert.equal(api.reportRinger().status,'error');
});
await check('arming loads before the next admission and can be cancelled without clinical writes',async()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),port=nativeRingerPort487(r),original=r.ctx.startCase;
 const api=installPhysiologyQABootstrap487(r.ctx.window,port,async()=>observerModule,async()=>ownerModule);
 advance(r,2);const before=clinical(r);await api.armRinger();assert.equal(api.reportRinger().status,'armed-for-next-admission');
 assert.equal(clinical(r),before);assert.equal(api.rollbackRinger().status,'disabled');assert.equal(r.ctx.startCase,original);
 // The fixture excludes admission UI. Its replacement creates only a fresh
 // native state; the real clinical/nursing chain is retained thereafter.
 r.ctx.startCase=function(){r.ctx.sim=r.ctx.freshSim();r.ctx.sim.patientInstance={uid:'next-local-admission'};
  r.ctx.sim.__csV19Init=true;r.ctx.sim.clinicalV3={response:{factor:1},trajectory:{factor:1},complication:{offset:{}}};};
 const admission=r.ctx.startCase;await api.armRinger();r.ctx.startCase();
 assert.equal(api.reportRinger().patientId,'next-local-admission');assert.equal(r.ctx.startCase,admission);
 assert.equal(r.ctx.sim.gameMinute,0);assert.equal(api.rollbackRinger().status,'disabled');
});
await check('shadow and live ownership cannot overlap; pending import can be cancelled',async()=>{
 const {r,api}=await experiment();assert.throws(()=>api.enable(),/Ringer/);
 assert.equal(api.rollbackRinger().status,'disabled');await api.enable();
 assert.throws(()=>api.enableRinger(),/shadow/);api.disable();
 const b=createLiveNativeJourney487('PERI-SEC-001'),port=nativeRingerPort487(b);let resolve;
 const a=installPhysiologyQABootstrap487(b.ctx.window,port,async()=>observerModule,()=>new Promise(done=>{resolve=done;}));
 const start=a.enableRinger();a.rollbackRinger();resolve(ownerModule);assert.equal((await start).status,'cancelled');
 assert.equal(b.ctx.sim.csRinger487,undefined);
});
await check('zero Ringer and all unmigrated B1 interventions preserve native trajectories',async()=>{
 for(const text of [null,'oxigeno 4 L/min','morfina 4 mg','furosemida 40 mg','noradrenalina 0.05 mcg/kg/min']){
  const a=createLiveNativeJourney487('PERI-SEC-001'),{r:b}=await experiment();
  if(text){order(a,text);order(b,text);}let at=0;
  for(const end of [1,10,30]){advance(a,end-at);advance(b,end-at);at=end;assert.equal(clinical(b),clinical(a),text||'untreated');}
 }
});
await check('hypovolemic Ringer changes volume before monitor signs, with incomplete response',async()=>{
 const untreated=await experiment({volume:.45}),low=await experiment({volume:.45}),given=await experiment({volume:.45});
 order(low.r,'Ringer 50 ml IV');order(given.r,'Ringer 500 ml IV');let at=0;
 const trajectories={untreated:[],low:[],given:[]};
 for(const end of [1,10,30,60]){for(const [key,entry] of [['untreated',untreated],['low',low],['given',given]]){
  advance(entry.r,end-at);trajectories[key].push({realSeconds:end,...sample(entry.r)});
 }at=end;}
 // Early dose-dependent support is transient: untreated sepsis keeps losing
 // volume. The unchanged native floor can later make all doses converge.
 for(let i=0;i<3;i++){
  assert(trajectories.given[i].volume>trajectories.low[i].volume);assert(trajectories.low[i].volume>trajectories.untreated[i].volume);
  assert(trajectories.given[i].sys>=trajectories.untreated[i].sys);assert.equal(trajectories.given[i].sourceControlled,false);
 }
 assert(trajectories.given.at(-1).volume<trajectories.given[0].volume,'no permanent volume bonus');
 assert.equal(trajectories.given.at(-1).volume,trajectories.untreated.at(-1).volume,'persistent losses reach the preserved native floor');
 assert(trajectories.given.at(-1).sys<90,'a single bolus does not normalize severe shock');evidence.hypovolemia=trajectories;
});
await check('excess fluids produce pulmonary risk and deterioration rather than repeated fixed bonuses',async()=>{
 const a=await experiment({volume:1.05}),b=await experiment({volume:1.05});order(a.r,'Ringer 500 ml IV');
 order(b.r,'Ringer 3000 ml IV');advance(a.r,30);advance(b.r,30);
 assert(b.api.reportRinger().state.fluidOverloadRisk>a.api.reportRinger().state.fluidOverloadRisk);
 assert(b.r.ctx.sim.liveVitals.spo2<a.r.ctx.sim.liveVitals.spo2);assert(b.r.ctx.sim.liveVitals.rr>a.r.ctx.sim.liveVitals.rr);
 assert.equal(b.r.ctx.medicationSafetyOffsets().sys,0);assert.equal(b.r.ctx.medicationSafetyOffsets().spo2,0);
 evidence.overload={small:sample(a.r),large:sample(b.r),risk:b.api.reportRinger().state.fluidOverloadRisk};
});
await check('accepted source bridge retains its evidence and non-volume physiology but cannot add fluid',async()=>{
 const {r,api}=await experiment();for(const text of ['Ringer 500 ml IV','oxigeno 4 L/min','ceftriaxona 1 g','metronidazol 500 mg'])order(r,text);
 advance(r,3);r.ctx.sim.consults.set('cirugia',{status:'done',accepted:true});
 const care=r.ctx.window.csSecondaryBridge487.evidence();assert.equal(care.ready,true);assert.equal(care.sourceControlled,false);
 const p=r.ctx.sim.phys,writes=[];let value=p.effectiveVolume;
 Object.defineProperty(p,'effectiveVolume',{enumerable:true,configurable:true,get:()=>value,set:n=>{writes.push(new Error().stack);value=n;}});
 const svr=p.svr;advance(r,1);assert(!writes.some(x=>x.includes('csSecondaryBridgePhysiology487')));
 assert(r.ctx.sim.phys.svr>svr,'non-volume bridge support is retained');assert.equal(api.reportRinger().applications,1);
 assert.equal(r.ctx.sim.phys.sourceControlled,false);assert.equal(r.ctx.sim.administrationLog.length,4);
});
await check('actual Surgery consultation and native handoff remain distinct from source control',async()=>{
 const {r,api}=await experiment();r.ctx.sim.diagnosis='peritonitis secundaria';r.ctx.sim.lastVitalsKnown=true;
 r.ctx.sim.examDone=true;r.ctx.sim.examRegions.add('abdomen');
 r.ctx.finishCase=reason=>{r.closed=reason;r.ctx.sim.caseEnded=true;};
 for(const text of ['Ringer 500 ml IV','oxigeno 4 L/min','ceftriaxona 1 g','metronidazol 500 mg','solicito cirugia'])order(r,text);
 advance(r,3.4);assert.equal(r.ctx.sim.consults.get('cirugia').status,'pending');assert.equal(r.ctx.sim.phys.sourceControlled,false);
 advance(r,.3);assert.equal(r.ctx.sim.consults.get('cirugia').status,'done');assert.equal(r.ctx.sim.consults.get('cirugia').accepted,true);
 assert.equal(r.ctx.window.csPeritonitisAssessment487().ready,true);assert.equal(r.ctx.sim.disposition,null);
 advance(r,3.4);assert.equal(r.ctx.sim.disposition.id,'quirofano');assert.equal(r.closed,'completed');
 assert.equal(r.ctx.sim.phys.sourceControlled,false);assert.equal(api.reportRinger().applications,1);
 assert.equal(api.rollbackRinger().status,'disabled');
});
await check('pending support earns no fake rescue or fluid grace; critical rescue is still exactly finite',async()=>{
 const {r,api}=await experiment();stress(r);advance(r,500);r.setVitals(fatal);
 order(r,'Ringer 500 ml');order(r,'oxigeno 4 L/min');advance(r,.1);
 assert.equal(r.ctx.sim.administrationLog.length,0);assert.equal(r.ctx.csDeathRescueMissing(fatal,39),true);
 assert.equal(csGraceState487(r.ctx.sim,r.ctx.C,500).fluidOk,false);
 advance(r,.9);assert.equal(api.reportRinger().applications,1);
 const anchor=r.ctx.sim._criticalSupport487.startedAtSec;assert(Number.isFinite(anchor));
 advance(r,30);order(r,'Ringer 250 ml');advance(r,1);assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,anchor);
 advance(r,anchor+64.9-r.ctx.sim._criticalSupport487.elapsedSeconds);assert.equal(r.ctx.csDeathRescueMissing(fatal,39),false);
 advance(r,.2);assert.equal(r.ctx.csDeathRescueMissing(fatal,39),true);advance(r,11.5);
 assert.equal(r.ctx.sim.patientDied,true);assert.equal(r.closed,'death');assert.equal(api.reportRinger().applications,2);
 evidence.critical={windowSeconds:65,renewed:false,lateDeath:true};
});
await check('initial protection and critical rescue overlap without a fictitious extended lifetime',async()=>{
 const {r,api}=await experiment();stress(r);r.setVitals(fatal);order(r,'Ringer 500 ml');order(r,'oxigeno 4 L/min');advance(r,1);
 const anchor=r.ctx.sim._criticalSupport487.startedAtSec;advance(r,65);
 assert.equal(r.ctx.window.csCriticalRescue487.window().protected,false);assert.equal(!!r.ctx.sim.patientDied,false);
 const grace=r.ctx.window.csGraceSurvival487.get();assert(grace.releaseAt>=180&&grace.releaseAt<=480);
 advance(r,grace.releaseAt-66+12);assert.equal(r.ctx.sim.patientDied,true);assert.equal(r.ctx.sim._criticalSupport487.startedAtSec,anchor);
 assert.equal(api.reportRinger().applications,1);evidence.earlyGrace={releaseAt:grace.releaseAt,lateDeath:true};
});
await check('rollback restores exact endpoints and subsequent patients use native effects',async()=>{
 const r=createLiveNativeJourney487('PERI-SEC-001'),port=nativeRingerPort487(r),keys=['Nursing','Administration','Delivery','Immediate','Physiology','Progression'];
 const before=Object.fromEntries(keys.map(k=>[k,port['get'+k]() ])),api=await enableNativeRinger487(r);
 order(r,'Ringer 500 ml');advance(r,1);assert.equal(api.rollbackRinger().status,'blocked-active-patient');
 r.ctx.sim.caseEnded=true;assert.equal(api.rollbackRinger().status,'disabled');for(const k of keys)assert.equal(port['get'+k](),before[k]);
 r.ctx.sim=r.ctx.freshSim();r.ctx.sim.patientInstance={uid:'native-after-rollback'};r.ctx.sim.__csV19Init=true;
 r.ctx.sim.clinicalV3={response:{factor:1},trajectory:{factor:1},complication:{offset:{}}};r.ctx.sim.venousAccessCount=1;
 const initial=r.ctx.sim.phys.effectiveVolume;order(r,'Ringer 500 ml');advance(r,1);
 assert(r.ctx.sim.phys.effectiveVolume-initial>.025);assert.equal(r.ctx.sim.administrationLog[0].pharmacology487,undefined);
 assert.equal(api.ownsRinger(r.ctx.sim,r.ctx.C),false);
});
await check('typing follows the native clinical clock; determinism and timestep differences are bounded',async()=>{
 async function run(dt){const {r,api}=await experiment();order(r,'Ringer 500 ml');advance(r,2,{typing:true,dt});advance(r,8,{dt});return {r,report:api.reportRinger()};}
 const a=await run(1/60),b=await run(1/60),c=await run(1/30);
 assert.equal(serializeNativePatient487(a.r.ctx.sim),serializeNativePatient487(b.r.ctx.sim));assert.deepEqual(a.report,b.report);
 assert(Math.abs(a.report.clock.clinicalMinute-10)<1e-7);
 assert(Math.abs(a.report.clock.nativeMinute-(2*.03+8*.12))<1e-7,'existing clock keeps explicit typing segments');
 assert.equal(a.report.applications,1);assert.equal(c.report.applications,1);
 assert(Math.abs(sample(a.r).volume-sample(c.r).volume)<.0001);assert(Math.abs(sample(a.r).sys-sample(c.r).sys)<.03);
});
await check('clock history exhaustion blocks future doses without crashing physiology or changing owner',async()=>{
 const {r,api}=await experiment();
 assert.doesNotThrow(()=>{for(let i=0;i<130;i++)advance(r,.05,{typing:i%2===0});});
 assert.match(api.reportRinger().blockedReason,/clock/);
 assert.equal(api.ownsRinger(r.ctx.sim,r.ctx.C),true);
 assert.equal(r.ctx.addMonitorTherapy('Ringer 500 ml'),false);assert.equal(r.ctx.sim.administrationLog.length,0);
 assert.doesNotThrow(()=>advance(r,1));assert(r.ctx.sim.gameMinute>0);
});
console.log('LIVE RINGER SUMMARY',JSON.stringify({checks,evidence,environment:'generated HTML Node VM; admission UI stub; no physical Android',clinicalValidation:false}));
