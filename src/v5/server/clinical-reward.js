// The native claims remain suitable for the award RPC. The player's debrief
// and shift total use the account receipts after the RPC applies its modifiers.
export async function attachCreditedCaseReward(clinical,backend,actorId,roomId){
 const reward=clinical.caseReward;
 const ownCase=reward?.closed&&reward.actorId===actorId&&reward.creditStatus!=='ineligible';
 const outcomes=(clinical.shift?.outcomes||[]).filter(row=>row.closed);
 if(!ownCase&&!outcomes.length)return;
 if(ownCase)clinical.caseReward={...reward,creditStatus:'pending'};
 // A lookup can be retried on the next sync without hiding a committed closure.
 const [rows,scores]=await Promise.all([
  backend.creditedGuardRewards(actorId,roomId).catch(()=>[]),
  clinical.competition?backend.creditedRoomScores(roomId).catch(()=>[]):[]
 ]);
 const credits=new Map(rows.map(row=>[row.patient_uid,row]));
 const roomScores=new Map(scores.map(row=>[JSON.stringify([row.actor_id,row.patient_uid]),row]));
 for(const outcome of [...outcomes,...(clinical.competition?.outcomes||[]).filter(row=>row.closed)]){
  const row=clinical.competition?roomScores.get(JSON.stringify([outcome.ownerId,outcome.patientUid])):credits.get(outcome.patientUid);
  outcome.xp=row?.xp_delta??0;
  outcome.creditStatus=row?'credited':'pending';
 }
 const credited=ownCase&&credits.get(reward.patientUid);
 if(credited&&credited.event_id===reward.eventId)clinical.caseReward={...reward,creditStatus:'credited',xp:credited.xp_delta,
  baseXP:credited.base_xp??reward.baseXP,rewardScope:credited.reward_scope,
  rewardMultiplier:credited.reward_multiplier??1};
}

// Clinical confirmation must not depend on a second accounting round trip.
// The existing award RPC remains the only XP writer, retried by the same
// durable claim until its private receipt exists. An outage leaves XP pending.
export async function settleClinicalAccount(result,backend,identity,roomId){
 const clinical=result.clinical,actorId=identity.actorId;
 const discharges=(result.dischargePenalties||[]).filter(p=>p.actorId===actorId);
 const claims=[...(result.claims||[]).map(([,claim])=>claim),...(result.deaths||[]),...discharges].filter(claim=>claim.actorId===actorId);
 const death=clinical.patient?.patientDied&&claims.find(claim=>claim.kind==='clinical.death'&&claim.patientUid===clinical.patient.uid);
 if(clinical.patient?.patientDied)clinical.deathReward=death?
  {actorId,patientUid:death.patientUid,eventId:death.eventId,creditStatus:'pending',loss:null}:
  {actorId,patientUid:clinical.patient.uid,creditStatus:'ineligible',loss:0};
 const hasClosed=claims.length||clinical.caseReward?.closed||(clinical.shift?.outcomes||[]).some(row=>row.closed);
 if(!hasClosed)return identity.account;
 const readReceipts=()=>backend.creditedGuardReceipts?backend.creditedGuardReceipts(actorId,roomId):backend.creditedGuardRewards(actorId,roomId);
 let rows=await readReceipts().catch(()=>[]),account=identity.account;
 const credited=new Set(rows.map(row=>JSON.stringify([row.patient_uid,row.event_id])));
 if(!result.readOnly&&claims.some(claim=>!credited.has(JSON.stringify([claim.patientUid,claim.eventId])))){
  try{
   await backend.award(actorId,roomId);
   [rows,account]=await Promise.all([
    readReceipts().catch(()=>[]),
    backend.byAuth(identity.account.auth_user_id).catch(()=>identity.account)
   ]);
  }catch{/* The clinical commit and its ACK stay valid; next sync retries XP. */}
 }
 await attachCreditedCaseReward(clinical,{...backend,creditedGuardRewards:async()=>rows.filter(row=>!row.kind||row.kind==='clinical.closure')},actorId,roomId);
 const debit=death&&rows.find(row=>row.kind==='clinical.death'&&row.patient_uid===death.patientUid&&row.event_id===death.eventId);
 if(debit)clinical.deathReward={...clinical.deathReward,creditStatus:'credited',loss:Math.max(0,-debit.xp_delta)};
 if(discharges.length)clinical.dischargeRewards=discharges.map(({kind,actorId,patientUid,eventId})=>{
  const debit=rows.find(row=>row.kind===kind&&row.patient_uid===patientUid&&row.event_id===eventId);
  return {kind,actorId,patientUid,eventId,creditStatus:debit?'credited':'pending',loss:debit?Math.max(0,-debit.xp_delta):null};
 });
 return account;
}
