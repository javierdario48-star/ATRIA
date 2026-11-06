import test from 'node:test';
import assert from 'node:assert/strict';
import {accountGatewayFixture} from '../../../qa/v5/account-fixture.mjs';

async function account(f,index){
 const registered=await f.request('account/register',{username:'recovery_'+index,name:'Doctora Recuperación '+index,
  password:'safe-test-password-123',clientKey:('recovery-device-'+index+'-').repeat(4)});
 assert.equal(registered.status,200);
 const row=[...f.rows.values()].find(row=>row.actor_id===registered.body.account.actorId),
  headers={cookie:registered.cookies.map(row=>row.split(';')[0]).join('; ')},
  sid=[...f.sessions.values()].find(session=>session.userId===row.auth_user_id).sessionId;
 return {row,headers,sid};
}

test('an authenticated account session reconciles a missing active guard instead of advertising a phantom recovery',async()=>{
 const f=accountGatewayFixture();
 f.bindGuardStore({read:async()=>null});
 const registered=await f.request('account/register',{username:'recovery_doctor',name:'Doctora Recuperación',
  password:'safe-test-password-123',clientKey:'recovery-device-'.repeat(4)});
 assert.equal(registered.status,200);
 const headers={cookie:registered.cookies.map(row=>row.split(';')[0]).join('; ')},
  row=[...f.rows.values()][0];
 row.active_guard_id='missing-guard';row.controller_session_id=[...f.sessions.values()][0].sessionId;
 row.xp=450;row.cases_resolved=4;
 const result=await f.request('account/session',undefined,headers);
 assert.equal(result.status,200);
 assert.equal(result.body.account.activeGuardId,null,'a nonexistent guard cannot offer Retomar or Finalizar');
 assert.equal(row.active_guard_id,null,'the stale reference is reconciled persistently');
 assert.equal(result.body.account.xp,450);assert.equal(result.body.account.casesResolved,4);
});

for(const mode of ['solo','coop','competitive'])test(mode+' valid, saved and ended-turn guards remain recoverable without changing controller or clinical data',async()=>{
 const f=accountGatewayFixture(),a=await account(f,1),b=await account(f,2);
 const value={runtime:{mode,members:[{id:a.row.actor_id},{id:b.row.actor_id}],
  turn:{participantIds:[b.row.actor_id]},shift:{elapsedSeconds:1440,durationSeconds:1440},
  patients:[{uid:'original-patient',orders:[{id:'cbc',status:'pending'}],treatments:[{id:'existing-dose'}],messages:['original-answer']}]}};
 f.bindGuardStore({read:async id=>id==='existing-guard'?{etag:'1',value}:null});
 a.row.active_guard_id='existing-guard';a.row.controller_session_id='original-device';
 const before=structuredClone({value,a:a.row,b:b.row});
 const result=await f.request('account/session',undefined,a.headers);
 assert.equal(result.status,200);assert.equal(result.body.account.activeGuardId,'existing-guard');
 assert.deepEqual(result.body.account.guardRecovery,{status:'available',roomId:'existing-guard',mode,turnEnded:true,participating:false});
 assert.deepEqual({value,a:a.row,b:b.row},before,'inspection neither transfers control nor changes either physician or the guard');
 const transfer=await f.request('account/take-control',{roomId:'existing-guard'},a.headers);
 assert.equal(transfer.status,200);assert.equal(a.row.controller_session_id,a.sid);
 const released=await f.request('account/release-guard',{roomId:'existing-guard'},a.headers);
 assert.equal(released.status,200);assert.equal(a.row.active_guard_id,null);
 assert.deepEqual(value,before.value);assert.deepEqual(b.row,before.b);
});

test('both accounts reconcile their own stale references without releasing another doctor',async()=>{
 const f=accountGatewayFixture(),a=await account(f,1),b=await account(f,2);
 f.bindGuardStore({read:async()=>null});
 for(const [index,person] of [a,b].entries()){
  person.row.active_guard_id='missing-'+index;person.row.controller_session_id=person.sid;
  person.row.xp=133+index;person.row.cases_resolved=index+1;
 }
 const untouched=structuredClone(b.row);
 assert.equal((await f.request('account/session',undefined,a.headers)).body.account.activeGuardId,null);
 assert.deepEqual(b.row,untouched);
 assert.equal((await f.request('account/session',undefined,b.headers)).body.account.activeGuardId,null);
 assert.equal(a.row.xp,133);assert.equal(b.row.xp,134);assert.equal(f.released.size,0);
});

test('a delayed action for another guard cannot transfer or release the current one',async()=>{
 const f=accountGatewayFixture(),a=await account(f,1),value={runtime:{mode:'solo',members:[{id:a.row.actor_id}],turn:{participantIds:[]}}};
 f.bindGuardStore({read:async()=>({etag:'1',value})});a.row.active_guard_id='new-guard';a.row.controller_session_id='another-device';
 for(const action of ['take-control','release-guard']){
  const result=await f.request('account/'+action,{roomId:'old-guard',actorId:'someone-else'},a.headers);
  assert.equal(result.status,409);assert.equal(a.row.active_guard_id,'new-guard');assert.equal(a.row.controller_session_id,'another-device');
 }
 assert.equal(f.released.size,0);
});

test('a temporary database failure never turns an existing reference into a missing guard',async()=>{
 const f=accountGatewayFixture(),a=await account(f,1);
 f.bindGuardStore({read:async()=>{throw Error('temporary database failure');}});
 a.row.active_guard_id='existing-guard';a.row.controller_session_id=a.sid;
 const result=await f.request('account/session',undefined,a.headers);
 assert.equal(result.status,503);assert.equal(a.row.active_guard_id,'existing-guard');assert.equal(f.released.size,0);
});

test('release requires the native authority to record leave before the account is detached',async()=>{
 const f=accountGatewayFixture(),a=await account(f,1);
 f.bindGuardStore({read:async()=>({etag:'1',value:{runtime:{mode:'coop',members:[{id:a.row.actor_id}],turn:{participantIds:[a.row.actor_id]}}}})});
 a.row.active_guard_id='existing-guard';a.row.controller_session_id=a.sid;
 assert.equal((await f.request('account/release-guard',{roomId:'existing-guard'},a.headers)).status,409);
 assert.equal(a.row.active_guard_id,'existing-guard');assert.equal(f.released.size,0);
});

for(const scenario of ['released','not-member','unreadable'])test(scenario+' recovery uses authoritative membership without changing the guard',async()=>{
 const f=accountGatewayFixture(),a=await account(f,1),value={runtime:{mode:'coop',
  ...(scenario==='unreadable'?{}:{members:scenario==='not-member'?[{id:'other-doctor'}]:[{id:a.row.actor_id}]}),
  turn:{participantIds:[]},clinicalSentinel:['patient','dose','conversation']}};
 f.bindGuardStore({read:async()=>({etag:'1',value})});a.row.active_guard_id='existing';a.row.controller_session_id=a.sid;
 if(scenario==='released')f.released.add(JSON.stringify([a.row.actor_id,'existing']));
 const before=structuredClone(value),result=await f.request('account/session',undefined,a.headers);
 assert.equal(result.status,200);assert.deepEqual(value,before);
 assert.equal(a.row.active_guard_id,scenario==='unreadable'?'existing':null);
 assert.equal(result.body.account.guardRecovery.status,scenario==='unreadable'?'unavailable':'none');
});

test('logging in on another device reconciles a missing guard before offering the recovered account',async()=>{
 const f=accountGatewayFixture(),a=await account(f,1);f.bindGuardStore({read:async()=>null});
 a.row.active_guard_id='missing';a.row.controller_session_id=a.sid;
 const result=await f.request('account/login',{name:a.row.name,password:'safe-test-password-123'});
 assert.equal(result.status,200);assert.equal(result.body.account.activeGuardId,null);
 assert.equal(a.row.active_guard_id,null);assert.equal(f.released.size,0);
});

test('a cookie switched to a colleague cannot transfer or release that colleague in the same shared guard',async()=>{
 const f=accountGatewayFixture(),a=await account(f,1),b=await account(f,2),
  value={runtime:{mode:'coop',members:[{id:a.row.actor_id},{id:b.row.actor_id}],turn:{participantIds:[]}}};
 f.bindGuardStore({read:async()=>({etag:'1',value})});
 for(const person of [a,b]){person.row.active_guard_id='shared';person.row.controller_session_id='previous-device';}
 const before=structuredClone([a.row,b.row]);
 for(const action of ['take-control','release-guard']){
  const result=await f.request('account/'+action,{roomId:'shared',expectedActorId:a.row.actor_id},b.headers);
  assert.equal(result.status,409);assert.deepEqual([a.row,b.row],before);assert.equal(f.released.size,0);
 }
 assert.equal((await f.request('account/take-control',{roomId:'shared',expectedActorId:b.row.actor_id},b.headers)).status,200);
});
