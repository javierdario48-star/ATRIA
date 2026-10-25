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

/**
 * A client-only selection intent. A tap does not own, focus, or mutate a
 * patient; observe() resolves it only from the authenticated server view.
 * The server remains the unique owner of actual claims and patient sessions.
 */
export function createDirectPatientSelection(){
 let requested=null;
 function begin(uid,kind='patient'){
  if(typeof uid!=='string'||!uid||!['patient','monitor'].includes(kind))return false;
  requested={uid,kind};
  return true;
 }
 function observe(clinical,actorId){
  if(!requested)return null;
  const status=directPatientIntent(clinical,requested.uid,actorId);
  if(status==='claim')return null; // an older snapshot is not confirmation
  const result={status,...requested};
  requested=null; // terminal notifications are one-shot, even on repeated snapshots
  return result;
 }
 return Object.freeze({
  begin,observe,cancel(){requested=null;},
  status:()=>requested?{...requested}:null
 });
}
