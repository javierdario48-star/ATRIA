import test from 'node:test';
import assert from 'node:assert/strict';
import {createPersistentSocialStorage} from './supabase-account-store.js';
import {createConflictFreeRoomStorage} from '../social/room-membership-store.js';

const roomId='01234567-89ab-4cde-8012-123456789abc';
const host='qa_'+'a'.repeat(30),guest='qa_'+'b'.repeat(30),outsider='qa_'+'c'.repeat(30);
const roomKey='qa-v1:room:'+roomId,memberKey='atria-v5:room-member:'+roomId+':'+guest;

function fixture({beforeWrite=async()=>{},now=Date.now}={}){
 const rows=new Map(),caches=[new Map(),new Map()],requests=[];
 const backend={async request(path,{method='GET',body,prefer}={}){
  requests.push({path,method});
  const url=new URL(path,'https://testproject.supabase.co');
  assert.equal(url.pathname,'/rest/v1/atria_v5_social');
  const key=url.searchParams.get('key')?.slice(3);
  if(method==='POST'){
   await beforeWrite(body);
   const insertOnly=prefer?.includes('resolution=ignore-duplicates');
   const returning=prefer?.includes('return=representation');
   if(insertOnly&&rows.has(body.key))return returning?[]:null;
   rows.set(body.key,structuredClone(body.value));
   return returning?[{value:structuredClone(body.value)}]:null;
  }
  if(method==='DELETE'){rows.delete(key);return null;}
  return rows.has(key)?[{value:structuredClone(rows.get(key))}]:[];
 }};
 const slots=caches.map(cache=>createConflictFreeRoomStorage(createPersistentSocialStorage({
  backend,cache:{
   get:async key=>cache.get(key),
   set:async(key,value)=>{cache.set(key,structuredClone(value));},
   delete:async key=>cache.delete(key)
  }
 }),{now}));
 return {slots,rows,requests,caches};
}
test('accepted guest remains a member when the next request reaches another server instance',async()=>{
 const {slots,rows,caches}=fixture();
 const initial={id:roomId,hostUserId:host,mode:'coop',closed:false,
  members:[{userId:host,peerId:'host-peer'}],pending:[guest]};
 await slots[0].set(roomKey,initial,{ttl:21600});
 const accepted={...initial,members:[...initial.members,{userId:guest,peerId:'guest-peer'}],pending:[]};
 await slots[0].set(roomKey,accepted,{ttl:21600});
 assert.equal(rows.get(memberKey).state,'accepted');
 assert.equal(caches[1].size,0,'other instance must have no room cache');
 const recovered=await slots[1].get(roomKey);
 assert.deepEqual(recovered.members,accepted.members);
 assert.deepEqual(recovered.pending,[]);
 assert.equal(recovered.members.some(m=>m.userId===outsider),false);
});
test('guest membership survives a fresh instance and stays scoped to its own room',async()=>{
 const {slots}=fixture();
 const otherRoom='fedcba98-7654-4321-8012-abcdefabcdef';
 await slots[0].set(roomKey,{hostUserId:host,closed:false,
  members:[{userId:host}],pending:[guest]});
 await slots[0].set(roomKey,{hostUserId:host,closed:false,
  members:[{userId:host},{userId:guest}],pending:[]});
 await slots[1].set('qa-v1:room:'+otherRoom,{hostUserId:outsider,closed:false,
  members:[{userId:outsider}],pending:[guest]});
 const first=await slots[1].get(roomKey),second=await slots[1].get('qa-v1:room:'+otherRoom);
 assert(first.members.some(x=>x.userId===guest));
 assert(!second.members.some(x=>x.userId===guest));
 assert(second.pending.includes(guest));
});
test('declined or departed guest cannot be resurrected by a stale room snapshot',async()=>{
 const {slots}=fixture();
 await slots[0].set(roomKey,{hostUserId:host,closed:false,members:[{userId:host}],pending:[guest]});
 await slots[0].set(roomKey,{hostUserId:host,closed:false,members:[{userId:host},{userId:guest}],pending:[]});
 await slots[0].mark(roomId,guest,'left');
 await slots[1].set(roomKey,{hostUserId:host,closed:false,members:[{userId:host},{userId:guest}],pending:[]});
 const recovered=await slots[1].get(roomKey);
 assert(!recovered.members.some(x=>x.userId===guest));
});
test('an acceptance already in flight cannot overwrite a concurrent revocation',async()=>{
 const entered=Promise.withResolvers(),release=Promise.withResolvers();
 const {slots,rows}=fixture({beforeWrite:async({key,value})=>{
  if(key===memberKey&&value.state==='accepted'){entered.resolve();await release.promise;}
 }});
 const initial={id:roomId,hostUserId:host,closed:false,members:[{userId:host}],pending:[guest]};
 await slots[0].set(roomKey,initial);
 const accepting=slots[1].set(roomKey,{...initial,members:[...initial.members,{userId:guest}],pending:[]});
 await entered.promise;
 try{await slots[0].mark(roomId,guest,'removed');}
 finally{release.resolve();await accepting;}
 assert.equal(rows.get(memberKey).state,'removed');
 assert.deepEqual((await slots[1].get(roomKey)).members,initial.members);
});
test('a stale social room expires with its member slots and cannot be reimported from cache',async()=>{
 let time=Date.UTC(2026,10,11);
 const {slots,rows,caches}=fixture({now:()=>time});
 const room={id:roomId,hostUserId:host,closed:false,members:[{userId:host}],pending:[guest],createdAt:time};
 await slots[0].set(roomKey,room);
 await slots[0].set(roomKey,{...room,members:[...room.members,{userId:guest}],pending:[]});
 caches[1].set(roomKey,structuredClone(rows.get(roomKey)));
 time+=21600*1000-1;
 assert.equal((await slots[1].get(roomKey)).members.length,2);
 time++;
 assert.equal(await slots[1].get(roomKey),null);
 assert.equal(rows.has(roomKey),false);
 assert.equal(rows.has(memberKey),false);
 assert.equal(await slots[1].get(roomKey)??null,null);
 assert.equal(rows.has(roomKey),false);
});
test('a delayed acceptance cannot reopen a cancelled room',async()=>{
 const {slots}=fixture();
 const room={id:roomId,hostUserId:host,closed:false,members:[{userId:host}],pending:[guest]};
 await slots[0].set(roomKey,room);
 const stale=await slots[1].get(roomKey);
 await slots[0].set(roomKey,{...room,closed:true});
 await slots[1].set(roomKey,{...stale,members:[...stale.members,{userId:guest}],pending:[]});
 assert.equal((await slots[1].get(roomKey)).closed,true);
});
