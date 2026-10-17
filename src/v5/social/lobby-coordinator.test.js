import test from 'node:test';
import assert from 'node:assert/strict';
import {createLobbyCoordinator} from './lobby-coordinator.js';
const fixture=(count=4)=>{
 let now=100000,seq=0;
 const tokens=new Map(Array.from({length:count},(_,i)=>['token-'+i,{id:'user-'+i}]));
 const messages=[];
 const hub=createLobbyCoordinator({
  authenticate:async token=>tokens.get(token)||null,clock:()=>now,
  newId:()=>String(++seq),idleMs:30000
 });
 hub.subscribe(x=>messages.push(x));
 const join=(i,extra={})=>hub.join('token-'+i,{name:'Dr '+i,color:'navy',x:i*10,y:10,...extra});
 const token=i=>'token-'+i;
 const tick=ms=>now+=ms;
 return {hub,join,tick,token,messages};
};
test('C20a 2/3/4 real authenticated roster members prepare isolated cooperative and competitive rooms',async()=>{
 for(const n of [2,3,4])for(const mode of ['coop','competitive']){
  const f=fixture(n),sessions=[];
  for(let i=0;i<n;i++)sessions.push((await f.join(i)).sessionId);
  const first=await f.hub.createParty(f.token(0),{sessionId:sessions[0],mode,caseId:'APP-001'});
  for(let i=1;i<n;i++){
   await f.hub.invite(f.token(0),{sessionId:sessions[0],partyId:first.id,targetId:'user-'+i});
   await f.hub.accept(f.token(i),{sessionId:sessions[i],partyId:first.id});
  }
  const ready=await f.hub.start(f.token(0),{sessionId:sessions[0],partyId:first.id});
  assert.deepEqual(ready,{roomId:first.id,mode,caseId:'APP-001',
   members:Array.from({length:n},(_,i)=>'user-'+i),status:'ready-for-guard-owner'});
  assert.equal((await f.hub.party(f.token(0),{sessionId:sessions[0],partyId:first.id})).phase,'active');
  await assert.rejects(f.hub.start(f.token(0),{sessionId:sessions[0],partyId:first.id}),/party-not-ready/);
  f.hub.dispose();
 }
});
test('C20a no client fields can forge a member, invite, host or move another account',async()=>{
 const f=fixture(3),sessions=await Promise.all([0,1,2].map(i=>f.join(i)));
 const p=await f.hub.createParty(f.token(0),{sessionId:sessions[0].sessionId,mode:'coop',caseId:'CIRR-001'});
 await assert.rejects(f.hub.invite(f.token(1),{sessionId:sessions[1].sessionId,partyId:p.id,targetId:'user-2'}),/not-party-member/);
 await assert.rejects(f.hub.accept(f.token(2),{sessionId:sessions[2].sessionId,partyId:p.id}),/invitation-missing/);
 await assert.rejects(f.hub.start(f.token(1),{sessionId:sessions[1].sessionId,partyId:p.id}),/not-party-member/);
 await assert.rejects(f.hub.move(f.token(1),{sessionId:sessions[0].sessionId,seq:1,x:5,y:5}),/stale-or-unknown/);
 await assert.rejects(f.hub.createParty('invalid',{sessionId:sessions[0].sessionId,mode:'coop',caseId:'APP-001'}),/not-authenticated/);
 assert.equal(f.hub.diagnostics().parties,1);
 f.hub.dispose();
});
test('C20a stale motion, old sessions after reconnect, party membership and spatial culling',async()=>{
 const f=fixture(4),p=await Promise.all([0,1,2,3].map(i=>f.join(i,{x:i===3?900:100+i*20,y:100})));
 assert.deepEqual((await f.hub.nearby(f.token(0),{sessionId:p[0].sessionId,radius:70})).map(x=>x.id),
  ['user-1','user-2']);
 assert.deepEqual(await f.hub.move(f.token(0),{sessionId:p[0].sessionId,seq:1,x:110,y:100}),
  {applied:true,seq:1});
 assert.deepEqual(await f.hub.move(f.token(0),{sessionId:p[0].sessionId,seq:1,x:900,y:900}),
  {applied:false,reason:'stale-motion',seq:1});
 assert.equal((await f.hub.nearby(f.token(0),{sessionId:p[0].sessionId,radius:70})).length,2);
 const p2=await f.join(0,{x:110,y:100});
 await assert.rejects(f.hub.move(f.token(0),{sessionId:p[0].sessionId,seq:2,x:800,y:800}),/stale-or-unknown/);
 assert.equal((await f.hub.nearby(f.token(0),{sessionId:p2.sessionId,radius:70})).length,2);
 await assert.rejects(f.hub.nearby(f.token(0),{sessionId:p2.sessionId,radius:5000}),/invalid-visibility/);
 f.hub.dispose();
});
test('C20a expired presence, invitations and destroyed parties never persist as ghosts',async()=>{
 const f=fixture(3),s=await Promise.all([0,1,2].map(i=>f.join(i)));
 const p=await f.hub.createParty(f.token(0),{sessionId:s[0].sessionId,mode:'coop',caseId:'APP-001'});
 await f.hub.invite(f.token(0),{sessionId:s[0].sessionId,partyId:p.id,targetId:'user-1'});
 f.tick(31000);
 await assert.rejects(f.hub.accept(f.token(1),{sessionId:s[1].sessionId,partyId:p.id}),/stale-or-unknown/);
 assert.equal(f.hub.diagnostics().players,0);assert.equal(f.hub.diagnostics().parties,0);
 const again=await f.join(0);
 assert.equal(f.hub.diagnostics().players,1);
 assert.equal(await f.hub.disconnect(f.token(0),{sessionId:s[0].sessionId}).then(x=>x.disconnected),false);
 assert.equal((await f.hub.disconnect(f.token(0),{sessionId:again.sessionId})).disconnected,true);
 assert.equal(f.hub.diagnostics().spatialCells,0);
 f.hub.dispose();
});
test('C20a capacity, invitation limit and simultaneous joins cannot exceed four',async()=>{
 const f=fixture(6);const sessions=await Promise.all(Array.from({length:6},(_,i)=>f.join(i)));
 const p=await f.hub.createParty(f.token(0),{sessionId:sessions[0].sessionId,mode:'competitive',caseId:'APP-001'});
 for(let i=1;i<4;i++)await f.hub.invite(f.token(0),{sessionId:sessions[0].sessionId,partyId:p.id,targetId:'user-'+i});
 await assert.rejects(f.hub.invite(f.token(0),{sessionId:sessions[0].sessionId,partyId:p.id,targetId:'user-4'}),/party-full/);
 await assert.rejects(f.hub.start(f.token(0),{sessionId:sessions[0].sessionId,partyId:p.id}),/party-not-ready/);
 await Promise.all([1,2,3].map(i=>f.hub.accept(f.token(i),{sessionId:sessions[i].sessionId,partyId:p.id})));
 const joined=await f.hub.start(f.token(0),{sessionId:sessions[0].sessionId,partyId:p.id});
 assert.equal(joined.members.length,4);
 assert.equal(f.hub.diagnostics().players,6);
 f.hub.dispose();
});
test('C20a spatial directory scales without public full-roster copies',async()=>{
 const f=fixture(600);
 const sessions=[];
 for(let i=0;i<600;i++)sessions.push(await f.join(i,{x:i*12,y:500}));
 const near=await f.hub.nearby(f.token(0),{sessionId:sessions[0].sessionId,radius:100,limit:8});
 assert(near.length<=8);
 assert(near.every(x=>x.id!=='user-0'&&!Object.hasOwn(x,'sessionId')));
 assert(f.hub.diagnostics().spatialCells>20);
 f.hub.dispose();
});
