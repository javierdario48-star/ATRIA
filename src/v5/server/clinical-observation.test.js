import test from 'node:test';
import assert from 'node:assert/strict';
import {createDurableGuardAuthority} from './durable-guard-authority.js';
import {createClinicalHttp} from './clinical-http.js';
import {clinicalContent as content} from './content.js';

async function fixture(){
 let value=null,revision=0,writes=0,clock=100000,holdCommit=null;
 const copy=structuredClone;
 const store={read:async()=>value?{etag:String(revision),value:copy(value)}:null,
  async compareAndSwap(room,etag,next){
   if(holdCommit&&next.lease===null&&etag!==null)await holdCommit;
   if(etag!==(value?String(revision):null))return null;
   value=copy(next);writes++;return String(++revision);
  }};
 const authority=createDurableGuardAuthority({store,content,now:()=>clock});
 await authority.bootstrap({roomId:'observe-room',caseId:'FECAL-001',members:[{id:'a',name:'Ana'},{id:'b',name:'Bruno'}],hostId:'a',actorId:'a'});
 return {authority,store,get writes(){return writes;},tick:ms=>clock+=ms,
  hold(promise){holdCommit=promise;},read:()=>copy(value)};
}

test('a committed guard can be observed without advancing physiology or contending for its writer',async()=>{
 const f=await fixture();
 assert.equal(typeof f.authority.observe,'function','the authority exposes a read-only committed view');
 const before=f.read(),writes=f.writes;f.tick(20000);
 const [a,b]=await Promise.all(['a','b'].map(actorId=>f.authority.observe({roomId:'observe-room',actorId})));
 assert.equal(a.epoch,0);assert.equal(b.epoch,0);
 assert.equal(a.clinical.patient.uid,b.clinical.patient.uid);
 assert.deepEqual(f.read(),before);assert.equal(f.writes,writes);
 await assert.rejects(f.authority.observe({roomId:'observe-room',actorId:'intruder'}),error=>error.code==='forbidden');
});

test('an observer during a pending commit sees the previous committed epoch and no unconfirmed command',async()=>{
 const f=await fixture();
 assert.equal(typeof f.authority.observe,'function');
 let release;f.hold(new Promise(resolve=>release=resolve));
 const mutation=f.authority.transact({roomId:'observe-room',actorId:'a',commands:[{id:'question',text:'Hola'}]});
 while(!f.read().lease)await new Promise(resolve=>setImmediate(resolve));
 const view=await f.authority.observe({roomId:'observe-room',actorId:'b'});
 assert.equal(view.epoch,0);assert.equal(view.clinical.room.transcript.length,0);
 const idle=await f.authority.transact({roomId:'observe-room',actorId:'b'});
 assert.equal(idle.readOnly,true,'an idle colleague must not contend with a clinical order');
 assert.equal(idle.epoch,0);
 release();const done=await mutation;
 const observed=await f.authority.observe({roomId:'observe-room',actorId:'b'});
 assert.equal(observed.epoch,done.epoch);
 assert.equal(observed.clinical.room.transcript.filter(row=>row.id==='question').length,1);
});

test('redundant idle heartbeats reuse committed state while a due clinical tick still advances once',async()=>{
 const f=await fixture(),initial=f.writes;
 const idle=await f.authority.transact({roomId:'observe-room',actorId:'b'});
 assert.equal(idle.readOnly,true);assert.equal(f.writes,initial);
 f.tick(900);
 const tick=await f.authority.transact({roomId:'observe-room',actorId:'a'});
 assert.equal(tick.epoch,1);assert.equal(tick.clinical.clock.gameMinute,.9);
 assert.equal(tick.commitNotice,false,'a plain clock tick is not a clinical chat event');
 const sibling=await f.authority.transact({roomId:'observe-room',actorId:'b'});
 assert.equal(sibling.epoch,1);assert.equal(sibling.readOnly,true);
});

test('HTTP observation authenticates its actor but does not fetch a physician profile or admit commands',async()=>{
 const calls=[],identity={id:'a',account:{name:'Ana'}};
 const route=createClinicalHttp({enabled:true,resolveActor:async()=>identity,
  authority:{observe:async input=>{calls.push(input);return {epoch:7,clinical:{patient:{uid:'p'}}};}},
  memberProfile:async()=>{throw Error('an observation must not fetch or change the doctor profile');},
  beforeTransact:async input=>calls.push(input.action),verifiedRoom:async()=>null});
 const response=await route({method:'POST',body:{action:'observe',roomId:'room',actorId:'other',
  targetPatientUid:'p',commands:[{id:'not-executed',text:'Enfermera, morfina 40 mg IV'}]}});
 assert.equal(response.status,200);
 assert.deepEqual(calls,['observe',{roomId:'room',actorId:'a',targetPatientUid:'p'}]);
 assert.equal(response.body.epoch,7);
});

test('the first invited doctor joins through the fenced transaction before using read-only observation',async()=>{
 const f=await fixture();let admitted=false,observations=0;
 Object.defineProperty(f.store,'requiresAdmission',{get:()=>!admitted});
 f.store.observe=async room=>{
  observations++;
  if(!admitted)throw Object.assign(Error('not yet a controller'),{code:'forbidden'});
  return f.store.read(room);
 };
 const cas=f.store.compareAndSwap;
 f.store.compareAndSwap=async(...args)=>{const result=await cas(...args);if(result)admitted=true;return result;};
 const joined=await f.authority.transact({roomId:'observe-room',actorId:'b'});
 assert.equal(joined.readOnly,undefined);assert.equal(joined.epoch,1);assert.equal(admitted,true);
 assert.equal(observations,0,'joining must not require a controller that only its CAS can establish');
 const idle=await f.authority.transact({roomId:'observe-room',actorId:'b'});
 assert.equal(idle.readOnly,true);assert.equal(observations,1);
});
