// C12.g — pure adverse signal from real patient-bound IV administrations.
// A physiological game signal, not a declaration of malpractice for every
// crystalloid dose or an independent heart/lung model.
import {summarizeIVExposures} from './medication-exposure.js';
import {crystalloidOverloadOffsets} from './crystalloid-overload.js';
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
 if(caseDef?.id==='CIRR-001'){
  if(exposures.ceftriaxone?.administrations)
   notes.push('Ceftriaxona sin foco infeccioso identificado en CIRR-001');
  if(exposures.metronidazole?.administrations)
   notes.push('Metronidazol sin foco infeccioso identificado en CIRR-001');
 }
 if(caseDef?.id==='APP-001'&&exposures.furosemide?.administrations&&
    lung.confirmedFluidMl<3000)
  notes.push('Furosemida sin sobrecarga demostrada en APP-001');
 if((exposures.furosemide?.totalAmount??0)>160)
  notes.push('Dosis acumuladas de furosemida superiores a la pauta del caso');
 return {...lung,adverseCount:Math.min(4,lung.adverseCount+notes.length),
  flags:[...lung.flags,...notes]};
}
