import test from 'node:test';
import assert from 'node:assert/strict';
import {createGuardRuntime} from '../clinical/guard-runtime.js';
import {clinicalContent as content} from './content.js';
import {createWorld} from '../app/world.js';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createSqliteGuardStore} from '../../../qa/v5/sqlite-guard-store.mjs';

const roster=[{id:'a',name:'A'},{id:'b',name:'B'}];
async function fixture(mode='coop'){
 const r=await createGuardRuntime({roomId:'hint-runtime',caseId:'CIRR-001',members:roster,hostId:'a',mode,nowMs:0,content});
 const navigation=createWorld(content,{id:'a',name:'A'}).navigation,point=navigation.center(...content.beds[0].approach);
 r.motion('a',[point.x,point.y]);r.motion('b',[point.x,point.y]);await r.advanceTo(20000);r.claim('a','hint-runtime:patient');
 return r;
}
function req(r,actor,op,extra={}){return {...r.view(actor).clinical.hintBinding,op,requestId:crypto.randomUUID(),...extra};}
test('runtime requires confirmed selection and denies the rival owner in competitive mode',async()=>{
 const r=await fixture('competitive');try{
  assert.equal((await r.hint('b',req(r,'b','prepare'))).status,'rejected');
  assert.equal((await r.hint('a',req(r,'a','prepare'))).status,'prepared');
 }finally{r.dispose();}
});
test('changing focus invalidates an older offer even after returning to the same patient',async()=>{
 let r=await fixture();const b=req(r,'a','prepare'),offer=await r.hint('a',b),checkpoint=await r.checkpoint();r.dispose();
 checkpoint.focusVersions=[['a',99]];
 r=await createGuardRuntime({roomId:'hint-runtime',checkpoint,content,nowMs:20000});
 try{assert.equal((await r.hint('a',{...b,op:'revalidate',requestId:'late',offerId:offer.offerId})).status,'rejected');
  assert.equal(r.view('a').clinical.hintCount,0);
 }finally{r.dispose();}
});
test('cooperative history and fees remain private and persistent across runtime recreation',async()=>{
 let r=await fixture();r.claim('b','hint-runtime:patient');
 const offer=await r.hint('a',req(r,'a','prepare'));
 await r.hint('a',req(r,'a','revalidate',{offerId:offer.offerId}));
 await r.hint('a',req(r,'a','displayed',{offerId:offer.offerId}));
 assert.equal(r.view('a').clinical.hintCount,1);assert.equal(r.view('b').clinical.hintCount,0);
 const cp=await r.checkpoint();r.dispose();r=await createGuardRuntime({roomId:'hint-runtime',checkpoint:cp,content,nowMs:20000});
 try{assert.equal(r.view('a').clinical.hintCount,1);assert.equal(r.view('b').clinical.hintCount,0);}
 finally{r.dispose();}
});
test('hint acknowledgement is committed by the existing durable CAS before delivery',async()=>{
 const store=createSqliteGuardStore(':memory:');let now=0;
 const server=createDurableGuardAuthority({store,content,now:()=>now});
 try{
  await server.bootstrap({roomId:'durable-hints',caseId:'CIRR-001',members:roster,hostId:'a',actorId:'a'});
  const world=createWorld(content,{id:'a',name:'A'}),pt=world.navigation.center(...content.beds[0].approach);
  await server.transact({roomId:'durable-hints',actorId:'a',motion:[pt.x,pt.y]});now=20000;
  let state=await server.transact({roomId:'durable-hints',actorId:'a',claim:'durable-hints:patient'});
  const binding=state.clinical.hintBinding;
  for(const op of ['prepare','revalidate','displayed']){
   const request={...binding,op,requestId:'request-'+op,...(state.hintAcknowledgement?.offerId?{offerId:state.hintAcknowledgement.offerId}:{})};
   state=await server.transact({roomId:'durable-hints',actorId:'a',hintRequest:request});
   if(op==='revalidate')assert.equal(state.hintAcknowledgement.selectionRevision,binding.selectionRevision);
  }
  assert.equal(state.hintAcknowledgement.status,'displayed');assert.equal(state.clinical.hintCount,1);
  assert.equal((await store.read('durable-hints')).value.runtime.session.hints.history.length,1);
 }finally{store.close();}
});

for(const mode of ['coop','competitive'])test(mode+' credits only the actor’s own revealed hints when a recovered case closes',async()=>{
 let r=await fixture(mode);
 try{
  if(mode==='coop')assert(r.claim('b','hint-runtime:patient'));
  const offer=await r.hint('a',req(r,'a','prepare'));
  for(const op of ['revalidate','displayed'])await r.hint('a',req(r,'a',op,{offerId:offer.offerId}));
  const checkpoint=JSON.parse(JSON.stringify(await r.checkpoint()));r.dispose();
  r=await createGuardRuntime({roomId:'hint-runtime',content,checkpoint,nowMs:20000});
  for(const [id,text] of [['dx','/diagnostico cirrosis descompensada'],['end','/cierre-parcial observacion']])
   await r.post('a',{id,text,targetPatientUid:'hint-runtime:patient'});
  const a=r.view('a'),b=r.view('b'),native=a.clinical.patient.closure.xp;
  assert(native>0);assert.equal(a.clinical.caseReward.xp,Math.floor(native*.95));
  assert.equal(a.clinical.caseReward.hintCount,1);
  assert.deepEqual(a.claims.find(([id])=>id==='a')[1],a.clinical.caseReward);
  assert.equal(a.clinical.caseReward.quality.score,b.clinical.caseReward.quality.score);
  if(mode==='coop'){
   assert.equal(b.clinical.caseReward.xp,native);assert.equal(b.clinical.caseReward.hintCount,0);
   assert.deepEqual(b.claims.find(([id])=>id==='b')[1],b.clinical.caseReward);
  }else{
   assert.equal(b.clinical.caseReward.creditStatus,'ineligible');assert.equal(b.clinical.caseReward.xp,0);
   assert(!b.claims.some(([id])=>id==='b'));
  }
  await r.post('a',{id:'end',text:'/cierre-parcial observacion',targetPatientUid:'hint-runtime:patient'});
  assert.deepEqual(r.view('a').claims,a.claims);
 }finally{r.dispose();}
});

test('a painted hint acknowledgement in the same sync as closure is settled first',async()=>{
 const store=createSqliteGuardStore(':memory:');let now=0;
 const server=createDurableGuardAuthority({store,content,now:()=>now}),roomId='settled-hint-on-close',actorId='a';
 const call=extra=>server.transact({roomId,actorId,...extra});
 try{
  await server.bootstrap({roomId,actorId,caseId:'CIRR-001',members:roster,hostId:actorId});
  const world=createWorld(content,{id:actorId,name:'A'}),pt=world.navigation.center(...content.beds[0].approach);
  await call({motion:[pt.x,pt.y]});now=20000;
  const patientUid=roomId+':patient',claimed=await call({claim:patientUid});
  const binding=claimed.clinical.hintBinding;
  const prepared=await call({hintRequest:{...binding,op:'prepare',requestId:'prepare'}});
  const offerId=prepared.hintAcknowledgement.offerId;
  const verified=await call({hintRequest:{...binding,op:'revalidate',requestId:'revalidate',offerId}});
  assert.equal(verified.hintAcknowledgement.status,'verified');
  const packet={hintRequest:{...binding,op:'displayed',requestId:'displayed',offerId},commands:[
   {id:'diagnosis',text:'/diagnostico cirrosis descompensada',targetPatientUid:patientUid},
   {id:'closure',text:'/cierre-parcial observacion',targetPatientUid:patientUid}
  ]};
  const closed=await call(packet);
  assert.equal(closed.hintAcknowledgement.status,'displayed');
  assert.equal(closed.clinical.caseReward.hintCount,1);
  assert.equal(closed.clinical.caseReward.xp,Math.floor(closed.clinical.patient.closure.xp*.95));
  assert.deepEqual((await call(packet)).claims,closed.claims);
 }finally{store.close();}
});
