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
  // Ignore extra unrelated procedures, but a matching IV entry must be a
  // legitimate, uniquely identified confirmed dose to be counted.
  if(entry.patientUid!==uid||typeof entry.sourceEventId!=='string'||!entry.sourceEventId||
     seen.has(entry.sourceEventId)||
     !Number.isFinite(entry.dose?.amount)||entry.dose.amount<=0||
     !['mg','ml'].includes(entry.dose.unit)||
     (entry.id==='fluid'?entry.dose.unit!=='ml':entry.dose.unit!=='mg'))
   throw Error('unconfirmed or duplicate IV exposure record');
  seen.add(entry.sourceEventId);
  const total=byDrug[entry.id]??={unit:entry.dose.unit,totalAmount:0,
   administrations:0,sourceEventIds:[]};
  if(total.unit!==entry.dose.unit)throw Error('mixed dose units for one therapy');
  total.totalAmount+=entry.dose.amount;
  total.administrations++;
  total.sourceEventIds.push(entry.sourceEventId);
 }
 return {patientUid:uid,confirmedIvEventCount:seen.size,
  confirmedCrystalloidMl:byDrug.fluid?.totalAmount??0,byDrug};
}
