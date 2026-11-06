import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseAccountStore} from './supabase-account-store.js';
const config={url:'https://testproject.supabase.co',secretKey:'sb_secret_test'};
const token='header.'+Buffer.from(JSON.stringify({exp:Date.now()/1000+3600,sub:'auth-a',session_id:'session-a'})).toString('base64url')+'.signature';
test('guard reconciliation calls the private atomic RPC with the verified doctor, session and expected room',async()=>{
 const store=createSupabaseAccountStore({...config,fetchImpl:async(url,options)=>{
  assert.equal(url.pathname,'/rest/v1/rpc/atria_v5_guard_recovery');assert.equal(options.method,'POST');
  assert.deepEqual(JSON.parse(options.body),{p_actor_id:'doctor-a',p_session_id:'session-a',p_operation:'take-control',p_room_id:'guard-a'});
  return {ok:true,text:async()=>JSON.stringify({status:'available',roomId:'guard-a',mode:'coop'})};
 }});
 assert.deepEqual(await store.guardRecovery('doctor-a','session-a','take-control','guard-a'),{status:'available',roomId:'guard-a',mode:'coop'});
});
test('a revoked Auth user response is unauthorized so the gateway can clear the expired cookie',async()=>{
 const store=createSupabaseAccountStore({...config,fetchImpl:async()=>({ok:false,status:403,text:async()=>JSON.stringify({code:'session_not_found'})})});
 await assert.rejects(()=>store.validateSession({access_token:token,refresh_token:'refresh-a'}),{status:401});
});
test('Auth outages remain retryable and name collisions remain conflicts',async()=>{
 let status=503,body={};const store=createSupabaseAccountStore({...config,fetchImpl:async()=>({ok:false,status,text:async()=>JSON.stringify(body)})});
 await assert.rejects(()=>store.validateSession({access_token:token,refresh_token:'refresh-a'}),{status:503});
 status=409;body={code:'23505'};await assert.rejects(()=>store.insertAccount({name:'Darío'}),{status:409});
});

test('reads only the authenticated doctor’s credited closures for this guard, including a zero award',async()=>{
 const result={patient_uid:'patient-a',event_id:'closure-a',xp_delta:0,base_xp:133,reward_multiplier:1.2,reward_scope:'specialty'};
 const store=createSupabaseAccountStore({...config,fetchImpl:async(url)=>{
  assert.equal(url.pathname,'/rest/v1/atria_v5_progress_receipts');
  for(const [k,v] of Object.entries({actor_id:'eq.actor-a',room_id:'eq.guard-a',kind:'eq.clinical.closure'}))assert.equal(url.searchParams.get(k),v,k);
  return {ok:true,text:async()=>JSON.stringify([result])};
 }});
 assert.deepEqual(await store.creditedGuardRewards('actor-a','guard-a'),[result]);
});

test('competitive score projection reads only public match score fields in the verified room',async()=>{
 const store=createSupabaseAccountStore({...config,fetchImpl:async url=>{
  assert.equal(url.searchParams.get('room_id'),'eq.room');
  assert.equal(url.searchParams.get('kind'),'eq.clinical.closure');
  assert.equal(url.searchParams.get('select'),'actor_id,patient_uid,xp_delta');
  return {ok:true,text:async()=>'[]'};
 }});
 assert.deepEqual(await store.creditedRoomScores('room'),[]);
});
