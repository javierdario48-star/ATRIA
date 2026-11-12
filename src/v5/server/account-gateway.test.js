import test from 'node:test';
import assert from 'node:assert/strict';
import {clinicalActorId} from './clinical-http.js';

const key='device-secret-1111111111111111111111111111111111';

import {accountGatewayFixture as fixture} from '../../../qa/v5/account-fixture.mjs';
import {createAccountGateway} from './account-gateway.js';
import {createV5QaSocialServer} from '../social/room-membership-store.js';
import {privateRoomMotionPrefix} from '../social/room-motion-scope.js';
const cookie=r=>r.cookies.map(x=>x.split(';')[0]).join('; ');
const password='safe-test-password-123';
async function register(f,username,name){
 const result=await f.request('account/register',{username,password,name,clientKey:key+'-'+username.replaceAll('_','-')});
 assert.equal(result.status,200);return result;
}
function publish(gate,login,{phase='lobby',roomId,epoch=100,pageEpoch,seq=1,x=20,peerId='peer-device-a'}={}){
 return gate.signalRoute({method:'POST',headers:{cookie:cookie(login)},body:{presence:{
  peerId,phase,roomId,pageEpoch,motionSession:'browser-source-'+epoch,motionEpoch:epoch,seq,x,y:400}}});
}
const lobby=(f,login,roomId)=>f.gate.route({path:'lobby',headers:{cookie:cookie(login)},query:{roomId}});

test('verified lobby status follows the latest heartbeat, even with a saved guard reference',async()=>{
 const f=fixture(),a=await register(f,'medico_a','Médico Ana'),b=await register(f,'medico_b','Médico Bruno');
 const aid=a.body.account.actorId,headers={cookie:cookie(b)},profile=async()=> (await f.request('profiles/'+aid,undefined,headers)).body.profile;
 const doctor=async()=> (await lobby(f,b)).body.players.find(x=>x.userId===aid);
 await publish(f.gate,a);
 assert.equal((await doctor()).status,'disponible');
 const account=await f.backend.byActor(aid),session=await f.gate.authenticate({cookie:cookie(a)});
 account.active_guard_id='personal-private-guard';account.controller_session_id=session.sessionId;
 await publish(f.gate,a,{phase:'guard',roomId:account.active_guard_id,epoch:101,x:987});
 const occupied=await doctor();assert.equal(occupied.status,'en guardia');
 assert.equal(occupied.x,undefined);assert.equal(occupied.motionSession,undefined);
 assert.equal((await profile()).status,'en guardia');
 const publicRoster=await f.gate.signalRoute({method:'GET',headers,query:{roster:'1'}});
 assert.equal(publicRoster.body.players.find(x=>x.userId===aid).x,undefined);
 assert(!JSON.stringify(publicRoster.body).includes(account.active_guard_id));
 await publish(f.gate,a,{epoch:102,x:45});
 assert.equal((await doctor()).status,'disponible');assert.equal((await doctor()).x,45);
 assert.equal((await profile()).status,'disponible');
 const late=await publish(f.gate,a,{phase:'guard',roomId:account.active_guard_id,epoch:101,seq:3,x:987});
 assert.equal(late.body.stale,true);assert.equal((await doctor()).status,'disponible');
 await f.request('account/logout',{}, {cookie:cookie(a)});
 assert.equal((await profile()).status,'desconectado');
 assert.equal((await doctor())?.x,undefined);
 assert.equal((await publish(f.gate,a,{epoch:103})).status,401);
});

test('only an admitted ward member receives ward poses, and a false scope has no pose',async()=>{
 const f=fixture(),a=await register(f,'medico_a','Médico Ana'),b=await register(f,'medico_b','Médico Bruno'),c=await register(f,'medico_c','Médico Celia');
 const aid=a.body.account.actorId,bid=b.body.account.actorId;
 const created=await f.request('rooms',{mode:'coop',invitees:[bid],peerId:'peer-device-a'},{cookie:cookie(a)});
 const roomId=created.body.room.id;
 for(const login of [a,b]){
  const identity=await f.gate.authenticate({cookie:cookie(login)});
  identity.account.active_guard_id=roomId;identity.account.controller_session_id=identity.sessionId;
 }
 await publish(f.gate,a,{phase:'guard',roomId,epoch:101,x:900});
 assert.deepEqual((await lobby(f,b,roomId)).body.wardPlayers,[],'an invitation alone does not expose movement');
 await f.request('rooms/join',{roomId,peerId:'peer-device-b'},{cookie:cookie(b)});
 const teammate=await lobby(f,b,roomId),outsider=await lobby(f,c,roomId);
 assert.equal(teammate.body.wardPlayers.find(x=>x.userId===aid).x,900);
 assert(teammate.body.wardPlayers.find(x=>x.userId===aid).motionSession.startsWith(privateRoomMotionPrefix(roomId)));
 assert.equal(teammate.body.players.find(x=>x.userId===aid).x,undefined);
 assert.deepEqual(outsider.body.wardPlayers,[]);
 assert(!JSON.stringify(outsider.body).includes(roomId));
 await publish(f.gate,a,{phase:'guard',roomId:'different-room',epoch:102,x:901});
 assert.equal((await lobby(f,b,roomId)).body.wardPlayers.find(x=>x.userId===aid)?.x,900,
  'a client cannot publish a different room’s pose into its active ward');
});

test('an in-flight heartbeat on another worker cannot replace the new publishing device',{timeout:2000},async()=>{
 const f=fixture(),a=await register(f,'medico_a','Médico Ana'),b=await register(f,'medico_b','Médico Bruno');
 const otherStorage={...f.storage},other=createAccountGateway({backend:f.backend,storage:otherStorage,legacy:createV5QaSocialServer(otherStorage)});
 await publish(f.gate,a);
 const entered=Promise.withResolvers(),resume=Promise.withResolvers(),set=f.storage.set;
 f.storage.set=async(k,v,opts)=>{
  if(v?.presence?.x===456){entered.resolve();await resume.promise;}
  return set(k,v,opts);
 };
 const inFlight=publish(f.gate,a,{phase:'guard',epoch:101,x:456});
 await entered.promise;
 try{
  const second=await other.route({method:'POST',path:'account/login',body:{username:'medico_a',password}});
  assert.equal(second.status,200);
  await publish(other,second,{epoch:100,x:600,peerId:'peer-device-b'});
 }finally{resume.resolve();await inFlight;}
 const ana=(await lobby(f,b)).body.players.find(x=>x.userId===a.body.account.actorId);
 assert.equal(ana.status,'disponible');assert.equal(ana.x,600);
});

test('a superseded tab cannot regain publishing by starting a later motion session',async()=>{
 const f=fixture(),a=await register(f,'medico_a','Médico Ana'),b=await register(f,'medico_b','Médico Bruno');
 await publish(f.gate,a,{pageEpoch:100,epoch:100});
 await publish(f.gate,a,{pageEpoch:101,epoch:101,x:400});
 const stale=await publish(f.gate,a,{phase:'guard',pageEpoch:100,epoch:102,x:600});
 assert.equal(stale.body.stale,true);
 const ana=(await lobby(f,b)).body.players.find(x=>x.userId===a.body.account.actorId);
 assert.equal(ana.status,'disponible');assert.equal(ana.x,400);
});

test('a delayed same-phase packet cannot roll back the latest pose on another worker',{timeout:2000},async()=>{
 const f=fixture(),a=await register(f,'medico_a','Médico Ana'),b=await register(f,'medico_b','Médico Bruno');
 const otherStorage={...f.storage},other=createAccountGateway({backend:f.backend,storage:otherStorage,legacy:createV5QaSocialServer(otherStorage)});
 await publish(f.gate,a);
 const entered=Promise.withResolvers(),resume=Promise.withResolvers(),set=f.storage.set;
 f.storage.set=async(k,v,opts)=>{
  if(v?.presence?.x===456){entered.resolve();await resume.promise;}
  return set(k,v,opts);
 };
 const inFlight=publish(f.gate,a,{seq:2,x:456});
 await entered.promise;
 try{await publish(other,a,{seq:3,x:600});}
 finally{resume.resolve();await inFlight;}
 const ana=(await lobby(f,b)).body.players.find(x=>x.userId===a.body.account.actorId);
 assert.equal(ana.x,600);
 assert.equal((await publish(f.gate,a,{seq:3,x:700})).body.stale,true);
});
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

test('a second login cannot retire the active guard controller presence or break its SDP',async()=>{
 const f=fixture(),a=await f.request('account/register',{username:'medico_uno',password:'safe-test-password-123',clientKey:key,name:'Médico Uno'});
 const row=[...f.rows.values()][0];row.active_guard_id='room-1';row.controller_session_id=[...f.sessions.values()][0].sessionId;
 const b=await f.request('account/login',{username:'medico_uno',password:'safe-test-password-123'});
 const presence=(r,peerId,epoch,seq,x)=>f.gate.signalRoute({method:'POST',headers:{cookie:cookie(r)},body:{presence:{peerId,motionSession:peerId,motionEpoch:epoch,seq,x,y:400}}});
 assert.equal((await presence(a,'peer-device-a',100,1,20)).status,200);
 assert.equal((await presence(b,'peer-device-b',101,1,30)).body.observer,true);
 assert.equal((await presence(a,'peer-device-a',100,2,40)).body.stale,undefined);
 assert.equal((await f.legacy.roster())[0].x,40);
 const signal=await f.gate.signalRoute({method:'GET',headers:{cookie:cookie(a)},query:{signal:'offer',toPeer:'peer-device-a',fromPeer:'peer-other'}});
 assert.equal(signal.status,200);
});
test('refreshed session cookies survive a later account projection outage',async()=>{
 const f=fixture(),a=await f.request('account/register',{username:'medico_uno',password:'safe-test-password-123',clientKey:key,name:'Médico Uno'});
 const original=f.backend.validateSession.bind(f.backend);
 f.backend.validateSession=async tokens=>({...await original(tokens),tokens:{access_token:'rotated-access',refresh_token:'rotated-refresh'}});
 f.backend.award=async()=>{throw Error('database unavailable');};
 const response=await f.request('account/session',undefined,{cookie:cookie(a)});
 assert.equal(response.status,503);assert.equal(response.cookies.length,1);
 assert(!JSON.stringify(response.body).includes('rotated-access'));
 f.backend.byAuth=async()=>{throw Error('lookup unavailable');};
 const lookup=await f.request('account/session',undefined,{cookie:cookie(a)});
 assert.equal(lookup.status,503);assert.equal(lookup.cookies.length,1);
});
test('legacy presence route cannot forge an account level or appearance',async()=>{
 const f=fixture(),a=await f.request('account/register',{username:'medico_uno',password:'safe-test-password-123',clientKey:key,name:'Médico Uno'});
 const r=await f.request('lobby/state',{peerId:'peer-device-a',motionSession:'motion-a',motionEpoch:1,seq:1,level:999,color:'female-pink'},{cookie:cookie(a)});
 assert.equal(r.status,200);const p=(await f.legacy.roster())[0];assert.equal(p.level,1);assert.equal(p.color,'navy');
});
