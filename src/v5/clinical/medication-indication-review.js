// Shared clinical indication review for *executed* medication decisions.
// Ordering is never vetoed here: a wrong but technically valid prescription
// reaches the nurse and can exert its native physiological effects. Only
// administration receipts can later turn this advice into a score deduction.
// Rules use pharmacology classes, actual physiology and declared care options;
// no case IDs, alternate XP scorer, or physiological writer.
import {PHARMA_RULES_487,csPharmContext487} from '../../clinical/pharmacology-registry-487.js';

const HIGH_RISK_INDICATIONS=Object.freeze({
 diuretic:['overload','congestion','ascites'],
 pressor:['shock','hypotension','severeShock','vasoplegia'],
 blood:['bleed','anemia']
});
function declaredTreatments(c){
 const rule=c?.clinicalPolicy?.closure||{},sets=[
  ...(rule.treatment||[]),...Object.values(rule.treatmentByDestination||{}).flat(),
  ...(c?.pharmacology?.coverageSets||[]),...(c?.physiology?.coverageSets||[])
 ];
 return new Set([
  ...(c?.keyInterventions||[]),
  ...sets.flatMap(x=>Array.isArray(x)?x:[])
 ]);
}
export function medicationIndicationReview(patient,caseData,id){
 if(!patient||!caseData||typeof id!=='string')return null;
 const drug=PHARMA_RULES_487[id];if(!drug)return null;
 const relevant=HIGH_RISK_INDICATIONS[drug.classId];if(!relevant)return null;
 // Authored appropriate alternatives remain acceptable, including an
 // accepted transfusion, rescue pressor or established ascites treatment.
 if(declaredTreatments(caseData).has(id))return null;
 const observed=csPharmContext487(caseData,patient).traits;
 if(relevant.some(x=>observed.has(x)))return null;
 return {code:'clinical-indication-not-supported',
  message:'No hay indicación clínica documentada para '+id+
   ' en el estado actual. Revisar la exposición y sus efectos adversos.'};
}
