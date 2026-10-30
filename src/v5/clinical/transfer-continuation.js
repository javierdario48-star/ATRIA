import {isDeliveredClinicalAdministration,confirmedClinicalTreatment} from './receipts.js';
import {matchesMedicationAllergy487} from './medication-safety-487.js';
import {clinicalInterventionEligibility} from './native-medication-eligibility.js';
import {nativeTreatmentDefinition} from './native-medications.js';
import {confirmedMedicationHarms487} from './medication-harms-487.js';

function withheldTransferPreparations(p,c,destination,minute,ongoing){
 const rule=c.clinicalPolicy?.closure,groups=rule?.treatmentByDestination?.[destination]||rule?.treatment;
 const access=p.procedures?.iv,confirmedAccess=p.venousAccessCount>0&&access?.patientUid===p.uid&&
  typeof access.eventId==='string'&&access.eventId.length>0;
 if(!['quirofano','procedimiento'].includes(destination)||!rule?.consult?.[destination]?.length||
  !(c.clinicalPolicy?.definitiveInterventions||[]).some(id=>nativeTreatmentDefinition(id,c)?.kind==='procedure')||
  !p.procedures?.monitor?.connected||!confirmedAccess||!groups?.length)return [];
 const delivered=id=>id==='iv'?confirmedAccess:ongoing.has(id)||!!confirmedClinicalTreatment(p,id,minute);
 if(groups.some(group=>group.length&&group.every(delivered)))return [];
 // Withholding an unsafe preparation never substitutes for rescue of an
 // actual severe drug reaction before transport.
 const activeAllergies=p.adverseEvents?.filter(e=>e.kind==='severe-drug-allergy'&&e.status==='active')||[];
 if(activeAllergies.length){
  // Reuse the native reaction owner's validated, dose-specific rescue
  // receipts. A dose predating the trigger cannot stabilize this episode.
  const reactions=confirmedMedicationHarms487(p,c,minute).reactions;
  if(activeAllergies.some(event=>!reactions.find(r=>r.kind===event.kind&&r.sourceEventId===event.sourceEventId)
   ?.rescueSourceEventIds?.length))return [];
 }
 const withheld=new Map();
 const justified=groups.every(group=>group.length&&group.every(id=>{
  if(delivered(id))return true;
  const definition=nativeTreatmentDefinition(id,c);
  if(!definition||['procedure','conduct'].includes(definition.kind))return false;
  const issue=clinicalInterventionEligibility(p,c,id,{nativeMinute:minute,clinicalMinute:p.policyState?.realSecond});
  if(!['clinical-contraindication','clinical-blood-pressure-limit'].includes(issue?.reason))return false;
  withheld.set(id,{id,reason:issue.reason,message:issue.message});return true;
 }));
 // Every authored alternative must be delivered or unsafe. A safe alternative
 // still pending cannot be replaced with a fictional administration.
 return justified?[...withheld.values()]:[];
}

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
 const withheldPreparations=withheldTransferPreparations(p,c,destination,minute,ongoing);
 const deferredTreatmentIds=Object.entries(c.clinicalPolicy?.eligibility||{}).filter(([,rule])=>
  rule.requiresCompletedTreatments?.some(id=>ongoing.has(id))).map(([id])=>id);
 const deferredStudyIds=(c.studies||[]).filter(study=>study.requiresCompletedTreatments?.some(id=>ongoing.has(id))).map(study=>study.id);
 const eventIds=new Set(continuingAdministrations.map(row=>row.sourceEventId));
 const pendingBlockers=(p.pendingTreatments||[]).filter(row=>!eventIds.has(row.sourceEventId));
 return {continuingAdministrations,deferredTreatmentIds,deferredStudyIds,pendingBlockers,
  ...(withheldPreparations.length?{withheldPreparations}:{})};
}
