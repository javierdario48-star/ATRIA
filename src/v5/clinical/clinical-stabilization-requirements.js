// Read-only stabilization projection for experimental V2 care. Symptoms and
// native-documented injury determine urgency; no parallel vital writer,
// death criterion, toxicology simulation, medication authorization or XP.
// Explicit disease/physiology traits are safer than inferring drug reversal
// from a low blood pressure alone.
import {confirmedRespiratoryAdverse} from './clinical-risk.js';

export function observedStabilizationRequirements({patient:p,caseData:c,fulfilled=[]}={}){
 if(!/^v2(?:$|[-.])/.test(String(c?.clinicalRevision||''))||
  !c?.clinicalPolicy||!p||p.caseEnded||p.patientDied)return [];
 const v=p.liveVitals||{},traits=new Set(c.clinicalPolicy.traits||[]);
 const done=new Set(fulfilled),events=(p.adverseEvents||[]).filter(event=>
  event.status==='active'&&event.patientUid===p.uid&&
  typeof event.sourceEventId==='string'&&
  (p.administrationLog||[]).some(row=>row.patientUid===p.uid&&row.sourceEventId===event.sourceEventId));
 const kinds=new Set(events.map(event=>event.kind));
 const overload=confirmedRespiratoryAdverse(p,c).adverseCount>0||
  kinds.has('albumin-respiratory-overload');
 const bleedingHarm=kinds.has('anticoagulant-bleeding')||kinds.has('antithrombotic-bleeding');
 const respiratoryHarm=kinds.has('opioid-respiratory-depression')||overload;
 // Anaphylaxis is handled by the authoritative, higher-priority adrenaline
 // rescue path (with its own dose, route, time and reaction receipt).
 const shock=Number.isFinite(v.sys)&&v.sys<90||
  Number.isFinite(v.sys)&&Number.isFinite(v.dia)&&(v.sys+2*v.dia)/3<65;
 const respiratory=Number.isFinite(v.spo2)&&v.spo2<90||
  Number.isFinite(v.rr)&&v.rr<10;
 const needsOxygen=respiratory||respiratoryHarm&&(
  Number.isFinite(v.spo2)&&v.spo2<94||Number.isFinite(v.rr)&&v.rr<12);
 const needsBlood=traits.has('bleed')&&(shock||
  bleedingHarm&&Number.isFinite(v.sys)&&v.sys<105);
 const needsVolume=shock&&!needsBlood&&traits.has('infection')&&!overload&&
  !kinds.has('vasopressor-excess-response');
 const suggested=[
  ...(needsOxygen?['oxygen']:[]),
  ...(needsBlood?['transfusion']:[]),
  ...(needsVolume?['fluid']:[])
 ].filter(id=>!done.has(id));
 if(!suggested.length)return [];
 const reason=events.length?'iatrogenic-deterioration-rescue':'observed-instability-rescue';
 // This is the SAME structured requirement consumed by native closure and
 // Vega, not an invented hidden diagnosis or a second complication episode.
 return [{type:'treatment',anyOf:[suggested],reason,
  message:'Estabilización inmediata indicada por deterioro fisiológico documentado antes del destino.'}];
}
