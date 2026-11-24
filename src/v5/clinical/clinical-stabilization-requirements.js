// Read-only, transversal stabilization projection for experimental V2 cases.
// One native physiological state, five possible and overlapping causes.
// No separate drug reversal, dose writer, death gate, or XP.
import {confirmedRespiratoryAdverse} from './clinical-risk.js';
import {observedDeteriorationCauses} from './clinical-deterioration-causes.js';

const seriousKinds=new Set([
 'severe-drug-allergy','anticoagulant-bleeding','antithrombotic-bleeding',
 'opioid-respiratory-depression','albumin-respiratory-overload',
 'vasopressor-excess-response','diuretic-volume-depletion'
]);
export function observedStabilizationRequirements({patient:p,caseData:c,fulfilled=[],destination}={}){
 if(!/^v2(?:$|[-.])/.test(String(c?.clinicalRevision||''))||
  !c?.clinicalPolicy||!p||p.caseEnded||p.patientDied)return [];
 const v=p.liveVitals||{},traits=new Set(c.clinicalPolicy.traits||[]);
 const done=new Set(fulfilled);
 const {causes,events}=observedDeteriorationCauses({patient:p,caseData:c});
 const kinds=new Set(events.map(event=>event.kind));
 const overload=confirmedRespiratoryAdverse(p,c).adverseCount>0||
  kinds.has('albumin-respiratory-overload');
 const bleedingHarm=kinds.has('anticoagulant-bleeding')||kinds.has('antithrombotic-bleeding');
 const respiratoryHarm=kinds.has('opioid-respiratory-depression')||overload;
 // The native allergic-reaction path independently owns adrenaline rescue.
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
 const originCodes=[...new Set(causes.map(x=>x.origin))];
 const iatrogenic=needsOxygen&&respiratoryHarm||needsBlood&&bleedingHarm;
 const requirements=[];
 if(suggested.length)requirements.push({type:'treatment',anyOf:[suggested],
  reason:iatrogenic?'iatrogenic-deterioration-rescue':'observed-instability-rescue',
  origins:originCodes,
  message:'Estabilización inmediata según los signos vitales y el daño nativo observado.'});
 // Giving symptomatic support does not prove that an actual toxic injury has
 // resolved. Elective discharge waits for the native adverse episode to clear;
 // urgent transfers to a receiving specialist need not wait for full recovery.
 if(destination==='alta'&&events.some(e=>seriousKinds.has(e.kind))&&!suggested.length)
  requirements.push({type:'wait',reason:'active-adverse-recovery',origins:originCodes,
   message:'Esperar y reevaluar la resolución fisiológica documentada del evento adverso antes del alta.'});
 return requirements;
}
