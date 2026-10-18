import {initialLegacySepsisPhysiology487,advanceLegacySepsisPhysiology487,
 legacySepsisVitalsOffsets487} from './sepsis-physiology-487-core.js';
import {csSecondaryBridgePhysiology487} from '../../clinical/secondary-sepsis-bridge-487.js';
import {csCriticalRescuePhysiology487} from '../../clinical/critical-rescue-487.js';
import {summarizeIVExposures} from './medication-exposure.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {applyMedicationHarmTargets487} from './medication-harms-487.js';
import {applyConfirmedMorphineTargetOffsets487} from './morphine-487.js';
import {applyConfirmedNativeSupportTargets487} from './native-support-487.js';
const axes=['temp','hr','rr','sys','dia','spo2'];
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const bounds={temp:[34.5,41],hr:[38,175],rr:[8,42],sys:[55,190],dia:[30,115],spo2:[72,100]};
export function initialPeritonitisVitals(c){
 if(c.id!=='PERI-SEC-001')throw Error('secondary peritonitis policy requires PERI-SEC-001');
 const [sys,dia]=c.vitals.bp.split('/').map(Number);
 return {temp:c.vitals.temp,hr:c.vitals.hr,rr:c.vitals.rr,sys,dia,spo2:c.vitals.spo2};
}
export function initializeNativePeritonitis(p,c){
 p.phys=initialLegacySepsisPhysiology487(c);p.physBaseline=structuredClone(p.phys);
}
/** Read-only adapter to the original pure policies. A treatment flag, pending
 * order or a foreign/future receipt never becomes active clinical evidence.
 */
export function confirmedSepsisView487(p,atNativeMinute){
 const active=new Map(),seen=new Set(),counts=new Map();
 for(const row of p.administrationLog){
  const matches=p.treatments.filter(t=>t.sourceEventId===row.sourceEventId&&t.id===row.id);
  if(row.patientUid!==p.uid||!row.sourceEventId||seen.has(row.sourceEventId)||matches.length!==1||
   matches[0].patientUid!==p.uid||matches[0].administeredAtNativeMinute!==row.administeredAtNativeMinute||
   matches[0].dose?.amount!==row.dose?.amount||matches[0].dose?.unit!==row.dose?.unit||
   !Number.isFinite(row.administeredAtNativeMinute)||row.administeredAtNativeMinute<0||row.administeredAtNativeMinute>atNativeMinute+1e-9)
   throw Error('sepsis physiology requires unique confirmed administration');
  seen.add(row.sourceEventId);
  if(row.action==='stop'){active.delete(row.id);continue;}
  counts.set(row.id,(counts.get(row.id)||0)+1);
  if(!matchesMedicationAllergy487(p,row.id))active.set(row.id,{...row,m:row.administeredAtNativeMinute,
   startedAt:row.administeredAtNativeMinute});
 }
 return {...p,gameMinute:atNativeMinute,monitorTherapies:active,counts,
  administrationLog:p.administrationLog.map(row=>({...row,m:row.administeredAtNativeMinute})),
  therapyTotals:{fluidMl:summarizeIVExposures(p).confirmedCrystalloidMl},
  consults:new Map(p.consults.map(x=>[x.id,x]))};
}
export function sepsisCoverage487(view,c,atNativeMinute){
 let best={score:0,ramp:0,set:null};
 for(const set of c.physiology.coverageSets){
  const present=set.filter(id=>view.monitorTherapies.has(id));
  const score=present.reduce((sum,id)=>{
   const dose=view.monitorTherapies.get(id).dose,rule=c.physiology.doseRules?.[id];
   return sum+(rule&&dose?.amount?clamp(dose.amount/(rule.amount||1),.15,1):1);
  },0)/set.length;
  if(score<best.score)continue;
  const latest=present.length?Math.max(...present.map(id=>view.monitorTherapies.get(id).startedAt)):atNativeMinute;
  const ramp=score?clamp((atNativeMinute-latest)/2.2,0,1):0;
  if(score>best.score||ramp>best.ramp)best={score,ramp,set:[...set]};
 }
 return best;
}
/** The original immediate state transitions, invoked once only AFTER the
 * shared IV executor has emitted the matching real patient-bound dose.
 */
export function applyConfirmedSepsisAdministration487(p,c,row){
 const view=confirmedSepsisView487(p,row.administeredAtNativeMinute);
 if(!p.administrationLog.includes(row)||row.action==='stop')return;
 const next={...p.phys},dose=row.dose,amount=Number(dose?.amount||0),count=view.counts.get(row.id)||0;
 if(row.id==='fluid')next.effectiveVolume=Math.min(1.12,next.effectiveVolume+.065*clamp(amount/500,0,3)*Number(c.physiology.fluidResponsiveness??.75));
 if(row.id==='albumin'){
  const factor=clamp(amount/1.5,.5,1.5);
  next.effectiveVolume=Math.min(1.08,next.effectiveVolume+.055*factor);
  next.renalReserve=Math.min(1,next.renalReserve+.045*factor);
 }
 if(row.id==='furosemide'){
  next.effectiveVolume=Math.max(.25,next.effectiveVolume-.07);next.renalStress=Math.min(1.5,next.renalStress+.10);
  if(count>1){next.effectiveVolume=Math.max(.22,next.effectiveVolume-.045*(count-1));next.renalStress=Math.min(1.5,next.renalStress+.06*(count-1));}
 }
 if(['amikacin','gentamicin'].includes(row.id)){
  if(c.physiology.avoid?.includes(row.id))next.renalStress=Math.min(1.5,next.renalStress+.18);
  if(count>1){next.renalStress=Math.min(1.5,next.renalStress+.10*(count-1));next.renalReserve=Math.max(.10,next.renalReserve-.025*(count-1));}
 }
 // Source control is intentionally absent: no migrated bedside order performs
 // an operation. A handoff also never changes sourceControlled.
 p.phys=next;
}
/** ONE per-patient physiology/vital writer. The guard owns time, while this
 * integrates the original native 60Hz transition, secondary bridge and finite
 * recent-support physiology. It creates neither timer nor clinical authority.
 */
export function advancePeritonitisVitals(p,c,dt,atNativeMinute){
 if(!Number.isFinite(dt)||dt<0||!Number.isFinite(atNativeMinute)||atNativeMinute<p.phys.lastNativeMinute-1e-9)
  throw Error('invalid peritonitis clock');
 if(p.caseEnded||dt===0)return;
 const from=p.phys.lastNativeMinute,view=confirmedSepsisView487(p,atNativeMinute),steps=Math.ceil(dt*60-1e-9);
 let elapsed=0;
 for(let i=0;i<steps;i++){
  const seconds=Math.min(1/60,dt-elapsed);elapsed+=seconds;
  const at=from+(atNativeMinute-from)*(elapsed/dt),dm=at-p.phys.lastNativeMinute;
  const before={...p.phys},coverage=sepsisCoverage487(view,c,at);
  p.phys=advanceLegacySepsisPhysiology487(p.phys,c,at,{coverageScore:coverage.score,coverageRamp:coverage.ramp,
   albuminActive:view.monitorTherapies.has('albumin')});
  view.phys=p.phys;view.gameMinute=at;
  csSecondaryBridgePhysiology487(view,c,before,dm,false);
  csCriticalRescuePhysiology487(view,c,dm,false);
  const progression=legacySepsisVitalsOffsets487(p.phys,p.physBaseline,c),base=initialPeritonitisVitals(c);
  const target=Object.fromEntries(axes.map(axis=>[axis,base[axis]+progression[axis]]));
  if(view.monitorTherapies.has('oxygen')){target.spo2+=6;target.rr-=2;}
  applyConfirmedNativeSupportTargets487(target,p,c,at);
  applyConfirmedMorphineTargetOffsets487(target,p,c,at);
  applyMedicationHarmTargets487(target,p,c,at);
  // Effective native crystalloid toxicity is bounded; the experimental B1
  // volume owner and APP/CIRR's independently validated target are not applied.
  const excess=Math.max(0,view.therapyTotals.fluidMl-Number(c.physiology.fluidOverloadThresholdMl||2800))/500;
  target.rr+=Math.min(12,excess*2.2);target.spo2-=Math.min(10,excess*1.8);target.sys+=Math.min(8,excess*1.5);
  const diureticCount=view.counts.get('furosemide')||0;
  if(diureticCount>1){const n=diureticCount-1;target.sys-=Math.min(24,n*7);target.dia-=Math.min(14,n*4);target.hr+=Math.min(16,n*4);}
  for(const axis of axes)p.liveVitals[axis]+=(clamp(target[axis],...bounds[axis])-p.liveVitals[axis])*Math.min(1,seconds*(axis==='temp'?.08:.38));
  p.hypoperfusionNativeMinutes=p.liveVitals.sys<75||p.liveVitals.spo2<85?
   (p.hypoperfusionNativeMinutes||0)+seconds*.12:Math.max(0,(p.hypoperfusionNativeMinutes||0)-seconds*.24);
 }
 p.coverage=sepsisCoverage487(view,c,atNativeMinute);
}
