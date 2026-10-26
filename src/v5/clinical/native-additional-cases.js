// Distinct disease targets for five original unported case seeds.
// ONE acute-care clinical executor owns the clock and all medication events.
// These bounded educational trajectories do not represent prognostic scores.
import {summarizeIVExposures} from './medication-exposure.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {oxygenationTargetOffset} from './oxygen-physiology.js';
import {applyConfirmedIVTargetOffsets} from './pharmacology-catalog.js';
import {applyMedicationHarmTargets487} from './medication-harms-487.js';
import {applyConfirmedMorphineTargetOffsets487} from './morphine-487.js';
import {applyConfirmedNativeSupportTargets487} from './native-support-487.js';
import {GASTRO_DYNAMICS} from './gastro-expansion-policies.js';
import {confirmedClinicalTreatment} from './receipts.js';
const axes=['temp','hr','rr','sys','dia','spo2'];
const bounds={temp:[34.5,41],hr:[38,175],rr:[8,42],sys:[55,190],dia:[30,115],spo2:[72,100]};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const ramp=(t,a,b)=>clamp((t-a)/(b-a),0,1);
export const ADDITIONAL_CASE_TRAJECTORIES=Object.freeze({
 ...GASTRO_DYNAMICS,
 // Inflammation can improve gradually, without a direct BP/SpO2 bonus or
 // instant IBD remission. These are bounded gameplay changes, not kinetics.
 'CROHN-001':{early:[.25,7,1,-3,-2,-.3],late:[.35,7,1,-4,-2,-.4],earlyEnd:180,lateEnd:600,
  therapy:'steroid',protection:.25,protectionAxes:['temp','hr'],onset:60,peak:240,fluidResponse:0},
 // An IV PPI suppresses acid, not active hemorrhage. Do not grant a
 // false perfusion benefit before endoscopic hemostasis (which is a handoff,
 // NOT a performed operation in this shift).
 'HDA-001':{early:[0,17,3,-13,-7,-.6],late:[0,15,3,-13,-8,-1.2],earlyEnd:130,lateEnd:360,
  therapy:null,protection:0,fluidResponse:1.0},
 // Colon neoplasm/anemia is NOT reversed by an ED encounter or imaging.
 'COLON-001':{early:[0,3,0,-1,0,0],late:[0,3,0,-2,-1,0],earlyEnd:360,lateEnd:1000,
  therapy:null,protection:0,fluidResponse:0},
 // Bowel obstruction: vomiting and third-space losses can cause depletion.
 // NG decompression is documented, not a replacement for volume or surgery.
 'ILEO-001':{early:[.18,14,2,-12,-7,-.4],late:[.5,16,3,-15,-8,-1],earlyEnd:170,lateEnd:500,
  therapy:'ngt',protection:0,fluidResponse:.9},
 // Mesenteric ischemia: anticoagulation is part of care but must not imply
 // reperfusion of this arterial ischemia or reverse ongoing bowel injury.
 'MESI-001':{early:[.25,15,3,-11,-6,-1],late:[.85,19,4,-18,-10,-2],earlyEnd:100,lateEnd:300,
  therapy:'anticoagulation',protection:0,fluidResponse:.65}
});
export function additionalCaseInitialVitals(c){
 if(!Object.hasOwn(ADDITIONAL_CASE_TRAJECTORIES,c?.id))throw Error('additional case not supported');
 const [sys,dia]=String(c.vitals.bp).split('/').map(Number);
 const out={temp:c.vitals.temp,hr:c.vitals.hr,rr:c.vitals.rr,sys,dia,spo2:c.vitals.spo2};
 if(axes.some(k=>!Number.isFinite(out[k])))throw Error('invalid baseline');
 return out;
}
export function additionalCaseTargets(p,c,minute){
 const rule=ADDITIONAL_CASE_TRAJECTORIES[c?.id];
 if(!rule||!Number.isFinite(minute)||minute<0)throw Error('invalid disease target');
 const therapyIds=Array.isArray(rule.therapy)?rule.therapy:rule.therapy?[rule.therapy]:[];
 const confirmed=therapyIds.map(id=>confirmedClinicalTreatment(p,id,minute)).find(Boolean);
 const protective=confirmed?rule.protection*ramp(
  minute-confirmed.administeredAtNativeMinute,rule.onset??10,rule.peak??130):0;
 const first=ramp(minute,20,rule.earlyEnd),second=ramp(minute,rule.earlyEnd,rule.lateEnd);
 const out=Object.fromEntries(axes.map((axis,i)=>[axis,
  (rule.early[i]*first+rule.late[i]*second)*
   (1-(rule.protectionAxes||[]).includes(axis)*protective)]));
 // Volume resuscitation must be ADMINISTERED. A pending order cannot
 // produce a miraculous response. Crystalloid is not a definitive therapy.
 const iv=summarizeIVExposures(p);
 const fluid=clamp(iv.confirmedCrystalloidMl/1000,0,1.25)*rule.fluidResponse;
 out.sys+=14*fluid;out.dia+=7*fluid;out.hr-=11*fluid;
 // Transfusion physiology is owned ONLY by applyConfirmedNativeSupportTargets487.
 return out;
}
export function advanceAdditionalCaseVitals(p,c,delta,minute=0){
 if(!Number.isFinite(delta)||delta<0||!Number.isFinite(minute)||minute<0)throw Error('invalid physiology delta');
 if(delta===0||p.caseEnded)return;
 const base=additionalCaseInitialVitals(c),offset=additionalCaseTargets(p,c,minute);
 for(const axis of axes)base[axis]+=offset[axis];
 const overload=crystalloidOverloadOffsets(p,c);
 base.rr+=overload.rr;base.spo2+=overload.spo2;
 base.spo2+=oxygenationTargetOffset(p,c,minute);
 applyConfirmedIVTargetOffsets(base,p,c,minute);
 applyMedicationHarmTargets487(base,p,c,minute);
 applyConfirmedMorphineTargetOffsets487(base,p,c,minute);
 applyConfirmedNativeSupportTargets487(base,p,c,minute);
 const steps=Math.floor(delta*60+1e-10),remainder=Math.max(0,delta-steps/60);
 for(const axis of axes){
  const rate=axis==='temp'?.08:.38,blend=1-Math.pow(1-rate/60,steps)*(1-Math.min(1,remainder*rate));
  p.liveVitals[axis]+=(clamp(base[axis],...bounds[axis])-p.liveVitals[axis])*blend;
 }
}
