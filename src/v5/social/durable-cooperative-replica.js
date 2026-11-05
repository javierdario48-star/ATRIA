export const CLINICAL_REQUEST_TIMEOUT_MS=12000;

function retainConfirmedRewards(next,previous){
 const reward=next.caseReward,prior=previous?.caseReward;
 if(reward?.creditStatus==='pending'&&prior?.creditStatus==='credited'&&
  ['actorId','patientUid','eventId'].every(key=>prior[key]===reward[key]))next.caseReward=prior;
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
 window,roomId,clientKey,storage,authorization=()=>null,onSnapshot=()=>{},onError=()=>{},
 requestTimeoutMs=CLINICAL_REQUEST_TIMEOUT_MS
}){
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(roomId)||!/^[-a-zA-Z0-9]{32,120}$/.test(clientKey))
  throw Error('invalid durable cooperative credentials');
 const key='atria.v5.durable.pending:'+roomId;
 let disposed=false,current=null,epoch=-1,lastPoll=-Infinity,inflight=null,queuedMotion=null,queuedClaim=null,queuedMotionSequence=null,latestMotionSequence=0,typing=null,confirmation=null;
 const pending=new Map(),pendingHints=new Map();
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
 function accept(response){
  if(!response?.clinical||response.clinical.room?.roomId!==roomId||!Number.isSafeInteger(response.epoch))
   throw Error('invalid clinical response');
  if(response.epoch<epoch)return false;
  epoch=response.epoch;
  const previous=current?.clinical;
  current=clone(response);
  retainConfirmedRewards(current.clinical,previous);
  for(const ack of response.acknowledgements||[]){
   if(!ack||typeof ack.commandId!=='string')continue;
   const waiting=pending.get(ack.commandId);
   if(waiting){pending.delete(ack.commandId);waiting.resolve?.(clone(ack));}
  }
  const requested=response.hintRequestId,ack=response.hintAcknowledgement,waitingHint=pendingHints.get(requested);
  if(ack&&waitingHint){pendingHints.delete(requested);waitingHint.resolve?.(clone(ack));saveHints();}
  save();onSnapshot(clone(current));
  return true;
 }
 async function request(action,extra={}){
  const signal=AbortSignal.timeout(requestTimeoutMs);
  const response=await window.fetch('/api/clinical',{method:'POST',cache:'no-store',
   signal,
   headers:{'Content-Type':'application/json',...(authorization()?{Authorization:authorization()}:{})},
   body:JSON.stringify({action,clientKey,roomId,...extra})});
  let value;
  try{value=await response.json();}
  catch(error){signal.throwIfAborted();if(response.ok)throw error;value={};}
  if(!response.ok){
   const error=Error(value.error||'clinical-'+response.status);
   error.status=response.status;error.code=value.code||'unavailable';
   throw error;
  }
  return value;
 }
 // At most one in-flight mutation per browser. Server-side CAS serializes
 // actors across browsers; retained event IDs make retransmission idempotent.
 function synchronize(){
  if(disposed)return Promise.reject(Error('replica-disposed'));
  if(inflight)return inflight;
  const batch=[...pending.values()].slice(0,16).map(x=>clone(x.envelope));
  const motion=queuedMotion,motionSequence=queuedMotionSequence,claim=queuedClaim,typingState=typing,receipt=confirmation,
   hint=[...pendingHints.values()][0]?.request;
  inflight=request('sync',{commands:batch,...(hint?{hintRequest:clone(hint)}:{}),...(motion?{motion,...(motionSequence!==null?{motionSequence}:{})}:{}),
   ...(claim?{claim}:{}),...(typingState!==null?{typing:typingState}:{}),...(receipt?{confirmation:receipt}:{})})
   .then(response=>{
    if(disposed)return null;
    if(!accept(response))return null;
    // Do not discard motion on a recovering response: the server did not
    // admit new commands, movement or confirmations during catch-up.
    if(!response.recovering){
     if(queuedMotion===motion){queuedMotion=null;queuedMotionSequence=null;}
      if(queuedClaim===claim&&response.clinical?.shift?.confirmedFocusPatientUid===claim)queuedClaim=null;
     if(confirmation===receipt)confirmation=null;
    }
    return response;
   }).catch(error=>{if(!disposed)onError(error);throw error;})
   .finally(()=>{inflight=null;});
  return inflight;
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
   const busy=inflight;
   if(busy)busy.then(()=>{if(!disposed&&queuedClaim===patientUid)synchronize().catch(()=>{});},()=>{});
   else synchronize().catch(()=>{});
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
  setTyping(value){typing=!!value;},
  confirm(revision,outcomeId){confirmation={revision,outcomeId};},
  read:()=>current?clone(current.clinical):null,
  snapshotSpatial:()=>current?clone(current.spatial):null,
  lastAcknowledgedMotion(actorId){
   const receipts=current?.motionReceipts;
   if(!Array.isArray(receipts))return null; // old checkpoints remain compatible
   const ack=receipts.find(pair=>Array.isArray(pair)&&pair[0]===actorId)?.[1];
   return Number.isSafeInteger(ack)&&ack>0?ack:null;
  },
  catalog:()=>clone(current?.catalog||[]),
  monitorRead(uid){const p=current?.clinical?.patient;
   return p?.uid===uid?{uid,caseEnded:p.caseEnded,ecg:clone(p.ecg),
    procedures:clone(p.procedures),lastVitalsKnown:clone(p.lastVitalsKnown)}:null;},
  advance(){},finishNurseArrivals(){return [];},flush:()=>inflight||Promise.resolve(),
  hasSnapshot:()=>!!current,
  isRecovering:()=>!!current?.recovering,
  dispose(){
   disposed=true;
   for(const item of pending.values())item.resolve?.({status:'rejected',reason:'replica-disposed'});
   pending.clear();
   for(const h of pendingHints.values())h.resolve?.({status:'rejected',reason:'replica-disposed'});
   pendingHints.clear();
  },
 });
}
