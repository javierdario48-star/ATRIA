// Full generated ATRIA, isolated browser processes, real HTTP and RTC channels.
// The production route handlers run on localhost with a filesystem KV adapter.
// No client coordinates, received states, or clinical state are injected.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {pathToFileURL} from 'node:url';
import {apply487} from '../src/integration/apply-487.js';
const {createQaSocialServer}=await import(process.env.MOTION_SOURCE_SERVER?pathToFileURL(process.env.MOTION_SOURCE_SERVER).href:'../src/social/qa-social-server.js');
import {metrics} from './remote-motion-metrics-487.mjs';
import {assertMotionPair} from './remote-motion-acceptance-487.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const label=process.env.MOTION_LABEL||'baseline';
const count=Number(process.env.MOTION_PLAYERS)||2;
assert([2,3,4].includes(count));
const extended=process.env.MOTION_EXTENDED==='1'&&!process.env.MOTION_SOURCE_HTML;
const output=process.env.MOTION_OUTPUT||'qa/remote-motion-results/'+label;
await fs.mkdir(output,{recursive:true});
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'atria-motion-http-'));
const file=k=>path.join(dir,createHash('sha256').update(k).digest('hex')+'.json');
const storage={async get(k){try{const d=JSON.parse(await fs.readFile(file(k),'utf8'));return d.until>Date.now()?d.value:null}catch{return null}},
 async set(k,value,{ttl=600}={}){const tmp=file(k)+'.'+Math.random().toString(36).slice(2);await fs.writeFile(tmp,JSON.stringify({until:Date.now()+ttl*1000,value}));await fs.rename(tmp,file(k))},
 async delete(k){await fs.rm(file(k),{force:true})}};
const core=createQaSocialServer(storage);
const base=await fs.readFile('vendor/atria-4.8.6/index.html','utf8');
const html=process.env.MOTION_SOURCE_HTML?await fs.readFile(process.env.MOTION_SOURCE_HTML,'utf8'):apply487(base);
const requests=[];
let transaction=Promise.resolve();
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(u.pathname.startsWith('/api/')){
   let raw='';for await(const chunk of req)raw+=chunk;
   const args={method:req.method,path:u.pathname,query:Object.fromEntries(u.searchParams),headers:req.headers,body:raw?JSON.parse(raw):{}};
   // The filesystem test KV has no transactions. Serialize complete handler
   // transactions so concurrent read/modify/write message lists cannot lose ACKs.
   const t=Date.now(),operation=transaction.then(()=>u.pathname==='/api/lobby-sync'?core.signalRoute(args):core.route(args));transaction=operation.catch(()=>{});const r=await operation;
   requests.push({t,path:u.pathname,method:req.method,status:r.status,seq:args.body.seq||args.body.presence?.seq,stale:r.body?.stale||false});
   res.writeHead(r.status,{'Content-Type':'application/json'});res.end(JSON.stringify(r.body));return;
  }
  if(u.pathname==='/'||u.pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return}
  if(/^\/task\d+\.js$/.test(u.pathname)){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await fs.readFile('vendor/atria-4.8.6'+u.pathname));return}
  res.writeHead(404);res.end('not found');
 }catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}))}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const url='http://127.0.0.1:'+server.address().port;
const browsers=[],clients=[],browserErrors=[];
const launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding'],
 ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})};
// Observe packets at their real boundaries. This probe is test-only and opt-in.
function initProbe({name,fps}){
 if(!localStorage.getItem('clinicalShift.profile.v1'))localStorage.setItem('clinicalShift.profile.v1',JSON.stringify({name,deviceId:'motion-device-'+name,scrubColor:'navy',soundEnabled:false}));
 localStorage.setItem('nightShift.social.client.v2@'+name.toLowerCase(),'atria_motion_isolated_client_'+name);
 localStorage.setItem('nightShift.social.client.v2@medico','atria_motion_isolated_client_'+name);
 window.motionTrace={frames:[],packets:[],errors:[],record:false,impair:{enabled:false,count:0,dropped:0,delayed:0}};
 const raf=requestAnimationFrame.bind(window);
 window.requestAnimationFrame=cb=>{const run=()=>raf(t=>{motionTrace.raf=t;cb(t)});return fps?setTimeout(run,Math.max(0,1000/fps-1000/60)):run()};
 const log=(kind,transport,data)=>{if(!motionTrace.record)return;motionTrace.packets.push({t:Date.now(),now:performance.now(),kind,transport,data})};
 const impairment=()=>{const p=motionTrace.impair;if(!p.enabled)return null;const n=++p.count;if(n%7===0){p.dropped++;return -1}p.delayed++;return 40+[0,180,20,90,10,230][n%6]};
 const wire=dc=>{
  if(dc.__motionProbe)return;dc.__motionProbe=true;
  const send=dc.send.bind(dc);dc.send=v=>{let m;try{m=JSON.parse(v)}catch{}const delay=m?.t==='p'?impairment():null;
   if(delay===-1){log('drop','rtc',m);return}if(delay!==null){log('queued','rtc',m);setTimeout(()=>{if(dc.readyState==='open'){log('send','rtc',m);send(v)}},delay);return}log('send','rtc',m);return send(v)};
  dc.addEventListener('message',e=>{try{log('receive','rtc',JSON.parse(e.data))}catch{}});
 };
 const RTC=window.RTCPeerConnection;
 window.RTCPeerConnection=class extends RTC{constructor(...args){super(...args);this.addEventListener('datachannel',e=>wire(e.channel))}createDataChannel(...args){const c=super.createDataChannel(...args);wire(c);return c}};
 const fetch=window.fetch.bind(window);
 window.fetch=async(...args)=>{const [input,options]=args,u=String(input);
  if(options?.body){let data;try{data=JSON.parse(options.body)}catch{}const pose=/lobby\/state/.test(u)||data?.presence||data?.message?.type==='state',delay=pose?impairment():null;
   if(delay===-1){log('drop','http',data);throw Error('motion test outgoing packet loss')}if(delay!==null){log('queued','http',data);await new Promise(r=>setTimeout(r,delay))}
   if(/lobby\/state|rooms\/.*\/messages|lobby-sync/.test(u))log('send','http',data)}
  const r=await fetch(...args);
  if(/api\/lobby(?:\?|$)|rooms\/.*\/messages|lobby-sync/.test(u)){try{const d=await r.clone().json();
   for(const p of d.players||[])log('receive','http',{t:'p',p});
   for(const m of d.messages||[])if(m.data?.type==='state'||/^atria_party_/.test(m.data?.type||''))log('receive','http',m.data);
  }catch{}}
  return r;
 };
}
async function installRenderProbe(page){
 await page.evaluate(()=>{
  const sprite=drawSprite,nameplate=csDrawNameplate,render=draw;let current=[];
  drawSprite=function(im,a,h){if(motionTrace.record&&(a===player||h===60||h===62))current.push({x:a.x,y:a.y,dir:a.dir,moving:!!a.moving,phase:a.walkPhase||0,local:a===player,h,resetReason:a.resetReason||null,transport:a.transport||null,cadence:a.cadence||null});return sprite.apply(this,arguments)};
  csDrawNameplate=function(a,name,level,remote){if(motionTrace.record){const p=current.findLast(p=>p.x===a.x&&p.y===a.y);if(p){p.name=name;p.remote=remote;if(remote&&nsLobby.active){const q=[...nsLobby.players.values()].find(v=>v.name===name);p.resetReason=q?._motion?.resetReason||null;p.transport=q?._motion?.transport||null;p.cadence=q?._motion?.cadence||null}}}return nameplate.apply(this,arguments)};
  draw=function(){current=[];const r=render.apply(this,arguments);if(motionTrace.record){const now=motionTrace.raf??performance.now();motionTrace.frames.push({t:performance.timeOrigin+now,now,drawTime:performance.now(),scene:nsLobby.active?'lobby':'guard',player:{x:player.x,y:player.y,dir:player.dir,moving:!!player.moving,phase:player.walkPhase||0},actors:current})}return r};
 });
}
async function makeClient(i){
 const browser=await chromium.launch(launch);browsers.push(browser);
 const context=await browser.newContext({viewport:{width:1024,height:768},...(process.env.MOTION_VIDEO==='1'?{recordVideo:{dir:output+'/video',size:{width:1024,height:768}}}:{})});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>{browserErrors.push({client:i,error:e.message});console.log('BROWSER_ERROR',i,e.message)});
 await context.addInitScript(initProbe,{name:'MotionClient_'+i,fps:extended&&count>2&&i===count-1?20:extended&&count>2&&i===count-2?30:null});
 await page.goto(url);await page.locator('#nsEnter').click();
 await page.waitForFunction(()=>window.nsLobby?.active&&window.nsSocial?.state?.().user);
 await installRenderProbe(page);
 await page.evaluate(()=>{if(window.csRemoteMotionDiagnostics487)csRemoteMotionDiagnostics487.enabled=true});
 if(!process.env.MOTION_SOURCE_HTML)assert(await page.evaluate(()=>csDrawRemote.toString().includes('csMotionReceive487')),'final active renderer owns the shared timeline');
 const user=await page.evaluate(()=>nsSocial.state().user);
 const c={browser,context,page,user,name:user.name};clients.push(c);return c;
}
async function move(page,dx,dy){
 // Feed the original destination controller and pathfinder; never assign player.x/y.
 const pt=await page.evaluate(({dx,dy})=>{
  const tx=Math.floor(player.x/TW)+dx,ty=Math.floor(player.y/TH)+dy;
  const p=nearestPassable(tx,ty,8);if(!p)throw Error('No passable movement target');
  return worldToScreen((p[0]+.5)*TW,(p[1]+.5)*TH);
 },{dx,dy});
 await page.evaluate(([x,y])=>setPlayerTarget(x,y),pt);
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function route(page,shot=async()=>{}){
 await move(page,0,-10);await pause(1800);await shot('straight');
 await move(page,7,0);await pause(1300);await shot('turn90');
 await page.evaluate(()=>{const [x,y]=worldToScreen(player.x,player.y);setPlayerTarget(x,y)});await pause(700);
 await shot('stop');await move(page,-7,0);await pause(1100);await shot('reverse');
 for(const [x,y]of [[0,-3],[4,0],[-3,0],[0,4]]){await move(page,x,y);await pause(330)}
 await pause(350);await page.evaluate(()=>{const [x,y]=worldToScreen(player.x,player.y);setPlayerTarget(x,y)});await pause(1500);await shot('rapid-turns');
}
async function capture(scene,{simultaneous=false,short=false,impaired=false,httpFallback=false,action=null,qualitySince=null}={}){
 for(const c of clients)await c.page.evaluate(()=>{motionTrace.frames=[];motionTrace.packets=[];motionTrace.record=true;window.csRemoteMotionDiagnostics487?.clear()});
 const shot=async(tag,i)=>{for(let j=0;j<clients.length;j++)await clients[j].page.screenshot({path:output+'/'+scene+'-source'+i+'-'+tag+'-observer'+j+'.png'})};
 if(action)await action();
 else if(short){await Promise.all(clients.map(c=>move(c.page,0,-5)));await pause(1600);await Promise.all(clients.map(c=>move(c.page,5,0)));await pause(1200);await Promise.all(clients.map(c=>c.page.evaluate(()=>{const [x,y]=worldToScreen(player.x,player.y);setPlayerTarget(x,y)})));await pause(1200)}
 else if(simultaneous)await Promise.all(clients.map(c=>route(c.page)));
 else for(let i=0;i<clients.length;i++)await route(clients[i].page,tag=>shot(tag,i));
 // Observe one unchanged lobby idle heartbeat after impaired terminal packets.
 // This extends test recording, not the renderer's following delay.
 if(impaired&&scene.startsWith('lobby'))await pause(1800);
 const traces=await Promise.all(clients.map(c=>c.page.evaluate(()=>{motionTrace.record=false;return {...motionTrace,motionDebug:window.csRemoteMotionDiagnostics487?.events||[],renderer:csDrawRemote.toString(),wire:csWireDataChannel.toString()}})));
 const pairs={};for(let i=0;i<clients.length;i++)for(let j=0;j<clients.length;j++)if(i!==j)pairs[i+'->'+j]=metrics(traces[i],traces[j],clients[i].name);
 const m={scene,label,clients:clients.length,simultaneous,impaired,pairs,AB:pairs['0->1'],BA:pairs['1->0']};
 const since=qualitySince?.();if(since){const resumed=traces.map(t=>({...t,frames:t.frames.filter(f=>f.t>=since),packets:t.packets.filter(p=>p.t>=since)}));m.postRecoveryPairs={};for(let i=0;i<clients.length;i++)for(let j=0;j<clients.length;j++)if(i!==j)m.postRecoveryPairs[i+'->'+j]=metrics(resumed[i],resumed[j],clients[i].name)}
 for(let i=0;i<clients.length;i++)await clients[i].page.screenshot({path:output+'/'+scene+'-'+i+'.png'});
 await fs.writeFile(output+'/'+scene+'-trace.json',JSON.stringify(traces));await fs.writeFile(output+'/'+scene+'-metrics.json',JSON.stringify(m,null,2));
 console.log('CROSSED_MOTION',JSON.stringify(m));
 for(const p of Object.values(m.postRecoveryPairs||pairs)){
  assert(p.frames>60&&p.localFrames>60,'every independent client renders every real companion');
  if(!process.env.MOTION_SOURCE_HTML){const http=httpFallback||p.transports.includes('http'),cadence=p.cadence.max|| (scene.startsWith('lobby')?(http?260:100):220),poll=scene.startsWith('lobby')?(http?260:0):150;p.acceptance=assertMotionPair(p,{cadence,poll,impaired})}
 }
 return m;
}
async function waitRTC(){
 try{await Promise.all(clients.map(c=>c.page.waitForFunction(()=>[...window.__atriaLobbyNet461.peers.values()].some(p=>p.open&&p.dc?.readyState==='open'),{},{timeout:30000})))}catch(e){
  console.log('RTC_FAILURE_DIAGNOSTICS',JSON.stringify(await Promise.all(clients.map(c=>c.page.evaluate(()=>{const n=__atriaLobbyNet461;return {version:n.version,syncFailures:n.syncFailures,error:n.lastSyncError,postError:n.lastPostError,peers:[...n.peers.values()].map(p=>({open:p.open,connecting:p.connecting,connection:p.pc?.connectionState,ice:p.pc?.iceConnectionState,sdp:!!p.pc?.localDescription,remoteSdp:!!p.pc?.remoteDescription,channel:p.dc?.readyState})),roster:n.roster.size}})))));
  if(process.env.MOTION_REQUIRE_RTC!=='0')throw e;
 }
}
async function startGuard(mode){
 for(const c of clients)await c.page.evaluate(()=>{nsPractice.configure({area:'gastro',organ:'peritoneo',pathology:'APP-001'});motionTrace.record=true});
 await clients[0].page.evaluate(({mode,ids})=>nsLobby.openGuardia(mode,ids),{mode,ids:clients.slice(1).map(c=>c.user.id)});
 await clients[0].page.locator('[data-guard="go"]').click();
 await clients[0].page.waitForFunction(()=>nsSocial.room()?.id);
 const room=await clients[0].page.evaluate(()=>nsSocial.room());
 for(const c of clients.slice(1))await c.page.evaluate(id=>nsSocial.joinRoom(id),room.id);
 try{await Promise.all(clients.map(c=>c.page.waitForFunction(()=>csV41Challenge.active,{},{timeout:35000})))}catch(e){
  await fs.writeFile(output+'/guard-start-failure.json',JSON.stringify(await Promise.all(clients.map(c=>c.page.evaluate(()=>motionTrace)))));
  console.log('GUARD_START_DIAGNOSTICS',JSON.stringify(await Promise.all(clients.map(c=>c.page.evaluate(()=>({room:nsSocial.room(),challenge:{id:csV41Challenge.id,active:csV41Challenge.active,self:csV41Challenge.selfId,mode:csV41Challenge.mode},channel:csCoop.dc?.readyState,localCase:C?.id,lobby:nsLobby.active,status:nsLobby.status,plan:nsLobby.groupPlan,acks:nsLobby.partyHandshake?.acks?.size,expected:nsLobby.partyHandshake?.expected?.size}))))));throw e;
 }
 assert.equal(new Set(await Promise.all(clients.map(c=>c.page.evaluate(()=>csV41Challenge.id)))).size,1,'all independent clients share one real guard');
 return room;
}
async function returnLobby(){
 // The original selector retains C/sim; use the normal page reload after
 // authorized room leave, retaining each client's own session/storage.
 for(const c of clients){await c.page.evaluate(()=>nsSocial.leave());await c.page.reload();await c.page.locator('#nsEnter').click();await c.page.waitForFunction(()=>nsLobby.active&&nsSocial.state().user);await installRenderProbe(c.page);await c.page.evaluate(()=>{csRemoteMotionDiagnostics487.enabled=true})}
 await Promise.all(clients.map(c=>c.page.waitForFunction(()=>nsLobby.active&&!csV41Challenge.active)));
 await pause(1000);
}
try{
 for(let i=0;i<count;i++)await makeClient(i);
 await Promise.all(clients.map(c=>c.page.waitForFunction(n=>nsLobby.players.size>=n,count-1)));
 await waitRTC();
 const identities=await Promise.all(clients.map(c=>c.page.evaluate(()=>({user:nsSocial.state().user.id,session:sessionStorage.getItem('atria.lobby.peer.v2'),rtc:[...window.__atriaLobbyNet461.peers.values()].map(p=>({open:p.open,channel:p.dc?.readyState,session:p.peerId}))}))));
 assert.equal(new Set(identities.map(c=>c.user)).size,count);assert.equal(new Set(identities.map(c=>c.session)).size,count);
 console.log('INDEPENDENT_CLIENTS',JSON.stringify(identities));
 const lobby=await capture('lobby'),scenarios=[];
 if(extended){
  scenarios.push(await capture('lobby-simultaneous',{simultaneous:true}));
  await Promise.all(clients.map(c=>c.page.evaluate(()=>{csRemoteMotionDiagnostics487.enabled=true;motionTrace.impair.enabled=true})));
  scenarios.push(await capture('lobby-jitter-loss-reorder',{simultaneous:true,impaired:true}));
  const impairment=await Promise.all(clients.map(c=>c.page.evaluate(()=>{motionTrace.impair.enabled=false;return motionTrace.impair})));
  assert(impairment.every(p=>p.delayed>5&&p.dropped>0),'real outgoing packets were delayed and lost');
  console.log('TRANSPORT_IMPAIRMENT',JSON.stringify(impairment));await pause(700);
 }
 const firstRoom=await startGuard('coop');
 const guard=await capture('guard');
 if(extended){
  scenarios.push(await capture('guard-simultaneous',{simultaneous:true}));
  await Promise.all(clients.map(c=>c.page.evaluate(()=>{motionTrace.impair.enabled=true})));
  scenarios.push(await capture('guard-jitter-loss',{short:true,impaired:true}));
  await Promise.all(clients.map(c=>c.page.evaluate(()=>{motionTrace.impair.enabled=false})));await pause(700);
  let onlineAt=0;
  scenarios.push(await capture('guard-outage',{impaired:true,qualitySince:()=>onlineAt,action:async()=>{
   await clients[0].context.setOffline(true);await Promise.all(clients.map(c=>move(c.page,0,-8)));await pause(1800);
   await clients[0].context.setOffline(false);onlineAt=Date.now();await pause(500);
   await Promise.all(clients.map(c=>move(c.page,6,0)));await pause(4000);
  }}));
  const outageTrace=JSON.parse(await fs.readFile(output+'/guard-outage-trace.json','utf8'));
  const sourceEnd=outageTrace[0].frames.at(-1).player;
  for(const trace of outageTrace.slice(1)){
   assert(trace.packets.some(p=>p.kind==='receive'&&p.data.name===clients[0].name&&p.data.sentAt>=onlineAt),'new source packets really arrive after reconnection');
   const observed=trace.frames.at(-1).actors.find(a=>a.remote&&a.name===clients[0].name);
   assert(observed&&Math.hypot(observed.x-sourceEnd.x,observed.y-sourceEnd.y)<18,'the rendered companion recovers within one stride without a persistent backlog');
  }
  await returnLobby();scenarios.push(await capture('lobby-return',{short:true}));
  // Close the actual channels; the original discovery/retry and HTTP fallback act.
  await Promise.all(clients.map(c=>c.page.evaluate(()=>{for(const p of __atriaLobbyNet461.peers.values()){p.dc?.close();p.pc?.close()}})));
  const fallback=await capture('lobby-fallback',{short:true,httpFallback:true});scenarios.push(fallback);
  const fallbackTrace=JSON.parse(await fs.readFile(output+'/lobby-fallback-trace.json','utf8'));
  assert(fallbackTrace.every((t,i)=>t.packets.some(p=>p.kind==='receive'&&p.transport==='http'&&p.data?.p?.userId!==clients[i].user.id&&p.data?.p?.moving&&p.data?.p?.motionAt!=null)),'closed RTC channels yield to genuine server states');
  const previous=await clients[0].page.evaluate(()=>({session:csMotionPage487,epoch:csMotionEpoch487}));
  await clients[0].page.reload();await clients[0].page.locator('#nsEnter').click();await clients[0].page.waitForFunction(()=>nsLobby.active&&nsSocial.state().user);await installRenderProbe(clients[0].page);
  const next=await clients[0].page.evaluate(()=>({session:csMotionPage487,epoch:csMotionEpoch487,motionSession:csMotionPage487+':'+sessionStorage.getItem('atria.lobby.peer.v2')}));assert.notEqual(next.session,previous.session);assert(next.epoch>previous.epoch,'real reload has an ordered new generation');
  // RTC is optional after a real channel failure/reload. Verify that every
  // observer actually accepts the new source generation through the existing
  // transport, including HTTP fallback, rather than requiring the old signal
  // negotiation to reconnect as a precondition for measuring remote recovery.
  await Promise.all(clients.slice(1).map(c=>c.page.waitForFunction(({id,motionSession,epoch})=>{const p=nsLobby.players.get(id)?._motion;return p?.session===motionSession&&p.epoch===epoch},{id:clients[0].user.id,...next},{timeout:15000})));
  scenarios.push(await capture('lobby-reconnect',{short:true}));
  const secondRoom=await startGuard('competitive');assert.notEqual(secondRoom.id,firstRoom.id,'another guard has an independent scene identity');
  scenarios.push(await capture('guard-competitive-restart',{short:true}));
 }
 assert.equal(browserErrors.length,0,'no browser errors across native scene and transport transitions');
 await fs.writeFile(output+'/summary.json',JSON.stringify({label,lobby,guard,scenarios,identities,browserErrors,httpRequests:requests.length,stalePresenceWrites:requests.filter(r=>r.stale).length,realNetwork:true,physicalAndroid:false},null,2));
}finally{
 await Promise.allSettled(clients.map(c=>c.context.close()));await Promise.allSettled(browsers.map(b=>b.close()));
 await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});
}
