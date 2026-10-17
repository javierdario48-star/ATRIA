// C12.e — Oxygen target for the SINGLE native case vital writer.
// Reuses the validated generic V4 pharmacology rule. No timers, no extra
// physiological state, no direct writes and no reliance on textual orders.
import {csPharmResponse487} from '../../clinical/pharmacology-registry-487.js';
import {caseDrugResponseScale} from './pharmacology-catalog.js';

export function oxygenationTargetOffset(patient,caseDef,atNativeMinute){
 const support=patient?.procedures?.oxygen;
 if(!support?.active)return 0;
 if(![2,4].includes(support.flowLpm)||!Number.isFinite(atNativeMinute))
  throw Error('invalid active oxygen context');
 const completed=(patient.administrationLog||[]).filter(row=>
  row.id==='oxygen'&&row.sourceEventId===support.sourceEventId&&
  row.patientUid===patient.uid&&['start','setRate'].includes(row.action));
 if(completed.length!==1)throw Error('oxygen effect requires unique confirmed receipt');
 const receipt=completed[0];
 if(receipt.dose?.amount!==support.flowLpm||receipt.dose.unit!=='L/min'||
  !Number.isFinite(receipt.administeredAtNativeMinute)||
  atNativeMinute+1e-9<receipt.administeredAtNativeMinute)
  throw Error('oxygen receipt and clinical clock disagree');
 // The legacy engine uses the patient's *current* observed saturation, not
 // the diagnosis alone, and ramps the response over its native 3 min onset.
 const elapsed=Math.max(0,atNativeMinute-receipt.administeredAtNativeMinute);
 const estimate=csPharmResponse487('oxygen',caseDef,patient,elapsed,patient.liveVitals);
 const response=estimate.offsets.spo2;
 if(!Number.isFinite(response)||response<0)throw Error('invalid oxygen drug response');
 // 2 L/min offers a smaller game-scale response than 4 L/min; neither changes
 // a normoxic 98% patient. Saturation remains clamped by the case's native
 // monitor bounds. No accumulated oxygen dose across rate changes.
 return Math.min(7,response)*(support.flowLpm===2?.65:1)*caseDrugResponseScale(caseDef,'oxygen');
}
