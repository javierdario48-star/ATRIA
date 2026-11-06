import test from 'node:test';
import assert from 'node:assert/strict';
import {createPostgresGuardStore} from './postgres-guard-store.js';
function fakeDb(){const records=new Map(),requests=[];let sequence=0;
 const response=(status,data)=>({ok:status>=200&&status<300,status,text:async()=>JSON.stringify(data)});
 async function fetchImpl(url,opts){requests.push({path:url.pathname,query:url.searchParams.toString(),method:opts.method,
  key:opts.headers.apikey,cache:opts.cache,authorization:opts.headers.Authorization});
  if(url.pathname==='/rest/v1/atria_clinical_guards'){
   const id=url.searchParams.get('room_id')?.replace(/^eq\./,'');const row=records.get(id);
   return response(200,row?[{revision:row.revision,state:structuredClone(row.state)}]:[]);
  }
  if(url.pathname==='/rest/v1/rpc/atria_guard_cas'){
   const {p_room_id,p_expected_revision,p_state}=JSON.parse(opts.body),old=records.get(p_room_id);
   if(old?(old.revision!==p_expected_revision):p_expected_revision!==null)return response(200,null);
   const revision=(old?.revision??0)+1;records.set(p_room_id,{revision,state:structuredClone(p_state)});sequence++;
   return response(200,revision);
  }
  return response(404,{code:'not-found'});
 }
 return {records,requests,get sequence(){return sequence},fetchImpl};
}
const create=db=>createPostgresGuardStore({url:'https://atria-example.supabase.co/',secretKey:'sb_secret_qa_only',fetchImpl:db.fetchImpl});
test('Postgres store follows read/atomic CAS interface with stale-writer fencing',async()=>{
 const db=fakeDb(),a=create(db),b=create(db);
 assert.equal(await a.read('guard_A'),null);
 assert.equal(await a.compareAndSwap('guard_A',null,{epoch:0,medications:[]}), '1');
 assert.equal(await b.compareAndSwap('guard_A',null,{epoch:9}),null);
 const initial=await b.read('guard_A');
 assert.deepEqual(initial,{etag:'1',value:{epoch:0,medications:[]}});
 assert.equal(await a.compareAndSwap('guard_A','1',{epoch:1,medications:[{id:'dose-1'}]}),'2');
 assert.equal(await b.compareAndSwap('guard_A',initial.etag,{epoch:99}),null);
 assert.deepEqual((await b.read('guard_A')).value,{epoch:1,medications:[{id:'dose-1'}]});
 assert.equal(db.sequence,2);
 assert(db.requests.every(x=>x.key==='sb_secret_qa_only'&&x.cache==='no-store'&&!x.authorization));
});
test('reject invalid rooms, origins, revisions or missing server-side secret',async()=>{
 const db=fakeDb(),store=create(db);
 await assert.rejects(store.read('../outside'),/invalid durable room ID/);
 await assert.rejects(store.compareAndSwap('room','0',{}),/invalid expected clinical revision/);
 await assert.rejects(store.compareAndSwap('room',null,[]),/invalid clinical checkpoint/);
 assert.throws(()=>createPostgresGuardStore({url:'http://atria-example.supabase.co/',secretKey:'sb_secret_qa_only',fetchImpl:db.fetchImpl}),/HTTPS/);
 assert.throws(()=>createPostgresGuardStore({url:'https://atria-example.supabase.co/',secretKey:'sb_publishable_leaked',fetchImpl:db.fetchImpl}),/private backend/);
});
test('remote failures fail closed, without fallback to memory or Blob',async()=>{
 const store=createPostgresGuardStore({url:'https://atria-example.supabase.co/',secretKey:'sb_secret_qa_only',
  fetchImpl:async()=>({ok:false,status:503,text:async()=>JSON.stringify({code:'database-unavailable'})})});
 await assert.rejects(store.read('room'),e=>e.status===503&&e.code==='database-unavailable');
 await assert.rejects(store.compareAndSwap('room',null,{x:1}),e=>e.status===503&&e.code==='database-unavailable');
});

test('read-only observation verifies the current account controller without acquiring a CAS lease',async()=>{
 const paths=[];let authorized=true;
 const store=createPostgresGuardStore({url:'https://atria-example.supabase.co/',secretKey:'sb_secret_qa_only',
  accountSession:{actorId:'a',sessionId:'session-a'},fetchImpl:async(url,options)=>{
   paths.push(url.pathname);
   const value=url.pathname.endsWith('atria_v5_can_control_guard')?authorized:[{revision:4,state:{roomId:'room',epoch:2}}];
   if(url.pathname.endsWith('atria_v5_can_control_guard'))assert.deepEqual(JSON.parse(options.body),
    {p_actor_id:'a',p_room_id:'room',p_session_id:'session-a'});
   return {ok:true,status:200,text:async()=>JSON.stringify(value)};
  }});
 assert.equal(typeof store.observe,'function');
 assert.deepEqual(await store.observe('room'),{etag:'4',value:{roomId:'room',epoch:2}});
 assert.deepEqual(paths,['/rest/v1/rpc/atria_v5_can_control_guard','/rest/v1/atria_clinical_guards']);
 authorized=false;paths.length=0;
 await assert.rejects(store.observe('room'),error=>error.code==='forbidden');
 assert.deepEqual(paths,['/rest/v1/rpc/atria_v5_can_control_guard']);
});
