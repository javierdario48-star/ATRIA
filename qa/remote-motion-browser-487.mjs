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
import {apply487} from '../src/integration/apply-487.js';
import {createQaSocialServer} from '../src/social/qa-social-server.js';
import {metrics} from './remote-motion-metrics-487.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const label=process.env.MOTION_LABEL||'baseline';
const output=process.env.MOTION_OUTPUT||'qa/remote-motion-results/'+label;
await fs.mkdir(output,{recursive:true});
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'atria-motion-http-'));
const file=k=>path.join(dir,createHash('sha256').update(k).digest('hex')+'.json');
const storage={async get(k){try{const d=JSON.parse(await fs.readFile(file(k),'utf8'));return d.until>Date.now()?d.value:null}catch{return null}},
 async set(k,value,{ttl=600}={}){await fs.writeFile(file(k),JSON.stringify({until:Date.now()+ttl*1000,value}))},
 async delete(k){await fs.rm(file(k),{force:true})}};
const core=createQaSocialServer(storage);
const base=await fs.readFile('vendor/atria-4.8.6/index.html','utf8');
const html=apply487(base);
const requests=[];
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(u.pathname.startsWith('/api/')){
   let raw='';for await(const chunk of req)raw+=chunk;
   const args={method:req.method,path:u.pathname,query:Object.fromEntries(u.searchParams),headers:req.headers,body:raw?JSON.parse(raw):{}};
   const t=Date.now(),r=await(u.pathname==='/api/lobby-sync'?core.signalRoute(args):core.route(args));
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
const browsers=[],clients=[];
const launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding'],
 ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})};
// Observe packets at their real boundaries. This probe is test-only and opt-in.
function initProbe({name}){
 localStorage.setItem('clinicalShift.profile.v1',JSON.stringify({name,scrubColor:'navy',soundEnabled:false}));
 localStorage.setItem('nightShift.social.client.v2@'+name.toLowerCase(),'atria_motion_isolated_client_'+name);
 window.motionTrace={frames:[],packets:[],errors:[],record:false};
 const log=(kind,transport,data)=>{if(!motionTrace.record)return;motionTrace.packets.push({t:Date.now(),now:performance.now(),kind,transport,data})};
 const wire=dc=>{
  if(dc.__motionProbe)return;dc.__motionProbe=true;
  const send=dc.send.bind(dc);dc.send=v=>{try{log('send','rtc',JSON.parse(v))}catch{}return send(v)};
  dc.addEventListener('message',e=>{try{log('receive','rtc',JSON.parse(e.data))}catch{}});
 };
 const RTC=window.RTCPeerConnection;
 window.RTCPeerConnection=class extends RTC{constructor(...args){super(...args);this.addEventListener('datachannel',e=>wire(e.channel))}createDataChannel(...args){const c=super.createDataChannel(...args);wire(c);return c}};
 const fetch=window.fetch.bind(window);
 window.fetch=async(...args)=>{const [input,options]=args,u=String(input);
  if(options?.body){try{const data=JSON.parse(options.body);if(/lobby\/state|rooms\/.*\/messages|lobby-sync/.test(u))log('send','http',data)}catch{}}
  const r=await fetch(...args);
  if(/api\/lobby(?:\?|$)|rooms\/.*\/messages|lobby-sync/.test(u)){try{const d=await r.clone().json();
   for(const p of d.players||[])log('receive','http',{t:'p',p});
   for(const m of d.messages||[])if(m.data?.type==='state')log('receive','http',m.data);
  }catch{}}
  return r;
 };
}
async function installRenderProbe(page){
 await page.evaluate(()=>{
  const sprite=drawSprite,nameplate=csDrawNameplate,render=draw;let current=[];
  drawSprite=function(im,a,h){if(motionTrace.record&&(a===player||h===60||h===62))current.push({x:a.x,y:a.y,dir:a.dir,moving:!!a.moving,phase:a.walkPhase||0,local:a===player,h});return sprite.apply(this,arguments)};
  csDrawNameplate=function(a,name,level,remote){if(motionTrace.record){const p=current.findLast(p=>p.x===a.x&&p.y===a.y);if(p){p.name=name;p.remote=remote}}return nameplate.apply(this,arguments)};
  draw=function(){current=[];const r=render.apply(this,arguments);if(motionTrace.record)motionTrace.frames.push({t:Date.now(),now:performance.now(),scene:nsLobby.active?'lobby':'guard',player:{x:player.x,y:player.y,dir:player.dir,moving:!!player.moving,phase:player.walkPhase||0},actors:current});return r};
 });
}
async function makeClient(i){
 const browser=await chromium.launch(launch);browsers.push(browser);
 const context=await browser.newContext({viewport:{width:1024,height:768}});
 const page=await context.newPage();page.setDefaultTimeout(15000);
 page.on('pageerror',e=>{console.log('BROWSER_ERROR',i,e.message)});
 await context.addInitScript(initProbe,{name:'MotionClient_'+i});
 await page.goto(url);await page.locator('#nsEnter').click();
 await page.waitForFunction(()=>window.nsLobby?.active&&window.nsSocial?.state?.().user);
 await installRenderProbe(page);
 const user=await page.evaluate(()=>nsSocial.state().user);
 const c={browser,context,page,user,name:user.name};clients.push(c);return c;
}
async function move(page,dx,dy){
 // Feed the original pointer controller and original pathfinder; never assign player.x/y.
 const pt=await page.evaluate(({dx,dy})=>{
  const tx=Math.floor(player.x/TW)+dx,ty=Math.floor(player.y/TH)+dy;
  const p=nearestPassable(tx,ty,8);if(!p)throw Error('No passable movement target');
  return worldToScreen((p[0]+.5)*TW,(p[1]+.5)*TH);
 },{dx,dy});
 await page.mouse.click(pt[0],pt[1]);
}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function route(page){
 await move(page,0,-10);await pause(1800);
 await move(page,7,0);await pause(1300);
 await page.evaluate(()=>{const [x,y]=worldToScreen(player.x,player.y);handleGameTap({clientX:x,clientY:y})});await pause(700);
 await move(page,-7,0);await pause(1100);
 for(const [x,y]of [[0,-3],[4,0],[-3,0],[0,4]]){await move(page,x,y);await pause(330)}
 await pause(1100);
}
async function capture(scene){
 for(const c of clients)await c.page.evaluate(()=>{motionTrace.frames=[];motionTrace.packets=[];motionTrace.record=true});
 await route(clients[0].page);await route(clients[1].page);
 const traces=await Promise.all(clients.map(c=>c.page.evaluate(()=>{motionTrace.record=false;return motionTrace})));
 const m={scene,label,clients:clients.length,AB:metrics(traces[0],traces[1],clients[0].name),BA:metrics(traces[1],traces[0],clients[1].name)};
 for(let i=0;i<clients.length;i++)await clients[i].page.screenshot({path:output+'/'+scene+'-'+i+'.png'});
 await fs.writeFile(output+'/'+scene+'-trace.json',JSON.stringify(traces));await fs.writeFile(output+'/'+scene+'-metrics.json',JSON.stringify(m,null,2));
 console.log('CROSSED_MOTION',JSON.stringify(m));
 assert(m.AB.frames>60&&m.BA.frames>60,'both clients render the real companion');
 assert(m.AB.localFrames>60&&m.BA.localFrames>60);
 return m;
}
try{
 await makeClient(0);await makeClient(1);
 await Promise.all(clients.map(c=>c.page.waitForFunction(()=>nsLobby.players.size>=1)));
 try{await Promise.all(clients.map(c=>c.page.waitForFunction(()=>[...window.__atriaLobbyNet461.peers.values()].some(p=>p.open&&p.dc?.readyState==='open'),{},{timeout:20000})))}catch(e){
  console.log('RTC_FAILURE_DIAGNOSTICS',JSON.stringify(await Promise.all(clients.map(c=>c.page.evaluate(()=>{const n=__atriaLobbyNet461;return {version:n.version,syncFailures:n.syncFailures,error:n.lastSyncError,postError:n.lastPostError,peers:[...n.peers.values()].map(p=>({open:p.open,connecting:p.connecting,connection:p.pc?.connectionState,ice:p.pc?.iceConnectionState,sdp:!!p.pc?.localDescription,remoteSdp:!!p.pc?.remoteDescription,channel:p.dc?.readyState})),roster:n.roster.size}})))));
  console.log('HTTP_REQUESTS',JSON.stringify(requests.filter(r=>r.path.includes('sync')).slice(-18)));
  if(process.env.MOTION_REQUIRE_RTC!=='0')throw e;
 }
 console.log('INDEPENDENT_CLIENTS',JSON.stringify(await Promise.all(clients.map(c=>c.page.evaluate(()=>({user:nsSocial.state().user.id,session:sessionStorage.getItem('atria.lobby.peer.v2'),rtc:[...window.__atriaLobbyNet461.peers.values()].map(p=>({open:p.open,channel:p.dc?.readyState,session:p.peerId}))}))))));
 const lobby=await capture('lobby');
 const room=await clients[0].page.evaluate(id=>nsSocial.createRoom('coop',[id]),clients[1].user.id);
 await clients[1].page.evaluate(id=>nsSocial.joinRoom(id),room.id);
 await clients[0].page.waitForFunction(()=>nsSocial.room()?.allAccepted&&csCoop.dc?.readyState==='open');
 await clients[0].page.evaluate(()=>{nsPractice.setMode('coop');nsPractice.start(false)});
 await Promise.all(clients.map(c=>c.page.waitForFunction(()=>csV41Challenge.active)));
 const guard=await capture('guard');
 await fs.writeFile(output+'/summary.json',JSON.stringify({label,lobby,guard,httpRequests:requests.length,stalePresenceWrites:requests.filter(r=>r.stale).length,realNetwork:true,physicalAndroid:false},null,2));
}finally{
 await Promise.allSettled(browsers.map(b=>b.close()));
 await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true});
}
