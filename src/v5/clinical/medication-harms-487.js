// Receipt adapter to EFFECTIVE V4 adverse-reaction equations. Pure offsets;
// native case physiology remains the only writer. No order or warning is a dose.
import {csSevereDrugReaction487} from '../../clinical/general-therapy-487.js';
import {csHeparinHarm487} from '../../clinical/urgent-care-487.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
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
   message:r.kind==='severe-drug-allergy'?
    'Reacción alérgica grave tras '+r.label+': deterioro respiratorio y hemodinámico. Reevaluar y estabilizar.':
    'Sangrado agravado tras heparina: taquicardia e hipotensión por pérdida sanguínea. Priorizar estabilización.'};
  p.adverseEvents.push(event);created.push(structuredClone(event));
 }
 return created;
}
