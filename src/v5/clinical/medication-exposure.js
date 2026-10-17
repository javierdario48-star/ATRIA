// Pure projection of ACTUAL, patient-bound administrations. Never mutate
// patient state or infer a drug effect from an order/intent/treatment flag.
import {IV_MEDICINES} from './native-medications.js';

/** Dose aggregates are historical exposure, NOT concentration/PD effects.
 * In particular a past antibiotic order never means it is still active.
 */
export function summarizeIVExposures(patient){
 const uid=patient?.uid;
 if(typeof uid!=='string'||!uid)throw Error('exposure requires patient identity');
 const byDrug={};const seen=new Set();
 for(const entry of patient.administrationLog||[]){
  if(!Object.hasOwn(IV_MEDICINES,entry.id))continue;
  const medicine=IV_MEDICINES[entry.id],stop=entry.action==='stop';
  const unit=medicine.unit||(entry.id==='anticoagulation'?'protocolo':entry.id==='fluid'?'ml':'mg');
  // Ignore extra unrelated procedures, but a matching IV entry must be a
  // legitimate, uniquely identified confirmed dose to be counted.
  if(entry.patientUid!==uid||typeof entry.sourceEventId!=='string'||!entry.sourceEventId||
     seen.has(entry.sourceEventId)||
     (stop?!medicine.continuous||entry.dose!==undefined||!Number.isFinite(entry.previousDose?.amount)||
      entry.previousDose.amount<=0||entry.previousDose.unit!==unit:
      !Number.isFinite(entry.dose?.amount)||entry.dose.amount<=0||entry.dose.unit!==unit)||
     (medicine.continuous?!['start','setRate','stop'].includes(entry.action):!!entry.action)||
     (entry.id==='anticoagulation'&&entry.dose.amount!==1))
   throw Error('unconfirmed or duplicate IV exposure record');
  seen.add(entry.sourceEventId);
  const total=byDrug[entry.id]??={unit,totalAmount:medicine.continuous?null:0,
   administrations:0,sourceEventIds:[]};
  if(total.unit!==unit)throw Error('mixed dose units for one therapy');
  if(medicine.continuous){
   total.currentRate=stop?0:entry.dose.amount;
   total.stops=(total.stops||0)+Number(stop);
   total.rateChanges=(total.rateChanges||0)+Number(entry.action==='setRate');
   total.starts=(total.starts||0)+Number(entry.action==='start');
  }else total.totalAmount+=entry.dose.amount;
  if(!stop)total.administrations++;
  total.sourceEventIds.push(entry.sourceEventId);
 }
 return {patientUid:uid,confirmedIvEventCount:seen.size,
  confirmedCrystalloidMl:byDrug.fluid?.totalAmount??0,byDrug};
}
