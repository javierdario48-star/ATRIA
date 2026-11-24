// Transversal, read-only provenance over ACTUAL native physiology and receipts.
// Five overlapping origins are evidence labels, NOT five simulated engines.
// No vital writes, synthetic adverse events, malpractice verdicts or XP.
import {clinicalAcuity} from './acuity.js';
import {currentClinicalTreatment,isDeliveredClinicalAdministration} from './receipts.js';

const allergyKinds=new Set(['severe-drug-allergy','cutaneous-drug-hypersensitivity']);
const harmKinds=new Set([
 'severe-drug-allergy','cutaneous-drug-hypersensitivity',
 'anticoagulant-bleeding','antithrombotic-bleeding',
 'opioid-respiratory-depression','albumin-respiratory-overload',
 'vasopressor-excess-response','diuretic-volume-depletion'
]);
const unsafeCodes=new Set([
 'clinical-contraindication','clinical-anticoagulant-mismatch',
 'clinical-blood-pressure-limit'
]);
const activeEpisode=new Set(['active','incipient','recovering']);
const finite=x=>typeof x==='number'&&Number.isFinite(x);
const baseVitals=c=>{
 const [sys,dia]=String(c?.vitals?.bp||'').split('/').map(Number);
 return {sys,dia,spo2:c?.vitals?.spo2,rr:c?.vitals?.rr,hr:c?.vitals?.hr,temp:c?.vitals?.temp};
};
const materiallyWorse=(v,base)=>{
 const current=clinicalAcuity(v),initial=clinicalAcuity(base);
 return current.priority>initial.priority||
  finite(v.sys)&&finite(base.sys)&&v.sys<95&&v.sys<base.sys||
  finite(v.spo2)&&finite(base.spo2)&&v.spo2<92&&v.spo2<base.spo2||
  finite(v.hr)&&finite(base.hr)&&v.hr>=120&&v.hr>base.hr||
  finite(v.rr)&&finite(base.rr)&&v.rr>=30&&v.rr>base.rr;
};

/** Only authentic native evidence qualifies. A risk/contraindication alone
 * cannot create organ injury. "Unattended" means observed untreated
 * progression, not automatically negligence by an identifiable doctor. */
export function observedDeteriorationCauses({patient:p,caseData:c,minute}={}){
 const empty={causes:[],events:[],complications:[]};
 if(!p||!c?.clinicalPolicy||p.caseEnded||p.patientDied)return empty;
 const at=finite(minute)?minute:p.policyState?.nativeMinute??p.phys?.lastNativeMinute??0;
 if(!finite(at)||at<0)return empty;
 const causes=[],events=[],complications=[];
 const push=(origin,sourceId,details={})=>{
  if(causes.some(x=>x.origin===origin&&x.sourceId===sourceId))return;
  causes.push({origin,sourceId,...details});
 };
 const definitions=new Set((c.clinicalPolicy.complications||[]).map(x=>x.id));
 for(const e of p.policyState?.complications||[]){
  if(definitions.has(e.id)&&activeEpisode.has(e.status)&&
   finite(e.onsetAt)&&e.onsetAt<=at){
   complications.push(e);
   push('random',e.id,{evidence:'manifested-native-episode'});
  }
 }
 const delivered=(p.administrationLog||[]).filter(row=>
  row.patientUid===p.uid&&finite(row.administeredAtNativeMinute)&&
  row.administeredAtNativeMinute<=at&&isDeliveredClinicalAdministration(p,row,at));
 for(const e of p.adverseEvents||[]){
  if(!harmKinds.has(e.kind)||e.status!=='active'||e.patientUid!==p.uid||
   !e.sourceEventId||finite(e.atNativeMinute)&&e.atNativeMinute>at)continue;
  const row=delivered.find(row=>row.sourceEventId===e.sourceEventId&&
   (!e.drugId||row.id===e.drugId));
  if(!row)continue; // Copied, pending, wrong-patient and future events are not evidence.
  events.push(e);
  const repeated=delivered.filter(other=>other.id===row.id&&other.action!=='stop').length>1;
  const caution=(row.clinicalAdvisories||[]).some(x=>unsafeCodes.has(x.code))||
   (c.physiology?.avoid||[]).includes(row.id);
  if(allergyKinds.has(e.kind))push('allergy',e.sourceEventId,{kind:e.kind,drugId:row.id});
  else push('treatment',e.sourceEventId,{kind:e.kind,drugId:row.id,repeated});
  if(caution)push('contraindication',e.sourceEventId,{kind:e.kind,drugId:row.id});
 }
 const policy=c.clinicalPolicy,trajectory=policy.trajectory;
 const first=Number(trajectory?.earlyEnd);
 const targets=new Set((policy.responses||[]).flatMap(r=>[...(r.allOf||[]),...(r.anyOf||[])]));
 if(!targets.size)for(const id of c.keyInterventions||[])targets.add(id);
 const treated=[...targets].some(id=>currentClinicalTreatment(p,id,at));
 // Avoid declaring abandonment from elapsed time alone, while allowing an
 // actually worsening initially-critical patient (whose acuity tier cannot rise).
 if(finite(first)&&first>=0&&at>first&&targets.size&&!treated&&
  materiallyWorse(p.liveVitals||{},baseVitals(c)))
  push('unattended',c.id,{evidence:'observed-untreated-progression',
   attribution:'not-a-malpractice-finding'});
 return {causes,events,complications};
}
