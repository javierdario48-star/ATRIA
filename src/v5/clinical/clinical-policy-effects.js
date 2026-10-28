// Declarative targets consumed by the EXISTING acute-case vital writer.
// These game-scale response envelopes are not patient PK/prognostic estimates.
// This module never writes liveVitals, death, the clock, closure or rewards.
import {currentClinicalTreatment,isDeliveredClinicalAdministration} from './receipts.js';
import {summarizeIVExposures} from './medication-exposure.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {evaluateComplicationCandidate} from './complication-eligibility.js';

export const CLINICAL_AXES=Object.freeze(['temp','hr','rr','sys','dia','spo2']);
const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
const ramp=(t,a,b)=>clamp((t-a)/(b-a));
const zero=()=>Object.fromEntries(CLINICAL_AXES.map(axis=>[axis,0]));
const vector=(values,scale=1)=>Object.fromEntries(CLINICAL_AXES.map((axis,i)=>[axis,values[i]*scale]));
const add=(target,offset)=>{for(const axis of CLINICAL_AXES)target[axis]+=offset[axis];return target;};
function checkMinute(minute){if(!Number.isFinite(minute)||minute<0)throw Error('invalid clinical policy time');}

/** A dose may exert a partial effect during a real timed infusion, but cannot
 * satisfy closure before completion. It must be an owned, unique delivery row;
 * an order, a consultation or a preparation has no physiological effect. */
export function deliveredClinicalTreatment(patient,id,minute){
 const complete=currentClinicalTreatment(patient,id,minute);
 if(complete)return {...complete,deliveryFraction:1};
 const rows=(patient.administrationLog||[]).filter(row=>row.id===id&&row.status==='administering'&&
  isDeliveredClinicalAdministration(patient,row,minute));
 return rows[0];
}

export function clinicalPolicyTargets(patient,caseData,minute){
 checkMinute(minute);
 const policy=caseData.clinicalPolicy,trajectory=policy?.trajectory;
 if(!trajectory)throw Error('missing clinical trajectory');
 const first=ramp(minute,0,trajectory.earlyEnd),second=ramp(minute,trajectory.earlyEnd,trajectory.lateEnd);
 const out=zero();
 for(const [i,axis] of CLINICAL_AXES.entries())out[axis]=trajectory.early[i]*first+trajectory.late[i]*second;
 for(const response of policy.responses||[]){
  const all=(response.allOf||[]).map(id=>!matchesMedicationAllergy487(patient,id)&&deliveredClinicalTreatment(patient,id,minute));
  const any=(response.anyOf||[]).map(id=>!matchesMedicationAllergy487(patient,id)&&deliveredClinicalTreatment(patient,id,minute)).filter(Boolean);
  if(all.some(x=>!x)||response.anyOf?.length&&!any.length)continue;
  const evidence=[...all,...(any.length?[any.reduce((a,b)=>a.administeredAtNativeMinute<b.administeredAtNativeMinute?a:b)]:[])];
  if(!evidence.length)continue;
  const at=Math.max(...evidence.map(x=>x.administeredAtNativeMinute));
  const doseFraction=Math.min(...evidence.map(x=>x.deliveryFraction??1));
  add(out,vector(response.offsets,ramp(minute-at,response.delay,response.peak)*doseFraction));
 }
 if(trajectory.fluidResponse){
  const fluid=clamp(summarizeIVExposures(patient).confirmedCrystalloidMl/1000,0,1.25)*trajectory.fluidResponse;
  out.sys+=14*fluid;out.dia+=7*fluid;out.hr-=11*fluid;
 }
 return out;
}

/** The shared gate checks observed physiology and elapsed native time. A
 * deterministic draw selects a possible complication, never its outcome. */
export function complicationStateEligible(candidate,{nativeMinute,clinicalState}={}){
 if(!Number.isFinite(nativeMinute)||nativeMinute<(candidate.minMinute??0))return false;
 for(const [axis,conditions] of Object.entries(candidate.requiredState||{})){
  const value=axis==='map'?(clinicalState?.sys+2*clinicalState?.dia)/3:clinicalState?.[axis];
  if(!Number.isFinite(value))return false;
  for(const [operation,threshold] of Object.entries(conditions)){
   if(!Number.isFinite(threshold)||
    operation==='lt'&&!(value<threshold)||operation==='lte'&&!(value<=threshold)||
    operation==='gt'&&!(value>threshold)||operation==='gte'&&!(value>=threshold)||
    !['lt','lte','gt','gte'].includes(operation))return false;
  }
 }
 return true;
}
export function progressClinicalComplication(candidate,elapsed){
 if(!Number.isFinite(elapsed)||elapsed<0)return zero();
 return vector(candidate.offsets,clamp(elapsed/candidate.riseMinutes));
}
export function rescueClinicalComplication(candidate,elapsed){
 if(!Number.isFinite(elapsed)||elapsed<0)return 1;
 return 1-clamp(elapsed/candidate.recoveryMinutes);
}

/** Called only from advanceAdditionalCaseVitals. The checkpointed metadata is
 * the state of this policy within the existing patient, not another simulator. */
export function advanceClinicalComplications(patient,caseData,minute){
 checkMinute(minute);
 patient.policyState??={nativeMinute:0,complications:[]};
 if(minute+1e-8<patient.policyState.nativeMinute)throw Error('clinical policy clock cannot run backwards');
 const state=patient.policyState;
 const previousNativeMinute=state.nativeMinute;
 state.nativeMinute=minute;state.complications??=[];
 const out=zero(),selected=new Set((patient.variation?.complicationCandidates||[]).map(x=>x.id));
 for(const candidate of caseData.clinicalPolicy.complications||[]){
  if(!selected.has(candidate.id))continue;
  let episode=state.complications.find(x=>x.id===candidate.id);
  if(!episode){
   const eligibility=evaluateComplicationCandidate(candidate,{nativeMinute:minute,clinicalState:patient.liveVitals,
    registeredProgressions:{'offset-ramp-v1':ctx=>complicationStateEligible(candidate,ctx)},
    registeredRescues:{'confirmed-rescue-v1':rescueClinicalComplication}});
   if(eligibility.status!=='eligible')continue;
   episode={id:candidate.id,type:candidate.type||'clinical-deterioration',manifestation:candidate.manifestation,
    ...(candidate.neurology?{neurology:structuredClone(candidate.neurology)}:{}),
    onsetAt:minute,status:'active',severity:0,lastEvaluatedAt:minute,recoveryRemaining:1};state.complications.push(episode);
  }
  if(episode.status==='recovered')continue;
  const all=(candidate.rescueAllOf||[]).map(id=>currentClinicalTreatment(patient,id,minute));
  const any=(candidate.rescueAnyOf||[]).map(id=>currentClinicalTreatment(patient,id,minute)).filter(Boolean);
  const rescued=(all.length||candidate.rescueAnyOf?.length)&&all.every(Boolean)&&(!candidate.rescueAnyOf?.length||any.length);
  const previousAt=episode.lastEvaluatedAt??Math.max(episode.onsetAt,previousNativeMinute);
  let remaining=episode.recoveryRemaining??(episode.rescueAt===undefined?1:
   rescueClinicalComplication(candidate,Math.max(0,previousAt-episode.rescueAt)));
  if(rescued){
   const evidence=[...all,...(any.length?[any.reduce((a,b)=>a.administeredAtNativeMinute<b.administeredAtNativeMinute?a:b)]:[])];
   const evidenceAt=Math.max(episode.onsetAt,...evidence.map(t=>t.completedAtNativeMinute??t.administeredAtNativeMinute));
   episode.rescueAt??=evidenceAt;
   episode.rescueEvents=evidence.map(t=>t.sourceEventId);episode.status='recovering';
   remaining=Math.max(0,remaining-Math.max(0,minute-Math.max(previousAt,evidenceAt))/candidate.recoveryMinutes);
  }else{
   if(episode.status==='recovering')episode.rescueInterruptedAt=minute;
   if(episode.rescueAt!==undefined)remaining=Math.min(1,remaining+(minute-previousAt)/candidate.riseMinutes);
   episode.status='active';
  }
  episode.lastEvaluatedAt=minute;episode.recoveryRemaining=remaining;
  const elapsed=Math.max(0,minute-episode.onsetAt);
  episode.severity=clamp(elapsed/candidate.riseMinutes)*remaining;
  if(remaining===0){episode.status='recovered';episode.recoveredAt=minute;}
  const progression=progressClinicalComplication(candidate,elapsed);
  for(const axis of CLINICAL_AXES)out[axis]+=progression[axis]*remaining;
 }
 state.renalStress=Math.max(0,...state.complications.filter(e=>e.type==='acute-kidney-injury').map(e=>e.severity));
 return out;
}
