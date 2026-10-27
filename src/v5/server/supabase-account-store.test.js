import test from 'node:test';
import assert from 'node:assert/strict';
import {createSupabaseAccountStore} from './supabase-account-store.js';
const config={url:'https://testproject.supabase.co',secretKey:'sb_secret_test'};
const token='header.'+Buffer.from(JSON.stringify({exp:Date.now()/1000+3600,sub:'auth-a',session_id:'session-a'})).toString('base64url')+'.signature';
test('a revoked Auth user response is unauthorized so the gateway can clear the expired cookie',async()=>{
 const store=createSupabaseAccountStore({...config,fetchImpl:async()=>({ok:false,status:403,text:async()=>JSON.stringify({code:'session_not_found'})})});
 await assert.rejects(()=>store.validateSession({access_token:token,refresh_token:'refresh-a'}),{status:401});
});
test('Auth outages remain retryable and name collisions remain conflicts',async()=>{
 let status=503,body={};const store=createSupabaseAccountStore({...config,fetchImpl:async()=>({ok:false,status,text:async()=>JSON.stringify(body)})});
 await assert.rejects(()=>store.validateSession({access_token:token,refresh_token:'refresh-a'}),{status:503});
 status=409;body={code:'23505'};await assert.rejects(()=>store.insertAccount({name:'Darío'}),{status:409});
});
