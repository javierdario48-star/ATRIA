import test from 'node:test';
import assert from 'node:assert/strict';
import {createQaSocialServer} from '../../social/qa-social-server.js';
import {createV5QaSocialServer} from '../social/room-membership-store.js';
import {createClinicalHttp,clinicalActorId} from './clinical-http.js';

test('clinical bootstrap verifies independently accepted members using the same social storage adapter as /api',async()=>{
 const data=new Map();
 const store={
  async get(key){return structuredClone(data.get(key)??null);},
  async set(key,value){data.set(key,structuredClone(value));},
  async delete(key){data.delete(key);}
 };
 // Two HTTP serverless entrypoints share raw KV, not process memory.
 const invitations=createV5QaSocialServer(store);
 const clinicalDirectory=createV5QaSocialServer(store);
 const rawDirectory=createQaSocialServer(store);
 const user=async(clientKey,name)=>{
  const result=await invitations.route({method:'POST',path:'resume',body:{clientKey,name}});
  assert.equal(result.status,200);
  assert.equal(result.body.user.id,clinicalActorId(clientKey));
  return {id:result.body.user.id,headers:{authorization:'Bearer '+result.body.token}};
 };
 const host=await user('a'.repeat(64),'Dra. Ana');
 const guest=await user('b'.repeat(64),'Dr. Bruno');
 const created=await invitations.route({method:'POST',path:'rooms',headers:host.headers,
  body:{mode:'coop',peerId:'v5-ana',invitees:[guest.id]}});
 assert.equal(created.status,201);
 const id=created.body.room.id;
 const joined=await invitations.route({method:'POST',path:'rooms/join',headers:guest.headers,
  body:{roomId:id,peerId:'v5-bruno'}});
 assert.equal(joined.status,200);
 // Under the conflict-free V5 schema, this is the exact broken V4 read:
 // only the original host persists in the room metadata.
 const old=await rawDirectory.route({method:'GET',path:'rooms/'+id+'/messages',headers:host.headers,query:{after:0}});
 assert.equal(old.status,200);
 assert.equal(old.body.room.allAccepted,false);
 const verifiedRoom=async(headers,roomId,actorId)=>{
  const me=await clinicalDirectory.route({method:'GET',path:'me',headers});
  if(me.status!==200||me.body.user.id!==actorId)return null;
  const result=await clinicalDirectory.route({method:'GET',path:'rooms/'+roomId+'/messages',headers,query:{after:0}});
  return result.status===200?result.body.room:null;
 };
 const rooms=[];const clinical=createClinicalHttp({
  enabled:true,
  authority:{async bootstrap(input){rooms.push(input);return {epoch:1};}},
  verifiedRoom,probe:async()=>({durable:true,kind:'test-cas'})
 });
 const started=await clinical({method:'POST',headers:host.headers,
  body:{action:'start',clientKey:'a'.repeat(64),roomId:id,caseId:'PERI-PBE-001'}});
 assert.equal(started.status,200);
 assert.equal(rooms.length,1);
 assert.deepEqual(new Set(rooms[0].members.map(x=>x.id)),new Set([host.id,guest.id]));
 assert.equal(rooms[0].hostId,host.id);
});
