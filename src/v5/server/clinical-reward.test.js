import test from 'node:test';
import assert from 'node:assert/strict';
import {attachCreditedCaseReward} from './clinical-reward.js';

test('credits and displays the exact persisted amount after applying the guard selection factor',async()=>{
 const claim={closed:true,actorId:'a',patientUid:'p',eventId:'end',xp:93,baseXP:133,hintCount:6,hintPenaltyPercent:30,
  quality:{score:100}};
 const clinical={caseReward:claim,shift:{outcomes:[{patientUid:'p',closed:true,xp:93}]}};
 await attachCreditedCaseReward(clinical,{creditedGuardRewards:async(...binding)=>{
  assert.deepEqual(binding,['a','room']);
  return [{patient_uid:'p',event_id:'end',xp_delta:140,base_xp:133,reward_scope:'random',reward_multiplier:1.5}];
 }},'a','room');
 assert.deepEqual(clinical.caseReward,{...claim,xp:140,creditStatus:'credited',rewardScope:'random',rewardMultiplier:1.5});
 assert.equal(clinical.shift.outcomes[0].xp,140);
 assert.equal(claim.xp,93,'the claim used by the database is preserved');
});

test('a missing receipt is pending, and a rival cannot read the owner’s receipt',async()=>{
 const reward={closed:true,actorId:'a',patientUid:'p',eventId:'end',xp:0};
 const clinical={caseReward:reward};
 const store={creditedGuardRewards:async()=>[{patient_uid:'p',event_id:'other-event',xp_delta:99}]};
 await attachCreditedCaseReward(clinical,store,'a','room');
 assert.equal(clinical.caseReward.creditStatus,'pending');
 await attachCreditedCaseReward(clinical,{},'b','room');
 assert.equal(clinical.caseReward.creditStatus,'pending');
 await attachCreditedCaseReward(clinical,{creditedGuardRewards:async()=>{throw Error('temporary');}},'a','room');
 assert.equal(clinical.caseReward.creditStatus,'pending');
 await attachCreditedCaseReward(clinical,{creditedGuardRewards:async()=>[{patient_uid:'p',event_id:'end',xp_delta:0}]},'a','room');
 assert.equal(clinical.caseReward.creditStatus,'credited');
 assert.equal(clinical.caseReward.xp,0);
});

test('previously settled patients retain the same amount after selecting another patient',async()=>{
 const clinical={shift:{outcomes:[{patientUid:'p',closed:true,xp:93},{patientUid:'q',closed:true,xp:40}]}};
 await attachCreditedCaseReward(clinical,{creditedGuardRewards:async()=>[
  {patient_uid:'p',event_id:'end',xp_delta:140},{patient_uid:'q',event_id:'end2',xp_delta:60}
 ]},'a','room');
 assert.deepEqual(clinical.shift.outcomes.map(x=>x.xp),[140,60]);
});

test('competitive scores show the credited amount for each owner without exposing private hint details',async()=>{
 const outcomes=[{closed:true,ownerId:'a',patientUid:'p',xp:128},{closed:true,ownerId:'b',patientUid:'q',xp:90}];
 const clinical={competition:{outcomes},shift:{outcomes}};
 const backend={creditedGuardRewards:async()=>[],creditedRoomScores:async room=>{
  assert.equal(room,'room');return [{actor_id:'a',patient_uid:'p',xp_delta:192}];
 }};
 await attachCreditedCaseReward(clinical,backend,'b','room');
 assert.deepEqual(outcomes.map(({xp,creditStatus})=>[xp,creditStatus]),[[192,'credited'],[0,'pending']]);
});
