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
