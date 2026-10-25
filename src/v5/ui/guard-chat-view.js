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
/** Preview only. A confirmed server turn always replaces its fast preview.
 * Unconfirmed remote speech expires; a different patient's view cannot
 * keep echoing the prior actor after a selection changes. */
export function pruneWardSpeechPreviews(previews,{rows,scene,self,navigation,now}){
 const ids=new Set(rows.map(row=>row.id));
 for(const [id,p] of previews)
  if(ids.has(id)||now-p.time>15000||
    !canHearWardDoctor(scene,p.actorId,self,navigation))previews.delete(id);
}
