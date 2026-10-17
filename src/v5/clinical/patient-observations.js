// Read-only observations from effective ns421-clinical-state/patient-dialogue.
// Trends and analgesia are read from actual native signs and the shared pure
// medication response. Observation never advances time or decides treatment/XP.
import {PATIENT_PROFILES} from './patient-profiles.js';
import {confirmedMorphineResponse487} from './morphine-487.js';
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
export function readPatientObservations(p,caseId=p.caseId,atNativeMinute=0){
 const neuro=readNeurologicalState(p),initial=observationIndex(p.baselineVitals||p.liveVitals,{eye:4,verbal:5,motor:6}),
  delta=observationIndex(p.liveVitals,neuro)-initial;
 const trend=delta>.8?'worse':delta<-.8?'better':'unchanged';
 const intensity=PATIENT_PROFILES[caseId]?.intensity;
 // Original ns421 symptoms() used a four-point morphine pain reduction, but
 // its active-chip rule never wore off. Use the final original dose-dependent
 // analgesia instead, from the same real receipts and authoritative clock as
 // the vital owner. Observation remains pure and never advances the model.
 const opioid=confirmedMorphineResponse487(p,{id:caseId},atNativeMinute);
 const pain=Number.isFinite(intensity)?Math.round(Math.max(0,Math.min(10,
  intensity-4*(opioid?.analgesia??0)+(trend==='worse'?1:0)))):null;
 return {neuro,trend,pain};
}
