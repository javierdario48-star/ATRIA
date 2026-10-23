// Atria V5 read-only clinical monitor triage. Based exclusively on confirmed
// measured vitals and rhythm, never a prognostic score or a treatment executor.
const abnormalRhythms=new Set(['asystole','ventricular_fibrillation','ventricular_tachycardia']);
export function monitorAcuity(patient,ecg=null){
 const connected=!!patient?.procedures?.monitor?.connected&&!patient.caseEnded;
 const v=patient?.lastVitalsKnown?.vitals;
 if(!connected||!v||!['sys','hr','spo2','rr'].every(key=>Number.isFinite(v[key])))
  return {state:'unknown',label:'SIN VIGILANCIA',reason:''};
 const rhythm=ecg?.rhythm;
 if(patient.patientDied||abnormalRhythms.has(rhythm)||
  v.sys<90||v.spo2<90||v.hr<40||v.hr>=130||v.rr<8||v.rr>=35)
  return {state:'critical',label:'CRÍTICO',reason:'Signos de alarma'};
 if(v.sys<100||v.spo2<94||v.hr<50||v.hr>=110||v.rr<10||v.rr>=26||
  Number.isFinite(v.temp)&&(v.temp<35||v.temp>=38))
  return {state:'warning',label:'VIGILANCIA',reason:'Valores fuera de rango'};
 return {state:'stable',label:'ESTABLE',reason:'Sin alarmas en la medición actual'};
}
