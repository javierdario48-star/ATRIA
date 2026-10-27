import test from 'node:test';
import assert from 'node:assert/strict';
import {accountGatewayFixture} from '../../../qa/v5/account-fixture.mjs';
const key='welcome-device-secret-1111111111111111111111111111';
const cookie=r=>r.cookies.map(x=>x.split(';')[0]).join('; ');
test('a natural doctor name is the sole public login; remember=false uses a real session cookie',async()=>{
 const f=accountGatewayFixture();
 const r=await f.request('account/register',{name:'Darío del Mar',password:'safe-test-password-123',clientKey:key,remember:false});
 assert.equal(r.status,200);assert.equal(r.body.account.name,'Darío del Mar');
 assert(r.cookies[0].includes('HttpOnly'));assert(!r.cookies[0].includes('Max-Age='));
 const restored=await f.request('account/session',undefined,{cookie:cookie(r)});
 assert.equal(restored.body.account.name,'Darío del Mar');
});
test('name lookup is server-backed and login accepts the canonical character alias',async()=>{
 const f=accountGatewayFixture();
 await f.request('account/register',{username:'old_login',name:'Darío',password:'safe-test-password-123',clientKey:key});
 const status=await f.request('account/name-status',{name:'DARIO'});
 assert.equal(status.status,200);assert.equal(status.body.available,false);
 const login=await f.request('account/login',{name:'DÁRIO',password:'safe-test-password-123',remember:false});
 assert.equal(login.status,200);assert.equal(login.body.account.name,'Darío');
 assert(!login.cookies[0].includes('Max-Age='));
});
test('logout preserves an active guard for explicit recovery; creating a new doctor cannot inherit the prior actor',async()=>{
 const f=accountGatewayFixture();
 const a=await f.request('account/register',{username:'old_login',name:'Doctor A',password:'safe-test-password-123',clientKey:key});
 const row=[...f.rows.values()][0];row.active_guard_id='guard-a';let releases=0;
 f.backend.rpc=async name=>{if(name==='atria_v5_set_active_guard')releases++;return true;};
 assert.equal((await f.request('account/logout',{}, {cookie:cookie(a)})).status,200);
 assert.equal(releases,0);assert.equal(row.active_guard_id,'guard-a');
 const b=await f.request('account/register',{name:'Doctor B',password:'safe-test-password-123',clientKey:key,newCharacter:true});
 assert.equal(b.status,200);assert.notEqual(b.body.account.actorId,a.body.account.actorId);
 assert.equal(b.body.account.xp,0);
});
test('session renewal preserves the choice not to remember the account',async()=>{
 const f=accountGatewayFixture();const a=await f.request('account/register',{name:'Médica Andina',password:'safe-test-password-123',clientKey:key,remember:false});
 const original=f.backend.validateSession;
 f.backend.validateSession=async tokens=>({...await original(tokens),tokens:{access_token:'refreshed',refresh_token:'renewed'}});
 const result=await f.request('account/session',undefined,{cookie:cookie(a)});
 assert.equal(result.status,200);assert.equal(result.cookies.length,1);assert(!result.cookies[0].includes('Max-Age='));
});
test('invalid doctor names cannot create an identity; legacy names remain intact on appearance updates',async()=>{
 const f=accountGatewayFixture();assert.equal((await f.request('account/register',{name:'<script>',password:'safe-test-password-123',clientKey:key})).status,400);assert.equal(f.rows.size,0);
 const a=await f.request('account/register',{username:'old_login',name:'Doctor Anterior',password:'safe-test-password-123',clientKey:key});
 const row=[...f.rows.values()][0];row.name='🩺';row.character_name_key=null;
 const result=await f.request('account/profile',{name:'🩺',sex:'female',scrubColor:'teal'},{cookie:cookie(a)});
 assert.equal(result.status,200);assert.equal(result.body.account.loginName,'old_login');assert.equal(result.body.account.name,'🩺');
});
