// Adapter boundary for the ONE existing native clinical executor.
// The port deliberately does not implement medicines, diagnostic policy or an
// independent clinical simulation. The game integrator supplies native invoke().
const copy=x=>structuredClone(x);
const canonical=x=>Array.isArray(x)?x.map(canonical):x&&typeof x==='object'?
 Object.fromEntries(Object.keys(x).sort().map(key=>[key,canonical(x[key])])):x;

export function createNativeClinicalPort({withPatient,invoke,validateReceipt=()=>{}}={}){
 if(typeof withPatient!=='function'||typeof invoke!=='function'||typeof validateReceipt!=='function')
  throw Error('native clinical withPatient and invoke required');
 const receipts=new Map(),inflight=new Map(),subscribers=new Set();
 function acknowledge(result,patientUid,eventId,intent){
  if(!result||!['executed','pending','rejected','unconfirmed'].includes(result.status))
   throw Error('native executor returned no trustworthy execution state');
  if(result.patientUid!==patientUid)throw Error('native receipt patient mismatch');
  if(result.status==='executed'&&
   (!result.receipt||result.receipt.patientUid!==patientUid||result.receipt.eventId!==eventId))
   throw Error('executed native action needs an exact patient/event receipt');
  validateReceipt({result,intent});
  return {status:result.status,patientUid,eventId,receipt:result.receipt??null,
   reason:result.reason??null};
 }
 return Object.freeze({
  async execute({eventId,patientUid,actorId,intent}){
   if(typeof eventId!=='string'||!eventId||typeof patientUid!=='string'||!patientUid)
    throw Error('patient-scoped native event identity required');
   const fingerprint=JSON.stringify([patientUid,actorId,intent]);
   if(inflight.has(eventId)){
    const prior=inflight.get(eventId);
    if(prior.fingerprint!==fingerprint)throw Error('native execution event identity collision');
    return copy(await prior.promise);
   }
   if(receipts.has(eventId)){
    const prior=receipts.get(eventId);
    if(prior.fingerprint!==fingerprint)throw Error('native execution event identity collision');
    return copy(prior.ack);
   }
   // The game-native patient context is selected before invoking any effect.
   // Its implementation MUST restore the previous patient even on failures.
   const promise=Promise.resolve().then(async()=>{try{
    const result=await withPatient(patientUid,async nativePatient=>{
    if(nativePatient?.uid!==patientUid)throw Error('native patient context mismatch');
    try{return await invoke({eventId,actorId,patientUid,intent,nativePatient});}
    catch{return {status:'unconfirmed',patientUid,reason:'native invocation failed after dispatch'};}
   });
   const acknowledged=acknowledge(result,patientUid,eventId,intent);
   // An explicitly unconfirmed native effect is never silently retried.
   receipts.set(eventId,{fingerprint,intent:copy(intent),ack:copy(acknowledged),completed:false});
   return copy(acknowledged);
   }catch(error){
    // A malformed proof can follow a real mutation. Quarantine it instead of
    // dispatching the same native effect again on a transport retry.
    receipts.set(eventId,{fingerprint,intent:copy(intent),completed:false,
     ack:{status:'unconfirmed',patientUid,eventId,receipt:null,reason:'invalid-native-execution-receipt'}});
    throw error;
   }});
   inflight.set(eventId,{fingerprint,promise});
   try{return copy(await promise);}finally{inflight.delete(eventId);}
  },
  // This capability belongs only to the native executor. Chat envelopes cannot
  // complete actions; they still enter through execute and room authentication.
  complete(result){
   if(!result||typeof result.eventId!=='string'||!receipts.has(result.eventId))
    throw Error('native completion requires a known pending event');
   const record=receipts.get(result.eventId);
   if(!['executed','rejected','unconfirmed'].includes(result.status))
    throw Error('native completion requires a terminal execution state');
   const acknowledged=copy(acknowledge(result,record.ack.patientUid,result.eventId,record.intent));
   if(record.completed){
    if(JSON.stringify(canonical(record.ack))!==JSON.stringify(canonical(acknowledged)))
     throw Error('native completion event identity collision');
    return copy(record.ack);
   }
   if(record.ack.status!=='pending')throw Error('native completion requires a pending execution');
   record.ack=acknowledged;record.completed=true;
   for(const subscription of [...subscribers]){
    try{subscription.callback(copy(acknowledged));}catch{/* presentation cannot undo native completion */}
   }
   return copy(acknowledged);
  },
  subscribeCompletion(callback){
   if(typeof callback!=='function')throw Error('native completion callback must be a function');
   const subscription={callback};subscribers.add(subscription);
   return ()=>subscribers.delete(subscription);
  },
  receipt:eventId=>receipts.has(eventId)?copy(receipts.get(eventId).ack):null
 });
}
