import test from 'node:test';
import assert from 'node:assert/strict';
import {createPrivateBlobGuardStore} from './private-blob-guard-store.js';
class Conflict extends Error{}
function fixture(){let entry=null,revision=0;const calls=[];
 return {calls,get entry(){return entry;},store:createPrivateBlobGuardStore({BlobPreconditionFailedError:Conflict,
  async get(path,options){calls.push({operation:'get',path,...options});if(!entry)return null;return {statusCode:200,stream:new Response(JSON.stringify(entry.value)).body,blob:{etag:entry.etag,url:'https://qa.private.blob.vercel-storage.com/'+path}};},
  async put(path,raw,options){calls.push({operation:'put',path,...options});
   if(entry&&(!options.allowOverwrite||options.ifMatch!==entry.etag))throw new Conflict();
   entry={etag:String(++revision),value:JSON.parse(raw)};return {etag:entry.etag,url:'https://qa.private.blob.vercel-storage.com/'+path};}})};
}
test('private Blob CAS rejects stale writers and never uses CDN caching, public access or random paths',async()=>{
 const f=fixture();assert.equal(await f.store.read('room'),null);
 assert.equal(await f.store.compareAndSwap('room',null,{dose:0}),'1');
 assert.equal(await f.store.compareAndSwap('room',null,{dose:999}),null);
 const prior=await f.store.read('room');assert.equal(await f.store.compareAndSwap('room',prior.etag,{dose:1}),'2');
 assert.equal(await f.store.compareAndSwap('room',prior.etag,{dose:2}),null);assert.equal(f.entry.value.dose,1);
 assert(f.calls.every(x=>x.access==='private'));assert(f.calls.filter(x=>x.operation==='get').every(x=>x.useCache===false));
 assert(f.calls.filter(x=>x.operation==='put').every(x=>x.addRandomSuffix===false));
 await assert.rejects(f.store.read('../escape'),/invalid/);
});
test('access/storage failure never silently falls back to public or memory',async()=>{
 const f=createPrivateBlobGuardStore({BlobPreconditionFailedError:Conflict,get:async()=>{throw Error('private access unavailable');},put:async()=>{throw Error('public-only store');}});
 await assert.rejects(f.read('room'),/private access/);await assert.rejects(f.compareAndSwap('room',null,{patient:'never public'}),/private access/);
});
