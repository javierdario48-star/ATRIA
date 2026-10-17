// C12.i — legacy pharmacological context and actual V5 IV receipts.
// Only a pure read model. No timer, second physiology writer or new dose.
import {csPharmContext487} from '../../clinical/pharmacology-registry-487.js';

export function confirmedFluidFeedback(patient,caseDef){
 if(typeof patient?.uid!=='string'||!patient.uid)throw Error('fluid status requires patient UID');
 const rows=(patient.administrationLog||[]).filter(t=>t.id==='fluid');
 const proofs=patient.treatments||[],seen=new Set();let totalMl=0;
 for(const row of rows){
  const matches=proofs.filter(t=>t.id==='fluid'&&t.sourceEventId===row.sourceEventId);
  if(row.patientUid!==patient.uid||typeof row.sourceEventId!=='string'||!row.sourceEventId||
   seen.has(row.sourceEventId)||!Number.isFinite(row.dose?.amount)||row.dose.amount<=0||
   row.dose.unit!=='ml'||!Number.isFinite(row.administeredAtNativeMinute)||
   matches.length!==1||matches[0].patientUid!==patient.uid||
   matches[0].dose?.amount!==row.dose.amount||
   matches[0].administeredAtNativeMinute!==row.administeredAtNativeMinute)
   throw Error('fluid summary requires uniquely confirmed native treatment');
  seen.add(row.sourceEventId);totalMl+=row.dose.amount;
 }
 const ctx=csPharmContext487(caseDef,patient,patient.liveVitals);
 const tags=ctx.traits;
 return Object.freeze({patientUid:patient.uid,administrations:rows.length,totalMl,
  congestionRisk:tags.has('congestion')||tags.has('overloadRisk'),
  lowPerfusion:tags.has('hypovolemia')||tags.has('hypotension')||tags.has('severeShock'),
  respiratoryChangeMeasured:Number.isFinite(patient.lastVitalsKnown?.vitals?.spo2) &&
   Number.isFinite(caseDef?.vitals?.spo2) &&
   caseDef.vitals.spo2-patient.lastVitalsKnown.vitals.spo2>2});
}
export function fluidFeedbackLabel(status){
 if(!status||status.administrations<1)return '';
 return 'Ringer confirmado: '+status.totalMl.toLocaleString('es-AR')+
  ' ml en '+status.administrations+' '+(status.administrations===1?'administración':'administraciones')+
  '. '+(status.respiratoryChangeMeasured?
   'Descenso de SpO₂ medido; reevaluar.':
   status.congestionRisk?'Riesgo basal de sobrecarga; controlar signos y reevaluar.':
   'Controlar respuesta circulatoria y respiratoria.');
}
