import test from 'node:test';
import assert from 'node:assert/strict';
import {createLocalGuardStore,scopedStorage} from './local-guard-checkpoint.js';
import {createLocalShift} from './local-shift.js';
import {createWorld} from './world.js';
import {createGuardSession} from '../clinical/guard-session.js';
import {createShiftFlow} from '../clinical/shift-flow.js';
import {createProgressionLedger} from '../clinical/progression.js';
import {clinicalContent as content} from '../server/content.js';
function memory(){const map=new Map();return {getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};}
test('V1, V2 and another source SHA cannot overwrite one another or the normal online profile',()=>{
 const base=memory(),v1=scopedStorage(base,'offline-v1'),v2=scopedStorage(base,'offline-v2');
 base.setItem('atria.v5.profile.v1','online');v1.setItem('atria.v5.profile.v1','v1');v2.setItem('atria.v5.profile.v1','v2');
 assert.equal(base.getItem('atria.v5.profile.v1'),'online');assert.equal(v1.getItem('atria.v5.profile.v1'),'v1');
 assert.equal(v2.getItem('atria.v5.profile.v1'),'v2');
 assert.notEqual(createLocalGuardStore({storage:v1,buildId:'a'}).key,createLocalGuardStore({storage:v1,buildId:'b'}).key);
});
test('two actual local patient checkpoints restore one ledger, debt, clock, studies and travelling nursing without duplicate XP',async()=>{
 const storage=memory(),store=createLocalGuardStore({storage,buildId:'test-sha',now:()=>'2026-11-22'}),roomId='local-checkpoint';
 const profile={name:'Local',scrubColor:'navy',sex:'male'},world=createWorld(content,profile),progress=createProgressionLedger();
 const admissions=createShiftFlow({content,roomId,mode:'solo',firstCaseId:'CIRR-001'}),shift=createLocalShift({caseIds:content.cases.map(c=>c.id)});
 shift.begin({caseId:'CIRR-001'});const first=admissions.advance(0)[0];world.enterGuard({mode:'solo',caseId:first.caseId,patientUid:first.uid,bedId:first.bedId});
 const second=admissions.advance(180)[0];world.addPatient({uid:second.uid,caseId:second.caseId,bedId:second.bedId});
 const sessions=[first,second].map(r=>createGuardSession({roomId,mode:'solo',actorId:'local-player',actorName:profile.name,
  content,progress,patient:r,resolveContext:()=>({patientUid:r.uid}),nursing:{
   enqueue:task=>world.enqueueNurseJourney(task),takeArrivals:()=>world.takeNurseArrivals(r.uid),accept:v=>world.acceptNurseClinicalResult(v)}}));
 const restored=[];
 try{
  await sessions[0].post({id:'unsafe',text:'/disposicion alta'});assert.equal(progress.read().xpDebt,15);
  await sessions[0].post({id:'pending-drug',text:'Enfermera espironolactona 100 mg'});
  await sessions[0].post({id:'pending-study',text:'/estudio renal'});
  sessions[0].advance(2);await sessions[0].flush();
  const checkpoints=await Promise.all(sessions.map(s=>s.checkpoint()));
  assert(checkpoints[0].pendingNurseJobs.length>0,'travelling nursing is owned by the session transport, before native preparation starts');
  assert(world.checkpoint().nursing.tasks.length>0,'the spatial nursing queue remains unfinished');
  const record={roomId,mode:'solo',profile,world:world.checkpoint(),admissions:admissions.checkpoint(),shift:shift.snapshot(),
   progress:progress.read(),focusedUid:first.uid,sessions:checkpoints};
  store.save(record);const saved=store.read(),ledger=createProgressionLedger(saved.progress);
  const w=createWorld(content,profile,saved.world),flow=createShiftFlow({content,roomId,mode:'solo',firstCaseId:first.caseId,snapshot:saved.admissions});
  const s2=createLocalShift({caseIds:content.cases.map(c=>c.id)});s2.restore(saved.shift);assert.deepEqual(s2.snapshot(),shift.snapshot());
  for(const checkpoint of saved.sessions)restored.push(createGuardSession({roomId,mode:'solo',actorId:'local-player',actorName:profile.name,
   content,progress:ledger,patient:flow.record(checkpoint.patient.uid),checkpoint,sharedCheckpointProgress:true,
   resolveContext:()=>({patientUid:checkpoint.patient.uid}),nursing:{enqueue:task=>w.enqueueNurseJourney(task),
    takeArrivals:()=>w.takeNurseArrivals(checkpoint.patient.uid),accept:v=>w.acceptNurseClinicalResult(v)}}));
  for(let i=0;i<2;i++){assert.deepEqual(restored[i].read().patient,sessions[i].read().patient);assert.deepEqual(restored[i].read().clock,sessions[i].read().clock);}
  assert.deepEqual(w.checkpoint().nursing,world.checkpoint().nursing);
  await restored[0].post({id:'unsafe',text:'/disposicion alta'});assert.equal(ledger.read().penalties.length,1);
  const beforeNew=restored[0].read().room.transcript.length;
  await restored[0].post({id:'message-new-document-1',text:'/signos'});
  assert(restored[0].read().room.transcript.length>beforeNew,'a newly identified post-recovery command executes in the original room');
  const reward={kind:'clinical.closure',eventId:'other-closure',patientUid:'other',actorId:'local-player',closed:true,xp:133};
  ledger.award(reward);ledger.award(reward);
  assert.equal(restored[0].read().progress.xp,118);assert.equal(restored[1].read().progress.xp,118,'all restored sessions still share one career');
  const prior=storage.getItem(store.key),bad=structuredClone(record);bad.sessions[0].roomId='wrong-room';
  assert.throws(()=>store.save(bad),/mismatch/);assert.equal(storage.getItem(store.key),prior,'invalid save preserves previous playable checkpoint');
 }finally{for(const s of [...sessions,...restored])s.dispose();}
});
