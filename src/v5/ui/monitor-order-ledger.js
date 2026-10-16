/**
 * Read-only projection of room-authoritative treatment events. Never infers
 * administration from text, movement, elapsed time or a pending receipt.
 * The event stream is bounded; the patient's native administrationLog remains
 * the durable in-session source for actually delivered treatments.
 */
const clinicalKinds=new Set(['therapy.request','therapy.stop','procedure.request','monitor.set','consult.request']);
const copy=x=>structuredClone(x);
export function monitorOrderLedger(room,patient){
 if(!room||!patient)return [];
 const entries=new Map();
 for(const event of room.events||[]){
  if(event.type==='chat.posted'&&event.message?.patientUid===patient.uid){
   (event.clinical||[]).forEach((item,index)=>{
    if(!clinicalKinds.has(item.kind))return;
    const eventId=room.roomId+':'+event.message.actorId+':'+event.message.id+':'+index;
    entries.set(eventId,{eventId,commandId:event.message.id,kind:item.kind,id:item.id,
     status:item.status,reason:item.reason||null,receipt:copy(item.receipt||null),at:event.message.at});
   });
  }else if(event.type==='clinical.completed'&&event.patientUid===patient.uid){
   for(const item of event.clinical||[]){
    if(!clinicalKinds.has(item.kind))continue;
    const prior=entries.get(event.eventId);
    entries.set(event.eventId,{...prior,eventId:event.eventId,
     commandId:prior?.commandId||event.commandId,kind:item.kind,id:item.id,
     status:item.status,reason:item.reason||null,receipt:copy(item.receipt||null),
     at:event.at??prior?.at});
   }
  }
 }
 return [...entries.values()];
}
/** Medication history comes from native administration, not a chat receipt. */
export function administeredTreatmentHistory(patient){
 return (patient?.administrationLog||[]).map(t=>({
  eventId:t.sourceEventId,id:t.id,label:t.label||t.id,action:t.action||'administer',
  dose:t.dose?.display||null,time:t.administeredAtRealSecond??null,
  patientUid:t.patientUid
 }));
}
export function latestMonitorOrderState(ledger,commandId){
 const entries=ledger.filter(x=>x.commandId===commandId);
 if(!entries.length)return null;
 const rejected=entries.filter(x=>x.status==='rejected'||x.status==='unconfirmed');
 const pending=entries.filter(x=>x.status==='pending');
 const completed=entries.filter(x=>x.status==='executed');
 // A mixed command must not appear entirely successful if a component failed.
 const status=rejected.length?'rejected':pending.length?'pending':'executed';
 return {status,total:entries.length,completed:completed.length,pending:pending.length,
  rejected:rejected.length,details:entries};
}
