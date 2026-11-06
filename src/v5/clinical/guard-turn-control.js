import {SHIFT_DURATION_SECONDS} from './shift-flow.js';

const clone=value=>structuredClone(value);
const operations=new Set(['continue','leave','resume']);
const validId=value=>typeof value==='string'&&value.length>0&&value.length<=160;

/** Persisted turn decisions around the existing shift clock, never a second
 * clinical clock. Disconnects do not remove a required vote: only an explicit
 * leave does. Resume rejoins without voting. No control creates clinical or XP
 * receipts, and every request ID remains bound to its actor and original body.
 *
 * Public view: {id,number,status:'active'|'decision'|'paused',durationSeconds,
 * startedAtSeconds,elapsedSeconds,remainingSeconds,participantIds,continuedIds,
 * leftIds,requiredIds,actor:{participating,continued},canContinue,canLeave,canResume}.
 */
export function createGuardTurnControl({roomId,members,shift,snapshot=null}){
 const memberIds=members.map(member=>member.id),memberSet=new Set(memberIds);
 let number=snapshot?.number??shift.duration()/SHIFT_DURATION_SECONDS;
 const participants=new Set(snapshot?.participantIds??memberIds),continued=new Set(snapshot?.continuedIds??[]);
 const receipts=new Map();
 const turnId=()=>roomId+':turn-'+number;
 const validMembers=ids=>Array.isArray(ids)&&new Set(ids).size===ids.length&&ids.every(id=>memberSet.has(id));
 if(snapshot&&(snapshot.version!==1||!Number.isSafeInteger(number)||number<1||
   number*SHIFT_DURATION_SECONDS!==shift.duration()||!validMembers(snapshot.participantIds)||
   !validMembers(snapshot.continuedIds)||snapshot.continuedIds.some(id=>!participants.has(id))||
   !Array.isArray(snapshot.receipts)))throw Error('invalid guard turn checkpoint');
 for(const entry of snapshot?.receipts??[]){
  if(!entry||!memberSet.has(entry.actorId)||!validId(entry.requestId)||!validId(entry.turnId)||
   !operations.has(entry.op)||!['accepted','rejected'].includes(entry.result?.status)||
   entry.result.requestId!==entry.requestId||entry.result.turnId!==entry.turnId||entry.result.op!==entry.op)
   throw Error('invalid guard turn receipt');
  const key=JSON.stringify([entry.actorId,entry.requestId]);
  if(receipts.has(key))throw Error('duplicate guard turn receipt');
  receipts.set(key,clone(entry));
 }
 function transition(){
  if(!shift.ended()||!participants.size||![...participants].every(id=>continued.has(id)))return false;
  if(!shift.extend())return false;
  number++;continued.clear();return true;
 }
 return Object.freeze({
  participating:actorId=>participants.has(actorId),
  running:()=>participants.size>0&&!shift.ended(),
  control(actorId,request){
   const {op,requestId,turnId:requestedTurnId}=request??{};
   const result={status:'rejected',op,requestId,turnId:requestedTurnId};
   if(!memberSet.has(actorId))return {...result,reason:'shift-forbidden'};
   if(!operations.has(op)||!validId(requestId)||!validId(requestedTurnId))return {...result,reason:'invalid-shift-control'};
   const key=JSON.stringify([actorId,requestId]),prior=receipts.get(key);
   if(prior)return prior.op===op&&prior.turnId===requestedTurnId?clone(prior.result):{...result,reason:'shift-request-conflict'};
   if(requestedTurnId!==turnId())result.reason='shift-turn-changed';
   else if(op==='continue'){
    if(!participants.has(actorId))result.reason='shift-member-left';
    else if(!shift.ended())result.reason='shift-not-ended';
    else{continued.add(actorId);result.status='accepted';}
   }else if(op==='leave'){
    participants.delete(actorId);continued.delete(actorId);result.status='accepted';
   }else{
    participants.add(actorId);result.status='accepted';
   }
   if(result.status==='accepted'&&transition())result.nextTurnId=turnId();
   receipts.set(key,clone({actorId,op,requestId,turnId:requestedTurnId,result}));
   return clone(result);
  },
  view(actorId){
   const participating=participants.has(actorId),voted=continued.has(actorId),startedAtSeconds=(number-1)*SHIFT_DURATION_SECONDS;
   return {id:turnId(),number,status:!participants.size?'paused':shift.ended()?'decision':'active',
    durationSeconds:SHIFT_DURATION_SECONDS,startedAtSeconds,elapsedSeconds:Math.max(0,shift.elapsed()-startedAtSeconds),
    remainingSeconds:shift.remaining(),participantIds:memberIds.filter(id=>participants.has(id)),
    continuedIds:memberIds.filter(id=>continued.has(id)),leftIds:memberIds.filter(id=>!participants.has(id)),
    requiredIds:memberIds.filter(id=>participants.has(id)&&!continued.has(id)),
    actor:{participating,continued:voted},canContinue:participating&&shift.ended()&&!voted,
    canLeave:participating,canResume:memberSet.has(actorId)&&!participating};
  },
  checkpoint:()=>clone({version:1,number,participantIds:[...participants],continuedIds:[...continued],receipts:[...receipts.values()]})
 });
}
