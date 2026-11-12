import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createV5QaSocialServer} from './room-membership-store.js';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function collidingKeys(){
 const slots=new Map();
 for(let i=0;i<1000;i++){
  const key='atria-presence-collision-client-'+i,id='qa_'+hash('atria-preview:'+key).slice(0,30),slot=parseInt(hash(id).slice(0,8),16)%48;
  if(slots.has(slot))return [slots.get(slot),key];slots.set(slot,key);
 }
 throw Error('no deterministic collision');
}
async function fixture(independent=false){
 const data=new Map(),store=()=>({get:async k=>structuredClone(data.get(k)),set:async(k,v)=>{await Promise.resolve();data.set(k,structuredClone(v));},delete:async k=>data.delete(k)});
 const a=createV5QaSocialServer(store()),b=independent?createV5QaSocialServer(store()):a,servers=[a,b];
 const registered=await Promise.all(collidingKeys().map((clientKey,i)=>servers[i].route({method:'POST',path:'register',body:{clientKey,name:'Doctor '+i}})));
 const headers=registered.map(r=>({authorization:'Bearer '+r.body.token}));
 const presence=(i,seq=1)=>servers[i].signalRoute({method:'POST',headers:headers[i],body:{presence:{peerId:'peer-client-'+i,motionSession:'session-'+i,motionEpoch:100,seq,x:100+seq,y:100}}});
 const signal=i=>servers[i].signalRoute({method:'GET',headers:headers[i],query:{signal:'offer',toPeer:'peer-client-'+i,fromPeer:'peer-client-'+(1-i)}});
 return {servers,headers,presence,signal};
}
test('concurrent doctors in the same presence bucket retain both directory entries and authorized signaling',async()=>{
 const f=await fixture();assert((await Promise.all([f.presence(0),f.presence(1)])).every(r=>r.status===200));
 assert.equal((await f.servers[0].roster()).length,2,'neither acknowledged presence may erase the other doctor');
 for(let i=0;i<2;i++)assert.equal((await f.signal(i)).status,200,'a present doctor must be able to receive the host offer');
});
test('separate workers authenticate RTC against owned presence when a shared directory projection loses a writer',async()=>{
 const f=await fixture(true);await Promise.all([f.presence(0),f.presence(1)]);
 for(let i=0;i<2;i++)assert.equal((await f.signal(i)).status,200,'another worker cannot retire this doctor presence');
 const stale=await f.presence(0,1);assert.equal(stale.body.stale,true,'the independent owned row retains monotonic motion');
 const spoof=await f.servers[0].signalRoute({method:'GET',headers:f.headers[0],query:{signal:'offer',toPeer:'peer-client-1',fromPeer:'peer-client-0'}});
 assert.equal(spoof.status,403,'owned presence cannot authorize a different peer');
});

test('an expired heartbeat cannot keep a doctor online in the lobby or profile',async()=>{
 let time=100000;
 const data=new Map(),api=createV5QaSocialServer({get:async k=>data.get(k),set:async(k,v)=>data.set(k,structuredClone(v)),
  delete:async k=>data.delete(k)},{now:()=>time});
 const registered=await api.route({method:'POST',path:'register',body:{clientKey:collidingKeys()[0],name:'Doctor Uno'}});
 const headers={authorization:'Bearer '+registered.body.token},id=registered.body.user.id;
 const pulse=await api.route({method:'POST',path:'lobby/state',headers,body:{phase:'guard',peerId:'peer-expiring',x:80,y:90,seq:1}});
 assert.equal(pulse.status,200);
 assert.equal((await api.route({path:'lobby?after=0',headers})).body.players[0].status,'en guardia');
 time+=35001;
 assert.deepEqual((await api.route({path:'lobby',headers})).body.players,[]);
 assert.equal((await api.route({path:'profiles/'+id,headers})).body.profile.status,'desconectado');
});
