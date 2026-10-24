// Monitor is a read-only projection of real, *connected* measurements.
import {clinicalAcuity} from '../clinical/acuity.js';
export function monitorAcuity(patient,ecg=null){
 const connected=!!patient?.procedures?.monitor?.connected&&!patient.caseEnded;
 const v=patient?.lastVitalsKnown?.vitals;
 if(!connected||!v)return {state:'unknown',label:'SIN VIGILANCIA',reason:''};
 const severity=clinicalAcuity(v,{dead:!!patient.patientDied,rhythm:ecg?.rhythm});
 return severity.state==='unknown'?{state:'unknown',label:'SIN VIGILANCIA',reason:''}:severity;
}
