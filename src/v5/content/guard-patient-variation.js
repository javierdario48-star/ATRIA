// Pure bridge from a validated variation profile to the existing V5 patient
// contract. The guard remains the sole authority for physiology and outcomes.
import {generatePatientVariation} from './patient-variation.js';
export function materializeGuardPatient(patient,caseData,checkpoint=null){
 if(!caseData?.variation||checkpoint)return patient;
 if(!patient?.uid||!patient?.caseId||patient.caseId!==caseData.id)
  throw Error('patient identity/case mismatch');
 const v=generatePatientVariation(caseData.variation,patient.uid+':'+caseData.id);
 const existing=new Set([...(patient.allergies||[]),...(patient.clinicalFlags?.drugAllergies||[])]);
 for(const a of v.allergies)existing.add(a.drugId);
 return {...patient,name:patient.name||v.name,age:patient.age??v.age,
  personality:patient.personality||v.personality,opening:patient.opening||v.opening,
  allergies:[...existing],
  // Candidates are metadata only. No deterioration occurs without a clinical
  // progression owner implementing the referenced pathway.
  variation:{seed:v.seed,complicationCandidates:v.complicationCandidates}};
}
