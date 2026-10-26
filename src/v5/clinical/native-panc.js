// PANC-001 native educational disease trajectory, kept outside the active
// executor roster until clinical/browser certification. NOT a prognostic model.
// Targets are bounded and advanced by the single native acute-care clock.
import {summarizeIVExposures} from './medication-exposure.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {oxygenationTargetOffset} from './oxygen-physiology.js';
import {applyConfirmedIVTargetOffsets} from './pharmacology-catalog.js';
import {applyMedicationHarmTargets487} from './medication-harms-487.js';
import {applyConfirmedMorphineTargetOffsets487} from './morphine-487.js';
import {applyConfirmedNativeSupportTargets487} from './native-support-487.js';
const axes=['temp','hr','rr','sys','dia','spo2'];
const limits={temp:[34.5,41],hr:[38,175],rr:[8,42],sys:[55,190],dia:[30,115],spo2:[72,100]};
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const ramp=(x,a,b)=>clamp((x-a)/(b-a),0,1);
export function initialPancVitals(c){
 if(c?.id!=='PANC-001')throw Error('PANC physiology requires PANC-001');
 const [sys,dia]=String(c.vitals.bp).split('/').map(Number);
 const v={temp:c.vitals.temp,hr:c.vitals.hr,rr:c.vitals.rr,sys,dia,spo2:c.vitals.spo2};
 if(axes.some(axis=>!Number.isFinite(v[axis])))throw Error('invalid PANC baseline vital signs');
 return v;
}
export function pancreatitisDiseaseTargets(p,c,minute){
 if(c?.id!=='PANC-001'||!Number.isFinite(minute)||minute<0)
  throw Error('invalid pancreatitis disease time');
 const trend=ramp(minute,20,200),late=ramp(minute,200,600);
 // This seed is already hypotensive. Clinical evaluation must NOT assume
 // that delayed treatment cures pancreatitis or that a consultation did it.
 return {temp:.18*trend+.25*late,hr:8*trend+7*late,
  rr:2*trend+2*late,sys:-7*trend-8*late,dia:-4*trend-4*late,
  spo2:-1.5*trend-1.5*late};
}
export function advancePancVitals(p,c,delta,minute=0){
 if(!Number.isFinite(delta)||delta<0||!Number.isFinite(minute)||minute<0)
  throw Error('invalid PANC physiology delta');
 if(p.caseEnded||delta===0)return;
 const base=initialPancVitals(c),natural=pancreatitisDiseaseTargets(p,c,minute);
 for(const axis of axes)base[axis]+=natural[axis]??0;
 // Only patient-bound COMPLETED crystalloid administration counts; a pending
 // order or guessed therapy flag does not improve shock. The bounded gain
 // protects against treating endless repeated boluses as unlimited benefit.
 const ml=summarizeIVExposures(p).confirmedCrystalloidMl;
 const normalized=clamp(ml/1200,0,1.35);
 base.sys+=16*normalized;base.dia+=8*normalized;
 base.hr-=12*normalized;base.rr-=1.5*normalized;
 const overload=crystalloidOverloadOffsets(p,c);
 base.rr+=overload.rr;base.spo2+=overload.spo2;
 base.spo2+=oxygenationTargetOffset(p,c,minute);
 applyConfirmedIVTargetOffsets(base,p,c,minute);
 applyMedicationHarmTargets487(base,p,c,minute);
 applyConfirmedMorphineTargetOffsets487(base,p,c,minute);
 applyConfirmedNativeSupportTargets487(base,p,c,minute);
 const steps=Math.floor(delta*60+1e-10),remainder=Math.max(0,delta-steps/60);
 for(const axis of axes){
  const rate=axis==='temp'?.08:.38;
  const blend=1-Math.pow(1-rate/60,steps)*(1-Math.min(1,remainder*rate));
  p.liveVitals[axis]+=(clamp(base[axis],...limits[axis])-p.liveVitals[axis])*blend;
 }
}
