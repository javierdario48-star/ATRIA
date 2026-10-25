import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createClinicalHttp,clinicalActorId} from './clinical-http.js';
import {createWorld} from '../app/world.js';

const load=name=>JSON.parse(fs.readFileSync(new URL('../content/'+name+'.json',import.meta.url)));
const content={map:load('hospital'),beds:load('beds'),cases:load('cases'),therapies:load('therapies'),defaultDoses:load('default-doses')};
for(const n of [2,3,4]){
 test('competitive room of '+n+' doctors has persistent single-owner clinical authority',async()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-competitive-'));
  const store=createSqliteGuardStore(path.join(dir,'guard.sqlite'));
  let now=1700000000000;
  const keys=Array.from({length:n},(_,i)=>String.fromCharCode(97+i).repeat(64));
  const ids=keys.map(clinicalActorId),members=ids.map((userId,i)=>({userId,name:'Doctor '+i}));
  const room={id:'comp_'+n,mode:'competitive',hostUserId:ids[0],members,allAccepted:true};
  const makeHttp=()=>createClinicalHttp({enabled:true,
   authority:createDurableGuardAuthority({store,content,now:()=>now}),
   verifiedRoom:async()=>room,probe:async()=>({durable:true})});
  let http=makeHttp();
  const call=(i,action,extra={})=>http({method:'POST',body:{clientKey:keys[i],roomId:room.id,action,...extra}});
  try{
   assert.equal((await call(1,'start',{caseId:'PERI-PBE-001'})).status,403);
   const start=await call(0,'start',{caseId:'PERI-PBE-001'});
   assert.equal(start.status,200);
   const patientUid=start.body.clinical.patient.uid;
   assert.equal(start.body.clinical.competition.ownerId,null);
   assert.equal((await call(1,'sync',{claim:patientUid})).body.clinical.competition.ownerId,null);
   const world=createWorld(content,{id:ids[0],name:members[0].name});
   const point=world.navigation.center(...content.beds[0].approach);
   await call(1,'sync',{motion:[point.x,point.y],motionSequence:1});
   now+=20000;
   const claimed=await call(1,'sync',{claim:patientUid});
   assert.equal(claimed.status,200);
   assert.equal(claimed.body.clinical.competition.ownerId,ids[1]);
   for(let rival=0;rival<n;rival++)if(rival!==1){
    const blocked=await call(rival,'sync',{commands:[{id:'rival-'+rival,text:'/signos'}]});
    assert.equal(blocked.body.acknowledgements[0].status,'rejected');
    assert.equal(blocked.body.acknowledgements[0].reason,'other-player-owns-patient');
   }
   http=makeHttp();
   const owner=await call(1,'sync',{commands:[{id:'owner-signs',text:'/signos'}]});
   assert.equal(owner.status,200);
   assert.equal(owner.body.clinical.competition.ownerId,ids[1]);
   assert.notEqual(owner.body.acknowledgements[0].reason,'other-player-owns-patient');
  }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
 });
}

test('competitive PBE closes once: only bedside owner receives clinical XP; rivals get zero',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-competitive-closure-'));
 const store=createSqliteGuardStore(path.join(dir,'guard.sqlite'));
 let now=100000;
 const roster=[{id:'a',name:'Ana'},{id:'b',name:'Bruno'}],roomId='competitive-close';
 const server=createDurableGuardAuthority({store,content,now:()=>now});
 const call=(actorId,extra={})=>server.transact({roomId,actorId,...extra});
 try{
  const started=await server.bootstrap({roomId,caseId:'PERI-PBE-001',members:roster,hostId:'a',actorId:'a',mode:'competitive'});
  const patient=started.clinical.patient.uid;
  const navigation=createWorld(content,{id:'a',name:'Ana'}).navigation;
  const target=navigation.center(...content.beds[0].approach);
  await call('b',{motion:[target.x,target.y]});
  now+=20000;
  const claimed=await call('b',{claim:patient});
  assert.equal(claimed.clinical.competition.ownerId,'b');
  const texts=['¿Tiene cirrosis?','¿Tiene ascitis?','¿Tuvo fiebre?','¿Notó confusión?','/signos','/diagnostico PBE',
   ...['general','inspection','auscultation','percussion','palpation'].map(x=>'/examen '+x),
   '/estudio pbe_paracentesis','/estudio pbe_renal','Enfermera ceftriaxona 1 g y albumina 1.5 g/kg'];
  for(let i=0;i<texts.length;i++)await call('b',{commands:[{id:'care-'+i,text:texts[i]}]});
  now+=50000;
  const ready=await call('b');
  assert.deepEqual(ready.clinical.eligibleDestinations,['sala']);
  await call('b',{commands:[{id:'reassess',text:'/reevaluar'}]});
  const closed=await call('b',{commands:[{id:'close',text:'/disposicion sala'}]});
  assert.equal(closed.clinical.patient.caseEnded,true);
  assert.equal(closed.claims.length,1);
  assert.equal(closed.claims[0][0],'b');
  assert.equal(closed.claims[0][1].xp,111);
  const scores=closed.clinical.competition.outcomes;
  assert.equal(scores.length,1);
  assert.equal(scores[0].ownerId,'b');
  const tally=(await import('../ui/guard-scoreboard.js')).guardScoreModelV5({
   mode:'competitive',players:roster,outcomes:scores,ownerId:'b'});
  assert.equal(tally.players.find(x=>x.id==='a').xp,0);
  assert.equal(tally.players.find(x=>x.id==='b').xp,111);
  assert.equal(tally.players.find(x=>x.id==='b').resolved,1);
  const attempted=await call('a',{commands:[{id:'late-rival',text:'Enfermera otro antibiótico'}]});
  assert.equal(attempted.acknowledgements[0].status,'rejected');
  assert.equal(attempted.claims.length,1);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});

test('competitive chat while far cannot claim a patient or elicit a remote patient reply',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-spatial-claim-')),store=createSqliteGuardStore(path.join(dir,'guard.sqlite'));
 let now=100000;
 const authority=createDurableGuardAuthority({store,content,now:()=>now});
 const call=(actorId,extra={})=>authority.transact({roomId:'spatial',actorId,...extra});
 try{
  const start=await authority.bootstrap({roomId:'spatial',caseId:'PERI-PBE-001',
   members:[{id:'a',name:'Ana'},{id:'b',name:'Bruno'}],hostId:'a',actorId:'a',mode:'competitive'});
  const first=start.clinical.shift.patients[0],second=start.clinical.shift.patients[1];
  for(const [actor,id] of [['a','greet-far'],['b','greet-other']]){
   const result=await call(actor,{commands:[{id,text:'hola'}]});
   assert.equal(result.acknowledgements[0].reason,'approach-patient-to-claim');
   assert.equal(result.clinical.shift.patients[0].ownerId,null);
   assert.equal(result.clinical.shift.patients[1].ownerId,null);
   assert.equal(result.clinical.room.transcript.length,0);
  }
  const point=createWorld(content,{id:'a',name:'Ana'}).navigation.center(
   ...content.beds.find(b=>b.id===second.bedId).approach);
  await call('b',{motion:[point.x,point.y],motionSequence:1});
  now+=20000;await call('b');
  const greeting=await call('b',{commands:[{id:'near-but-unclaimed',text:'hola'}]});
  assert.equal(greeting.acknowledgements[0].reason,'approach-patient-to-claim');
  assert.equal(greeting.clinical.shift.patients[1].ownerId,null);
  const touched=await call('b',{claim:second.uid});
  assert.equal(touched.clinical.patient.uid,second.uid);
  assert.equal(touched.clinical.shift.patients[1].ownerId,'b');
  assert.equal(touched.clinical.shift.patients[0].ownerId,null);
  const talk=await call('b',{commands:[{id:'bedside-hello',text:'hola'}]});
  assert.equal(talk.acknowledgements[0].status,'received');
  assert.equal(talk.clinical.patient.uid,second.uid);
  assert(talk.clinical.room.transcript.some(x=>x.text==='hola'&&x.patientUid===second.uid));
  assert(talk.clinical.messages.some(x=>x.role==='patient'));
  const rival=await call('a',{commands:[{id:'other-bed-hello',text:'hola'}]});
  assert.equal(rival.acknowledgements[0].reason,'approach-patient-to-claim');
  assert.equal(rival.clinical.shift.patients[0].ownerId,null);
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
