import test from 'node:test';
import assert from 'node:assert/strict';
import * as rewards from './clinical-reward.js';

const identity={actorId:'a',account:{auth_user_id:'auth-a',actor_id:'a',xp:10}};
function fixture(){
 const calls=[],rows=[];
 const backend={creditedGuardRewards:async()=>{calls.push('receipts');return structuredClone(rows);},
  async award(){calls.push('award');rows.push({patient_uid:'p',event_id:'close',xp_delta:95,base_xp:100,reward_multiplier:1});},
  byAuth:async()=>{calls.push('account');return {...identity.account,xp:105};}};
 const result={claims:[['a',{actorId:'a',patientUid:'p',eventId:'close'}]],
  clinical:{caseReward:{closed:true,actorId:'a',patientUid:'p',eventId:'close',xp:95,baseXP:100,hintCount:1},
   shift:{outcomes:[{closed:true,patientUid:'p'}]}}};
 return {calls,rows,backend,result};
}

test('an open bedside command does not wait for account awards or reread the already authenticated profile',async()=>{
 assert.equal(typeof rewards.settleClinicalAccount,'function');
 const f=fixture(),result={claims:[],clinical:{patient:{uid:'p'},shift:{outcomes:[]}}};
 const account=await rewards.settleClinicalAccount(result,f.backend,identity,'room');
 assert.deepEqual(f.calls,[]);assert.equal(account,identity.account);
});

test('only an uncredited closure invokes the idempotent award and the display uses its exact persisted receipt',async()=>{
 assert.equal(typeof rewards.settleClinicalAccount,'function');
 const f=fixture();
 const account=await rewards.settleClinicalAccount(f.result,f.backend,identity,'room');
 assert.equal(account.xp,105);assert.equal(f.result.clinical.caseReward.creditStatus,'credited');
 assert.equal(f.result.clinical.caseReward.xp,95);
 f.calls.length=0;
 await rewards.settleClinicalAccount(f.result,f.backend,{...identity,account},'room');
 assert(!f.calls.includes('award'));assert(!f.calls.includes('account'));
});

test('read-only observation and temporary account failure cannot hide a committed clinical acknowledgement',async()=>{
 assert.equal(typeof rewards.settleClinicalAccount,'function');
 const f=fixture();f.result.readOnly=true;
 await rewards.settleClinicalAccount(f.result,f.backend,identity,'room');
 assert(!f.calls.includes('award'));assert.equal(f.result.clinical.caseReward.creditStatus,'pending');
 f.result.readOnly=false;f.backend.award=async()=>{throw Error('temporarily unavailable');};
 const account=await rewards.settleClinicalAccount(f.result,f.backend,identity,'room');
 assert.equal(account,identity.account);assert.equal(f.result.clinical.caseReward.creditStatus,'pending');
});

test('an attributable death is settled from the same verified account RPC instead of being lost on the no-closure fast path',async()=>{
 const calls=[];
 const result={claims:[],deaths:[{kind:'clinical.death',actorId:'a',patientUid:'p',eventId:'death'}],
  clinical:{patient:{uid:'p',patientDied:true},shift:{outcomes:[{patientUid:'p',closed:false,survived:false}]}}};
 const backend={creditedGuardReceipts:async()=>[],creditedGuardRewards:async()=>[],
  award:async()=>calls.push('award'),byAuth:async()=>({...identity.account,xp:0})};
 const account=await rewards.settleClinicalAccount(result,backend,identity,'room');
 assert.deepEqual(calls,['award']);assert.equal(account.xp,0);
 assert.deepEqual(result.clinical.deathReward,{actorId:'a',patientUid:'p',eventId:'death',creditStatus:'pending',loss:null});
});

test('death debrief shows the exact persisted debit and an uninvolved physician has no debit',async()=>{
 const result={claims:[],deaths:[{kind:'clinical.death',actorId:'a',patientUid:'p',eventId:'death'}],
  clinical:{patient:{uid:'p',patientDied:true},shift:{outcomes:[]}}};
 const rows=[{kind:'clinical.death',patient_uid:'p',event_id:'death',xp_delta:-7}];
 const backend={creditedGuardReceipts:async()=>rows,creditedGuardRewards:async()=>[],award:async()=>{throw Error('must not award twice');}};
 await rewards.settleClinicalAccount(result,backend,identity,'room');
 assert.deepEqual(result.clinical.deathReward,{actorId:'a',patientUid:'p',eventId:'death',creditStatus:'credited',loss:7});
 const colleague=structuredClone(result);colleague.deaths=[];delete colleague.clinical.deathReward;
 await rewards.settleClinicalAccount(colleague,backend,{actorId:'b',account:{auth_user_id:'auth-b'}},'room');
 assert.deepEqual(colleague.clinical.deathReward,{actorId:'b',patientUid:'p',creditStatus:'ineligible',loss:0});
});
test('an unsafe discharge debits its author while the patient is still active',async()=>{
 const penalty={kind:'clinical.unsafe-discharge',actorId:'a',patientUid:'p',eventId:'discharge'};
 const result={dischargePenalties:[penalty],clinical:{patient:{uid:'p',caseEnded:false},shift:{outcomes:[]}}};
 let awards=0;const rows=[];
 const backend={creditedGuardReceipts:async()=>rows,
  award:async()=>{awards++;rows.push({kind:penalty.kind,patient_uid:'p',event_id:penalty.eventId,xp_delta:-10});},
  byAuth:async()=>({...identity.account,xp:0})};
 const account=await rewards.settleClinicalAccount(result,backend,identity,'room');
 assert.equal(account.xp,0);
 assert.deepEqual(result.clinical.dischargeRewards,[{...penalty,creditStatus:'credited',loss:10}]);
 await rewards.settleClinicalAccount(result,backend,{...identity,account},'room');
 assert.equal(awards,1);
 const colleague={dischargePenalties:[penalty],clinical:{patient:{uid:'p'},shift:{outcomes:[]}}};
 await rewards.settleClinicalAccount(colleague,backend,{actorId:'b',account:{auth_user_id:'auth-b'}},'room');
 assert.equal(colleague.clinical.dischargeRewards,undefined);
});
