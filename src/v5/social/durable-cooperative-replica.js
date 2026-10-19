/**
 * C5.b.3 client transport. It does not create a GuardSession, progress clock,
 * dispense a drug, or make a second clinical authority in the browser.
 * The server is the only writer. A caller drives maintain() from the existing
 * animation frame; no timers or new scheduling loops are added.
 */
export function createDurableCooperativeReplica({
 window,roomId,clientKey,storage,authorization=()=>null,onSnapshot=()=>{},onError=()=>{}
}){
 if(!/^[A-Za-z0-9_-]{1,100}$/.test(roomId)||!/^[-a-zA-Z0-9]{32,120}$/.test(clientKey))
  throw Error('invalid durable cooperative credentials');
 const key='atria.v5.durable.pending:'+roomId;
 let disposed=false,current=null,epoch=-1,lastPoll=-Infinity,inflight=null,queuedMotion=null,typing=null,confirmation=null;
 const pending=new Map();
 const clone=x=>structuredClone(x);
 function save(){try{storage?.setItem(key,JSON.stringify([...pending.values()].map(x=>x.envelope)));}catch{}}
 try{
  const retained=JSON.parse(storage?.getItem(key)||'[]');
  if(Array.isArray(retained))for(const envelope of retained)
   if(typeof envelope?.id==='string'&&typeof envelope?.text==='string'&&!pending.has(envelope.id))
    pending.set(envelope.id,{envelope:clone(envelope),resolve:null});
 }catch{}
 function accept(response){
  if(!response?.clinical||response.clinical.room?.roomId!==roomId||!Number.isSafeInteger(response.epoch)
   ||response.epoch<epoch)return false;
  epoch=response.epoch;
  current=clone(response);
  for(const ack of response.acknowledgements||[]){
   if(!ack||typeof ack.commandId!=='string')continue;
   const waiting=pending.get(ack.commandId);
   if(waiting){pending.delete(ack.commandId);waiting.resolve?.(clone(ack));}
  }
  save();onSnapshot(clone(current));
  return true;
 }
 async function request(action,extra={}){
  const response=await window.fetch('/api/clinical',{method:'POST',cache:'no-store',
   headers:{'Content-Type':'application/json',...(authorization()?{Authorization:authorization()}:{})},
   body:JSON.stringify({action,clientKey,roomId,...extra})});
  let value;try{value=await response.json();}catch{value={};}
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
  const motion=queuedMotion,typingState=typing,receipt=confirmation;
  inflight=request('sync',{commands:batch,...(motion?{motion}:{}),
   ...(typingState!==null?{typing:typingState}:{}),...(receipt?{confirmation:receipt}:{})})
   .then(response=>{
    if(disposed)return null;
    accept(response);
    // Do not discard motion on a recovering response: the server did not
    // admit new commands, movement or confirmations during catch-up.
    if(!response.recovering){
     if(queuedMotion===motion)queuedMotion=null;
     if(confirmation===receipt)confirmation=null;
    }
    return response;
   }).catch(error=>{if(!disposed)onError(error);throw error;})
   .finally(()=>{inflight=null;});
  return inflight;
 }
 return Object.freeze({
  async start(caseId){
   if(disposed)throw Error('replica-disposed');
   try{const response=await request('start',{caseId});accept(response);return response;}
   catch(error){
    // A successful start with a lost HTTP response can return 'exists';
    // only the authenticated durable roster can recover this room.
    if(error.status===409&&error.code==='exists')return synchronize();
    throw error;
   }
  },
  sync:synchronize,
  maintain(now){
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
    synchronize().catch(()=>{/* on next RAF retry same id */});
   });
  },
  motion(target){
   if(!Array.isArray(target)||target.length!==2||!target.every(Number.isFinite))return false;
   queuedMotion=clone(target);return true;
  },
  setTyping(value){typing=!!value;},
  confirm(revision,outcomeId){confirmation={revision,outcomeId};},
  read:()=>current?clone(current.clinical):null,
  catalog:()=>clone(current?.catalog||[]),
  monitorRead(uid){const p=current?.clinical?.patient;
   return p?.uid===uid?{uid,caseEnded:p.caseEnded,ecg:clone(p.ecg),
    procedures:clone(p.procedures),lastVitalsKnown:clone(p.lastVitalsKnown)}:null;},
  advance(){},finishNurseArrivals(){return [];},flush:()=>inflight||Promise.resolve(),
  hasSnapshot:()=>!!current,
  isRecovering:()=>!!current?.recovering,
  dispose(){disposed=true;pending.clear();},
 });
}
