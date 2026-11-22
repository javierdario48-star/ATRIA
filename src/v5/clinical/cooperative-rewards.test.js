import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardRuntime} from './guard-runtime.js';
import {clinicalContent as content} from '../server/content.js';
import {createNavigation} from '../engine/navigation.js';

async function fixture(size=2,mode='coop'){
 const members=Array.from({length:size},(_,i)=>({id:String.fromCharCode(97+i),name:'Doctor '+i}));
 const roomId='shared-reward-'+size+'-'+mode;
 let runtime=await createGuardRuntime({content,roomId,caseId:'CIRR-001',members,hostId:'a',mode,nowMs:0});
 const point=createNavigation(content.map).center(...content.beds[0].approach),uid=roomId+':patient';
 for(const m of members)runtime.motion(m.id,[point.x,point.y]);
 await runtime.advanceTo(20000);
 for(const m of members)if(mode!=='competitive'||m.id==='a')assert(runtime.claim(m.id,uid));
 const hint=async actor=>{
  const binding=runtime.view(actor).clinical.hintBinding;
  const offer=await runtime.hint(actor,{...binding,op:'prepare',verify:true,requestId:crypto.randomUUID()});
  assert.equal(offer.status,'verified');
  const request={...binding,op:'displayed',offerId:offer.offerId,requestId:crypto.randomUUID()};
  const ack=await runtime.hint(actor,request);
  assert.deepEqual(await runtime.hint(actor,request),ack);
  return ack;
 };
 const send=(actor,id,text)=>runtime.post(actor,{id,text,targetPatientUid:uid});
 const control=(actor,op)=>runtime.shiftControl(actor,{op,requestId:crypto.randomUUID(),turnId:runtime.view(actor).clinical.shift.turn.id});
 return {get r(){return runtime;},members,hint,send,control,async restore(){
  const checkpoint=await runtime.checkpoint();runtime.dispose();
  runtime=await createGuardRuntime({content,roomId,checkpoint,nowMs:20000});
 },dispose(){runtime.dispose();}};
}
for(const size of [2,3,4])test('cooperative '+size+' doctors share one displayed hint and one closure discount across recovery',async()=>{
 const f=await fixture(size);
 try{
  assert.equal((await f.hint('a')).newHint,true);
  for(const m of f.members)assert.equal(f.r.view(m.id).clinical.hintCount,1);
  assert.equal((await f.hint('b')).newHint,false,'another doctor repeating the same action is free');
  await f.restore();
  await f.send('a','dx','/diagnostico cirrosis descompensada');
  await f.send('b','close','/cierre-parcial observacion');
  const views=f.members.map(m=>f.r.view(m.id)),xp=views[0].clinical.caseReward.xp;
  for(const v of views){
   assert.equal(v.clinical.caseReward.xp,xp);
   assert.equal(v.clinical.caseReward.hintCount,1);
   assert.equal(v.clinical.caseReward.xp,Math.floor(v.clinical.caseReward.baseXP*.95));
   assert.equal(v.clinical.progress.xp,xp);
  }
  const claims=f.r.view('a').claims;
  await f.send('b','close','/cierre-parcial observacion');
  assert.deepEqual(f.r.view('a').claims,claims);
 }finally{f.dispose();}
});
test('cooperative absence excludes hint fees and unsafe-decision debt; rejoin cannot invent missing credit',async()=>{
 const f=await fixture(3);
 try{
  assert.equal(f.control('c','leave').status,'accepted');
  await f.hint('a');
  for(const actor of ['a','b'])assert.equal(f.r.view(actor).clinical.hintCount,1);
  assert.equal(f.r.view('c').clinical.hintCount,0);
  const before=f.r.view('a').clinical.patient;
  await f.send('a','unsafe','/disposicion alta');
  assert.deepEqual(f.r.view('b').clinical.patient,before);
  for(const actor of ['a','b'])assert.equal(f.r.view(actor).clinical.progress.xpDebt,15);
  assert.equal(f.r.view('c').clinical.progress.xpDebt,0);
  await f.restore();
  assert.equal(f.control('c','resume').status,'accepted');
  assert.equal(f.r.view('c').clinical.hintCount,0);
  assert.equal(f.r.view('c').clinical.progress.xpDebt,0);
  await f.send('a','unsafe','/disposicion alta');
  assert.equal(f.r.view('b').clinical.progress.xpDebt,15);
  assert.equal(f.r.view('c').clinical.progress.xpDebt,0,'replaying an old event cannot include a later participant');
 }finally{f.dispose();}
});
