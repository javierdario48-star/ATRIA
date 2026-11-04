import {canHearWardDoctor,canHearWardPatient} from './spatial-ward-speech.js';
import {publicClinicalText} from './guard-message-policy.js';
/** Contextual, read-only chat projection. No clinical side effects or
 * transport replay. Never mix another patient's native transcript. */
export function visibleWardChatRows({clinicalState,scene,self,roomId,navigation}){
 const messages=clinicalState?.messages||[];
 const nearBed=canHearWardPatient(scene,clinicalState?.patient?.uid,navigation);
 const ids=new Set();
 const rows=[];
 for(const row of messages.slice(-300)){
  if(roomId){
   const heard=row.role==='player'
    ?canHearWardDoctor(scene,row.actorId,self,navigation):nearBed;
   if(!heard)continue;
  }
  const key=String(row.id||'');
  if(key&&ids.has(key))continue;
  if(key)ids.add(key);
  rows.push({...row,text:publicClinicalText(row.text)});
 }
 return rows;
}

// Acoustics decide which new lines are audible. Confirmed history keeps the
// lines already heard and the authenticated physician's own command replies.
export function createWardChatHistory({storage}={}){
 const storageKey='atria.v5.ward-chat-history';
 let scope=null,patients=new Map();
 return Object.freeze({
  read(args,audible=visibleWardChatRows(args)){
   const {clinicalState,roomId,self}=args,uid=clinicalState?.patient?.uid;
   if(!roomId||!self||!uid)return audible;
   const key=JSON.stringify([roomId,self]);
   if(scope!==key){
    scope=key;patients.clear();
    try{
     const saved=JSON.parse(storage?.getItem(storageKey)||'null');
     if(saved?.scope===scope)patients=new Map(saved.patients);
    }catch{/* The authoritative transcript remains available. */}
   }
   const previous=patients.get(uid)||[],visible=new Map(audible.map(row=>[row.id,row]));
   const retained=new Map(previous.map(row=>[row.id,row]));
   const incoming=clinicalState.messages||[],ids=new Set(incoming.map(row=>row.id));
   const rows=new Map(previous.filter(row=>!ids.has(row.id)).map(row=>[row.id,row]));
   for(const row of incoming){
    const current=visible.get(row.id)||retained.get(row.id)||
     (row.actorId===self?{...row,text:publicClinicalText(row.text)}:null);
    if(current)rows.set(row.id,current);
   }
   const history=[...rows.values()].slice(-300);
   if(history.length!==previous.length||history.some((row,i)=>row.id!==previous[i]?.id||row.text!==previous[i]?.text)){
    patients.delete(uid);patients.set(uid,history);
    while(patients.size>8)patients.delete(patients.keys().next().value);
    try{storage?.setItem(storageKey,JSON.stringify({scope,patients:[...patients]}));}catch{/* Optional browser history. */}
   }
   return history;
  }
 });
}
/** Preview only. A confirmed server turn always replaces its fast preview.
 * Unconfirmed remote speech expires; a different patient's view cannot
 * keep echoing the prior actor after a selection changes. */
export function pruneWardSpeechPreviews(previews,{rows,scene,self,navigation,now}){
 const ids=new Set(rows.map(row=>row.id));
 for(const [id,p] of previews)
  if(ids.has(id)||now-p.time>15000||
    !canHearWardDoctor(scene,p.actorId,self,navigation))previews.delete(id);
}
