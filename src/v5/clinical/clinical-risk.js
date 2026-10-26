// C12.g — pure adverse signal from real patient-bound IV administrations.
// A physiological game signal, not a declaration of malpractice for every
// crystalloid dose or an independent heart/lung model.
import {summarizeIVExposures} from './medication-exposure.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
import {PHARMA_RULES_487,BASE_CASE_PHARMACOLOGY_487} from '../../clinical/pharmacology-registry-487.js';
export function confirmedRespiratoryAdverse(patient,caseDef){
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
 const lung=confirmedRespiratoryAdverse(patient,caseDef);
 if(!patient?.administrationLog?.length)return lung;
 const exposures=summarizeIVExposures(patient).byDrug;
 const notes=[];
 for(const event of patient.adverseEvents||[])
  if(['severe-drug-allergy','anticoagulant-bleeding','opioid-respiratory-depression','albumin-respiratory-overload'].includes(event.kind)&&event.patientUid===patient.uid&&
    (patient.administrationLog||[]).some(x=>x.sourceEventId===event.sourceEventId&&x.id===event.drugId))
   notes.push(event.message);
 const traits=caseDef?.pharmacology?.traits||BASE_CASE_PHARMACOLOGY_487[caseDef?.id]||[];
 if(!traits.includes('infection')){
  for(const [id,exposure] of Object.entries(exposures))
   if(caseDef?.id==='VARIX-001'&&id==='ceftriaxone')continue; // guideline-directed prophylaxis is NOT empiric treatment for invented sepsis
   if(exposure.administrations&&['antibiotic','aminoglycoside','antifungal'].includes(PHARMA_RULES_487[id]?.classId)){
    const label=patient.administrationLog.find(x=>x.id===id)?.label||id;
    notes.push(label+' sin foco infeccioso identificado en '+caseDef?.id);
   }
 }
 if(caseDef?.id==='APP-001'&&exposures.furosemide?.administrations&&
    lung.confirmedFluidMl<3000)
  notes.push('Furosemida sin sobrecarga demostrada en APP-001');
 if(caseDef?.id==='PERI-SEC-001'&&exposures.furosemide?.administrations&&
    lung.confirmedFluidMl<3000)
  notes.push('Furosemida en peritonitis secundaria con hipovolemia, sin sobrecarga demostrada');
 // Native peritonitis avoid lists already drive renal stress in the sole
 // physiology owner. Preserve that clinical mistake in the shared debrief;
 // this is a safety assessment, never another organ-toxicity equation.
 if(['PERI-PBE-001','PERI-TER-001'].includes(caseDef?.id)){
  for(const id of ['amikacin','gentamicin'])
   if(caseDef.physiology?.avoid?.includes(id)&&exposures[id]?.administrations)
    notes.push((patient.administrationLog.find(x=>x.id===id)?.label||id)+' con riesgo renal documentado en '+caseDef.id);
  if(caseDef.physiology?.avoid?.includes('furosemide')&&exposures.furosemide?.administrations&&lung.confirmedFluidMl<3000)
   notes.push('Furosemida con hipovolemia y riesgo renal en '+caseDef.id);
 }
 if((exposures.furosemide?.totalAmount??0)>160)
  notes.push('Dosis acumuladas de furosemida superiores a la pauta del caso');
 return {...lung,adverseCount:Math.min(4,lung.adverseCount+notes.length),
  flags:[...lung.flags,...notes]};
}
