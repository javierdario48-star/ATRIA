// A network view of the sole host clinical session. Never instantiates a case
// executor, advances clinical time or creates a medication/XP receipt.
export function createCooperativeReplica({roomId,hostId,send,storage,onSnapshot=()=>{}}){
 let current=null,sequence=-1,disposed=false,lastSend=-Infinity;const pendingHints=new Map(),pending=new Map(),key='atria.v5.coop.pending:'+roomId;
 const save=()=>{try{storage?.setItem(key,JSON.stringify([...pending.values()].map(x=>x.envelope)));}catch{}};
 try{for(const envelope of JSON.parse(storage?.getItem(key)||'[]'))pending.set(envelope.id,{envelope,resolve:()=>{}});}catch{}
 return Object.freeze({
  apply(packet){
   if(disposed)return false;
   if(packet.kind==='hint.ack'&&packet.roomId===roomId){const waiting=pendingHints.get(packet.requestId);if(!waiting)return false;pendingHints.delete(packet.requestId);waiting.resolve(structuredClone(packet.ack));return true;}
   if(packet.kind==='ack'&&packet.ack?.roomId===roomId){const request=pending.get(packet.ack.commandId);
    if(request){pending.delete(packet.ack.commandId);save();request.resolve(structuredClone(packet.ack));}return !!request;}
   if(packet.kind!=='state'||packet.roomId!==roomId||!Number.isSafeInteger(packet.sequence)||packet.sequence<=sequence||
    packet.clinical?.room?.roomId!==roomId||!packet.clinical?.patient?.uid||
    current&&current.clinical.patient.uid!==packet.clinical.patient.uid)return false;
   sequence=packet.sequence;current=structuredClone(packet);onSnapshot(current);return true;
  },
  hintBinding:()=>current?structuredClone(current.clinical.hintBinding):null,
  hint(request){if(disposed)return Promise.reject(Error('replica-disposed'));return new Promise(resolve=>{pendingHints.set(request.requestId,{request:structuredClone(request),resolve});send(hostId,{kind:'hint.request',request});});},
  post(envelope){if(disposed)return Promise.reject(Error('replica-disposed'));
   return new Promise(resolve=>{pending.set(envelope.id,{envelope:structuredClone(envelope),resolve});save();send(hostId,{kind:'command',envelope});});},
  maintain(now){if(disposed||now-lastSend<1500)return;lastSend=now;for(const p of pending.values())send(hostId,{kind:'command',envelope:p.envelope});for(const h of pendingHints.values())send(hostId,{kind:'hint.request',request:h.request});},
  read:()=>current?structuredClone(current.clinical):null,
  catalog:()=>structuredClone(current?.catalog||[]),
  monitorRead(uid){const p=current?.clinical.patient;return p?.uid===uid?{uid,caseEnded:p.caseEnded,ecg:structuredClone(p.ecg),procedures:structuredClone(p.procedures),lastVitalsKnown:structuredClone(p.lastVitalsKnown)}:null;},
  advance(){},finishNurseArrivals(){return [];},flush:()=>Promise.resolve(),
  dispose(){disposed=true;pending.clear();for(const h of pendingHints.values())h.resolve({status:'rejected',reason:'replica-disposed'});pendingHints.clear();}
 });
}
