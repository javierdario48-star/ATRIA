import {awaitAbortable} from '../core/abortable-operation.js';

export const CLINICAL_REQUEST_TIMEOUT_MS=12000;
const RECOVERY_CAS_BACKOFF_MS=[100,250,500,1000];

async function waitForRetry(ms,signal){
 let timer;
 try{await awaitAbortable(new Promise(resolve=>timer=setTimeout(resolve,ms)),signal);}
 finally{clearTimeout(timer);}
}

function retainConfirmedRewards(next,previous){
 for(const field of ['caseReward','deathReward']){
  const reward=next[field],prior=previous?.[field];
  if(reward?.creditStatus==='pending'&&prior?.creditStatus==='credited'&&
   ['actorId','patientUid','eventId'].every(key=>prior[key]===reward[key]))next[field]=prior;
 }
 const known=new Map((previous?.shift?.outcomes||[]).filter(row=>row.creditStatus==='credited')
  .map(row=>[row.patientUid,row]));
 for(const row of [...(next.shift?.outcomes||[]),...(next.competition?.outcomes||[])]){
  const verified=known.get(row.patientUid);
  if(verified&&row.creditStatus==='pending'){
   row.xp=verified.xp;row.creditStatus='credited';
  }
 }
}
/**
 * C5.b.3 client transport. It does not create a GuardSession, progress clock,
 * dispense a drug, or make a second clinical authority in the browser.
 * The server is the only writer. A caller drives maintain() from the existing
 * animation frame; no timers or new scheduling loops are added.
 */
export function createDurableCooperativeReplica({
 window,roomId,clientKey,storage,actorId=null,authorization=()=>null,onSnapshot=()=>{},onError=()=>{},onCommitted=()=>{},
 requestTimeoutMs=CLINICAL_REQUEST_TIMEOUT_MS
}){
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(roomId)||!/^[-a-zA-Z0-9]{32,120}$/.test(clientKey))
  throw Error('invalid durable cooperative credentials');
 const key='atria.v5.durable.pending:'+roomId;
 let disposed=false,current=null,epoch=-1,lastPoll=-Infinity,inflight=null,queuedMotion=null,queuedClaim=null,queuedMotionSequence=null,latestMotionSequence=0,typing=null,lastTyping=null,confirmation=null,confirmationKey=null;
 let observing=null,observationVersion=0,observeAgain=false,desiredFocus=null;
 const patientViews=new Map(),controllers=new Set(),pending=new Map(),pendingHints=new Map(),pendingShifts=new Map();
 const shiftStorageKey=key+':shift-controls';
 const saveShifts=()=>{try{storage?.setItem(shiftStorageKey,JSON.stringify([...pendingShifts.values()].map(x=>x.request)));}catch{}};
 try{for(const request of JSON.parse(storage?.getItem(shiftStorageKey)||'[]'))if(typeof request?.requestId==='string')pendingShifts.set(request.requestId,{request,resolve:null});}catch{}
 const hintStorageKey=key+':displayed-hints';
 function saveHints(){try{storage?.setItem(hintStorageKey,JSON.stringify([...pendingHints.values()].map(x=>x.request).filter(r=>r.op==='displayed')));}catch{}}
 try{for(const request of JSON.parse(storage?.getItem(hintStorageKey)||'[]'))if(request?.op==='displayed'&&typeof request.requestId==='string')pendingHints.set(request.requestId,{request,resolve:null});}catch{}
 const clone=x=>structuredClone(x);
 function save(){try{storage?.setItem(key,JSON.stringify([...pending.values()].map(x=>x.envelope)));}catch{}}
 try{
  const retained=JSON.parse(storage?.getItem(key)||'[]');
  if(Array.isArray(retained))for(const envelope of retained)
   if(typeof envelope?.id==='string'&&typeof envelope?.text==='string'&&!pending.has(envelope.id))
    pending.set(envelope.id,{envelope:clone({...envelope,targetPatientUid:envelope.targetPatientUid??null}),resolve:null});
 }catch{}
 function presented(){
  if(!current)return null;
  const stored=desiredFocus&&patientViews.get(desiredFocus),state=clone(stored?.clinical||current.clinical);
  if(stored&&current.clinical.shift){
   state.shift={...clone(current.clinical.shift),focusPatientUid:state.patient.uid};
   state.communication=clone(current.clinical.communication);
   if(state.hintBinding)state.hintBinding.selectionRevision=current.clinical.hintBinding?.selectionRevision??state.hintBinding.selectionRevision;
  }
  return state;
 }
 const presentedCatalog=()=>clone((desiredFocus&&patientViews.get(desiredFocus)?.catalog)||current?.catalog||[]);
 const emit=()=>{if(current&&!disposed)onSnapshot({...clone(current),clinical:presented(),catalog:presentedCatalog()});};
 function accept(response){
  if(!response?.clinical||response.clinical.room?.roomId!==roomId||!Number.isSafeInteger(response.epoch))
   throw Error('invalid clinical response');
  // Even a delayed older view can carry the final receipt for our exact
  // pending command. Settle receipts independently from view replacement.
  for(const ack of response.acknowledgements||[]){
   if(!ack||typeof ack.commandId!=='string')continue;
   const waiting=pending.get(ack.commandId);
   if(waiting){pending.delete(ack.commandId);waiting.resolve?.(clone(ack));}
  }
  const requested=response.hintRequestId,ack=response.hintAcknowledgement,waitingHint=pendingHints.get(requested);
  if(ack&&waitingHint){pendingHints.delete(requested);waitingHint.resolve?.(clone(ack));saveHints();}
  const shiftId=response.shiftRequestId??response.shiftAcknowledgement?.requestId,waitingShift=pendingShifts.get(shiftId);
  if(response.shiftAcknowledgement&&waitingShift){pendingShifts.delete(shiftId);waitingShift.resolve?.(clone(response.shiftAcknowledgement));saveShifts();}
  save();
  if(response.readOnly!==true&&response.commitNotice===true)try{onCommitted(response.epoch);}catch{/* a notification cannot undo a confirmed receipt */}
  if(response.epoch<epoch)return false;
  epoch=response.epoch;
  const previous=current?.clinical;
  current=clone(response);retainConfirmedRewards(current.clinical,previous);
  if(current.clinical.patient?.uid)patientViews.set(current.clinical.patient.uid,{clinical:clone(current.clinical),catalog:clone(current.catalog||[])});
  emit();
  return true;
 }
 async function request(action,extra={}, {controller=new AbortController(),signal:caller,retryBusy=false}={}){
  controllers.add(controller);
  const signals=[controller.signal,AbortSignal.timeout(requestTimeoutMs)];
  if(caller)signals.push(caller);
  const signal=AbortSignal.any(signals);
  try{
   const token=authorization(),options={method:'POST',cache:'no-store',signal,
    headers:{'Content-Type':'application/json',...(token?{Authorization:token}:{})},
    body:JSON.stringify({action,clientKey,roomId,...extra,...(actorId?{expectedActorId:actorId}:{})})};
   for(let attempt=0;;attempt++){
    signal.throwIfAborted();
    const response=await awaitAbortable(window.fetch('/api/clinical',options),signal);
    let value;
    try{value=await awaitAbortable(response.json(),signal);}
    catch(error){signal.throwIfAborted();if(response.ok)throw error;value={};}
    if(response.ok)return value;
    const error=Object.assign(Error(value?.error||'clinical-'+response.status),
     {status:response.status,code:value?.code||'unavailable'});
    const delay=RECOVERY_CAS_BACKOFF_MS[attempt];
    if(!retryBusy||error.status!==409||error.code!=='busy'||delay===undefined)throw error;
    await waitForRetry(delay,signal);
   }
  }finally{controllers.delete(controller);}
 }
 function observe(patientUid=desiredFocus){
  if(disposed)return Promise.reject(Error('replica-disposed'));
  const target=current?.clinical.shift?.mode==='competitive'?null:patientUid;
  if(observing&&observing.target===target)return observing.promise;
  if(observing)observing.controller.abort(new DOMException('Selection changed','AbortError'));
  const slot={target,controller:new AbortController(),version:++observationVersion,promise:null};
  observing=slot;
  slot.promise=request('observe',target?{targetPatientUid:target}:{},{controller:slot.controller}).then(response=>{
   if(disposed||slot.version!==observationVersion)return null;
   accept(response);return response;
  }).catch(error=>{
   if(error?.name==='AbortError'||disposed)return null;
   onError(error);throw error;
  }).finally(()=>{
   if(observing!==slot)return;
   observing=null;
   if(observeAgain&&!disposed){observeAgain=false;observe().catch(()=>{});}
  });
  return slot.promise;
 }
 function invalidate(advisoryEpoch){
  if(!Number.isSafeInteger(advisoryEpoch)||advisoryEpoch<0||advisoryEpoch<=epoch||disposed)return Promise.resolve(null);
  if(observing){observeAgain=true;return observing.promise;}
  return observe();
 }
 function flushPending(hasPending){
  const busy=inflight;
  if(busy)busy.then(()=>{if(!disposed&&hasPending())synchronize().catch(()=>{});},()=>{});
  else synchronize().catch(()=>{});
 }
 // At most one in-flight mutation per browser. Server-side CAS serializes
 // actors across browsers; retained event IDs make retransmission idempotent.
 function synchronize({signal,retryBusy=false,recoveryShift=null}={}){
  if(disposed)return Promise.reject(Error('replica-disposed'));
  if(signal?.aborted)return Promise.reject(signal.reason);
  if(inflight)return inflight;
  const batch=[...pending.values()].slice(0,16).map(x=>clone(x.envelope));
  const motion=queuedMotion,motionSequence=queuedMotionSequence,claim=queuedClaim,typingState=typing,receipt=confirmation,
   hint=[...pendingHints.values()][0]?.request,nextShift=[...pendingShifts.values()][0]?.request??recoveryShift;
  // A leave settles after this batch at the authority. Keep it queued while
  // any earlier command or displayed hint cannot fit in the current batch.
  const shift=nextShift?.op==='leave'&&(pending.size>batch.length||pendingHints.size>(hint?1:0))?null:nextShift;
  inflight=request('sync',{commands:batch,...(hint?{hintRequest:clone(hint)}:{}),...(motion?{motion,...(motionSequence!==null?{motionSequence}:{})}:{}),
   ...(claim?{claim}:{}),...(shift?{shiftRequest:clone(shift)}:{}),...(typingState!==null?{typing:typingState}:{}),...(receipt?{confirmation:receipt}:{})},{signal,retryBusy})
   .then(response=>{
    if(disposed)return null;
    signal?.throwIfAborted();
    accept(response);
    // Do not discard motion on a recovering response: the server did not
    // admit new commands, movement or confirmations during catch-up.
    if(!response.recovering){
     if(queuedMotion===motion){queuedMotion=null;queuedMotionSequence=null;}
      if(queuedClaim===claim&&response.clinical?.shift?.confirmedFocusPatientUid===claim)queuedClaim=null;
     if(confirmation===receipt)confirmation=null;
     if(typing===typingState)typing=null;
    }
    return response;
   }).catch(error=>{if(!disposed)onError(error);throw error;})
   .finally(()=>{inflight=null;});
  return inflight;
 }
 async function recoverTurn(op,{signal=AbortSignal.timeout(requestTimeoutMs)}={}){
  if(op!=='resume'&&op!=='leave')throw Error('invalid recovery decision');
  const participating=op==='resume';let decision=null;
  // Only the open recovery attempt owns its decision. Existing queued orders
  // and receipts keep their normal persistence and settle before leaving.
  while(true){
   const result=await synchronize({signal,retryBusy:true,recoveryShift:decision});
   signal.throwIfAborted();
   if(!result)throw Error('replica-disposed');
   if(result.recovering||pending.size||pendingHints.size||pendingShifts.size){
    await waitForRetry(100,signal);continue;
   }
   const turn=result.clinical.shift?.turn;
   if(!turn?.id||typeof turn.actor?.participating!=='boolean')
    throw Error('No se pudo comprobar el estado del turno. Tu progreso se conserva.');
   const receipt=result.shiftAcknowledgement;
   if(decision&&(receipt?.requestId!==decision.requestId||receipt.op!==op||receipt.turnId!==decision.turnId||
      receipt.status!=='accepted'&&receipt.reason!=='shift-turn-changed'))
    throw Error('No se confirmó tu decisión de guardia. Volvé a intentarlo.');
   if(turn.actor.participating===participating)return result;
   if(decision?.turnId===turn.id)throw Error('No se confirmó el cambio de participación. Volvé a intentarlo.');
   decision={op,turnId:turn.id,requestId:window.crypto.randomUUID()};
  }
 }
 return Object.freeze({
  async start(caseId,mode=null,guardSelection=null){
   if(disposed)throw Error('replica-disposed');
   try{const response=await request('start',{caseId,...(mode?{mode}:{}),...(guardSelection?{guardSelection}:{})});accept(response);return response;}
   catch(error){
    // A successful start with a lost HTTP response can return 'exists';
    // only the authenticated durable roster can recover this room.
    if(error.status===409&&error.code==='exists')return synchronize();
    throw error;
   }
  },
  sync:synchronize,
  recoverTurn,
  observe,invalidate,
  pendingCommands:()=>[...pending.values()].map(x=>clone(x.envelope)),
  maintain(now){
   // Physiological advancement and CAS writes are NOT a sprite transport.
   // Movement is visible through the existing room-scoped social presence,
   // so preserve the proven 900ms clinical cadence and avoid write contention.
   if(disposed||inflight||now-lastPoll<900)return;
   lastPoll=now;synchronize().catch(()=>{/* retain pending events for next frame */});
  },
  post(envelope){
   if(disposed)return Promise.reject(Error('replica-disposed'));
   if(typeof envelope?.id!=='string'||!envelope.id||typeof envelope.text!=='string')
    return Promise.reject(Error('invalid clinical command'));
   if(envelope.targetPatientUid===undefined&&envelope.channel!=='team'&&desiredFocus)
    envelope={...envelope,targetPatientUid:desiredFocus};
   const old=pending.get(envelope.id);
   if(old)return new Promise(resolve=>{
    if(!old.resolve)old.resolve=resolve;
    else {const prior=old.resolve;old.resolve=ack=>{prior(ack);resolve(ack);};}
   });
   return new Promise(resolve=>{
    pending.set(envelope.id,{envelope:clone(envelope),resolve});save();
    const busy=inflight;
    if(busy){
     // The current HTTP request took its command snapshot before this input.
     // Flush this new utterance immediately after its response, rather than
     // making the player wait for the next 900 ms idle refresh.
     busy.then(()=>{
      if(!disposed&&pending.has(envelope.id))
       synchronize().catch(()=>{/* bounded retry on existing RAF */});
     },()=>{/* failed request: existing RAF backs off and retains the command */});
    }else synchronize().catch(()=>{/* on next RAF retry same id */});
   });
  },
  shift(request){
   if(disposed)return Promise.reject(Error('replica-disposed'));
   if(typeof request?.requestId!=='string')return Promise.reject(Error('invalid shift control'));
   return new Promise(resolve=>{
    const old=pendingShifts.get(request.requestId);
    if(old&&JSON.stringify(old.request)!==JSON.stringify(request)){resolve({status:'rejected',reason:'shift-request-conflict'});return;}
    if(old){const prior=old.resolve;old.resolve=ack=>{prior?.(ack);resolve(ack);};}
    else pendingShifts.set(request.requestId,{request:clone(request),resolve});
    saveShifts();flushPending(()=>pendingShifts.has(request.requestId));
   });
  },
  hintBinding(){return current?clone(current.clinical.hintBinding):null;},
  hint(request){
   if(disposed)return Promise.reject(Error('replica-disposed'));
   if(typeof request?.requestId!=='string')return Promise.reject(Error('invalid hint request'));
   return new Promise(resolve=>{
    const old=pendingHints.get(request.requestId);
    if(old){const prior=old.resolve;old.resolve=ack=>{prior?.(ack);resolve(ack);};}
    else pendingHints.set(request.requestId,{request:clone(request),resolve});
    saveHints();const busy=inflight;
    if(busy)busy.then(()=>{if(!disposed&&pendingHints.has(request.requestId))synchronize().catch(()=>{});},()=>{});
    else synchronize().catch(()=>{});
   });
  },
  claim(patientUid){
   if(typeof patientUid!=='string'||!patientUid||disposed)return false;
   queuedClaim=patientUid;
   if(current?.clinical.shift?.mode!=='competitive'){desiredFocus=patientUid;emit();}
   const busy=inflight;
   if(busy)busy.then(()=>{if(!disposed&&queuedClaim===patientUid)synchronize().catch(()=>{});},()=>{});
   else synchronize().catch(()=>{});
   observe().catch(()=>{});
   return true;
  },
  cancelClaim(uid){
   if(queuedClaim===uid)queuedClaim=null;
  },
  motion(target,sequence=null){
   if(!Array.isArray(target)||target.length!==2||!target.every(Number.isFinite))return false;
   if(sequence!==null&&(!Number.isSafeInteger(sequence)||sequence<1||sequence>1e9))return false;
   if(sequence!==null&&sequence<latestMotionSequence)return false;
   if(sequence!==null)latestMotionSequence=Math.max(latestMotionSequence,sequence);
   queuedMotion=clone(target);queuedMotionSequence=sequence;return true;
  },
  setTyping(value){if(lastTyping!==!!value){typing=!!value;lastTyping=!!value;}},
  confirm(revision,outcomeId){const key=JSON.stringify([revision,outcomeId]);if(key!==confirmationKey){confirmationKey=key;confirmation={revision,outcomeId};}},
  read:presented,
  snapshotSpatial:()=>current?clone(current.spatial):null,
  lastAcknowledgedMotion(actorId){
   const receipts=current?.motionReceipts;
   if(!Array.isArray(receipts))return null; // old checkpoints remain compatible
   const ack=receipts.find(pair=>Array.isArray(pair)&&pair[0]===actorId)?.[1];
   return Number.isSafeInteger(ack)&&ack>0?ack:null;
  },
  catalog:presentedCatalog,
  monitorRead(uid){const p=presented()?.patient;
   return p?.uid===uid?{uid,caseEnded:p.caseEnded,ecg:clone(p.ecg),
    procedures:clone(p.procedures),lastVitalsKnown:clone(p.lastVitalsKnown)}:null;},
  advance(){},finishNurseArrivals(){return [];},async flush(){
   while(inflight||observing){const tasks=[inflight,observing?.promise].filter(Boolean);await Promise.all(tasks);}
  },
  hasSnapshot:()=>!!current,
  isRecovering:()=>!!current?.recovering,
  dispose(){
   disposed=true;
   for(const controller of controllers)controller.abort(new DOMException('Replica disposed','AbortError'));
   for(const item of pending.values())item.resolve?.({status:'rejected',reason:'replica-disposed'});
   pending.clear();
   for(const h of pendingHints.values())h.resolve?.({status:'rejected',reason:'replica-disposed'});
   pendingHints.clear();
   for(const item of pendingShifts.values())item.resolve?.({status:'rejected',reason:'replica-disposed'});
   pendingShifts.clear();patientViews.clear();
  },
 });
}
