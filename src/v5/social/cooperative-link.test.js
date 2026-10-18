import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createQaSocialServer} from '../../social/qa-social-server.js';
import {createCooperativeLink} from './cooperative-link.js';
const storage=()=>{const data=new Map();return {getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
function fixture(){
 const data=new Map(),store={get:async k=>data.get(k),set:async(k,v)=>data.set(k,structuredClone(v)),delete:async k=>data.delete(k)},backend=createQaSocialServer(store);
 let delayed=null,release=null,failed=null;const requests=[];let closed=0;
 const win={localStorage:storage(),crypto,performance:{now:()=>10000},fetch:async(uri,options)=>{
  const url=new URL(uri,'http://test'),input={method:options.method,path:url.pathname,query:Object.fromEntries(url.searchParams),headers:options.headers,body:options.body?JSON.parse(options.body):{}};
  requests.push(url.pathname);const result=await(url.pathname==='/api/lobby-sync'?backend.signalRoute(input):backend.route(input));
  if(delayed===url.pathname){delayed=null;await new Promise(resolve=>release=resolve);}
  if(failed===url.pathname){failed=null;return {ok:false,status:503,json:async()=>({error:'temporarily-unavailable'})};}
  return {ok:result.status<400,status:result.status,json:async()=>result.body};
 }};
 const make=()=>createCooperativeLink({window:win,profile:{name:'Ana',scrubColor:'navy'},onClose:()=>closed++});
 return {win,backend,requests,make,delay:path=>delayed=path,held:()=>!!release,release:()=>release?.(),fail:path=>failed=path,closed:()=>closed};
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
