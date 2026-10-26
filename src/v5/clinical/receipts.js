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
export function confirmedClinicalTreatment(p,id,minute){
 if(!Number.isFinite(minute)||minute<0)return undefined;
 return p.treatments?.find(t=>{
  if(t.id!==id||t.patientUid!==p.uid||typeof t.sourceEventId!=='string'||!t.sourceEventId||
   !Number.isFinite(t.administeredAtNativeMinute)||t.administeredAtNativeMinute<0||
   t.administeredAtNativeMinute>minute||
   p.treatments.filter(x=>x.sourceEventId===t.sourceEventId).length!==1)return false;
  if(!t.dose)return t.kind==='documented-clinical-conduct'&&t.route==='documented';
  const rows=(p.administrationLog||[]).filter(a=>a.sourceEventId===t.sourceEventId);
  return rows.length===1&&rows[0].patientUid===p.uid&&rows[0].id===id&&
   ['iv','oral'].includes(t.route)&&rows[0].route===t.route&&
   Number.isFinite(t.dose.amount)&&t.dose.amount>0&&
   rows[0].dose?.amount===t.dose.amount&&rows[0].dose?.unit===t.dose.unit&&
   rows[0].administeredAtNativeMinute===t.administeredAtNativeMinute;
 });
}
