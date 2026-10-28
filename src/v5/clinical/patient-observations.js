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
const clamp=(x,lo,hi)=>Math.max(lo,Math.min(hi,x));
const policyAt=(p,minute)=>Number.isFinite(p.policyState?.nativeMinute)&&
 p.policyState.nativeMinute<=minute+1e-9?p.policyState:null;
/** Read the existing owner's present episodes; never predict an unsampled
 * onset, progress severity, or turn an ordered rescue into recovery. */
export function readClinicalComplications(p,atNativeMinute=0){
 return (policyAt(p,atNativeMinute)?.complications||[]).filter(x=>
  ['active','recovering'].includes(x.status)&&Number.isFinite(x.severity)&&x.severity>0&&
  (!Number.isFinite(x.onsetAt)||x.onsetAt<=atNativeMinute))
  .map(x=>({...x,...(x.neurology?{neurology:{...x.neurology}}:{})}));
}
function blendNeurology(n,target,fraction,complication=false){
 for(const key of ['eye','verbal','motor'])if(Number.isFinite(target?.[key])&&Number.isFinite(n[key])){
  const value=Math.round(n[key]+(target[key]-n[key])*fraction);
  n[key]=complication?Math.min(n[key],value):value;
 }
 for(const key of ['seizureActive','postictal'])if(typeof target?.[key]==='boolean'&&
  (complication?fraction>0:fraction>=1))n[key]=target[key];
}
function neurologicalResponses(p,n,minute){
 for(const response of p.observationResponses||[]){
  const all=(response.allOf||[]).map(id=>confirmedClinicalTreatment(p,id,minute)),
   any=(response.anyOf||[]).map(id=>confirmedClinicalTreatment(p,id,minute)).filter(Boolean);
  if(all.some(x=>!x)||response.anyOf?.length&&!any.length)continue;
  const evidence=[...all,...(any.length?[any.reduce((a,b)=>
   (a.completedAtNativeMinute??a.administeredAtNativeMinute)<
   (b.completedAtNativeMinute??b.administeredAtNativeMinute)?a:b)]:[])];
  if(!evidence.length)continue;
  const completedAt=Math.max(...evidence.map(x=>x.completedAtNativeMinute??x.administeredAtNativeMinute)),
   fraction=clamp((minute-completedAt-response.delay)/(response.peak-response.delay),0,1);
  if(Number.isFinite(fraction)&&fraction>0)blendNeurology(n,response.neurology,fraction);
 }
}
/** Present respiratory support and complications are observations of the
 * existing clinical owner, never a second disease/treatment writer. */
export function readRespiratoryObservation(p,atNativeMinute=0){
 const state=policyAt(p,atNativeMinute);
 const fatigue=Math.max(0,...(state?.complications||[]).filter(x=>
  !['resolved','scheduled','inactive','not-triggered'].includes(x.status)&&
  (!Number.isFinite(x.onsetAt)||x.onsetAt<=atNativeMinute)&&
  (x.effect==='respiratory-fatigue'||x.effect?.type==='respiratory-fatigue'||x.type==='respiratory-fatigue'))
  .map(x=>Number.isFinite(x.severity)?clamp(x.severity,0,1):0));
 const invasive=confirmedClinicalTreatment(p,'intubation',atNativeMinute),
  noninvasive=confirmedClinicalTreatment(p,'niv',atNativeMinute),support=invasive||noninvasive;
 return {fatigue,ventilation:invasive?'invasive':noninvasive?'non-invasive':null,
  ventilationMinutes:support?Math.max(0,atNativeMinute-support.administeredAtNativeMinute):0};
}
export function readNeurologicalState(p,atNativeMinute=0){
 const current=policyAt(p,atNativeMinute)?.neurology||p.neurology;
 if(current){
  const n={...current},respiratory=readRespiratoryObservation(p,atNativeMinute);
  neurologicalResponses(p,n,atNativeMinute);
  for(const episode of readClinicalComplications(p,atNativeMinute))
   blendNeurology(n,episode.neurology,clamp(episode.severity,0,1),true);
  if(respiratory.ventilation==='invasive'){
   n.verbal=null;n.reason='Intubación: respuesta verbal no evaluable.';
  }
  return n;
 }
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
 const neuro=readNeurologicalState(p,atNativeMinute),initial=observationIndex(p.baselineVitals||p.liveVitals,
  p.neurology||readNeurologicalState({caseId})),
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
