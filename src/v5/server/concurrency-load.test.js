import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createLobbyCoordinator} from '../social/lobby-coordinator.js';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {CLINICAL_EXECUTORS} from '../content/clinical-cases.js';

const load=n=>JSON.parse(fs.readFileSync(new URL('../content/'+n+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),
 therapies:load('therapies'),defaultDoses:load('default-doses')};

test('320 simultaneous lobby clients move through the spatial index; reconnects and expiry do not leave ghosts',async()=>{
 const count=320,tokens=new Map(Array.from({length:count},(_,i)=>['token-'+i,{id:'load-'+i}]));
 let time=200000,serial=0;
 const hub=createLobbyCoordinator({authenticate:async key=>tokens.get(key)||null,
  clock:()=>time,newId:()=>String(++serial),idleMs:45000});
 const t0=performance.now();
 try{
  const joined=await Promise.all(Array.from({length:count},(_,i)=>
   hub.join('token-'+i,{name:'Load bot '+i,x:i%32*28+60,y:Math.floor(i/32)*35+60})));
  assert.equal(hub.diagnostics().players,count);
  const sessions=joined.map(x=>x.sessionId);
  for(let round=1;round<=5;round++){
   const receipts=await Promise.all(Array.from({length:count},(_,i)=>hub.move('token-'+i,{
    sessionId:sessions[i],seq:round,x:i%32*28+60+round*3,y:Math.floor(i/32)*35+60+round*2,
    dir:'E',moving:true})));
   assert(receipts.every(x=>x.applied&&x.seq===round),'motion must apply exactly once per sequence');
  }
  const vicinity=await hub.nearby('token-0',{sessionId:sessions[0],radius:140,limit:20});
  assert(vicinity.length>0&&vicinity.length<=20);
  assert(vicinity.every(p=>p.id!=='load-0'&&!Object.hasOwn(p,'sessionId')));
  assert.equal((await hub.move('token-0',{sessionId:sessions[0],seq:3,x:9000,y:9000})).applied,false,
   'reordered replay cannot teleport a lobby doctor');
  const resumed=await Promise.all(Array.from({length:32},(_,i)=>hub.join('token-'+i,{
   name:'Load resumed '+i,x:100+i*8,y:100})));
  assert.equal(hub.diagnostics().players,count,'reconnections must replace identities, not duplicate them');
  await assert.rejects(hub.move('token-0',{sessionId:sessions[0],seq:6,x:500,y:500}),
   /stale-or-unknown-lobby-session/);
  await hub.move('token-0',{sessionId:resumed[0].sessionId,seq:1,x:120,y:120});
  const elapsedMs=Math.round(performance.now()-t0);
  console.log('ATRIA_LOBBY_320_CLIENTS='+JSON.stringify({clients:count,motions:count*5,
   refreshedSessions:32,nearby:vicinity.length,elapsedMs}));
  time+=46000;
  await assert.rejects(hub.nearby('token-0',{sessionId:resumed[0].sessionId}),
   /stale-or-unknown-lobby-session|lobby-session-expired/);
  assert.equal(hub.diagnostics().players,0,'idle clients must not remain as connected ghosts');
  assert.equal(hub.diagnostics().spatialCells,0,'spatial grid must be drained after expiry');
 }finally{hub.dispose();}
});

test('independent durable writers race for 2,4,8,16 clinical writes: CAS admits each event exactly once',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-lease-stress-'));
 const store=createSqliteGuardStore(path.join(dir,'guard.sqlite')),roomId='load-room';
 let now=1700000000000;
 const make=()=>createDurableGuardAuthority({store,content,now:()=>now,
  uuid:()=>Math.random().toString(36).slice(2),leaseMs:15000,maxSteps:3600});
 const members=[{id:'a',name:'Ana'},{id:'b',name:'Beto'}];
 try{
  const first=make();
  await first.bootstrap({roomId,actorId:'a',hostId:'a',members,
   caseId:'CIRR-001',mode:'coop'});
  for(const concurrency of [2,4,8,16]){
   const event='same-event-'+concurrency,order={id:event,text:'/signos'};
   const at=performance.now();
   const results=await Promise.allSettled(Array.from({length:concurrency},()=>
    make().transact({roomId,actorId:'a',commands:[order]})));
   const valid=results.filter(r=>r.status==='fulfilled');
   const errors=results.filter(r=>r.status==='rejected');
   for(const result of errors)assert.match(String(result.reason?.code||result.reason?.message),
    /busy|fenced/,'CAS contention may be retried; it must not accept a conflicting write');
   assert(valid.length>=1,'one competing authority must acquire a lease');
   const snapshot=await make().transact({roomId,actorId:'a'});
   const seen=snapshot.clinical.room.transcript.filter(x=>x.text==='/signos');
   const expected=[2,4,8,16].indexOf(concurrency)+1;
   assert.equal(seen.length,expected,
    'one authenticated event ID must yield one clinical utterance despite '+concurrency+' writers');
   assert.equal(snapshot.claims.length,0);
   assert.equal(snapshot.clinical.shift.patients[0].ownerId,null);
   console.log('ATRIA_CAS_RACE='+JSON.stringify({writers:concurrency,committed:valid.length,
    busy:errors.length,elapsedMs:Math.round(performance.now()-at),uniqueClinicalEvents:seen.length}));
  }
  assert.equal(Object.keys(CLINICAL_EXECUTORS).length,7);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
