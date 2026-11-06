// C12.f1a — legacy survival POLICY only; not a copied V4 scheduler or vital writer.
// The native guard clock supplies time, case policies own liveVitals, and this
// ONE adapter owns fatal exposure + case termination for solo/apprentice.
import {csGraceState487} from '../../clinical/grace-survival-487.js';
import {csCriticalRescueEvidence487,csCriticalRescueWindow487}
 from '../../clinical/critical-rescue-487.js';
import {summarizeIVExposures} from './medication-exposure.js';
import {IV_MEDICINES} from './native-medications.js';
import {isDeliveredClinicalAdministration} from './receipts.js';
import {confirmedMedicationHarms487} from './medication-harms-487.js';
import {confirmedMorphineResponse487} from './morphine-487.js';
import {confirmedNativeSupportEffects487} from './native-support-487.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';

// Both constants come from the effective V4 irreversible transition and the
// validated 65s rescue policy. Gameplay units, NOT clinical prognosis.
const FATAL_EXPOSURE_NATIVE_MIN=1.35;
const HEAL_EXPOSURE_FACTOR=.70;
const VITAL_AXES=['sys','dia','spo2','hr'];
const previousState=()=>({observedCritical:false,exposureNativeMinutes:0,
 earnedCredit:0,rescueStartedAtSec:null,dead:false});

function confirmedView(p,mode,prior,minute){
 const administrations=p.administrationLog||[];
 const idSet=new Set();
 const active=new Map();
 for(const row of administrations){
  if(row.patientUid!==p.uid||typeof row.sourceEventId!=='string'||!row.sourceEventId||
    idSet.has(row.sourceEventId))throw Error('invalid native survival administration');
  idSet.add(row.sourceEventId);
  if(row.status==='administering'){
   if(!(row.dose?.amount===0&&row.deliveryFraction===0)&&
    !isDeliveredClinicalAdministration(p,row,minute))
    throw Error('survival support requires unique native treatment receipt');
   continue; // Running delivery is not a completed-dose support receipt.
  }
  if(Object.hasOwn(IV_MEDICINES,row.id)){
   const matches=(p.treatments||[]).filter(t=>t.sourceEventId===row.sourceEventId&&t.id===row.id);
   if(matches.length!==1||matches[0].patientUid!==p.uid||
      matches[0].dose?.amount!==row.dose?.amount||
      matches[0].administeredAtNativeMinute!==row.administeredAtNativeMinute)
    throw Error('survival support requires unique native treatment receipt');
  }
  if(row.action==='stop'){active.delete(row.id);continue;}
  if(row.id==='oxygen'){
   if(row.action==='stop'){active.delete('oxygen');continue;}
   if(!['start','setRate'].includes(row.action))throw Error('invalid oxygen survival event');
   const device=p.procedures?.oxygen;
   if(device?.active&&device.sourceEventId===row.sourceEventId&&
      device.flowLpm===row.dose?.amount&&row.dose?.unit==='L/min')
    active.set('oxygen',{id:'oxygen'});
   else active.delete('oxygen');
  }else active.set(row.id,{id:row.id});
 }
 // Neither a pending order nor a copied treatment flag qualifies.
 const total=summarizeIVExposures(p).confirmedCrystalloidMl;
 return {...p,playMode:mode,monitorConnected:!!p.procedures?.monitor?.connected,
  monitorTherapies:active,therapyTotals:{fluidMl:total},
  csGrace487:{earnedCredit:prior.earnedCredit}};
}
function danger(v){
 if(!v||VITAL_AXES.some(k=>!Number.isFinite(v[k])))throw Error('invalid survival vitals');
 const map=(v.sys+2*v.dia)/3;
 return {critical:v.spo2<80||map<45||v.sys<=58&&v.hr>=150,
  cause:v.spo2<80?'critical-hypoxemia':map<45||v.sys<=58&&v.hr>=150?
   'circulatory-collapse':null,map};
}
function nativeAdverseContributions(p,c,minute){
 const harm=confirmedMedicationHarms487(p,c,minute),opioid=confirmedMorphineResponse487(p,c,minute),
  support=confirmedNativeSupportEffects487(p,c,minute),fluid=crystalloidOverloadOffsets(p,c);
 const adverse={sys:Math.min(0,harm.offsets.sys),dia:Math.min(0,harm.offsets.dia),
  spo2:Math.min(0,harm.offsets.spo2),hr:Math.max(0,harm.offsets.hr)},sources=new Set();
 for(const reaction of harm.reactions)if(reaction.severity>.18&&
  ['severe-drug-allergy','anticoagulant-bleeding','antithrombotic-bleeding'].includes(reaction.kind)){
  if(reaction.kind==='severe-drug-allergy')sources.add(reaction.sourceEventId);
  else for(const row of p.administrationLog||[])if(row.id===reaction.drugId)sources.add(row.sourceEventId);
 }
 if(opioid?.respiratoryRisk){
  adverse.sys+=Math.min(0,opioid.offsets.sys);adverse.dia+=Math.min(0,opioid.offsets.dia);adverse.spo2+=Math.min(0,opioid.offsets.spo2);
  for(const row of (p.administrationLog||[]).filter(row=>row.id==='morphine'&&minute-row.administeredAtNativeMinute<40).slice(-24))
   sources.add(row.sourceEventId);
 }
 for(const [id,drug] of Object.entries(support.drugs))if(drug.active&&drug.toxicity.spo2<0){
  adverse.spo2+=drug.toxicity.spo2;
  for(const row of p.administrationLog||[])if(row.id===id)sources.add(row.sourceEventId);
 }
 if(fluid.spo2<0){
  adverse.spo2+=fluid.spo2;
  for(const row of p.administrationLog||[])if(row.id==='fluid'&&isDeliveredClinicalAdministration(p,row,minute))sources.add(row.sourceEventId);
 }
 return {adverse,sources};
}
/** Attribution reads the SAME pure native adverse reducers at the death time;
 * it never advances another patient or writes physiology. A doctor's delivered
 * sources must belong to a minimal group whose native adverse offsets cross
 * the existing fatal threshold. This excludes innocuous teammate doses while
 * retaining both joint and independently sufficient lethal contributors.
 * Native disease that is independently critical remains uncertain. */
export function nativeDeathAttribution(p,c,minute){
 const {adverse,sources}=nativeAdverseContributions(p,c,minute),fatal=danger(p.liveVitals),
  corrected=Object.fromEntries(VITAL_AXES.map(axis=>[axis,p.liveVitals[axis]-adverse[axis]]));
 const disease=p.nativeDiseaseTarget,independentlyCritical=disease?.nativeMinute===minute&&danger(disease.vitals).critical;
 const delivered=(p.administrationLog||[]).filter(row=>sources.has(row.sourceEventId)&&isDeliveredClinicalAdministration(p,row,minute)),
  candidates=new Set(delivered.map(row=>row.sourceEventId)),groups=[...new Set(delivered.map(row=>row.actorId||null))],causalGroups=new Set();
 // The authoritative roster has at most four doctors (plus an unknown author
 // in an old receipt). Enumerate those groups, never the unbounded dose log.
 if(fatal.critical&&!independentlyCritical&&groups.length>0&&groups.length<=5){
  const lethal=[],limit=2**groups.length;
  for(let mask=0;mask<limit;mask++){
   const retained=new Set(delivered.filter(row=>mask&(1<<groups.indexOf(row.actorId||null))).map(row=>row.sourceEventId));
   const keep=row=>!candidates.has(row.sourceEventId)||retained.has(row.sourceEventId),projection={...p,
    administrationLog:p.administrationLog.filter(keep),treatments:(p.treatments||[]).filter(keep)};
   const offsets=mask===limit-1?adverse:nativeAdverseContributions(projection,c,minute).adverse;
   lethal[mask]=danger(Object.fromEntries(VITAL_AXES.map(axis=>[axis,corrected[axis]+offsets[axis]]))).critical;
  }
  if(!lethal[0])for(let mask=1;mask<limit;mask++){
   if(!lethal[mask])continue;
   let minimal=true;
   for(let subset=(mask-1)&mask;subset;subset=(subset-1)&mask)if(lethal[subset]){minimal=false;break;}
   if(minimal)groups.forEach((id,index)=>{if(mask&(1<<index))causalGroups.add(id);});
  }
 }
 const actualSources=[...sources].filter(id=>delivered.some(row=>row.sourceEventId===id&&causalGroups.has(row.actorId||null)));
 const actorIds=[...new Set(delivered.filter(row=>actualSources.includes(row.sourceEventId))
  .map(row=>row.actorId).filter(id=>typeof id==='string'&&id))];
 const attributable=actualSources.length>0&&actorIds.length>0;
 return {classification:attributable?'treatment-contributed':candidates.size?'undetermined':'disease',
  actorIds:attributable?actorIds:[],
  sourceEventIds:attributable?actualSources:[],cause:fatal.cause,
  evidence:attributable?'confirmed-native-adverse-component':candidates.size?'independent-disease-or-insufficient-causal-evidence':'native-disease-progression'};
}
const overlap=(a,b,start,end)=>Math.max(0,Math.min(b,end)-Math.max(a,start));
/** One call after the native care advance, never from UI or monitor paint.
 * Reuse legacy pure gate and rescue policies. Time is the existing real-second
 * and native-minute guard clock, not a second interval. If danger first arose
 * within a large frame, do NOT charge that unseen earlier period as exposure.
 */
export function advanceNativeSurvival(p,c,mode,before,after){
 if(p.caseEnded)return p.survival||null;
 const start=before.clinicalMinute,end=after.clinicalMinute;
 const from=before.nativeMinute,to=after.nativeMinute;
 if(![start,end,from,to].every(Number.isFinite)||start<0||end<start||to<from)
  throw Error('invalid native survival clock');
 const old=p.survival||previousState(),view=confirmedView(p,mode,old,to);
 const v=danger(p.liveVitals);
 const grace=csGraceState487(view,c,end);
 const earnedCredit=Math.max(old.earnedCredit,grace.observedCredit??0);
 const releaseAt=180+300*earnedCredit;
 // A one-use genuine rescue interval: 65 real seconds, as in V4. It is
 // NEVER renewed by repeated orders, and treatment alone never cures injury.
 const support=csCriticalRescueEvidence487(view,c,p.liveVitals);
 const rescueStartedAtSec=old.rescueStartedAtSec===null&&v.critical&&support.supported?
  end:old.rescueStartedAtSec;
 const window=csCriticalRescueWindow487(
  {...view,_criticalSupport487:rescueStartedAtSec===null?null:{startedAtSec:rescueStartedAtSec}},
  c,p.liveVitals,end);
 let exposed=old.exposureNativeMinutes;
 if(v.critical&&old.observedCritical){
  const postGrace=overlap(start,end,releaseAt,Infinity);
  const protectedTime=rescueStartedAtSec===null?0:
   overlap(start,end,Math.max(releaseAt,rescueStartedAtSec),rescueStartedAtSec+65);
  const nativeRate=end>start?(to-from)/(end-start):0;
  exposed+=Math.max(0,postGrace-protectedTime)*nativeRate;
 }else if(!v.critical)
  exposed=Math.max(0,exposed-(to-from)*HEAL_EXPOSURE_FACTOR);
 // Assert effective V4 policy: no fatality before grace, despite accelerated
 // clinical time and severe monitored signs.
 const dead=v.critical&&!grace.protected&&exposed>=FATAL_EXPOSURE_NATIVE_MIN&&
  !window.protected;
 p.survival={observedCritical:v.critical,exposureNativeMinutes:exposed,
  earnedCredit,rescueStartedAtSec,releaseAtRealSecond:releaseAt,
  rescueProtected:window.protected,criticalCause:v.cause,
  dead,atNativeMinute:to,atRealSecond:end};
 if(dead){
  p.patientDied=true;p.deathReason=v.cause;
  p.deathAttribution=nativeDeathAttribution(p,c,to);
  p.caseEnded=true; // no further treatment, disposition or XP after death
 }
 return p.survival;
}
