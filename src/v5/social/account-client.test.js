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
