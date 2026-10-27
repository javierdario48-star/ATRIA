import test from 'node:test';
import assert from 'node:assert/strict';
import {createV5QaSocialServer} from './room-membership-store.js';
test('device identities retain real avatar cards, friendship and invitations before claiming an account',async()=>{
 const values=new Map(),server=createV5QaSocialServer({get:async k=>values.get(k),set:async(k,v)=>values.set(k,structuredClone(v)),delete:async k=>values.delete(k)});
 const register=async key=>server.route({method:'POST',path:'resume',body:{clientKey:key.repeat(64),name:'Doctor '+key}});
 const a=await register('a'),b=await register('b'),headers={authorization:'Bearer '+a.body.token};
 const otherHeaders={authorization:'Bearer '+b.body.token};
 await server.signalRoute({method:'POST',headers:otherHeaders,body:{presence:{peerId:'peer-b-123',color:'female-pink',seq:1}}});
 const profile=await server.route({path:'profiles/'+b.body.user.id,headers});
 assert.equal(profile.status,200);assert.equal(profile.body.profile.name,'Doctor b');assert.equal(profile.body.profile.verified,false);
 assert.equal(profile.body.profile.sex,'female');assert.equal(profile.body.profile.scrubColor,'pink');assert.equal(profile.body.profile.status,'disponible');
 assert.equal((await server.route({method:'POST',path:'friends',headers,body:{userId:b.body.user.id}})).status,200);
 assert.equal((await server.route({method:'POST',path:'friends/accept',headers:otherHeaders,body:{userId:a.body.user.id}})).status,200);
 assert.equal((await server.route({path:'profiles/'+b.body.user.id,headers})).body.profile.friendsCount,1);
 assert.equal((await server.route({method:'POST',path:'rooms',headers,body:{mode:'coop',invitees:[b.body.user.id],peerId:'peer-a-123'}})).status,201);
 assert.equal((await server.route({path:'profiles/'+b.body.user.id})).status,401);
});
