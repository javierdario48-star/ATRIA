import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const base=String(process.env.QA_BASE||'').replace(/\/$/,'');
if(!base.startsWith('https://'))throw Error('HTTPS QA_BASE is required');
const request=async(path,{method='GET',token,body}={})=>{
 const started=performance.now();
 const r=await fetch(base+path,{method,headers:{Accept:'application/json',...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(9000),redirect:'error'});
 const raw=await r.text();let json;try{json=JSON.parse(raw)}catch{throw Error(path+' response is not JSON, HTTP '+r.status)}
 return {status:r.status,json,latencyMs:Math.round(performance.now()-started)};
};
const sleeps=n=>new Promise(r=>setTimeout(r,n));
let ready=false;
for(let n=0;n<5;n++){
 try{
  const h=await request('/api/health');
  if(h.status===200&&h.json.service==='ATRIA Social QA'&&h.json.storage==='qa-regional-cache'){ready=true;break}
  console.log('QA backend not deployed yet',h.status,h.json?.service);
 }catch(e){console.log('Waiting for QA backend availability',e.message)}
 await sleeps(3500);
}
if(!ready)throw Error('Refusing to write test profiles: QA-exclusive social backend marker not verified');
const seed=randomUUID().replace(/-/g,'').slice(0,16),names=['qaA_'+seed.slice(0,6),'qaB_'+seed.slice(6,12)];
let a,b,roomId;
const call=(path,opt)=>request('/api/'+path,opt);
const eventually=async(fn,description)=>{
 for(let i=0;i<4;i++){const v=await fn();if(v)return v;await sleeps(350)}
 throw Error(description);
};
try{
 const register=async(i)=>{const x=await call('register',{method:'POST',body:{name:names[i],handle:names[i].toLowerCase(),clientKey:'qa-ci-'+seed+'-device-'+(i+1)+'-secret-01'}});assert.equal(x.status,200,'register');assert.ok(x.json.token);return x.json};
 [a,b]=await Promise.all([register(0),register(1)]);
 assert.notEqual(a.user.id,b.user.id);
 const fake=await call('me',{token:'invalid'});assert.equal(fake.status,401,'reject forged session');
 const heart=(u,peer,x)=>call('lobby/state',{method:'POST',token:u.token,body:{peerId:peer,x,y:150,dir:'S',seq:1,moving:false,level:1}});
 const heartA=await heart(a,'qa-peer-'+seed+'-a',100);assert.equal(heartA.status,200,'lobby state: '+JSON.stringify(heartA.json));
 const heartB=await heart(b,'qa-peer-'+seed+'-b',180);assert.equal(heartB.status,200,'second lobby state: '+JSON.stringify(heartB.json));
 const start=performance.now();
 let lobby=null;
 for(let attempt=0;attempt<12;attempt++){
  const r=await call('lobby?after=0',{token:a.token});
  const players=Array.isArray(r.json.players)?r.json.players:[];
  console.log('QA roster check',JSON.stringify({attempt,status:r.status,count:players.length,self:players.some(p=>p.userId===a.user.id),remote:players.some(p=>p.userId===b.user.id),error:r.json.error||null}));
  if(r.status===200&&players.some(p=>p.userId===a.user.id)&&players.some(p=>p.userId===b.user.id)){lobby=r;break}
  await sleeps(600);
 }
 if(!lobby)throw Error('two profiles never appeared together in live QA lobby');
 const presenceLatencyMs=Math.round(performance.now()-start);
 const s=await call('search?q='+names[1].toLowerCase(),{token:a.token});
 assert.equal(s.status,200);assert(s.json.users.some(p=>p.id===b.user.id));
 assert.equal((await call('friends',{method:'POST',token:a.token,body:{userId:b.user.id}})).status,200);
 await eventually(async()=>{const v=await call('me',{token:b.token});return v.json.requests?.incoming?.some(p=>p.id===a.user.id)?v:null},'request missing on invited device');
 assert.equal((await call('friends/accept',{method:'POST',token:b.token,body:{userId:a.user.id}})).status,200);
 await eventually(async()=>{const v=await call('me',{token:a.token});return v.json.friends?.some(p=>p.id===b.user.id)?v:null},'friendship did not synchronize');
 const created=await call('rooms',{method:'POST',token:a.token,body:{mode:'coop',invitees:[b.user.id],peerId:'qa-peer-'+seed+'-a'}});
 assert.equal(created.status,201,'create group');roomId=created.json.room.id;
 const invite=await eventually(async()=>{const v=await call('me',{token:b.token});return v.json.invites?.some(p=>p.roomId===roomId)?v:null},'room invitation missing');
 assert(invite.json.invites[0].host.id===a.user.id);
 const join=await call('rooms/join',{method:'POST',token:b.token,body:{roomId,peerId:'qa-peer-'+seed+'-b'}});
 assert.equal(join.status,200,'invited device joins group');assert.equal(join.json.room.members.length,2);assert.equal(join.json.room.allAccepted,true);
 const msg=await call('rooms/'+roomId+'/messages',{method:'POST',token:a.token,body:{message:{type:'chat',text:'qa-hello'}}});assert.equal(msg.status,200);
 const incoming=await call('rooms/'+roomId+'/messages?after=0',{token:b.token});
 assert.equal(incoming.status,200);assert.equal(incoming.json.messages.at(-1).data.text,'qa-hello');
 const chat=await call('lobby/chat',{method:'POST',token:b.token,body:{text:'lobby-'+seed}});assert.equal(chat.status,200);
 const feed=await call('lobby?after=0',{token:a.token});assert(feed.json.messages.some(m=>m.text==='lobby-'+seed));
 const p=await call('lobby-sync',{method:'POST',token:a.token,body:{signal:{type:'offer',fromUserId:a.user.id,fromPeerId:'qa-peer-'+seed+'-a',toPeerId:'qa-peer-'+seed+'-b',description:{type:'offer',sdp:'qa-test-no-sensitive-sdp'}}}});
 assert.equal(p.status,200,'authorized RTC offer');
 const answer=await call('lobby-sync?signal=offer&toPeer=qa-peer-'+seed+'-b&fromPeer=qa-peer-'+seed+'-a',{token:b.token});
 assert.equal(answer.status,200);assert.equal(answer.json.signal.description.sdp,'qa-test-no-sensitive-sdp');
 const bad=await call('rooms/'+roomId+'/messages?after=0',{token:'bogus'});assert.equal(bad.status,401);
 console.log(JSON.stringify({result:'PASS',scenario:'Two distinct QA users + live presence + chat + friendship + co-op + WebRTC signaling',rosterSize:lobby.json.players.length,firstPresenceMs:presenceLatencyMs,lobbyRequestMs:lobby.latencyMs,roomPollMs:incoming.latencyMs,qaOnly:true}));
}finally{
 for(const x of [a,b])if(x?.token){try{await call('lobby/leave',{method:'POST',token:x.token})}catch{}}
 if(a?.token&&roomId){try{await call('rooms/'+roomId+'/cancel',{method:'POST',token:a.token})}catch{}}
}
