// The game composition binds every executed proof to its interpreted action.
// Generic port consumers may add a different domain validator; the real guard
// always uses this one in addition to the port's patient/event checks.
export function assertMatchingClinicalReceipt({result,intent}){
 if(result.status!=='executed')return;
 const r=result.receipt,expected=intent.id;
 const matches=intent.kind==='study.request'?r?.studyId===expected:
  intent.kind==='therapy.request'?r?.therapyId===expected:
  r?.kind===intent.kind&&r?.id===expected;
 if(!matches)throw Error('native receipt clinical action mismatch');
 if(intent.kind==='case.close'&&(!r.closure?.closed||r.closure.patientUid!==result.patientUid||r.closure.eventId!==result.eventId))
  throw Error('native receipt clinical closure mismatch');
}

/** Read a completed patient-bound intervention at a given native clock time.
 * Pending orders and future/cross-patient receipts are never physiology.
 * Quantified medication requires its matching route/dose administration row;
 * a non-drug clinical conduct requires the native documented completion.
 */
const medicationRoutes=new Set(['iv','oral','inhaled','sc','im']);
function completedDelivery(row,minute){
 return (row.status===undefined||row.status==='completed')&&
  (row.completionStatus===undefined||row.completionStatus==='completed')&&
  (row.completedAtNativeMinute===undefined||Number.isFinite(row.completedAtNativeMinute)&&
   row.completedAtNativeMinute>=row.administeredAtNativeMinute&&row.completedAtNativeMinute<=minute)&&
  (row.deliveryFraction===undefined||row.deliveryFraction===1)&&
  (row.prescribedDose===undefined||Number.isFinite(row.prescribedDose?.amount)&&row.prescribedDose.amount>0&&
   row.dose?.amount===row.prescribedDose.amount&&row.dose?.unit===row.prescribedDose.unit);
}
function isConfirmedTreatment(p,t,id,minute){
  if(t.id!==id||t.patientUid!==p.uid||typeof t.sourceEventId!=='string'||!t.sourceEventId||
   !Number.isFinite(t.administeredAtNativeMinute)||t.administeredAtNativeMinute<0||
   t.administeredAtNativeMinute>minute||
   p.treatments.filter(x=>x.sourceEventId===t.sourceEventId).length!==1)return false;
  if(!completedDelivery(t,minute))return false;
  if(t.route==='procedure'){
   const rows=(p.administrationLog||[]).filter(a=>a.sourceEventId===t.sourceEventId);
   return t.kind==='procedure.performed'&&t.completionStatus==='completed'&&
    (!rows.length||rows.length===1&&rows[0].patientUid===p.uid&&rows[0].id===id&&rows[0].route==='procedure'&&
     completedDelivery(rows[0],minute)&&rows[0].completedAtNativeMinute===t.completedAtNativeMinute&&
     rows[0].administeredAtNativeMinute===t.administeredAtNativeMinute);
  }
  if(!t.dose)return t.kind==='documented-clinical-conduct'&&t.route==='documented';
  const rows=(p.administrationLog||[]).filter(a=>a.sourceEventId===t.sourceEventId);
  return rows.length===1&&rows[0].patientUid===p.uid&&rows[0].id===id&&
   medicationRoutes.has(t.route)&&rows[0].route===t.route&&
   completedDelivery(rows[0],minute)&&rows[0].completedAtNativeMinute===t.completedAtNativeMinute&&
   Number.isFinite(t.dose.amount)&&t.dose.amount>0&&
   rows[0].dose?.amount===t.dose.amount&&rows[0].dose?.unit===t.dose.unit&&
   rows[0].administeredAtNativeMinute===t.administeredAtNativeMinute;
}
export function confirmedClinicalTreatment(p,id,minute){
 if(!Number.isFinite(minute)||minute<0)return undefined;
 return p.treatments?.find(t=>isConfirmedTreatment(p,t,id,minute));
}

/** Validate delivered exposure independently from completed-treatment credit.
 * A finite infusion owns one mutable administration row while it runs; its
 * partial dose may affect the patient before a terminal treatment exists.
 */
export function isDeliveredClinicalAdministration(p,row,minute){
 if(!Number.isFinite(minute)||minute<0||!p?.administrationLog?.includes(row)||
  row.patientUid!==p.uid||typeof row.id!=='string'||!row.id||
  typeof row.sourceEventId!=='string'||!row.sourceEventId||!medicationRoutes.has(row.route)||
  p.administrationLog.filter(t=>t.sourceEventId===row.sourceEventId).length!==1||
  !Number.isFinite(row.administeredAtNativeMinute)||row.administeredAtNativeMinute<0||row.administeredAtNativeMinute>minute||
  row.administeredAtRealSecond!==undefined&&(!Number.isFinite(row.administeredAtRealSecond)||row.administeredAtRealSecond<0)||
  !Number.isFinite(row.dose?.amount)||row.dose.amount<=0||typeof row.dose.unit!=='string'||!row.dose.unit)return false;
 const matches=(p.treatments||[]).filter(t=>t.sourceEventId===row.sourceEventId);
 if(row.status==='administering')return matches.length===0&&row.completionStatus==='pending'&&
  row.completedAtNativeMinute===undefined&&row.completedAtRealSecond===undefined&&
  Number.isFinite(row.prescribedDose?.amount)&&row.prescribedDose.amount>0&&row.prescribedDose.unit===row.dose.unit&&
  Number.isFinite(row.deliveryFraction)&&row.deliveryFraction>0&&row.deliveryFraction<=1&&
  Math.abs(row.dose.amount/row.prescribedDose.amount-row.deliveryFraction)<1e-9;
 return matches.length===1&&isConfirmedTreatment(p,matches[0],row.id,minute)&&
  matches[0].administeredAtRealSecond===row.administeredAtRealSecond;
}
