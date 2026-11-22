// Read-only graph coverage. This module never executes care, alters a clock,
// approves a destination or awards XP. Native patient/receipt owners decide.
const list=x=>Array.isArray(x)?x:[];
const signals=Object.freeze({
 admitted:s=>!!s.patient?.uid,
 measured:s=>!!s.patient?.lastVitalsKnown,
 history:s=>list(s.patient?.intentHistory).length>0,
 examined:s=>!!s.patient?.examDone,
 hypothesis:s=>!!s.patient?.diagnosis,
 ordered:s=>list(s.patient?.orders).length>0,
 results:s=>list(s.patient?.orders).some(x=>x.status==='done'&&x.result),
 nursing:s=>list(s.patient?.pendingTreatments).length>0,
 administered:s=>list(s.patient?.administrationLog).length>0||list(s.patient?.treatments).length>0,
 elapsed:s=>s.clock?.nativeMinute>0,
 complication:s=>list(s.patient?.policyState?.complications).some(x=>x.status!=='recovered'),
 iatrogenia:s=>list(s.patient?.adverseEvents).length>0,
 rescued:s=>list(s.patient?.policyState?.complications).some(x=>Number.isFinite(x.rescueAt))||
  list(s.patient?.adverseEvents).some(x=>x.kind==='severe-drug-allergy'&&list(s.patient?.administrationLog).some(r=>
   r.id==='epi_im'&&r.patientUid===s.patient.uid&&r.administeredAtNativeMinute>=x.atNativeMinute)),
 reassessed:s=>!!s.patient?.lastReassessment,
 mentor:s=>list(s.room?.events).some(x=>x.type==='clinical.hint'||x.type==='clinical.hint-issued'||x.clinical?.some(c=>c.kind==='hint.request'))||
  s.hintCount>0,
 unsafeAlta:s=>list(s.room?.events).some(x=>x.clinical?.some(c=>c.receipt?.disposition?.kind==='clinical.unsafe-discharge')),
 unsafeObservation:s=>list(s.room?.events).some(x=>x.clinical?.some(c=>c.receipt?.disposition?.kind==='clinical.unsafe-observation')),
 recoverable:s=>!s.patient?.caseEnded&&!s.patient?.patientDied&&list(s.room?.events).some(x=>x.clinical?.some(c=>c.receipt?.disposition?.kind?.startsWith('clinical.unsafe-'))),
 requestedReceiver:s=>list(s.patient?.pendingConsults).length>0||list(s.patient?.consults).length>0,
 acceptedReceiver:s=>list(s.patient?.consults).some(x=>x.accepted&&x.status==='done'),
 rejectedReceiver:s=>list(s.patient?.consults).some(x=>!x.accepted&&x.status==='rejected'),
 alta:s=>s.patient?.closure?.closed&&s.patient.closure.destination==='alta',
 observacion:s=>s.patient?.closure?.closed&&s.patient.closure.destination==='observacion',
 sala:s=>s.patient?.closure?.closed&&s.patient.closure.destination==='sala',
 unsupportedDestination:s=>list(s.room?.events).some(x=>x.clinical?.some(c=>c.kind==='case.close'&&['uti','quirofano','procedimiento'].includes(c.id)&&c.status==='rejected')),
 death:s=>s.patient?.patientDied===true,
 recoveredCheckpoint:s=>s.checkpointRecovered===true,
 reward:s=>s.patient?.closure?.closed&&list(s.progress?.receipts).some(x=>x.patientUid===s.patient.uid)
});
export function validateClinicalGraph(graph){
 const errors=[],nodes=new Set(list(graph?.nodes).map(x=>x.id)),ids=new Set();
 if(graph?.schemaVersion!==1||!graph?.id||!nodes.has('encounter'))errors.push('invalid clinical graph identity');
 for(const edge of list(graph?.edges)){
  if(!edge.id||ids.has(edge.id))errors.push('duplicate/missing graph edge');ids.add(edge.id);
  if(!nodes.has(edge.from)||!nodes.has(edge.to))errors.push('unknown graph node: '+edge.id);
  if(!Object.hasOwn(signals,edge.when))errors.push('unknown graph predicate: '+edge.when);
 }
 if(!ids.size)errors.push('clinical graph requires edges');
 return errors;
}
export function createClinicalGraphObserver(graph){
 const errors=validateClinicalGraph(graph);if(errors.length)throw Error(errors.join('; '));
 const seen=new Map(),active=new Set(['encounter']);let uid=null;
 return Object.freeze({
  observe(state){
   if(!state?.patient?.uid)return [];
   uid??=state.patient.uid;if(uid!==state.patient.uid)throw Error('clinical graph patient changed');
   const hits=[];
   // Edges describe independent observations. Source labels provide context;
   // they never impose an order of clinical actions or block the player.
   for(const edge of graph.edges)if(!seen.has(edge.id)&&signals[edge.when](state)){
    const evidence={edgeId:edge.id,predicate:edge.when,patientUid:uid,
     nativeMinute:state.clock?.nativeMinute,realSecond:state.clock?.clinicalMinute,
     vitals:structuredClone(state.patient.liveVitals),
     administrationEventIds:list(state.patient.administrationLog).map(x=>x.sourceEventId),
     closureEventId:state.patient.closure?.eventId??null,
     penaltyEventIds:list(state.progress?.penalties).map(x=>x.eventId)};
    seen.set(edge.id,evidence);active.add(edge.to);hits.push(structuredClone(evidence));
   }
   return hits;
  },
  read:()=>({graphId:graph.id,patientUid:uid,activeNodes:[...active],covered:[...seen.keys()],
   uncovered:graph.edges.filter(x=>!seen.has(x.id)).map(x=>x.id),evidence:structuredClone([...seen.values()])})
 });
}
