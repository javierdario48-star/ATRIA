import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createQaSocialServer} from '../../social/qa-social-server.js';
import {createCooperativeLink} from './cooperative-link.js';
import {privateRoomMotionPrefix} from './room-motion-scope.js';
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
test('adopting a password account retires the legacy device recovery pointer',async()=>{
 const f=fixture();f.win.localStorage.setItem('atria.v5.coop.room','00000000-0000-4000-8000-000000000000');
 const a=f.make();a.useAccount({actorId:'qa_111111111111111111111111111111',username:'doctor',name:'Doctor'});
 assert.equal(a.state().recovering,false);assert.equal(f.win.localStorage.getItem('atria.v5.coop.room'),null);a.dispose();
});
test('restoring the same account keeps its invitation pointer; another identity cannot inherit it',()=>{
 const f=fixture(),id='qa_111111111111111111111111111111',room='00000000-0000-4000-8000-000000000000';
 f.win.localStorage.setItem('atria.v5.coop.room',room);f.win.localStorage.setItem('atria.v5.coop.actor',id);
 const a=f.make();a.useAccount({actorId:id,username:'doctor',name:'Doctor'},{restore:true});
 assert.equal(a.state().recovering,true);assert.equal(f.win.localStorage.getItem('atria.v5.coop.room'),room);a.dispose();
 const b=f.make();b.useAccount({actorId:'qa_222222222222222222222222222222',username:'other',name:'Other'},{restore:true});
 assert.equal(b.state().recovering,false);assert.equal(f.win.localStorage.getItem('atria.v5.coop.room'),null);b.dispose();
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
test('lobby-to-ward presence transition retains the accepted RTC offer while a later ward reload retires it',async()=>{
 const f=fixture(),pcs=[];class Peer{
  constructor(){pcs.push(this);this.connectionState='new';}
  async setRemoteDescription(x){this.remoteDescription=x;}
  async createAnswer(){return {type:'answer',sdp:'a=ice-ufrag:guest-'+pcs.length};}
  async setLocalDescription(x){this.localDescription=x;}
  close(){this.closed=true;}
 }
 f.win.RTCPeerConnection=Peer;
 const a=f.make(),host=await invited(f,a),scope=privateRoomMotionPrefix(host.id);
 const hostId=(await f.backend.route({path:'rooms/'+host.id+'/messages',headers:host.headers})).body.room.hostUserId;
 const presence=async(session,epoch)=>{
  const result=await f.backend.signalRoute({method:'POST',headers:host.headers,body:{presence:{
   peerId:'host-peer',motionSession:session,motionEpoch:epoch,seq:1,x:400,y:700,phase:session.startsWith(scope)?'guard':'lobby',roomId:host.id}}});
  assert.equal(result.status,200);
 };
 const offer=async(id,sdp)=>{
  const toPeerId='v5-'+f.win.localStorage.getItem('atria.v5.social.client').slice(0,32);
  const result=await f.backend.signalRoute({method:'POST',headers:host.headers,body:{signal:{
   type:'offer',fromUserId:hostId,fromPeerId:'host-peer',toPeerId,
   description:{type:'offer',sdp,negotiationId:scope+id}}}});
  assert.equal(result.status,200);
 };
 try{
  const epoch=Date.now();await presence(crypto.randomUUID(),epoch);
  a.maintain(1000,{x:420,y:700,phase:'lobby'});await a.flush();
  await a.join(host.id);await offer('first','a=ice-ufrag:host');
  a.maintain(2200,{x:420,y:700,phase:'lobby'});await a.flush();
  assert.equal(pcs.length,1);assert.equal(pcs[0].remoteDescription.sdp,'a=ice-ufrag:host');
  await presence(scope+crypto.randomUUID(),epoch+1);
  for(const now of [3500,4800]){a.maintain(now,{x:420,y:700,phase:'lobby'});await a.flush();}
  assert.equal(pcs.length,1,'entering the ward must not replace the connection that owns its accepted SDP');
  assert(!pcs[0].closed);
  // The new offer can beat presence after a host reload. Its later pose must
  // not dispose the very connection that already answered that offer.
  await offer('reloaded','a=ice-ufrag:reloaded');
  for(const now of [6100,7400]){a.maintain(now,{x:420,y:700,phase:'lobby'});await a.flush();}
  assert(pcs[0].closed,'a real subsequent ward session must retire the old connection');
  assert.equal(pcs.at(-1).remoteDescription.sdp,'a=ice-ufrag:reloaded');
  const accepted=pcs.at(-1),count=pcs.length;
  await presence(scope+crypto.randomUUID(),epoch+2);
  for(const now of [8700,10000]){a.maintain(now,{x:420,y:700,phase:'lobby'});await a.flush();}
  assert.equal(pcs.length,count,'late host presence cannot create a second answer for its current offer');
  assert(!accepted.closed);
 }finally{a.dispose();}
});
test('a host replaces a reloaded guest still in lobby, then preserves its connection on ward entry',async()=>{
 const f=fixture(),pcs=[];class Peer{
  constructor(){pcs.push(this);this.connectionState='new';}
  createDataChannel(){return {readyState:'connecting',close(){}};}
  async createOffer(){return {type:'offer',sdp:'a=ice-ufrag:host-'+pcs.length};}
  async setLocalDescription(x){this.localDescription=x;}
  async setRemoteDescription(x){this.remoteDescription=x;}
  close(){this.closed=true;}
 }
 f.win.RTCPeerConnection=Peer;const host=f.make();await host.connect();
 const registered=await f.backend.route({method:'POST',path:'register',body:{clientKey:crypto.randomUUID(),name:'Bruno'}});
 const headers={authorization:'Bearer '+registered.body.token},guest=registered.body.user.id;
 const presence=async(session,epoch)=>{
  const result=await f.backend.signalRoute({method:'POST',headers,body:{presence:{peerId:'guest-peer',
   motionSession:session,motionEpoch:epoch,seq:1,x:420,y:700}}});assert.equal(result.status,200);
 };
 const poll=async times=>{for(const now of times){host.maintain(now,{x:400,y:700,phase:'guard',roomId:room.id});await host.flush();}};
 const epoch=Date.now();await presence(crypto.randomUUID(),epoch);
 host.maintain(1000,{x:400,y:700,phase:'lobby'});await host.flush();
 const room=await host.invite([guest]),scope=privateRoomMotionPrefix(room.id);
 assert.equal((await f.backend.route({method:'POST',path:'rooms/join',headers,body:{roomId:room.id,peerId:'guest-peer'}})).status,200);
 try{
  await poll([2200]);assert.equal(pcs.length,1);
  await presence(scope+crypto.randomUUID(),epoch+1);await poll([3500,4800]);
  assert.equal(pcs.length,1,'initial admission keeps the original host offer');
  await presence(crypto.randomUUID(),epoch+2);await poll([6100,7400]);
  assert.equal(pcs.length,2,'a guest waiting in lobby after reload still needs a new host offer');
  assert(pcs[0].closed);const resumed=pcs[1];
  await presence(scope+crypto.randomUUID(),epoch+3);await poll([8700,10000]);
  assert.equal(pcs.length,2,'entering the ward cannot replace the renewed host offer');assert(!resumed.closed);
 }finally{host.dispose();}
});
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
 let value=null;
 for(let i=0;i<24;i++){
  // A real 60Hz frame keeps calling maintain while an earlier presence
  // request finishes; a single synthetic call may land on that boundary.
  a.maintain(1300+i*40,{x:452,y:720,dir:'E',moving:true,phase:'guard',roomId:room.id});
  const list=await f.backend.roster();
  value=list.find(x=>x.userId===a.state().user.id);
  if(value?.x===452)break;
  await Promise.resolve();
 }
 assert.equal(value?.x,452,'the ward pose is published while RTC signaling stays blocked');
 assert(value.motionSession.startsWith(privateRoomMotionPrefix(room.id)),
  'only the active private ward may render this pose');
 assert.equal(value?.motionCadence,260);
 f.release();await a.flush();a.dispose();
});

test('private physician speech reaches the second room member without clinical sync, once only',async()=>{
 const data=new Map(),backend=createQaSocialServer({
  get:async k=>data.get(k),set:async(k,v)=>data.set(k,structuredClone(v)),
  delete:async k=>data.delete(k)
 }),heard=[];
 function client(name,onRoomSpeech=()=>{}){
  const w={localStorage:storage(),crypto,performance:{now:()=>12000},
   fetch:async(uri,options)=>{
    const u=new URL(uri,'http://test');
    const input={method:options.method,path:u.pathname,query:Object.fromEntries(u.searchParams),
     headers:options.headers,body:options.body?JSON.parse(options.body):{}};
    const r=await(u.pathname==='/api/lobby-sync'?backend.signalRoute(input):backend.route(input));
    return {ok:r.status<400,status:r.status,json:async()=>r.body};
   }};
  return createCooperativeLink({window:w,profile:{name,scrubColor:'navy'},onRoomSpeech});
 }
 const ana=client('Ana'),bruno=client('Bruno',message=>heard.push(message));
 await Promise.all([ana.connect(),bruno.connect()]);
 const room=await ana.invite([bruno.state().user.id]);
 await bruno.join(room.id);
 assert.equal(await ana.postRoomSpeech({id:'message-100',text:'Hola desde Ana'}),true);
 bruno.maintain(1000,{x:430,y:700,phase:'guard',roomId:room.id});
 await bruno.flush();
 assert.equal(heard.length,1,'one independent room poll delivers speech to the guest');
 assert.deepEqual(heard.map(x=>x.text),['Hola desde Ana']);
 assert.equal(heard[0].userId,ana.state().user.id);
 assert.equal(heard[0].roomId,room.id);
 bruno.maintain(1350,{x:430,y:700,phase:'guard',roomId:room.id});
 await bruno.flush();
 assert.equal(heard.length,1,'incremental cursor prevents duplicate bubbles');
 const stranger=client('Outsider');await stranger.connect();
 assert.equal(await stranger.postRoomSpeech({id:'intrusion',text:'No autorizado'}),false);
 await ana.leave();bruno.dispose();ana.dispose();stranger.dispose();
});

test('slow lobby directory reads cannot hold back subsequent authenticated movement packets',async()=>{
 const f=fixture(),a=f.make();
 await a.connect();
 f.delayBefore('/api/lobby');
 a.maintain(1000,{x:40,y:40,phase:'lobby',moving:true});
 while(!f.beforeHeld())await Promise.resolve();
 await new Promise(resolve=>setImmediate(resolve));
 const before=f.requests.filter(x=>x==='/api/lobby-sync').length;
 assert.equal(before,1);
 // The directory request is deliberately still unresolved. Movement must
 // continue on the original 260ms RAF cadence, not wait for that GET.
 a.maintain(1300,{x:93,y:40,phase:'lobby',moving:true});
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(f.requests.filter(x=>x==='/api/lobby-sync').length,2);
 const roster=await f.backend.roster();
 assert.equal(roster[0].x,93);
 f.releaseBefore();
 await a.flush();
 a.dispose();
});
