// CHOLE-001 native owner: one bounded educational cholecystitis trajectory.
// This case does NOT inherit APP disease progression or the septic peritonitis
// engine. These approximate, explicit game-scale targets are not clinical
// prognostic equations and never imply that an unoperated gallbladder is cured.
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {oxygenationTargetOffset} from './oxygen-physiology.js';
import {applyConfirmedIVTargetOffsets} from './pharmacology-catalog.js';
import {applyMedicationHarmTargets487} from './medication-harms-487.js';
import {applyConfirmedMorphineTargetOffsets487} from './morphine-487.js';
import {applyConfirmedNativeSupportTargets487} from './native-support-487.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';

const axes=['temp','hr','rr','sys','dia','spo2'];
const bounds={temp:[34.5,41],hr:[38,175],rr:[8,42],sys:[55,190],dia:[30,115],spo2:[72,100]};
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
const ramp=(minute,from,to)=>clamp((minute-from)/(to-from),0,1);
const regimens=[['ceftriaxone','metronidazole'],['piptazo'],['imipenem']];

export function initialCholeVitals(c){
 if(c?.id!=='CHOLE-001')throw Error('native chole physiology requires CHOLE-001');
 const [sys,dia]=String(c.vitals.bp).split('/').map(Number);
 const vitals={temp:c.vitals.temp,hr:c.vitals.hr,rr:c.vitals.rr,sys,dia,spo2:c.vitals.spo2};
 if(axes.some(k=>!Number.isFinite(vitals[k])))throw Error('invalid CHOLE baseline');
 return vitals;
}
function confirmedAntimicrobialTime(p,minute){
 for(const regimen of regimens){
  const starts=[];
  for(const id of regimen){
   if(matchesMedicationAllergy487(p,id))break;
   const row=(p.administrationLog||[]).find(x=>x.id===id&&x.patientUid===p.uid&&
    Number.isFinite(x.administeredAtNativeMinute)&&x.administeredAtNativeMinute<=minute&&
    (p.treatments||[]).some(t=>t.id===x.id&&t.sourceEventId===x.sourceEventId&&
      t.patientUid===p.uid&&t.administeredAtNativeMinute===x.administeredAtNativeMinute));
   if(!row)break;
   starts.push(row.administeredAtNativeMinute);
  }
  if(starts.length===regimen.length)return Math.max(...starts);
 }
 return null;
}
/** No change before the short case baseline. Verified antibiotic coverage
 * reduces subsequent worsening; it never normalizes vital signs instantly.
 * Definitive source control is outside the ED and cannot be claimed here.
 */
export function choleDiseaseTargetOffsets(p,c,minute){
 if(c?.id!=='CHOLE-001'||!Number.isFinite(minute)||minute<0)
  throw Error('invalid CHOLE natural history clock');
 const treatedAt=confirmedAntimicrobialTime(p,minute);
 const protectedFraction=treatedAt===null?0:.55*ramp(minute-treatedAt,5,120);
 const growth=1-protectedFraction;
 const early=ramp(minute,20,180)*growth,late=ramp(minute,180,600)*growth;
 return {temp:.45*early+.3*late,hr:12*early+12*late,
  rr:2*early+3*late,sys:-6*early-12*late,
  dia:-3*early-7*late,spo2:-1*early-2*late};
}
export function advanceCholeVitals(p,c,dt,minute=0){
 if(!Number.isFinite(dt)||dt<0||!Number.isFinite(minute)||minute<0)
  throw Error('invalid CHOLE vital advance');
 if(p.caseEnded||dt===0)return;
 const target=initialCholeVitals(c),disease=choleDiseaseTargetOffsets(p,c,minute);
 for(const axis of axes)target[axis]+=disease[axis];
 // No automatic crystalloid pressure bonus in initially stable cholecystitis.
 // Real overload, toxic exposures and confirmed supportive doses still matter.
 const overload=crystalloidOverloadOffsets(p,c);
 target.rr+=overload.rr;target.spo2+=overload.spo2;
 target.spo2+=oxygenationTargetOffset(p,c,minute);
 applyConfirmedIVTargetOffsets(target,p,c,minute);
 applyMedicationHarmTargets487(target,p,c,minute);
 applyConfirmedMorphineTargetOffsets487(target,p,c,minute);
 applyConfirmedNativeSupportTargets487(target,p,c,minute);
 const steps=Math.floor(dt*60+1e-10),remaining=Math.max(0,dt-steps/60);
 for(const axis of axes){
  const rate=axis==='temp'?.08:.38;
  const blend=1-Math.pow(1-rate/60,steps)*(1-Math.min(1,remaining*rate));
  p.liveVitals[axis]+=(clamp(target[axis],...bounds[axis])-p.liveVitals[axis])*blend;
 }
}
