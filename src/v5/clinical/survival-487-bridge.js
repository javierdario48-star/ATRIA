// C12.f1a — legacy survival POLICY only; not a copied V4 scheduler or vital writer.
// The native guard clock supplies time, case policies own liveVitals, and this
// ONE adapter owns fatal exposure + case termination for solo/apprentice.
import {csGraceState487} from '../../clinical/grace-survival-487.js';
import {csCriticalRescueEvidence487,csCriticalRescueWindow487}
 from '../../clinical/critical-rescue-487.js';
import {summarizeIVExposures} from './medication-exposure.js';
import {IV_MEDICINES} from './native-medications.js';

// Both constants come from the effective V4 irreversible transition and the
// validated 65s rescue policy. Gameplay units, NOT clinical prognosis.
const FATAL_EXPOSURE_NATIVE_MIN=1.35;
const HEAL_EXPOSURE_FACTOR=.70;
const VITAL_AXES=['sys','dia','spo2','hr'];
const previousState=()=>({observedCritical:false,exposureNativeMinutes:0,
 earnedCredit:0,rescueStartedAtSec:null,dead:false});

function confirmedView(p,mode,prior){
 const administrations=p.administrationLog||[];
 const idSet=new Set();
 const active=new Map();
 for(const row of administrations){
  if(row.patientUid!==p.uid||typeof row.sourceEventId!=='string'||!row.sourceEventId||
    idSet.has(row.sourceEventId))throw Error('invalid native survival administration');
  idSet.add(row.sourceEventId);
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
 const old=p.survival||previousState(),view=confirmedView(p,mode,old);
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
  p.caseEnded=true; // no further treatment, disposition or XP after death
 }
 return p.survival;
}
