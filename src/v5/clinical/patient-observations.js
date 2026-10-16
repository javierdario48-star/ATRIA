// Read-only observations from effective ns421-clinical-state/patient-dialogue.
// This is a presentation trend over actual native signs, NOT a physiology or
// medication model. It never advances time or decides treatment/closure/XP.
import {PATIENT_PROFILES} from './patient-profiles.js';
export function readNeurologicalState(p){
 if(p.neurology)return {...p.neurology};
 const impaired=Number(p.hypoperfusionNativeMinutes||0);
 return impaired>=6?{eye:2,verbal:2,motor:4}:impaired>=2?{eye:3,verbal:3,motor:5}:{eye:4,verbal:5,motor:6};
}
function observationIndex(v,n){
 const map=(v.sys+2*v.dia)/3;
 return Math.max(0,(100-v.sys)/10)*2+Math.max(0,(65-map)/8)*2+Math.max(0,(v.hr-95)/15)+
  Math.max(0,(94-v.spo2)/2)+Math.max(0,(v.rr-20)/5)+Math.max(0,38-v.hr)/12+
  Math.max(0,8-v.rr)+Math.max(0,v.temp-37.5)*.8+Math.max(0,15-(n.eye??4)-(n.verbal??5)-(n.motor??6));
}
export function readPatientObservations(p,caseId=p.caseId){
 const neuro=readNeurologicalState(p),initial=observationIndex(p.baselineVitals||p.liveVitals,{eye:4,verbal:5,motor:6}),
  delta=observationIndex(p.liveVitals,neuro)-initial;
 const trend=delta>.8?'worse':delta<-.8?'better':'unchanged';
 const intensity=PATIENT_PROFILES[caseId]?.intensity;
 // Neither migrated case has an executed analgesic or source-control operation.
 // IV antibiotics and spironolactone are not assigned invented pain relief.
 return {neuro,trend,pain:Number.isFinite(intensity)?Math.min(10,intensity+(trend==='worse'?1:0)):null};
}
