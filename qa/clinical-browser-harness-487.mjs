// Full generated game, separate Chromium processes and authenticated HTTP.
// This fixture runs the project's route handlers with a file-backed QA cache.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {apply487} from '../src/integration/apply-487.js';
import {createQaSocialServer} from '../src/social/qa-social-server.js';

export async function clinicalBrowserHarness487(count=2){
 const require=createRequire(import.meta.url);
 const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'atria-clinical-http-'));
 const file=k=>path.join(dir,createHash('sha256').update(k).digest('hex')+'.json');
 const storage={async get(k){try{const d=JSON.parse(await fs.readFile(file(k),'utf8'));return d.until>Date.now()?d.value:null}catch{return null}},
  async set(k,value,{ttl=600}={}){const tmp=file(k)+'.'+Math.random().toString(36).slice(2);await fs.writeFile(tmp,JSON.stringify({until:Date.now()+ttl*1000,value}));await fs.rename(tmp,file(k))},
  async delete(k){await fs.rm(file(k),{force:true})}};
 const core=createQaSocialServer(storage),html=apply487(await fs.readFile('vendor/atria-4.8.6/index.html','utf8'));
 const requests=[],faults=[];let transaction=Promise.resolve();
 const server=createServer(async(req,res)=>{
  try{
   const u=new URL(req.url,'http://localhost');res.setHeader('Cache-Control','no-store');
   if(u.pathname.startsWith('/api/')){
    let raw='';for await(const chunk of req)raw+=chunk;
    const args={method:req.method,path:u.pathname,query:Object.fromEntries(u.searchParams),headers:req.headers,body:raw?JSON.parse(raw):{}};
    const operation=transaction.then(()=>u.pathname==='/api/lobby-sync'?core.signalRoute(args):core.route(args));
    transaction=operation.catch(()=>{});const result=await operation;
    const fault=faults.find(f=>f.remaining>0&&req.method==='POST'&&f.match(args));
    requests.push({at:Date.now(),path:u.pathname,method:req.method,body:args.body,status:result.status,lostResponse:!!fault,...(req.method==='GET'&&u.pathname.includes('/messages')?{after:args.query.after,cursor:result.body?.cursor,roomMembers:result.body?.room?.members?.map(m=>({userId:m.userId,peerId:m.peerId})),heard:result.body?.messages?.filter(m=>m.data?.kind==='team_chat').map(m=>({userId:m.userId,peerId:m.data.peerId,text:m.data.text,messageId:m.data.messageId,originPeerId:m.data.originPeerId}))}: {})});
    if(fault){fault.remaining--;res.writeHead(503,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Test: response lost AFTER acceptance'}));return}
    res.writeHead(result.status,{'Content-Type':'application/json'});res.end(JSON.stringify(result.body));return;
   }
   if(u.pathname==='/'||u.pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return}
   if(/^\/task\d+\.js$/.test(u.pathname)){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await fs.readFile('vendor/atria-4.8.6'+u.pathname));return}
   res.writeHead(404);res.end('not found');
  }catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}))}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url='http://127.0.0.1:'+server.address().port,clients=[],errors=[];
 const launch={headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling','--disable-renderer-backgrounding'],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})};
 for(let i=0;i<count;i++){
  const browser=await chromium.launch(launch),name='ClinicalClient_'+i;
  const context=await browser.newContext(i===count-1?devices['Pixel 5']:{viewport:{width:1024,height:768}});
  await context.addInitScript(({name})=>{
   localStorage.setItem('clinicalShift.profile.v1',JSON.stringify({name,deviceId:'clinical-device-'+name,scrubColor:'navy',soundEnabled:false}));
   localStorage.setItem('nightShift.social.client.v2@'+name.toLowerCase(),'atria_clinical_independent_'+name);
   localStorage.setItem('nightShift.social.client.v2@medico','atria_clinical_independent_'+name);
  },{name});
  const page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>errors.push({client:i,error:e.message}));
  await page.goto(url);await page.locator('#nsEnter').click();
  await page.waitForFunction(()=>nsLobby.active&&nsSocial.state().user);
  clients.push({browser,context,page,name,user:await page.evaluate(()=>nsSocial.state().user)});
 }
 await Promise.all(clients.map(c=>c.page.waitForFunction(n=>nsLobby.players.size>=n,count-1)));
 assert.equal(new Set(clients.map(c=>c.user.id)).size,count);
 const peers=await Promise.all(clients.map(c=>c.page.evaluate(()=>csV41Challenge.selfId)));
 assert.equal(new Set(peers).size,count);
 async function startGuard(mode='coop',caseId='APP-001'){
  for(const c of clients)await c.page.evaluate(caseId=>{
   const organ=Object.entries(nsPractice.catalog().organs).find(([,o])=>o.ids.includes(caseId))?.[0];
   if(!organ)throw Error('Unknown native clinical case '+caseId);
   return nsPractice.configure({area:'gastro',organ,pathology:caseId});
  },caseId);
  await clients[0].page.evaluate(({mode,ids})=>nsLobby.openGuardia(mode,ids),{mode,ids:clients.slice(1).map(c=>c.user.id)});
  await clients[0].page.locator('[data-guard="go"]').click();
  await clients[0].page.waitForFunction(()=>nsSocial.room()?.id);
  const room=await clients[0].page.evaluate(()=>nsSocial.room());
  for(const c of clients.slice(1))await c.page.evaluate(id=>nsSocial.joinRoom(id),room.id);
  await Promise.all(clients.map(c=>c.page.waitForFunction(()=>csV41Challenge.active,{},{timeout:35000})));
  const ids=await Promise.all(clients.map(c=>c.page.evaluate(()=>csV41Challenge.id)));
  assert.equal(new Set(ids).size,1);return room;
 }
 async function select(client,index=0){
  const page=clients[client].page;
  await page.evaluate(index=>csV41TakePatient(index),index);
  await page.waitForFunction(index=>{
   const p=csV41Challenge.patients[index];return p?.ownerId&&sim?.patientInstance?.uid===p.uid&&!sim.__csRoomSpectator;
  },index,{timeout:30000});
 }
 async function send(client,text,{tap=false}={}){
  const page=clients[client].page,input=page.locator('#dieInput');
  await input.fill(text);
  if(tap)await page.locator('#dieSend').click();else await input.press('Enter');
 }
 async function snapshot(){return Promise.all(clients.map(c=>c.page.evaluate(()=>({
  id:csV41Challenge.selfId,room:csV41Challenge.id,mode:csV41Challenge.mode,active:csV41Challenge.active,
  patients:csV41Challenge.patients,input:document.getElementById('dieInput')?.value,
  focused:document.activeElement?.id,keyboard:document.body.classList.contains('keyboardOpen'),
  chat:sim?.globalChat,lobby:nsLobby.messages,caseId:C?.id,uid:sim?.patientInstance?.uid,
  monitor:sim?.monitorConnected,iv:sim?.venousAccessCount,vitals:sim?.liveVitals,
  administrations:sim?.administrationLog,orders:sim?.orders?[...sim.orders]:[],
  receipts:sim?.csNurse487Receipts,mirror:sim?.__csRemoteMirror487,
  nurse:{state:nurse.state,task:nurse.task?.kind,queue:nurse.queue.map(t=>t.kind)},
  ward:typeof wardNurses!=='undefined'?wardNurses.map(n=>({state:n.state,task:n.task?.kind,queue:n.queue.map(t=>t.kind)})):[]
 }))))}
 async function close(){for(const c of clients)await c.browser.close();await new Promise(r=>server.close(r));await fs.rm(dir,{recursive:true,force:true})}
 return {clients,url,requests,faults,errors,startGuard,select,send,snapshot,close};
}
