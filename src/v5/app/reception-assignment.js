/**
 * Local reception navigation intent. No clinical rules, ownership map or
 * alternative nurse/shift clock belong here. Only the durable server can
 * accept a physical patient claim, and it may reject a race with another
 * physician even after the client reached the bedside.
 */
export function createReceptionAssignment({claim,cancelClaim}){
 if(typeof claim!=='function'||typeof cancelClaim!=='function')
  throw Error('reception intent requires durable claim and cancellation ports');
 let requested=null;
 function cancel(){
  if(requested)cancelClaim(requested.uid);
  requested=null;
 }
 function begin(uid){
  if(typeof uid!=='string'||!uid)return false;
  cancel();
  requested={uid,phase:'walking'};
  return true;
 }
 function arrive(player,inRange){
  if(requested?.phase!=='walking')return null;
  if(!player||player.moving||player.target||player.pathIndex<player.path?.length)return null;
  const uid=requested.uid;
  if(!inRange(uid)){cancel();return 'missed';}
  // Emit a single request. The backend validates real arrival and assignment.
  requested.phase='claiming';
  claim(uid);
  return 'claiming';
 }
 function observe(clinical,selfId){
  if(!requested||!clinical?.shift)return null;
  const r=clinical.shift.patients?.find(p=>p.uid===requested.uid);
  if(!r||r.closed||r.departed||r.patientDied||clinical.shift.ended){
   const uid=requested.uid;cancel();return {status:'unavailable',uid};
  }
  if(clinical.shift.mode==='competitive'&&r.ownerId&&r.ownerId!==selfId){
   const uid=requested.uid;cancel();return {status:'occupied',uid};
  }
  if(clinical.patient?.uid===requested.uid&&
   (clinical.shift.mode!=='competitive'||r.ownerId===selfId)){
   const uid=requested.uid,bedId=r.bedId;cancel();
   return {status:'assigned',uid,bedId};
  }
  return null;
 }
 return Object.freeze({begin,cancel,arrive,observe,
  status:()=>requested?{...requested}:null});
}
