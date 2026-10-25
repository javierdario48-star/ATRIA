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
    assert.equal(blocked.body.acknowledgements[0].reason,'approach-patient-to-claim',
     'distant rivals cannot target any patient, owned or otherwise');
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
  assert.equal(greeting.acknowledgements[0].status,'received',
   'a greeting beside exactly one available bed establishes real first contact');
  assert.equal(greeting.clinical.shift.patients[1].ownerId,'b');
  assert.equal(greeting.clinical.shift.patients[0].ownerId,null);
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


test('two competitive doctors type beside distant beds: each message targets only their own patient, without tapping a rival',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-competitive-nearby-'));
 const store=createSqliteGuardStore(path.join(dir,'guard.sqlite'));
 let now=1700000000000;
 const create=()=>createDurableGuardAuthority({store,content,now:()=>now});
 let authority=create();
 const call=(actorId,extra={})=>authority.transact({roomId:'independent-beds',actorId,...extra});
 try{
  const opening=await authority.bootstrap({roomId:'independent-beds',caseId:'PERI-PBE-001',
   members:[{id:'a',name:'A'},{id:'b',name:'B'}],hostId:'a',actorId:'a',mode:'competitive'});
  const [first,second]=opening.clinical.shift.patients;
  assert.notEqual(first.bedId,second.bedId);
  const nav=createWorld(content,{id:'a',name:'A'}).navigation;
  const point=uid=>nav.center(...content.beds.find(b=>b.id===(uid===first.uid?first.bedId:second.bedId)).approach);
  const initial=await call('a',{commands:[{id:'from-far-away',text:'hola'}]});
  assert.equal(initial.acknowledgements[0].reason,'approach-patient-to-claim');
  assert(initial.clinical.shift.patients.every(p=>!p.ownerId));
  const one=point(first.uid),two=point(second.uid);
  await call('b',{motion:[one.x,one.y],motionSequence:1});
  await call('a',{motion:[two.x,two.y],motionSequence:1});
  now+=20000;
  const other=await call('b',{claim:first.uid});
  assert.equal(other.clinical.shift.patients[0].ownerId,'b');
  // Physician A still has the old first-patient snapshot. The unscoped
  // typed greeting must NOT be sent to B's patient and must not be blocked.
  assert.equal((await call('a')).clinical.patient.uid,first.uid);
  const greeting=await call('a',{commands:[{id:'next-box-hello',text:'hola'}]});
  assert.equal(greeting.acknowledgements[0].status,'received');
  assert.equal(greeting.clinical.patient.uid,second.uid);
  assert.equal(greeting.clinical.shift.patients[1].ownerId,'a');
  assert.equal(greeting.clinical.shift.patients[0].ownerId,'b');
  assert(greeting.clinical.room.transcript.some(m=>m.text==='hola'&&m.patientUid===second.uid));
  const stranger=await call('b',{commands:[{id:'first-box-signs',text:'/signos'}]});
  assert.equal(stranger.clinical.patient.uid,first.uid);
  assert(stranger.clinical.room.transcript.some(m=>m.text==='/signos'));
  assert(!stranger.clinical.room.transcript.some(m=>m.text==='hola'&&m.patientUid===second.uid));
  const stale=await call('a',{commands:[{id:'stale-first-target',text:'/signos',targetPatientUid:first.uid}]});
  assert.equal(stale.acknowledgements[0].reason,'patient-selection-changed');
  authority=create();
  const restored=await call('a',{commands:[{id:'persisted-second-target',text:'/signos'}]});
  assert.equal(restored.clinical.patient.uid,second.uid);
  assert.equal(restored.clinical.shift.patients[1].ownerId,'a');
  assert(restored.clinical.room.transcript.some(m=>m.text==='/signos'));
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});


test('competitive manual claim on a rival bed never hijacks the physician focus, even after restart',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-rival-focus-'));
 const store=createSqliteGuardStore(path.join(dir,'room.sqlite'));
 let now=1700000000000;
 const server=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11400});
 let authority=server();
 const call=(actorId,extra={})=>authority.transact({roomId:'rival-focus',actorId,...extra});
 try{
  const start=await authority.bootstrap({roomId:'rival-focus',caseId:'CIRR-001',
   members:[{id:'a',name:'Ana'},{id:'b',name:'Bruno'}],hostId:'a',actorId:'a',mode:'competitive'});
  const [first,second]=start.clinical.shift.patients;
  const navigation=createWorld(content,{id:'a',name:'Ana'}).navigation;
  const place=record=>navigation.center(...content.beds.find(x=>x.id===record.bedId).approach);
  const one=place(first),two=place(second);
  await call('a',{motion:[two.x,two.y],motionSequence:1});
  await call('b',{motion:[one.x,one.y],motionSequence:1});
  now+=20000;
  assert.equal((await call('a',{claim:second.uid})).clinical.patient.uid,second.uid);
  assert.equal((await call('b',{claim:first.uid})).clinical.patient.uid,first.uid);
  await call('a',{motion:[one.x,one.y],motionSequence:2});
  now+=25000;
  const blocked=await call('a',{claim:first.uid});
  assert.equal(blocked.clinical.shift.patients[0].ownerId,'b');
  assert.equal(blocked.clinical.shift.patients[1].ownerId,'a');
  assert.equal(blocked.clinical.patient.uid,second.uid,
   'touching an occupied rival bed cannot switch the clinical snapshot');
  const speech=await call('a',{commands:[{id:'attempt-rival-order',text:'/signos'}]});
  assert.equal(speech.acknowledgements[0].reason,'other-player-owns-patient');
  assert.equal(speech.clinical.patient.uid,second.uid);
  assert.equal(speech.claims.length,0);
  authority=server();
  const restored=await call('a');
  assert.equal(restored.clinical.patient.uid,second.uid);
  assert.equal(restored.clinical.shift.patients[0].ownerId,'b');
  assert.equal(restored.clinical.shift.patients[1].ownerId,'a');
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});


test('one competitive physician retains two independent patient histories when switching beds and reconnecting',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'atria-own-bed-switch-'));
 const store=createSqliteGuardStore(path.join(dir,'guard.sqlite'));
 let now=1700000000000,authority;
 const makeAuthority=()=>createDurableGuardAuthority({store,content,now:()=>now,maxSteps:11000});
 authority=makeAuthority();
 const roomId='two-beds-one-owner';
 const call=(actorId,extra={})=>authority.transact({roomId,actorId,...extra});
 try{
  const opened=await authority.bootstrap({roomId,caseId:'CIRR-001',
   members:[{id:'a',name:'Ana'},{id:'b',name:'Bruno'}],hostId:'a',actorId:'a',mode:'competitive'});
  const [first,second]=opened.clinical.shift.patients;
  const navigation=createWorld(content,{id:'a',name:'Ana'}).navigation;
  const position=record=>navigation.center(...content.beds.find(x=>x.id===record.bedId).approach);
  const greeting='Hola ¿Qué te pasó?';
  async function go(record,sequence){
   const point=position(record);
   const sent=await call('b',{motion:[point.x,point.y],motionSequence:sequence});
   assert.equal(sent.clinical.shift.patients.length,2);
   now+=25000;
   const selected=await call('b',{claim:record.uid});
   assert.equal(selected.clinical.patient.uid,record.uid,'server must accept intended bedside UID');
   assert.equal(selected.clinical.shift.patients.find(x=>x.uid===record.uid).ownerId,'b');
   return selected;
  }
  await go(first,1);
  const a=await call('b',{commands:[{id:'first-history',text:greeting,targetPatientUid:first.uid}]});
  assert(a.acknowledgements[0].clinical.some(x=>x.kind==='history.ask'&&x.status==='executed'&&x.receipt?.message));
  assert.equal(a.clinical.patient.uid,first.uid);
  const firstFacts=structuredClone(a.clinical.patient.intentHistory);
  assert(firstFacts.length>0);
  await go(second,2);
  const b=await call('b',{commands:[{id:'second-history',text:greeting,targetPatientUid:second.uid}]});
  assert(b.acknowledgements[0].clinical.some(x=>x.kind==='history.ask'&&x.status==='executed'&&x.receipt?.message));
  assert.equal(b.clinical.patient.uid,second.uid);
  const secondFacts=structuredClone(b.clinical.patient.intentHistory);
  assert(secondFacts.length>0);
  assert(!b.clinical.room.transcript.some(x=>x.id==='first-history'),'another bed cannot inherit dialogue');
  await go(first,3);
  const returned=await call('b');
  assert.deepEqual(returned.clinical.patient.intentHistory,firstFacts);
  assert(returned.clinical.room.transcript.some(x=>x.id==='first-history'));
  assert(!returned.clinical.room.transcript.some(x=>x.id==='second-history'));
  assert(returned.clinical.shift.patients.slice(0,2).every(x=>x.ownerId==='b'));
  assert.equal(returned.claims.length,0,'switching focus cannot mint experience');
  authority=makeAuthority();
  const restored=await call('b');
  assert.equal(restored.clinical.patient.uid,first.uid);
  assert.deepEqual(restored.clinical.patient.intentHistory,firstFacts);
  await go(second,4);
  const back=await call('b');
  assert.deepEqual(back.clinical.patient.intentHistory,secondFacts);
  assert(back.clinical.room.transcript.some(x=>x.id==='second-history'));
 }finally{store.close();fs.rmSync(dir,{recursive:true,force:true});}
});
