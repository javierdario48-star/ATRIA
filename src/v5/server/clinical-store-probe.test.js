import test from 'node:test';
import assert from 'node:assert/strict';
import {createClinicalStoreProbe} from './clinical-store-probe.js';
function fakeCasStore(){
 let row=null,successful=0,conflicts=0;
 return {
  get successful(){return successful;},get conflicts(){return conflicts;},
  get row(){return structuredClone(row);},
  async read(id){assert.equal(id,'storage-capability');await Promise.resolve();return row?{etag:String(row.revision),value:structuredClone(row.value)}:null;},
  async compareAndSwap(id,expected,value){assert.equal(id,'storage-capability');await Promise.resolve();
   if((row?String(row.revision):null)!==expected){conflicts++;return null;}
   row={revision:(row?.revision??0)+1,value:structuredClone(value)};successful++;return String(row.revision);}
 };
}
test('first create, persistent read, stale writer, repeat',async()=>{
 const store=fakeCasStore(),probe=createClinicalStoreProbe({store,kind:'postgres-atomic-cas'});
 assert.deepEqual(await probe(),{durable:true,kind:'postgres-atomic-cas',schemaVersion:1});
 assert.equal(store.successful,2);assert.equal(store.row.value.counter,1);
 assert.equal((await probe()).durable,true);assert.equal(store.row.value.counter,2);
});
test('eight simultaneous capabilities converge without false 503',async()=>{
 const store=fakeCasStore(),probe=createClinicalStoreProbe({store,kind:'postgres-atomic-cas'});
 const results=await Promise.all(Array.from({length:8},()=>probe()));
 assert(results.every(r=>r.durable&&r.kind==='postgres-atomic-cas'));
 assert.equal(store.row.value.counter,8);assert.equal(store.successful,9);assert(store.conflicts>0);
});
test('unavailable or corrupt stores fail closed',async()=>{
 await assert.rejects(createClinicalStoreProbe({store:{read:async()=>({etag:'1',value:{kind:'bad',counter:1}}),compareAndSwap:async()=>null},kind:'postgres-atomic-cas'})(),/invalid clinical/);
 await assert.rejects(createClinicalStoreProbe({store:{read:async()=>{throw Error('offline')},compareAndSwap:async()=>null},kind:'postgres-atomic-cas'})(),/offline/);
 await assert.rejects(createClinicalStoreProbe({store:{read:async()=>null,compareAndSwap:async()=>null},kind:'postgres-atomic-cas',maxAttempts:2})(),/capability busy/);
});
