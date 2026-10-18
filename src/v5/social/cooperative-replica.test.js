import test from 'node:test';
import assert from 'node:assert/strict';
import {createCooperativeReplica} from './cooperative-replica.js';
test('a reconnecting cooperative view retries the same order and only accepts monotonic same-patient host evidence',async()=>{
 const values=new Map(),storage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},sent=[];
 const create=()=>createCooperativeReplica({roomId:'room',hostId:'host',storage,send:(id,v)=>sent.push({id,v})});
 const a=create(),envelope={id:'unique-order',text:'Enfermera ceftriaxona 1 g'};
 a.post(envelope);a.maintain(2000);assert(sent.every(x=>x.v.envelope.id==='unique-order'));a.dispose();
 const b=create();b.maintain(4000);assert.deepEqual(sent.at(-1).v.envelope,envelope,'unacknowledged order survives reload without a new event ID');
 const state={kind:'state',roomId:'room',sequence:1,clinical:{room:{roomId:'room',revision:2},patient:{uid:'P',liveVitals:{sys:96}},clock:{nativeMinute:3}},catalog:[],spatial:{}};
 assert(b.apply(state));b.advance(60);assert.equal(b.read().clock.nativeMinute,3,'replica never simulates');
 assert(!b.apply({...state,sequence:0}));assert(!b.apply({...state,sequence:2,clinical:{...state.clinical,patient:{uid:'foreign'}}}));
 assert(b.apply({kind:'ack',ack:{roomId:'room',commandId:envelope.id,status:'received'}}));assert.equal(JSON.parse([...values.values()][0]).length,0);
 b.dispose();
});
