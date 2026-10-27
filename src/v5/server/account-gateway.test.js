import test from 'node:test';
import assert from 'node:assert/strict';
import {createAccountGateway} from './account-gateway.js';
import {createV5QaSocialServer} from '../social/room-membership-store.js';
import {clinicalActorId} from './clinical-http.js';

const key='device-secret-1111111111111111111111111111111111';
function fixture(){
 const data=new Map(),storage={get:async k=>data.get(k),set:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>data.delete(k)};
 const legacy=createV5QaSocialServer(storage),rows=new Map(),sessions=new Map();let serial=0;
 const backend={
  byActor:async id=>[...rows.values()].find(x=>x.actor_id===id)||null,
  byAuth:async id=>rows.get(id)||null,
  byUsername:async u=>[...rows.values()].find(x=>x.username===u)||null,
  async createIdentity(username,password){return {id:'auth-'+(++serial)};},
  async passwordSession(username,password){const row=await this.byUsername(username);if(!row||password!=='safe-test-password-123')throw Object.assign(Error('invalid credentials'),{status:401});
   const token='access-'+(++serial),sessionId='session-'+serial;sessions.set(token,{userId:row.auth_user_id,sessionId});return {access_token:token,refresh_token:'refresh-'+serial,expires_in:3600};},
  async validateSession(tokens){const s=sessions.get(tokens.access_token);if(!s)throw Object.assign(Error('expired'),{status:401});return {...s,tokens};},
  async logout(tokens){sessions.delete(tokens.access_token);},
  async insertAccount(row){if(await this.byActor(row.actor_id)||await this.byUsername(row.username))throw Object.assign(Error('conflict'),{status:409});rows.set(row.auth_user_id,structuredClone(row));return row;},
  async updateAccount(id,change){const r=rows.get(id);Object.assign(r,change);return structuredClone(r);},
  async award(actorId){const r=await this.byActor(actorId);return {xp:r.xp,casesResolved:r.cases_resolved};},
  async rpc(){return true;}
 };
 const gate=createAccountGateway({backend,legacy,storage});
 const request=(path,body,headers={})=>gate.route({method:body?'POST':'GET',path,body:body||{},headers});
 return {data,storage,legacy,rows,sessions,backend,gate,request};
}
const cookie=r=>r.cookies.map(x=>x.split(';')[0]).join('; ');
test('claim preserves proven device actor and friends; another session recovers server progress without secrets',async()=>{
 const f=fixture();const old=await f.legacy.route({method:'POST',path:'resume',body:{clientKey:key,name:'Doctora Uno'}});
 await f.storage.set('qa-v1:friends:'+old.body.user.id,['qa_222222222222222222222222222222']);
 const r=await f.request('account/register',{username:'doctora_uno',password:'safe-test-password-123',clientKey:key,name:'Doctora Uno',sex:'female',scrubColor:'pink',legacyProgress:{xp:999999}});
 assert.equal(r.status,200);assert.equal(r.body.account.actorId,old.body.user.id);
 assert.equal(r.body.account.xp,0,'browser XP cannot become trusted account XP');
 assert.equal(r.body.account.level,1);assert(!JSON.stringify(r.body).includes('access-'));assert(!JSON.stringify(r.body).includes(key));
 assert(r.cookies.every(x=>x.includes('HttpOnly')&&x.includes('Secure')&&x.includes('SameSite=Lax')));
 const row=[...f.rows.values()][0];row.xp=450;row.cases_resolved=4;
 const second=await f.request('account/login',{username:'doctora_uno',password:'safe-test-password-123'});
 assert.equal(second.status,200);assert.equal(second.body.account.xp,450);assert.equal(second.body.account.level,3);assert.equal(second.body.account.casesResolved,4);
 const who=await f.request('me',undefined,{cookie:cookie(second)});
 assert.equal(who.status,200);assert.equal(who.body.user.id,old.body.user.id);
 assert.deepEqual(await f.storage.get('qa-v1:friends:'+row.actor_id),['qa_222222222222222222222222222222']);
 const saved=await f.request('account/profile',{name:'Doctora Dos',sex:'female',scrubColor:'teal',xp:999999},{cookie:cookie(second)});
 assert.equal(saved.body.account.xp,450);assert.equal(saved.body.account.name,'Doctora Dos');
 assert.equal((await f.request('account/session',undefined,{cookie:cookie(r)})).body.account.scrubColor,'teal');
});
test('claimed accounts reject old device keys and old bearer tokens; logout revokes only that session',async()=>{
 const f=fixture();const old=await f.legacy.route({method:'POST',path:'resume',body:{clientKey:key,name:'Doctora Uno'}});
 const first=await f.request('account/register',{username:'doctora_uno',password:'safe-test-password-123',clientKey:key,name:'Doctora Uno'});
 const second=await f.request('account/login',{username:'doctora_uno',password:'safe-test-password-123'});
 assert.equal((await f.request('resume',{clientKey:key,name:'Intruso'})).status,401);
 assert.equal((await f.request('me',undefined,{authorization:'Bearer '+old.body.token})).status,401);
 assert.equal((await f.request('account/logout',{}, {cookie:cookie(first)})).status,200);
 assert.equal((await f.request('account/session',undefined,{cookie:cookie(first)})).status,401);
 assert.equal((await f.request('account/session',undefined,{cookie:cookie(second)})).status,200);
});
test('register cannot claim a different actor and profiles do not reveal private account fields',async()=>{
 const f=fixture();const r=await f.request('account/register',{username:'medico_uno',password:'safe-test-password-123',clientKey:key,name:'Médico Uno',actorId:'qa_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'});
 assert.equal(r.body.account.actorId,clinicalActorId(key));
 const p=await f.request('profiles/'+r.body.account.actorId,undefined,{cookie:cookie(r)});
 assert.equal(p.status,200);assert.equal(p.body.profile.name,'Médico Uno');
 for(const field of ['auth_user_id','legacy_key','social_token','controller_session_id','password'])assert(!JSON.stringify(p.body).includes(field));
 assert.equal((await f.request('account/register',{username:'medico_uno',password:'safe-test-password-123',clientKey:key,name:'Otra Persona'})).status,409);
});
