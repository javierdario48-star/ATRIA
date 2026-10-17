// Receipt adapter to EFFECTIVE V4 adverse-reaction equations. Pure offsets;
// native case physiology remains the only writer. No order or warning is a dose.
import {csSevereDrugReaction487} from '../../clinical/general-therapy-487.js';
import {csHeparinHarm487} from '../../clinical/urgent-care-487.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {confirmedMorphineResponse487} from './morphine-487.js';
import {confirmedNativeSupportEffects487} from './native-support-487.js';
const axes=['temp','hr','rr','sys','dia','spo2'];
const zero=()=>Object.fromEntries(axes.map(k=>[k,0]));
function confirmedRows(p,atNativeMinute){
 const candidates=(p.administrationLog||[]).filter(row=>row.action!=='stop'&&
  (row.id==='anticoagulation'||matchesMedicationAllergy487(p,row.id,true)));
 if(!candidates.length)return [];
 if(!Number.isFinite(atNativeMinute)||atNativeMinute<0)throw Error('invalid adverse-reaction clock');
 const seen=new Set();
 return candidates.filter(row=>{
  const matching=(p.treatments||[]).filter(t=>t.sourceEventId===row.sourceEventId&&t.id===row.id);
  if(row.patientUid!==p.uid||typeof row.sourceEventId!=='string'||!row.sourceEventId||
    seen.has(row.sourceEventId)||!Number.isFinite(row.administeredAtNativeMinute)||
    row.administeredAtNativeMinute<0||row.administeredAtNativeMinute>atNativeMinute+1e-9||
    matching.length!==1||matching[0].patientUid!==p.uid||
    matching[0].administeredAtNativeMinute!==row.administeredAtNativeMinute||
    matching[0].dose?.amount!==row.dose?.amount||matching[0].dose?.unit!==row.dose?.unit)
   throw Error('adverse reaction requires unique confirmed patient administration');
  seen.add(row.sourceEventId);return true;
 });
}
export function confirmedMedicationHarms487(p,c,atNativeMinute){
 const rows=confirmedRows(p,atNativeMinute),reactions=[];
 for(const row of rows){
  if(!matchesMedicationAllergy487(p,row.id,true))continue;
  const reaction=csSevereDrugReaction487({patientInstance:{uid:p.uid},
   gameMinute:atNativeMinute,csSevereDrugReaction487:{patientId:p.uid,
    drug:row.id,minute:row.administeredAtNativeMinute}});
  reactions.push({kind:'severe-drug-allergy',sourceEventId:row.sourceEventId,
   patientUid:p.uid,drugId:row.id,label:row.label,...reaction});
 }
 // Preserve the original bounded response; no invented linear stacking.
 // A later confirmed dose can trigger a new episode after recovery.
 const peak=reactions.reduce((best,x)=>x.severity>(best?.severity??0)?x:best,null);
 const offsets={...(peak?.offsets??zero())},heparin=rows.filter(x=>x.id==='anticoagulation');
 if(heparin.length){
  const first=heparin.reduce((a,b)=>a.administeredAtNativeMinute<=b.administeredAtNativeMinute?a:b);
  const harm=csHeparinHarm487(c,{patientInstance:{uid:p.uid},clinicalFlags:p.clinicalFlags,
   phys:p.phys,gameMinute:atNativeMinute,therapyExposure:new Map([['anticoagulation',{count:heparin.length}]]),
   csHeparinHarm487:{patientId:p.uid,firstMinute:first.administeredAtNativeMinute}});
  for(const key of axes)offsets[key]+=harm.offsets[key];
  reactions.push({kind:'anticoagulant-bleeding',sourceEventId:first.sourceEventId,
   patientUid:p.uid,drugId:first.id,label:first.label,severity:harm.bleedingSeverity});
 }
 return {offsets,reactions};
}
export function applyMedicationHarmTargets487(target,p,c,atNativeMinute){
 const {offsets}=confirmedMedicationHarms487(p,c,atNativeMinute);
 for(const key of axes)target[key]+=offsets[key];
 return target;
}
/** Document only an emerged complication. Resolution preserves history/score.
 * Returns new events for the authoritative global transcript.
 */
export function documentMedicationComplications487(p,c,clock){
 if(p.caseEnded)return [];
 const {reactions}=confirmedMedicationHarms487(p,c,clock.nativeMinute),created=[];
 p.adverseEvents??=[];
 const opioid=confirmedMorphineResponse487(p,c,clock.nativeMinute);
 const previousOpioid=p.adverseEvents.find(x=>x.kind==='opioid-respiratory-depression'&&x.status==='active');
 const observed=opioid?.respiratoryRisk&&
  (opioid.offsets.rr<0&&p.liveVitals.rr<12||opioid.offsets.spo2<0&&p.liveVitals.spo2<94);
 if(observed||previousOpioid){
  // This binary documentation flag is NOT a new toxicity equation. The exact
  // original respiratoryRisk/offsets drive physiology above. Record a clinical
  // complication only once impaired respiration is observed, and retain it
  // through temporary oxygen support until the recovered opioid risk wears off.
  reactions.push({kind:'opioid-respiratory-depression',patientUid:p.uid,drugId:'morphine',
   sourceEventId:previousOpioid?.sourceEventId??opioid.sourceEventId,
   severity:(previousOpioid?opioid?.respiratoryRisk:observed)?1:0});
 }
 const albumin=confirmedNativeSupportEffects487(p,c,clock.nativeMinute).drugs.albumin;
 const previousAlbumin=p.adverseEvents.find(x=>x.kind==='albumin-respiratory-overload'&&x.status==='active');
 if(previousAlbumin||albumin?.toxicity.spo2<0&&p.liveVitals.spo2<94){
  reactions.push({kind:'albumin-respiratory-overload',patientUid:p.uid,drugId:'albumin',
   sourceEventId:previousAlbumin?.sourceEventId??albumin.sourceEventId,
   severity:albumin?.toxicity.spo2<0?1:0});
 }
 for(const r of reactions){
  const previous=p.adverseEvents.find(x=>x.kind===r.kind&&x.sourceEventId===r.sourceEventId);
  if(previous){
   previous.peakSeverity=Math.max(previous.peakSeverity,r.severity);
   if(r.severity===0&&clock.nativeMinute>previous.atNativeMinute){
    previous.resolvedAtNativeMinute??=clock.nativeMinute;previous.status='resolved';
   }
   continue;
  }
  if(r.severity<=.18)continue; // effective V4 alert threshold
  const event={kind:r.kind,sourceEventId:r.sourceEventId,patientUid:p.uid,
   drugId:r.drugId,atNativeMinute:clock.nativeMinute,atRealSecond:clock.clinicalMinute,
   peakSeverity:r.severity,status:'active',
   message:r.kind==='albumin-respiratory-overload'?
    'Sobrecarga respiratoria tras dosis repetidas de albúmina: deterioro de la saturación. Reevaluar el soporte y las nuevas administraciones.':
    r.kind==='opioid-respiratory-depression'?
    'Depresión respiratoria tras morfina: deterioro respiratorio observado con exposición opioide activa. Reevaluar y estabilizar.':r.kind==='severe-drug-allergy'?
    'Reacción alérgica grave tras '+r.label+': deterioro respiratorio y hemodinámico. Reevaluar y estabilizar.':
    'Sangrado agravado tras heparina: taquicardia e hipotensión por pérdida sanguínea. Priorizar estabilización.'};
  p.adverseEvents.push(event);created.push(structuredClone(event));
 }
 return created;
}
