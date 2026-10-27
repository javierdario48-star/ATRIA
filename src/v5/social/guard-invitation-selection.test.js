import test from 'node:test';
import assert from 'node:assert/strict';
import {createV5QaSocialServer} from './room-membership-store.js';
test('invitation retains host selection across service recreation and independent guest acceptance',async()=>{
 const rows=new Map(),storage={get:async k=>structuredClone(rows.get(k)),set:async(k,v)=>rows.set(k,structuredClone(v)),delete:async k=>rows.delete(k)};
 let social=createV5QaSocialServer(storage);
 const resume=key=>social.route({method:'POST',path:'/api/resume',body:{clientKey:key.repeat(64),name:'Doctor '+key}});
 const a=(await resume('a')).body,b=(await resume('b')).body;
 const ah={authorization:'Bearer '+a.token},bh={authorization:'Bearer '+b.token};
 const created=await social.route({method:'POST',path:'/api/rooms',headers:ah,
  body:{mode:'coop',invitees:[b.user.id],guardSelection:{scope:'specific',selection:'FECAL-001',multiplier:999}}});
 assert.equal(created.status,201);assert.deepEqual(created.body.room.guardSelection,{scope:'specific',selection:'FECAL-001'});
 social=createV5QaSocialServer(storage);
 const joined=await social.route({method:'POST',path:'/api/rooms/join',headers:bh,body:{roomId:created.body.room.id}});
 assert.equal(joined.status,200);assert.deepEqual(joined.body.room.guardSelection,{scope:'specific',selection:'FECAL-001'});
 const bad=await social.route({method:'POST',path:'/api/rooms',headers:ah,body:{mode:'coop',invitees:[b.user.id],guardSelection:{scope:'specialty',selection:'Cardiología'}}});
 assert.equal(bad.status,400);
});
