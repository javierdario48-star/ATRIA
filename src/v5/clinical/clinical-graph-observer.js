// Read-only graph coverage. This module never executes care, alters a clock,
// approves a destination or awards XP. Native patient/receipt owners decide.
const list=x=>Array.isArray(x)?x:[];
const closureDestinations=new Set(['alta','observacion','sala','uti','procedimiento','quirofano']);
const closedTo=(s,d)=>s.patient?.closure?.closed===true&&s.patient.closure.destination===d;
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
 complication:s=>list(s.patient?.policyState?.complications).some(x=>
  Number.isFinite(x.onsetAt)&&['active','incipient','recovering'].includes(x.status)),
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
 alta:s=>closedTo(s,'alta'),
 observacion:s=>closedTo(s,'observacion'),
 sala:s=>closedTo(s,'sala'),
 uti:s=>closedTo(s,'uti'),
 procedimiento:s=>closedTo(s,'procedimiento'),
 quirofano:s=>closedTo(s,'quirofano'),
 unsupportedDestination:s=>list(s.room?.events).some(x=>x.clinical?.some(c=>c.kind==='case.close'&&['uti','quirofano','procedimiento'].includes(c.id)&&c.status==='rejected')),
 death:s=>s.patient?.patientDied===true,
 recoveredCheckpoint:s=>s.checkpointRecovered===true,
 reward:s=>s.patient?.closure?.closed&&list(s.progress?.receipts).some(x=>x.patientUid===s.patient.uid)
});
export function validateClinicalGraph(graph,caseData){
 const errors=[],nodes=new Set(list(graph?.nodes).map(x=>x.id)),ids=new Set();
 if(graph?.schemaVersion!==1||!graph?.id||!nodes.has('encounter'))errors.push('invalid clinical graph identity');
 for(const edge of list(graph?.edges)){
  if(!edge.id||ids.has(edge.id))errors.push('duplicate/missing graph edge');ids.add(edge.id);
  if(!nodes.has(edge.from)||!nodes.has(edge.to))errors.push('unknown graph node: '+edge.id);
  if(!Object.hasOwn(signals,edge.when))errors.push('unknown graph predicate: '+edge.when);
 }
 if(!ids.size)errors.push('clinical graph requires edges');
 // The diagram observes the executable policy, never grants treatment or
 // closes a case. An accepting receiver cannot light two terminal branches.
 const allowed=caseData?.clinicalPolicy?.closure?.destinations;
 if(Array.isArray(allowed)){
  for(const destination of allowed){
   if(!nodes.has(destination)||!list(graph?.edges).some(e=>
    e.to===destination&&e.when===destination))
    errors.push('missing native closure route '+destination);
   if(!Object.hasOwn(graph?.destinations||{},destination))
    errors.push('missing graph destination declaration '+destination);
  }
  for(const edge of list(graph?.edges)){
   if(closureDestinations.has(edge.when)&&
    (edge.to!==edge.when||!allowed.includes(edge.when)))
    errors.push('unsupported or mismatched native closure route '+edge.id);
   if(closureDestinations.has(edge.to)&&allowed.includes(edge.to)&&
    edge.when!==edge.to)
    errors.push('destination edge without actual closure receipt '+edge.id);
  }
 }
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
