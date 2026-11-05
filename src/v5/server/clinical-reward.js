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
