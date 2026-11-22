import test from 'node:test';
import assert from 'node:assert/strict';
import {applyClinicalPenalties} from './apply-clinical-penalties.js';
import {createProgressionLedger} from '../clinical/progression.js';
import {createGuardSession} from '../clinical/guard-session.js';
import {clinicalContent as content} from '../server/content.js';

async function nativeErrors(){
 const roomId='app-shared-debt',uid='P',members=['a','b','c'].map(id=>({id,name:'Doctor '+id}));
 const s=createGuardSession({roomId,mode:'coop',actorId:'a',actorName:'Doctor A',members,content,
  patient:{uid,caseId:'CIRR-001'},authenticate:id=>({id,roomId}),resolveContext:()=>({patientUid:uid}),
  activeParticipants:()=>['a','b']});
 try{
  await s.post({id:'bad-a',text:'/disposicion alta'},'a');
  await s.post({id:'bad-b',text:'/disposicion alta'},'b');
  await s.post({id:'bad-obs',text:'/disposicion observacion'},'b');
  return s.read().progress.penalties;
 }finally{s.dispose();}
}
test('actual native Alta and Observation debts reach each active cooperative device, retain two authors and survive replay/reload',async()=>{
 const penalties=await nativeErrors();assert.equal(penalties.length,3);
 for(const actorId of ['a','b','c']){
  let progress=createProgressionLedger();
  applyClinicalPenalties(progress,penalties,{actorId,shared:true});
  assert.equal(progress.read().xpDebt,actorId==='c'?0:45);
  progress=createProgressionLedger(JSON.parse(JSON.stringify(progress.read())));
  applyClinicalPenalties(progress,penalties,{actorId,shared:true});
  assert.equal(progress.read().xpDebt,actorId==='c'?0:45);
  if(actorId!=='c')assert.deepEqual(progress.read().penalties.map(p=>p.actorId),['a','b','b']);
  progress.award({kind:'clinical.closure',actorId,patientUid:'next',eventId:'next',xp:100,closed:true});
  assert.equal(progress.read().xp,actorId==='c'?100:55);
 }
});
test('individual projection charges only its own native author, even if a cooperative cohort is present',async()=>{
 const penalties=await nativeErrors();
 for(const [actorId,debt] of [['a',15],['b',30],['c',0]]){
  const progress=createProgressionLedger();applyClinicalPenalties(progress,penalties,{actorId,shared:false});
  assert.equal(progress.read().xpDebt,debt);
 }
});
test('a runtime financial projection does not erase the original author when persisted by a teammate',async()=>{
 const penalties=await nativeErrors(),progress=createProgressionLedger();
 const projected=penalties.map(p=>({...p,actorId:'a',sourceActorId:p.actorId}));
 applyClinicalPenalties(progress,projected,{actorId:'a',shared:true});
 applyClinicalPenalties(progress,projected,{actorId:'a',shared:true});
 assert.equal(progress.read().xpDebt,45);assert.equal(progress.read().penalties.length,3);
});
