// Storage adapter for the existing local owners. No offline elapsed-time
// catch-up: a closed document pauses its simulation, it never rewrites clocks.
export function scopedStorage(storage,scope=''){
 if(!scope)return storage;
 if(!/^[a-z0-9.-]{1,100}$/i.test(scope))throw Error('invalid local storage scope');
 const key=name=>'atria.scope.'+scope+':'+name;
 return Object.freeze({getItem:name=>storage.getItem(key(name)),
  setItem:(name,value)=>storage.setItem(key(name),value),removeItem:name=>storage.removeItem(key(name))});
}
export function createLocalGuardStore({storage,buildId='modular-v5',now=()=>new Date().toISOString()}){
 if(typeof buildId!=='string'||!buildId||buildId.length>160)throw Error('invalid local build identity');
 const key='atria.v5.local-guard.v1:'+buildId;
 function validate(record){
  if(record?.schemaVersion!==1||record.buildId!==buildId||!['solo','apprentice'].includes(record.mode)||
   !record.roomId||!record.world||!record.admissions||!record.shift||!record.progress||!Array.isArray(record.sessions)||
   !record.sessions.length||record.sessions.length>6)throw Error('invalid local guard checkpoint');
  const ids=new Set();
  for(const checkpoint of record.sessions){
   const uid=checkpoint.patient?.uid;
   if(!uid||ids.has(uid)||checkpoint.roomId!==record.roomId||checkpoint.mode!==record.mode||
    !record.admissions.records.some(r=>r.uid===uid&&r.caseId===checkpoint.patient.caseId)||
    !record.world.state.patients.some(p=>p.uid===uid))throw Error('local guard checkpoint patient mismatch');
   ids.add(uid);
   // Local sessions share one career ledger. A torn save must not replace
   // the one ledger with a different balance from a per-patient snapshot.
   if(JSON.stringify(checkpoint.progress)!==JSON.stringify(record.progress))throw Error('local guard checkpoint ledger mismatch');
  }
  if(!ids.has(record.focusedUid)||record.world.state.mode!==record.mode||record.world.state.phase!=='guard')
   throw Error('local guard checkpoint focus/mode mismatch');
  return record;
 }
 return Object.freeze({
  read(){const text=storage.getItem(key);return text?structuredClone(validate(JSON.parse(text))):null;},
  save(record){const value=validate({...structuredClone(record),schemaVersion:1,buildId,savedAt:now()});
   storage.setItem(key,JSON.stringify(value));return structuredClone(value);},
  clear:()=>storage.removeItem(key),key
 });
}
