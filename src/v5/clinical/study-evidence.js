import {GASTRO_CASE_RULES} from './gastro-expansion-policies.js';

// Only authored, same-patient coverage can substitute for a checklist item.
// A similar label, an incidental finding or a generic normal result cannot.
export function studyEvidenceId(caseData,id){
 const aliases=(caseData.clinicalPolicy?.closure||GASTRO_CASE_RULES[caseData.id])?.studyEquivalences;
 return aliases&&Object.hasOwn(aliases,id)?aliases[id]:id;
}

export function patientStudyOrders(patient,status){
 return (patient.orders||[]).filter(order=>order.patientUid===patient.uid&&order.status===status);
}
