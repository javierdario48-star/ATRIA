// Read-only observations from effective ns421-clinical-state/patient-dialogue.
// Trends and analgesia are read from actual native signs and the shared pure
// medication response. Observation never advances time or decides treatment/XP.
import {PATIENT_PROFILES} from './patient-profiles.js';
import {confirmedMorphineResponse487} from './morphine-487.js';
import {confirmedClinicalTreatment} from './receipts.js';
const responseElapsed=(p,id,minute)=>{
 const received=confirmedClinicalTreatment(p,id,minute);
 return received?minute-received.administeredAtNativeMinute:-Infinity;
};
export function readNeurologicalState(p,atNativeMinute=0){
 if(p.neurology)return {...p.neurology};
 const impaired=Number(p.hypoperfusionNativeMinutes||0);
 const hepatic=p.caseId==='ENCEF-001';
 if(hepatic){
  // A delayed educational response to confirmed oral lactulose is observed
  // as orientation, never inferred from a heart-rate/BP improvement. Shock
  // or hypoxemia prevents claiming neurological recovery from this drug.
  const recovered=responseElapsed(p,'lactulose',atNativeMinute)>=90&&
   p.liveVitals?.sys>=90&&p.liveVitals?.spo2>=92&&impaired<2;
  return impaired>=6?{eye:2,verbal:2,motor:4}:impaired>=2?{eye:3,verbal:3,motor:5}:
   {eye:4,verbal:recovered?5:4,motor:6};
 }
 const confused=p.caseId==='PERI-PBE-001',recovered=confused&&
  p.phys?.inflammation<Number(p.physBaseline?.inflammation||.62)*.8&&p.liveVitals?.sys>=100;
 return impaired>=6?{eye:2,verbal:2,motor:4}:impaired>=2?{eye:3,verbal:3,motor:5}:
  {eye:4,verbal:confused&&!recovered?4:5,motor:6};
}
function observationIndex(v,n){
 const map=(v.sys+2*v.dia)/3;
 return Math.max(0,(100-v.sys)/10)*2+Math.max(0,(65-map)/8)*2+Math.max(0,(v.hr-95)/15)+
  Math.max(0,(94-v.spo2)/2)+Math.max(0,(v.rr-20)/5)+Math.max(0,38-v.hr)/12+
  Math.max(0,8-v.rr)+Math.max(0,v.temp-37.5)*.8+Math.max(0,15-(n.eye??4)-(n.verbal??5)-(n.motor??6));
}
export function readPatientObservations(p,caseId=p.caseId,atNativeMinute=0){
 const neuro=readNeurologicalState(p,atNativeMinute),initial=observationIndex(p.baselineVitals||p.liveVitals,readNeurologicalState({caseId})),
  delta=observationIndex(p.liveVitals,neuro)-initial;
 const trend=delta>.8?'worse':delta<-.8?'better':'unchanged';
 const intensity=PATIENT_PROFILES[caseId]?.intensity;
 // Original ns421 symptoms() used a four-point morphine pain reduction, but
 // its active-chip rule never wore off. Use the final original dose-dependent
 // analgesia instead, from the same real receipts and authoritative clock as
 // the vital owner. Observation remains pure and never advances the model.
 const opioid=confirmedMorphineResponse487(p,{id:caseId},atNativeMinute);
 const bowelImpactionResolved=caseId==='FECAL-001'&&responseElapsed(p,'disimpaction',atNativeMinute)>=5,
  bowelDecompressed=caseId==='ILEO-001'&&responseElapsed(p,'ngt',atNativeMinute)>=5;
 const localRelief=bowelImpactionResolved?3:bowelDecompressed?2:0;
 const pain=Number.isFinite(intensity)?Math.round(Math.max(0,Math.min(10,
  intensity-4*(opioid?.analgesia??0)-localRelief+(trend==='worse'?1:0)))):null;
 return {neuro,trend,pain,bowelImpactionResolved,bowelDecompressed};
}
