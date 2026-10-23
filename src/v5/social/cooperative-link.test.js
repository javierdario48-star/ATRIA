import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createQaSocialServer} from '../../social/qa-social-server.js';
import {createCooperativeLink} from './cooperative-link.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
function fixture(){
 const data=new Map(),store={get:async k=>data.get(k),set:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>data.delete(k)},backend=createQaSocialServer(store);
 let delayed=null,release=null,failed=null,beforePath=null,beforeRelease=null;const requests=[];let closed=0;
 const win={localStorage:storage(),crypto,performance:{now:()=>10000},fetch:async(uri,options)=>{
  const url=new URL(uri,'http://test'),input={method:options.method,path:url.pathname,query:Object.fromEntries(url.searchParams),headers:options.headers,body:options.body?JSON.parse(options.body):{}};
  requests.push(url.pathname);if(beforePath===url.pathname){beforePath=null;await new Promise(resolve=>beforeRelease=resolve);}const result=await(url.pathname==='/api/lobby-sync'?backend.signalRoute(input):backend.route(input));
  if(delayed===url.pathname){delayed=null;await new Promise(resolve=>release=resolve);}
  if(failed===url.pathname){failed=null;return {ok:false,status:503,json:async()=>({error:'temporarily-unavailable'})};}
  return {ok:result.status<400,status:result.status,json:async()=>result.body};
 }};
 const make=()=>createCooperativeLink({window:win,profile:{name:'Ana',scrubColor:'navy'},onClose:()=>closed++});
 return {win,backend,requests,make,delay:path=>delayed=path,held:()=>!!release,release:()=>release?.(),fail:path=>failed=path,closed:()=>closed,delayBefore:path=>beforePath=path,beforeHeld:()=>!!beforeRelease,releaseBefore:()=>beforeRelease?.()};
}
test('reloaded social identity renews authenticated presence without replaying a stale motion sequence',async()=>{
 const f=fixture(),a=f.make();await a.connect();for(let i=1;i<=8;i++){a.maintain(i*2000,{x:i,y:40});await a.flush();}
 const first=(await f.backend.roster())[0];const b=f.make();await b.connect();b.maintain(20000,{x:50,y:40});await b.flush();
 const second=(await f.backend.roster())[0];assert.equal(second.x,50);assert.notEqual(second.motionSession,first.motionSession);a.dispose();b.dispose();
});
test('an expired saved guard clears its resume pointer and returns to incoming invitations',async()=>{
 const f=fixture();f.win.localStorage.setItem('atria.v5.coop.room','00000000-0000-4000-8000-000000000000');const a=f.make();
 a.maintain(1000,{x:40,y:40});await a.flush();a.maintain(3000,{x:40,y:40});await a.flush();
 assert.equal(f.win.localStorage.getItem('atria.v5.coop.room'),null);assert(f.requests.includes('/api/me'));a.dispose();
});
test('a delayed room poll cannot recreate a guard after an explicit departure',async()=>{
 const f=fixture(),a=f.make();await a.connect();
 const other=await f.backend.route({method:'POST',path:'register',body:{clientKey:crypto.randomUUID(),name:'Bruno'}});
 const room=await a.invite([other.body.user.id]);const path='/api/rooms/'+room.id+'/messages';f.delay(path);
 a.maintain(1000,{x:40,y:40});
 // Yield through the real backend's asynchronous cache operations until the
 // controlled HTTP response is held. No clinical timers or state are mocked.
 while(!f.held())await Promise.resolve();await a.leave();f.release();await a.flush();
 assert.equal(a.state().room,null);assert.equal(f.win.localStorage.getItem('atria.v5.coop.room'),null);a.dispose();
});
test('a transient signaling-service failure cannot close the native cooperative guard',async()=>{
 const f=fixture(),a=f.make();await a.connect();const other=await f.backend.route({method:'POST',path:'register',body:{clientKey:crypto.randomUUID(),name:'Bruno'}});
 const room=await a.invite([other.body.user.id]);f.fail('/api/rooms/'+room.id+'/messages');a.maintain(1000,{x:40,y:40});await a.flush();
 assert.equal(a.state().room?.id,room.id);assert.equal(f.closed(),0);a.dispose();
});
test('canceling an invitation still being created removes its committed remote invitation',async()=>{
 const f=fixture(),a=f.make();await a.connect();const other=await f.backend.route({method:'POST',path:'register',body:{clientKey:crypto.randomUUID(),name:'Bruno'}});
 f.delay('/api/rooms');const inviting=a.invite([other.body.user.id]);while(!f.held())await Promise.resolve();await a.leave();f.release();
 await assert.rejects(inviting,/cancelada/);
 const me=await f.backend.route({path:'me',headers:{authorization:'Bearer '+other.body.token}});
 assert.equal(me.body.invites.length,0,'local mode must not leave an orphan invitation for the colleague');a.dispose();
});
async function invited(f,a){
 await a.connect();const host=await f.backend.route({method:'POST',path:'register',body:{clientKey:crypto.randomUUID(),name:'Bruno'}});
 const headers={authorization:'Bearer '+host.body.token};
 const result=await f.backend.route({method:'POST',path:'rooms',headers,body:{mode:'coop',invitees:[a.state().user.id],peerId:'host-peer'}});
 return {id:result.body.room.id,headers};
}
test('canceling an already committed join removes its remote membership',async()=>{
 const f=fixture(),a=f.make(),host=await invited(f,a);f.delay('/api/rooms/join');const joining=a.join(host.id);
 while(!f.held())await Promise.resolve();await a.leave();f.release();await assert.rejects(joining,/cancelada/);
 const result=await f.backend.route({path:'rooms/'+host.id+'/messages',headers:host.headers});
 assert(!result.body.room.members.some(x=>x.userId===a.state().user.id),'a cancelled join must not leave an accepted ghost member');assert.equal(a.state().room,null);a.dispose();
});
test('a superseded join cannot revoke a new intentional join to the same room',async()=>{
 const f=fixture(),a=f.make(),host=await invited(f,a);f.delay('/api/rooms/join');const previous=a.join(host.id);
 while(!f.held())await Promise.resolve();await a.join(host.id);f.release();await assert.rejects(previous,/cancelada/);
 const result=await f.backend.route({path:'rooms/'+host.id+'/messages',headers:host.headers});
 assert(result.body.room.members.some(x=>x.userId===a.state().user.id));assert.equal(a.state().room.id,host.id);a.dispose();
});

test('accepting an invitation consumes it locally before the next room can be opened',async()=>{
 const f=fixture(),a=f.make(),host=await invited(f,a);
 a.maintain(1000,{x:40,y:40});await a.flush();assert.equal(a.state().invites.length,1);
 await a.join(host.id);assert.deepEqual(a.state().invites,[],'an accepted room cannot remain an Accept button');
 await a.leave();assert.deepEqual(a.state().invites,[],'returning to lobby cannot resurrect the old invitation');a.dispose();
});

test('a late invitation poll cannot reinsert the room accepted during the same intent',async()=>{
 const f=fixture(),a=f.make(),host=await invited(f,a);
 f.delayBefore('/api/rooms/join');const joining=a.join(host.id);while(!f.beforeHeld())await Promise.resolve();
 f.delay('/api/me');a.maintain(1000,{x:40,y:40});while(!f.held())await Promise.resolve();
 f.releaseBefore();await joining;assert.equal(a.state().room.id,host.id);
 f.release();await a.flush();assert.deepEqual(a.state().invites,[],'a pre-accept response cannot restore an accepted invitation');
 await a.leave();assert.deepEqual(a.state().invites,[]);a.dispose();
});

test('two independent lobby clients exchange chat, accept friendship and receive direct invitation',async()=>{
 const records=new Map(),backend=createQaSocialServer({
  get:async k=>records.get(k),set:async(k,v)=>records.set(k,structuredClone(v)),
  delete:async k=>records.delete(k)
 });
 const make=(name)=>{
  const win={localStorage:storage(),crypto,performance:{now:()=>10000},
   fetch:async(uri,opts)=>{
    const url=new URL(uri,'http://test'),input={method:opts.method,path:url.pathname,
     query:Object.fromEntries(url.searchParams),headers:opts.headers,
     body:opts.body?JSON.parse(opts.body):{}};
    const r=await(url.pathname==='/api/lobby-sync'?backend.signalRoute(input):backend.route(input));
    return {ok:r.status<400,status:r.status,json:async()=>r.body};
   }};
  return createCooperativeLink({window:win,profile:{name,scrubColor:'navy'}});
 };
 const a=make('Ana'),b=make('Bruno');await Promise.all([a.connect(),b.connect()]);
 const aid=a.state().user.id,bid=b.state().user.id;
 for(const client of [a,b]){client.maintain(1000,{x:450,y:820,dir:'S'});await client.flush();}
 a.maintain(2500,{x:450,y:820,dir:'S'});await a.flush();
 assert(a.state().roster.some(x=>x.userId===bid));
 const id=aid+':hello-1';await a.postLobbyMessage('Hola Bruno',id);
 b.maintain(2500,{x:460,y:821,dir:'E'});await b.flush();
 assert.equal(b.state().lobbyMessages.filter(m=>m.text==='Hola Bruno').length,1);
 await a.addFriend(bid);
 b.maintain(3700,{x:460,y:821});await b.flush();
 assert(b.state().requests.incoming.some(x=>x.id===aid));
 await b.acceptFriend(aid);
 a.maintain(4800,{x:450,y:820});await a.flush();
 assert(a.state().friends.some(x=>x.id===bid));
 const room=await a.invite([bid]);
 b.maintain(6000,{x:460,y:821});await b.flush();
 assert(b.state().invites.some(x=>x.roomId===room.id));
 await b.join(room.id);
 assert.equal(b.state().room.id,room.id);
 a.dispose();b.dispose();
});

test('private ward keeps 260ms movement even when its RTC signaling is delayed',async()=>{
 const f=fixture(),a=f.make();await a.connect();
 const colleague=await f.backend.route({method:'POST',path:'register',
  body:{clientKey:crypto.randomUUID(),name:'Bruno'}});
 const room=await a.invite([colleague.body.user.id]);
 f.delay('/api/rooms/'+room.id+'/messages');
 a.maintain(1000,{x:400,y:720,dir:'E',moving:true,phase:'guard',roomId:room.id});
 while(!f.held())await Promise.resolve();
 a.maintain(1300,{x:452,y:720,dir:'E',moving:true,phase:'guard',roomId:room.id});
 let value=null;
 for(let i=0;i<100;i++){
  const list=await f.backend.roster();
  value=list.find(x=>x.userId===a.state().user.id);
  if(value?.x===452)break;
  await Promise.resolve();
 }
 assert.equal(value?.x,452,'the ward pose is published while RTC signaling stays blocked');
 assert.equal(value?.roomId,room.id);
 assert.equal(value?.phase,'guard');
 assert.equal(value?.motionCadence,260);
 f.release();await a.flush();a.dispose();
});
