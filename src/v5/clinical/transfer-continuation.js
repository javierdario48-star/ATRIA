import {isDeliveredClinicalAdministration} from './receipts.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';

// Transfer of responsibility is separate from completed medication credit.
// Only an actual, partially delivered infusion with IV access and monitoring
// can continue in the receiving inpatient service. Orders/preparation cannot.
export function clinicalTransferContinuation(p,c,destination,minute=p.policyState?.nativeMinute??p.phys?.lastNativeMinute??0){
 const permitted=['sala','uti','quirofano','procedimiento'].includes(destination)&&
  c.clinicalPolicy?.closure?.consult?.[destination]?.length&&p.venousAccessCount>0&&p.procedures?.monitor?.connected;
 const continuingAdministrations=permitted?(p.administrationLog||[]).filter(row=>row.status==='administering'&&
  row.route==='iv'&&isDeliveredClinicalAdministration(p,row,minute)&&!matchesMedicationAllergy487(p,row.id))
  .map(row=>({id:row.id,sourceEventId:row.sourceEventId,deliveredFraction:row.deliveryFraction,
   deliveredDose:structuredClone(row.dose),prescribedDose:structuredClone(row.prescribedDose)})):[];
 const ongoing=new Set(continuingAdministrations.map(row=>row.id));
 const deferredTreatmentIds=Object.entries(c.clinicalPolicy?.eligibility||{}).filter(([,rule])=>
  rule.requiresCompletedTreatments?.some(id=>ongoing.has(id))).map(([id])=>id);
 const deferredStudyIds=(c.studies||[]).filter(study=>study.requiresCompletedTreatments?.some(id=>ongoing.has(id))).map(study=>study.id);
 const eventIds=new Set(continuingAdministrations.map(row=>row.sourceEventId));
 const pendingBlockers=(p.pendingTreatments||[]).filter(row=>!eventIds.has(row.sourceEventId));
 return {continuingAdministrations,deferredTreatmentIds,deferredStudyIds,pendingBlockers};
}
