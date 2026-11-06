import {finalNurseMessage} from './guard-message-policy.js';

const validId=value=>typeof value==='string'&&value.length>0;
const messageKey=(patientUid,id)=>validId(patientUid)&&validId(id)?JSON.stringify([patientUid,id]):null;

// Presentation memory only. Seed once from the initial authorized snapshot;
// later live rows use has/mark, so a new clinical receipt can still sound once.
// Both scope and patient UID belong to the key: native row IDs may recur at
// another patient, and neither persisted sound state nor a peer is authority.
export function createGuardSpeechMemory({storage}={}){
 const storageKey='atria.v5.guard-speech-memory';
 const scopes=new Map();let seen=new Set();
 try{
  const saved=JSON.parse(storage?.getItem(storageKey)||'null');
  if(saved?.version===1&&Array.isArray(saved.scopes))for(const entry of saved.scopes)
   if(Array.isArray(entry)&&typeof entry[0]==='string'&&Array.isArray(entry[1]))
    scopes.set(entry[0],new Set(entry[1].filter(value=>typeof value==='string')));
 }catch{/* Browser sound memory is optional. */}
 function save(){
  try{storage?.setItem(storageKey,JSON.stringify({version:1,scopes:[...scopes].map(([scope,ids])=>[scope,[...ids]])}));}catch{}
 }
 function add(patientUid,id){
  const key=messageKey(patientUid,id);
  if(!key||seen.has(key))return false;
  seen.add(key);return true;
 }
 return Object.freeze({
  seed(clinical,roomId,actorId){
   const scope=JSON.stringify([roomId,actorId]);
   if(!scopes.has(scope))scopes.set(scope,new Set());
   seen=scopes.get(scope);
   const patientUid=clinical?.patient?.uid;
   for(const row of clinical?.messages||[])add(patientUid,row.id);
   const farewell=finalNurseMessage(clinical);
   if(farewell)add(patientUid,farewell.id);
   for(const row of clinical?.communication?.activity||[]){
    if(!validId(row.patientUid)||!validId(row.id))continue;
    const prefix=row.patientUid+':activity:';
    if(!row.id.startsWith(prefix))continue;
    add(row.patientUid,row.id.slice(prefix.length));
    if(row.kind==='disposition'&&validId(row.eventId))
     add(row.patientUid,'nurse-final:'+row.patientUid+':'+row.eventId);
   }
   save();
  },
  has(patientUid,id){const key=messageKey(patientUid,id);return !!key&&seen.has(key);},
  mark(patientUid,id){const fresh=add(patientUid,id);if(fresh)save();return fresh;}
 });
}
