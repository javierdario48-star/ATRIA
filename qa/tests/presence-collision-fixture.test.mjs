import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createV5QaSocialServer} from '../../src/v5/social/room-membership-store.js';
import {COLLIDING_BROWSER_CLIENTS} from '../v5/presence-collision-fixture.mjs';
test('browser collision scenario shares a legacy presence bucket while keeping both RTC peer addresses distinct',async()=>{
 const rows=new Map(),server=createV5QaSocialServer({get:async k=>rows.get(k),
  set:async(k,v)=>rows.set(k,structuredClone(v)),delete:async k=>rows.delete(k)});
 const users=await Promise.all(COLLIDING_BROWSER_CLIENTS.map((clientKey,i)=>server.route({
  method:'POST',path:'register',body:{clientKey,name:'Doctor '+i}}).then(result=>result.body.user)));
 const slot=id=>parseInt(createHash('sha256').update(id).digest('hex').slice(0,8),16)%48;
 assert.notEqual(users[0].id,users[1].id);assert.equal(slot(users[0].id),slot(users[1].id));
 const peers=COLLIDING_BROWSER_CLIENTS.map(key=>'v5-'+key.slice(0,32));
 assert.equal(new Set(peers).size,2,'forcing a bucket collision must not alias the two SDP/ICE mailboxes');
});
