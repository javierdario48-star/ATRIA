// A small validated formulary. Drug identity, dose and preparation are
// shared; disease-specific effects remain solely in native case physiology.
export const IV_MEDICINES=Object.freeze({
 fluid:Object.freeze({id:'fluid',label:'Cristaloides / reposición de volumen',seconds:.8}),
 ceftriaxone:Object.freeze({id:'ceftriaxone',label:'Ceftriaxona IV',seconds:1.5}),
 metronidazole:Object.freeze({id:'metronidazole',label:'Metronidazol IV',seconds:1.5}),
 furosemide:Object.freeze({id:'furosemide',label:'Furosemida IV',seconds:1.5})
});
export const isStandardIVMedicine=id=>Object.hasOwn(IV_MEDICINES,id);
export function parseStandardIVDose(text,reference){
 if(!Number.isFinite(reference?.amount)||!['mg','ml'].includes(reference.unit))throw Error('IV formulation missing');
 const raw=String(text||'').toLowerCase().normalize('NFD')
  .replace(/[\u0300-\u036f]/g,'').replace(/,/g,'.');
 if(/\b(oral|po|im|intramuscular|subcutane\w*|sc|nasal)\b/.test(raw))
  throw Error('unsupported-dose-route');
 const matches=[...raw.matchAll(/(?:^|\s)([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(mg|g|ml|cc|l)\b/g)];
 if(matches.length===0){
  if(/\d|\b(mcg|ug|gramos?|miligramos?|litros?)\b/.test(raw))throw Error('invalid-dose');
  return {...reference,defaultApplied:true};
 }
 if(matches.length!==1)throw Error('ambiguous-dose');
 const chosen=matches[0],rest=raw.slice(0,chosen.index)+raw.slice(chosen.index+chosen[0].length);
 if(/\d|\b(mcg|ug|mg|g|ml|cc|litros?|microgramos?)\b/.test(rest))
  throw Error('ambiguous-dose-qualifier');
 const unit=chosen[2],actual=Number(chosen[1])*(unit==='g'?1000:unit==='l'?1000:1);
 if((reference.unit==='mg'&&!['mg','g'].includes(unit))||
  (reference.unit==='ml'&&!['ml','cc','l'].includes(unit))||
  !Number.isFinite(actual)||actual!==reference.amount)
  throw Error('unsupported-dose');
 return {...reference,defaultApplied:false};
}

/** Scheduling and receipts for validated IV medicine: never changes vitals.
 * Calling care.advance() remains the only path to a true administration.
 */
export function createIVAdministration(p,{doses,labels=()=>null,proof,rejected}){
 const tasks=new Map();
 const copy=x=>structuredClone(x);
 function request(cmd,clock){
  const id=cmd.intent.id;
  if(cmd.intent.kind!=='therapy.request'||!isStandardIVMedicine(id))return null;
  let dose;
  try{dose=parseStandardIVDose(cmd.intent.clause||cmd.intent.sourceText,doses?.[id]);}
  catch(error){return rejected(cmd,error.message,'Dosis o vía IV no validada. No administrado.');}
  // A fresh clinical order is another exposure, even to the same drug.
  // Only replay of the SAME eventId may share an execution (room authority
  // already deduplicates transport retries by actor+commandId).
  if(tasks.has(cmd.eventId))return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};
  if(p.administrationLog.some(t=>t.sourceEventId===cmd.eventId))
   return proof(cmd,p.administrationLog.find(t=>t.sourceEventId===cmd.eventId),true);
  if((p.venousAccessCount??0)<1)
   return rejected(cmd,'venous-access-required','Primero confirmar al menos una vía venosa periférica. No administrado.');
  const task={id,label:labels(id)||IV_MEDICINES[id].label,dose,sourceEventId:cmd.eventId,
   actorId:cmd.actorId,patientUid:p.uid,
   readyAtRealSecond:clock.clinicalMinute+IV_MEDICINES[id].seconds,commands:[copy(cmd)]};
  tasks.set(cmd.eventId,task);
  p.pendingTreatments.push({id,sourceEventId:task.sourceEventId,patientUid:p.uid,
   readyAtRealSecond:task.readyAtRealSecond});
  return {status:'pending',eventId:cmd.eventId,patientUid:p.uid};
 }
 function due(before,after){
  return [...tasks.values()].filter(t=>t.readyAtRealSecond<=after.clinicalMinute+1e-9);
 }
 function finish(task,at,nativeMinute){
  if(tasks.get(task.sourceEventId)!==task)throw Error('unknown medicine preparation');
  const t={id:task.id,label:task.label,dose:copy(task.dose),sourceEventId:task.sourceEventId,
   actorId:task.actorId,patientUid:p.uid,administeredAtRealSecond:at,
   administeredAtNativeMinute:nativeMinute};
  p.treatments.push(t);p.administrationLog.push(copy(t));tasks.delete(task.sourceEventId);
  p.pendingTreatments=p.pendingTreatments.filter(x=>x.sourceEventId!==task.sourceEventId);
  return task.commands.map(cmd=>proof(cmd,t));
 }
 return Object.freeze({request,due,finish,owns:task=>tasks.get(task.sourceEventId)===task,
  dispose(){tasks.clear();}});
}
