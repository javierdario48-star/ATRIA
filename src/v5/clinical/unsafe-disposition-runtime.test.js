import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardRuntime} from './guard-runtime.js';
import {clinicalContent as content} from '../server/content.js';
import {createNavigation} from '../engine/navigation.js';

for(const destination of ['alta','observacion'])test(
 'competitive '+destination+': Dr Vega reprimand releases ownership; another doctor claims same patient after durable recovery',
 async()=>{
  const roomId='reprimand-reclaim-'+destination;
  let nowMs=1700000000000,runtime,sequence=0;
  const members=[{id:'a',name:'Ana'},{id:'b',name:'Bruno'}];
  const make=checkpoint=>createGuardRuntime({content,roomId,caseId:'RESP-01',
   mode:'competitive',members,hostId:'a',nowMs,checkpoint});
  const advance=async seconds=>{
   nowMs+=Math.round(seconds*1000);
   while((await runtime.advanceTo(nowMs)).recovering){}
  };
  try{
   runtime=await make(null);
   const uid=runtime.view('a').clinical.patient.uid;
   const beds=runtime.view('a').clinical.shift.patients;
   const bed=content.beds.find(x=>x.id===beds[0].bedId);
   const target=createNavigation(content.map).center(...bed.approach);
   assert(runtime.motion('a',[target.x,target.y],1));
   for(let i=0;i<120&&!runtime.claim('a',uid);i++)await advance(.25);
   assert.equal(runtime.view('a').clinical.shift.patients[0].ownerId,'a');
   const initial=await runtime.post('a',{id:'diagnosis',text:'/diagnostico neumonía adquirida en la comunidad',targetPatientUid:uid});
   assert.equal(initial.clinical?.[0]?.status,'executed');
   const before=runtime.view('a').clinical.patient;
   const intent={id:'wrong-'+destination,text:'/disposicion '+destination,targetPatientUid:uid};
   const bad=await runtime.post('a',intent);
   assert.equal(bad.clinical?.[0]?.status,'executed');
   const receipt=bad.clinical[0].receipt;
   assert.equal(receipt.disposition?.kind,destination==='alta'?
    'clinical.unsafe-discharge':'clinical.unsafe-observation');
   const after=runtime.view('a');
   assert.equal(after.clinical.shift.patients[0].ownerId,null);
   assert.equal(after.clinical.shift.patients[0].closed,false);
   assert.deepEqual(after.clinical.patient,before,'failed destination must preserve patient state');
   assert.equal(after.dischargePenalties.length,1);
   assert.equal(after.clinical.progress.xpDebt,15,'author must retain their own XP debt');
   assert.equal(after.clinical.progress.penalties.length,1);
   assert.equal(after.dischargePenalties[0].actorId,'a');
   assert.equal(after.dischargePenalties[0].loss,15);
   const save=await runtime.checkpoint();
   runtime.dispose();
   runtime=await make(save);
   // Retry is an immutable previous receipt; it cannot re-take ownership.
   const replay=await runtime.post('a',intent);
   assert.deepEqual(replay.clinical?.[0],bad.clinical?.[0]);
   assert.equal(runtime.view('a').clinical.shift.patients[0].ownerId,null);
   assert(runtime.motion('b',[target.x+18,target.y],1));
   for(let i=0;i<120&&!runtime.claim('b',uid);i++)await advance(.25);
   assert.equal(runtime.view('b').clinical.shift.patients[0].ownerId,'b');
   const continued=await runtime.post('b',{id:'continuation-'+(++sequence),
    text:'/signos',targetPatientUid:uid});
   assert.equal(continued.clinical?.[0]?.status,'executed');
   const patient=runtime.view('b').clinical.patient;
   assert.equal(patient.uid,uid);
   assert.equal(patient.diagnosis,before.diagnosis);
   assert.equal(patient.caseEnded,false);
   assert.equal(runtime.view('b').clinical.progress.xpDebt,0,
    'successor doctor cannot inherit the previous owner\'s XP debt');
   assert.deepEqual(runtime.view('b').clinical.progress.penalties,[],
    'successor cannot read first doctor private penalty receipts');
   assert.equal(runtime.view('b').dischargePenalties.length,0,
    'a colleague cannot read another doctor\'s private penalty');
  }finally{runtime?.dispose();}
 });
