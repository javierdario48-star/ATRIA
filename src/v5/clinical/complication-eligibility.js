// Pure complication eligibility gate. Clinical executors remain the only vital
// writers. A random candidate never implies unavoidable deterioration or death.
const valid=x=>typeof x==='string'&&x.length>0;
export function evaluateComplicationCandidate(candidate,{nativeMinute,clinicalState,registeredProgressions={},registeredRescues={}}={}){
 if(!candidate||!valid(candidate.progressionId)||!valid(candidate.rescueId))
  return {status:'invalid',reason:'missing-clinical-contract'};
 const progression=registeredProgressions[candidate.progressionId];
 const rescue=registeredRescues[candidate.rescueId];
 if(typeof progression!=='function'||typeof rescue!=='function')
  return {status:'unsupported',reason:'unregistered-clinical-owner'};
 if(!Number.isFinite(nativeMinute)||nativeMinute<0)
  return {status:'invalid',reason:'invalid-clock'};
 // The disease owner decides whether deterioration is plausible right now.
 const eligibility=progression({nativeMinute,clinicalState});
 if(eligibility!==true)return {status:'not-eligible'};
 return {status:'eligible',progressionId:candidate.progressionId,rescueId:candidate.rescueId};
}
export function evaluatePatientComplications(patient,context){
 return (patient?.variation?.complicationCandidates||[]).map(candidate=>({
  ...evaluateComplicationCandidate(candidate,context),candidateId:candidate.id
 }));
}
