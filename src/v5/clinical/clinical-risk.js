// C12.g — pure adverse signal from real patient-bound IV administrations.
// A physiological game signal, not a declaration of malpractice for every
// crystalloid dose or an independent heart/lung model.
import {summarizeIVExposures} from './medication-exposure.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {PHARMA_RULES_487,BASE_CASE_PHARMACOLOGY_487} from '../../clinical/pharmacology-registry-487.js';
import {isDeliveredClinicalAdministration} from './receipts.js';
// A clinical evaluation may be shown a foreign/forged log row during a
// recovery or adversarial test. It must never charge this patient's quality,
// and must not weaken the strict duplicate/dose validator for OWN exposures.
function patientBoundExposureView(patient){
 if(!Array.isArray(patient?.administrationLog))return patient;
 const own=patient.administrationLog.filter(row=>row.patientUid===patient.uid);
 return own.length===patient.administrationLog.length?patient:
  {...patient,administrationLog:own};
}
export function hasAcuteInstability({sys,dia,spo2,hr,rr}){
 const map=Math.round((sys+2*dia)/3);
 return sys<95||map<65||spo2<93||hr>=130||rr>=30;
}
export function confirmedRespiratoryAdverse(patient,caseDef){
 patient=patientBoundExposureView(patient);
 if(!patient?.administrationLog?.some(x=>x.id==='fluid'))
  return {adverseCount:0,flags:[],confirmedFluidMl:0};
 const ml=summarizeIVExposures(patient).confirmedCrystalloidMl;
 const effect=crystalloidOverloadOffsets(patient,caseDef);
 const baselineSpo2=Number(caseDef?.vitals?.spo2??98);
 const low=Number(patient?.liveVitals?.spo2)<94;
 const respiration=Number(patient?.liveVitals?.rr)>24;
 const decline=baselineSpo2-Number(patient?.liveVitals?.spo2)>3;
 const demonstrated=ml>=4000&&effect.spo2<=-4&&decline&&(low||respiration);
 const critical=ml>=6000&&effect.spo2<=-10&&
  (Number(patient?.liveVitals?.spo2)<90||Number(patient?.liveVitals?.rr)>30);
 return {adverseCount:critical?2:demonstrated?1:0,
  flags:critical?['Sobrecarga IV grave con compromiso respiratorio']:
   demonstrated?['Sobrecarga IV con deterioro respiratorio medible']:[],
  confirmedFluidMl:ml};
}

/** Documented game-case mismatches. These are scored as potentially unsafe
 * clinical decisions, not falsely described as observed organ toxicity.
 * Reviewed separately from pharmacodynamic effects, which still require a
 * native case-specific writer.
 */
export function confirmedClinicalMissteps(patient,caseDef){
 const bound=patientBoundExposureView(patient);
 const lung=confirmedRespiratoryAdverse(bound,caseDef);
 if(!bound?.administrationLog?.length)return lung;
 const exposures=summarizeIVExposures(bound).byDrug;
 const notes=[];
 // Only an actually delivered, uniquely bound exposure can affect quality.
 // These describe decisions, not invented organ damage. Replaying a command
 // or writing a pending prescription cannot earn or deduct treatment credit.
 const decisionNotes=new Map();
 for(const row of bound.administrationLog){
  if(!row.clinicalAdvisories?.length||row.action==='stop')continue;
  const minute=Math.max(row.completedAtNativeMinute??row.administeredAtNativeMinute,patient.policyState?.nativeMinute??patient.phys?.lastNativeMinute??0);
  if(!isDeliveredClinicalAdministration(patient,row,minute))continue;
  for(const advisory of row.clinicalAdvisories){
   if(['clinical-evidence-required','clinical-treatment-required','clinical-post-treatment-study-required'].includes(advisory.code))continue;
   const key=row.id+':'+advisory.code;
   if(advisory.message&&!decisionNotes.has(key))decisionNotes.set(key,(row.label||row.id)+': '+advisory.message);
  }
 }
 notes.push(...decisionNotes.values());
 for(const event of patient.adverseEvents||[])
  if(['severe-drug-allergy','anticoagulant-bleeding','opioid-respiratory-depression','albumin-respiratory-overload','vasopressor-excess-response'].includes(event.kind)&&event.patientUid===patient.uid&&
    bound.administrationLog.some(x=>x.sourceEventId===event.sourceEventId&&x.id===event.drugId))
   notes.push(event.message);
 const traits=caseDef?.pharmacology?.traits||BASE_CASE_PHARMACOLOGY_487[caseDef?.id]||[];
 if(!traits.includes('infection')){
  for(const [id,exposure] of Object.entries(exposures)){
   if((caseDef?.keyInterventions||[]).includes(id))continue; // any declared prophylaxis is a valid authored intervention
   if(exposure.administrations&&['antibiotic','aminoglycoside','antifungal'].includes(PHARMA_RULES_487[id]?.classId)){
    const label=bound.administrationLog.find(x=>x.id===id)?.label||id;
    notes.push(label+' sin foco infeccioso identificado en '+caseDef?.id);
   }
  }
 }
 // A physiology-declared avoid-list applies to EVERY case; no per-case
 // switches in the shared quality evaluator. Specific lack-of-indication
 // decisions are attached at administration by medication-indication-review.
 for(const id of caseDef?.physiology?.avoid||[]){
  if(!exposures[id]?.administrations)continue;
  const name=bound.administrationLog.find(x=>x.id===id)?.label||id;
  notes.push(name+' contraindicado o desaconsejado por el perfil fisiológico documentado.');
 }
 if((exposures.furosemide?.totalAmount??0)>160)
  notes.push('Dosis acumuladas de furosemida superiores a la pauta del caso');
 return {...lung,adverseCount:Math.min(4,lung.adverseCount+notes.length),
  flags:[...lung.flags,...notes]};
}
