import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountClient} from './account-client.js';
test('an account outage keeps protected onboarding; only an explicit unavailable installation permits practice',async()=>{
 let status=503;const client=createAccountClient({window:{fetch:async()=>({ok:status===200,status,json:async()=>status===200?{account:null,enabled:false}:{error:'unavailable'}})}});
 await assert.rejects(()=>client.restore(),{status:503});assert.equal(client.enabled(),true);
 status=200;assert.equal(await client.restore(),null);assert.equal(client.enabled(),false);
});
test('expired sessions remove cached identity and cannot prevent switching to another account',async()=>{
 const requests=[],client=createAccountClient({window:{fetch:async(url,options)=>{requests.push({url,options});return {ok:false,status:401,json:async()=>({error:'expired'})};}}});
 client.accept({actorId:'actor-a',xp:400,level:3});assert.equal(await client.restore(),null);assert.equal(client.read(),null);
 await client.logout();assert.equal(client.read(),null);assert.equal(requests[0].options.credentials,'same-origin');assert.equal(requests[1].url,'/api/account/logout');
});
for(const phase of ['headers','body'])test('an account request stalled at '+phase+' times out visibly and preserves the cached guard',async()=>{
 const never=new Promise(()=>{}),client=createAccountClient({requestTimeoutMs:20,window:{fetch:async()=>{
  if(phase==='headers')return never;
  return {ok:true,status:200,json:()=>never};
 }}});
 const account={actorId:'doctor',xp:133,level:1,activeGuardId:'existing'};client.accept(account);
 let timer;
 try{await assert.rejects(Promise.race([client.restore(),new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('account request remained unbounded')),100))]),{name:'TimeoutError'});}
 finally{clearTimeout(timer);}
 assert.deepEqual(client.read(),account);
});
test('a cancelled recovery response cannot replace the current account or guard',async()=>{
 let reply;const controller=new AbortController(),client=createAccountClient({window:{fetch:()=>new Promise(resolve=>reply=resolve)}}),
  account={actorId:'doctor',xp:133,level:1,activeGuardId:'current'};
 client.accept(account);const pending=client.call('session',undefined,{signal:controller.signal});
 controller.abort();reply({ok:true,status:200,json:async()=>({account:{...account,activeGuardId:'older'}})});
 await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(client.read(),account);
});
test('a malformed successful account response cannot silently erase a saved guard',async()=>{
 const client=createAccountClient({window:{fetch:async()=>({ok:true,status:200,json:async()=>({})})}}),
  account={actorId:'doctor',xp:133,level:1,activeGuardId:'current'};
 client.accept(account);await assert.rejects(()=>client.restore());assert.deepEqual(client.read(),account);
});
