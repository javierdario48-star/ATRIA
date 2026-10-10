// Dedicated, bounded critical-rescue policy. Do not infer treatment from plans
// or chat. This module intentionally never sets patientDied, sourceControlled,
// monitorTherapies, venousAccessCount or administrationLog.
export function csCriticalRescueEvidence487(patient,caseDef,vitals={}){
 if(!patient||patient.caseEnded||patient.patientDied)return {supported:false,hemodynamic:false,oxygen:false};
 const log=Array.isArray(patient.administrationLog)?patient.administrationLog:[];
 const given=id=>patient.monitorTherapies?.has?.(id)===true&&log.some(x=>x?.id===id);
 const fluid=given('fluid')&&Number(patient.therapyTotals?.fluidMl||0)>=250;
 const pressor=given('vasopressor'),blood=given('transfusion');
 const hemodynamic=caseDef?.risk==='bleed'?(blood||fluid||pressor):(fluid||pressor);
 const oxygen=given('oxygen');
 const sys=Number(vitals.sys??patient.liveVitals?.sys??120);
 const dia=Number(vitals.dia??patient.liveVitals?.dia??75);
 const spo2=Number(vitals.spo2??patient.liveVitals?.spo2??98);
 const map=(sys+2*dia)/3;
 const needCirculation=map<45||sys<=58&&Number(vitals.hr??patient.liveVitals?.hr??100)>=150;
 const needOxygen=spo2<80;
 const supported=(needCirculation||needOxygen)&&(!needCirculation||hemodynamic)&&(!needOxygen||oxygen);
 return {supported,hemodynamic,oxygen,fluid,pressor,blood,map,spo2,
  needCirculation,needOxygen};
}

// Add modest, short-lived volume/vascular/oxygenation response for severe sepsis.
// The native engine still handles dose, toxicity, inflammation and fluid losses.
export function csCriticalRescuePhysiology487(patient,caseDef,minutes){
 const ph=caseDef?.physiology,p=patient?.phys;
 if(!patient||!p||!['peritonitis','sepsis_source'].includes(ph?.engine))return false;
 const dm=Math.max(0,Math.min(1.5,Number(minutes)||0));
 if(!dm||patient.caseEnded||patient.patientDied)return false;
 const log=Array.isArray(patient.administrationLog)?patient.administrationLog:[];
 const recent=id=>patient.monitorTherapies?.has?.(id)===true&&log.some(x=>x?.id===id&&
  Number(patient.gameMinute||0)-Number(x.m??-100)>=0&&
  Number(patient.gameMinute||0)-Number(x.m??-100)<=4);
 const fluid=recent('fluid')&&Number(patient.therapyTotals?.fluidMl||0)>=250;
 const pressor=recent('vasopressor'),oxygen=recent('oxygen');
 let changed=false;
 const ml=Number(patient.therapyTotals?.fluidMl||0);
 const overload=Number(ph?.fluidOverloadThresholdMl||2800);
 if(fluid&&ml<=overload){
  // Max 4 simulated hours after an observed bolus; no permanent volume creation.
  const factor=Math.min(1.5,ml/650);
  p.effectiveVolume=Math.min(1.07,Number(p.effectiveVolume||.4)+dm*.019*factor);
  changed=true;
 }
 if(pressor){
  p.svr=Math.min(1.03,Number(p.svr||.5)+dm*.014);
  changed=true;
 }
 if(oxygen){
  p.oxygenation=Math.min(1.02,Number(p.oxygenation||.65)+dm*.007);
  changed=true;
 }
 return changed;
}

// A single, non-renewable recovery interval starts only AFTER documented support
// and only while actual fatal vitals exist. Repeating medication does NOT reset it.
// This is a pharmacodynamic response window, not immunity for stable patients.
export function csCriticalRescueWindow487(patient,caseDef,vitals={},seconds=0){
 const evidence=csCriticalRescueEvidence487(patient,caseDef,vitals);
 const clock=patient?._criticalSupport487;
 if(!evidence.supported||!clock||!Number.isFinite(clock.startedAtSec))return {protected:false,evidence};
 const age=Math.max(0,(Number(seconds)||0)-clock.startedAtSec);
 return {protected:age<65,age,evidence};
}
