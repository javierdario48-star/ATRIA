// Adapter boundary for the ONE existing native clinical executor.
// The port deliberately does not implement medicines, diagnostic policy or an
// independent clinical simulation. The game integrator supplies native invoke().
export function createNativeClinicalPort({withPatient,invoke}={}){
 if(typeof withPatient!=='function'||typeof invoke!=='function')
  throw Error('native clinical withPatient and invoke required');
 const receipts=new Map();
 return Object.freeze({
  async execute({eventId,patientUid,actorId,intent}){
   if(typeof eventId!=='string'||!eventId||typeof patientUid!=='string'||!patientUid)
    throw Error('patient-scoped native event identity required');
   const fingerprint=JSON.stringify([patientUid,actorId,intent]);
   if(receipts.has(eventId)){
    const prior=receipts.get(eventId);
    if(prior.fingerprint!==fingerprint)throw Error('native execution event identity collision');
    return structuredClone(prior.ack);
   }
   // The game-native patient context is selected before invoking any effect.
   // Its implementation MUST restore the previous patient even on failures.
   const result=await withPatient(patientUid,async nativePatient=>{
    if(nativePatient?.uid!==patientUid)throw Error('native patient context mismatch');
    try{return await invoke({eventId,actorId,patientUid,intent,nativePatient});}
    catch{return {status:'unconfirmed',patientUid,reason:'native invocation failed after dispatch'};}
   });
   if(!result||!['executed','pending','rejected','unconfirmed'].includes(result.status))
    throw Error('native executor returned no trustworthy execution state');
   if(result.patientUid!==patientUid)throw Error('native receipt patient mismatch');
   if(result.status==='executed'&&
    (!result.receipt||result.receipt.patientUid!==patientUid||result.receipt.eventId!==eventId))
    throw Error('executed native action needs an exact patient/event receipt');
   const acknowledged={status:result.status,patientUid,eventId,receipt:result.receipt??null,
    reason:result.reason??null};
   // An explicitly unconfirmed native effect is never silently retried.
   receipts.set(eventId,{fingerprint,ack:structuredClone(acknowledged)});
   return structuredClone(acknowledged);
  },
  receipt:eventId=>receipts.has(eventId)?structuredClone(receipts.get(eventId).ack):null
 });
}
