import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createQaSocialServer} from '../../social/qa-social-server.js';
function fixture(){
 const values=new Map();
 const store={get:async key=>structuredClone(values.get(key)??null),
  set:async(key,v)=>{await Promise.resolve();values.set(key,structuredClone(v));},
  delete:async key=>{values.delete(key);}};
 return createQaSocialServer(store);
}
async function register(server,name){
 const response=await server.route({method:'POST',path:'register',
  body:{clientKey:crypto.randomUUID(),name}});
 assert.equal(response.status,200);
 return {user:response.body.user,headers:{authorization:'Bearer '+response.body.token}};
}
test('two or three joins happening simultaneously cannot overwrite independent room memberships',async()=>{
 const api=fixture(),users=await Promise.all(['Ana','Beto','Cami','Dani'].map(name=>register(api,name)));
 const [host,...guests]=users;
 const created=await api.route({method:'POST',path:'rooms',headers:host.headers,
  body:{mode:'coop',peerId:'host-peer-123',invitees:guests.map(u=>u.user.id)}});
 assert.equal(created.status,201);
 const id=created.body.room.id;
 const joined=await Promise.all(guests.map((u,i)=>api.route({method:'POST',path:'rooms/join',
  headers:u.headers,body:{roomId:id,peerId:'guest-peer-'+i}})));
 assert(joined.every(x=>x.status===200),'all concurrent accepts must succeed');
 const room=await api.route({path:'rooms/'+id+'/messages',headers:host.headers});
 assert.equal(room.status,200);
 assert.equal(room.body.room.members.length,4);
 assert.deepEqual(new Set(room.body.room.members.map(m=>m.userId)),
  new Set(users.map(u=>u.user.id)));
 assert.equal(room.body.room.allAccepted,true);
 const rejoined=await api.route({method:'POST',path:'rooms/join',headers:guests[0].headers,
  body:{roomId:id,peerId:'guest-new-device'}});
 assert.equal(rejoined.body.room.members.length,4,'rejoining must be idempotent');
});
test('one guest leaving cannot remove another guest from the roster',async()=>{
 const api=fixture(),[host,a,b]=await Promise.all(['Host','Ana','Beto'].map(name=>register(api,name)));
 const room=(await api.route({method:'POST',path:'rooms',headers:host.headers,
  body:{mode:'coop',peerId:'host-peer-123',invitees:[a.user.id,b.user.id]}})).body.room;
 await Promise.all([a,b].map((u,i)=>api.route({method:'POST',path:'rooms/join',
  headers:u.headers,body:{roomId:room.id,peerId:'guest-'+i}})));
 const left=await api.route({method:'POST',path:'rooms/'+room.id+'/leave',headers:a.headers});
 assert.equal(left.status,200);
 const result=await api.route({path:'rooms/'+room.id+'/messages',headers:host.headers});
 assert.equal(result.body.room.members.length,2);
 assert(result.body.room.members.some(m=>m.userId===b.user.id));
 assert(!result.body.room.members.some(m=>m.userId===a.user.id));
});
