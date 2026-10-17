import {IV_MEDICINES} from './native-medications.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {oxygenationTargetOffset} from './oxygen-physiology.js';
import {applyConfirmedIVTargetOffsets} from './pharmacology-catalog.js';
// Case-specific original APP-001 vitals/doses, characterized from the effective
// 4.8.7 VM in qa/v5/fixtures/app-native-reference.json. Pure simulation only.
const keys=['temp','hr','rr','sys','dia','spo2'];
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const bounds={temp:[34.5,41],hr:[38,175],rr:[8,42],sys:[55,190],dia:[30,115],spo2:[72,100]};
export const APP_NATIVE_PREPARATION_SECONDS=Object.freeze(Object.fromEntries(
 Object.values(IV_MEDICINES).map(x=>[x.id,x.seconds])));
export function initialAppVitals(c){
 if(c?.id!=='APP-001')throw Error('native APP model requires APP-001');
 const [sys,dia]=String(c.vitals.bp).split('/').map(Number);
 return {temp:c.vitals.temp,hr:c.vitals.hr,rr:c.vitals.rr,sys,dia,spo2:c.vitals.spo2};
}
// Backwards-compatible export for characterized APP dose contracts.
export {parseStandardIVDose as parseAppDose} from './native-medications.js';
export function advanceAppVitals(p,c,dt,atNativeMinute){
 if(!Number.isFinite(dt)||dt<0)throw Error('invalid APP physiology delta');
 if(p.caseEnded)return;
 const target=initialAppVitals(c);
 if(p.treatments?.some(t=>t.id==='fluid')){
  target.sys+=14;target.dia+=7;target.hr-=12;target.rr-=1;
 }
 const overload=crystalloidOverloadOffsets(p,c);
 target.rr+=overload.rr;target.spo2+=overload.spo2;
 target.spo2+=oxygenationTargetOffset(p,c,atNativeMinute);
 applyConfirmedIVTargetOffsets(target,p,c,atNativeMinute);
 const steps=Math.floor(dt*60+1e-10),remaining=Math.max(0,dt-steps/60);
 for(const key of keys){
  target[key]=clamp(target[key],...bounds[key]);
  const rate=key==='temp'?.08:.38;
  const blend=1-Math.pow(1-rate/60,steps)*(1-Math.min(1,remaining*rate));
  p.liveVitals[key]+=(target[key]-p.liveVitals[key])*blend;
 }
}
