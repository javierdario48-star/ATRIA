/**
 * Read-only bedside selection policy. Reception travel is handled by
 * reception-assignment; only the clinical server can accept claims.
 * Position is never inferred from a HUD patient or another doctor's focus.
 */
export function directPatientIntent(state,uid,actorId){
 if(typeof uid!=='string'||!uid)return 'unavailable';
 const record=state?.shift?.patients?.find(r=>r.uid===uid);
 if(!record||state.shift.ended||record.closed||record.departed||record.patientDied)return 'unavailable';
 if(state.shift.mode==='competitive'){
  if(record.ownerId&&record.ownerId!==actorId)return 'occupied';
  return state.patient?.uid===uid&&record.ownerId===actorId?'selected':'claim';
 }
 return state.patient?.uid===uid?'selected':'claim';
}
