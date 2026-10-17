// C21.c — 2/3/4 genuinely separate Chromium processes using a real HTTP
// server, Bearer authentication and transactional test storage. This proves
// network protocol only; the V5 multiplayer UI is NOT enabled by this test.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createRoomRelayService,createMemoryRoomRelayStore} from '../../src/v5/social/room-relay-service.js';
import {createGuardRelayHost} from '../../src/v5/social/room-gateway.js';
import {createHttpRoomTransport} from '../../src/v5/social/room-mailbox.js';
import {createRoomAuthority} from '../../src/v5/core/room-authority.js';
import {createNativeClinicalPort} from '../../src/v5/adapters/native-clinical-port.js';

const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const tokens=new Map(),store=createMemoryRoomRelayStore();
const relay=createRoomRelayService({store,authenticate:raw=>tokens.get(raw)||null});
let dropToken=null,dropCount=0;
const server=createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(url.pathname.startsWith('/api/')){
   let body='';for await(const chunk of req){body+=chunk;if(body.length>100000)break;}
   if(body.length>100000){res.writeHead(413);res.end();return;}
   const response=await relay.handle({method:req.method,path:url.pathname,
    headers:req.headers,query:Object.fromEntries(url.searchParams),
    body:body?JSON.parse(body):{}});
   if(dropToken===req.headers.authorization&&req.method==='POST'&&response.status===200){
    // The server has committed, but the client receives no success proof.
    // A deterministic 503 models an ambiguous post-commit response in CI.
    dropToken=null;dropCount++;res.writeHead(503,{'Content-Type':'application/json'});
    res.end(JSON.stringify({error:'simulated-reply-loss-after-commit'}));return;
   }
   res.writeHead(response.status,{'Content-Type':'application/json'});
   res.end(JSON.stringify(response.body));return;
  }
  if(url.pathname==='/'){res.writeHead(200,{'Content-Type':'text/html'});
   res.end('<!doctype html><html><head><meta charset="utf-8"></head><body>ATRIA C21.c network acceptance</body></html>');return;}
  if(url.pathname.startsWith('/src/v5/')){
   const filename=path.resolve('.'+url.pathname),root=path.resolve('src/v5');
   if(!filename.startsWith(root+path.sep)||!filename.endsWith('.js'))throw Error('invalid route');
   const content=await fs.readFile(filename);
   res.writeHead(200,{'Content-Type':'text/javascript'});res.end(content);return;
  }
  res.writeHead(404);res.end('not found');
 }catch(e){res.writeHead(500,{'Content-Type':'application/json'});res.end(JSON.stringify({error:e.message}));}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+server.address().port;
const flags={headless:true,args:['--no-sandbox','--disable-dev-shm-usage',
 '--disable-background-timer-throttling'],
 ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})};
let suites=0,totalBrowserProcesses=0;
const setupGuest=async(page,{roomId,actorId,hostId,token})=>{
 await page.goto(origin,{waitUntil:'domcontentloaded'});
 await page.evaluate(async({roomId,actorId,hostId,token})=>{
  const [{createGuardRelayGuest},{createHttpRoomTransport}]=await Promise.all([
   import('/src/v5/social/room-gateway.js'),import('/src/v5/social/room-mailbox.js')]);
  window.__qaToken=token;
  window.guard=createGuardRelayGuest({roomId,actorId,hostId,
   transport:createHttpRoomTransport({roomId,token})});
 },{roomId,actorId,hostId,token});
};
try{
 for(const mode of ['coop','competitive'])for(const count of [2,3,4]){
  const roomId='accept-'+mode+'-'+count,names=Array.from({length:count},(_,n)=>'doctor-'+n);
  const issued=id=>'token-'+roomId+'-'+id;
  for(const id of names)tokens.set('Bearer '+issued(id),{id});
  await store.create({roomId,hostId:names[0],members:names});
  const clinicalCalls=[],port=createNativeClinicalPort({
   withPatient:(uid,fn)=>fn({uid}),
   invoke:req=>{clinicalCalls.push(req);return {status:'executed',eventId:req.eventId,patientUid:req.patientUid,
    receipt:{eventId:req.eventId,patientUid:req.patientUid}};}});
  const authority=createRoomAuthority({roomId,mode,
   members:names.map(id=>({id})),patients:[{uid:'P1'}],
   authenticate:id=>names.includes(id)?{id,roomId}:null,
   clinicalPort:port,resolveSpeechContext:()=>({patientUid:'P1',studies:[],
    therapies:[{id:'ceftriaxone',label:'Ceftriaxona',aliases:['ceftriaxona']}]})});
  const transport=createHttpRoomTransport({roomId,token:issued(names[0]),
   request:(relative,opts)=>fetch(origin+relative,opts)});
  const host=createGuardRelayHost({roomId,hostId:names[0],authority,transport,
   authenticateSender:async sender=>sender});
  const clients=await Promise.all(names.slice(1).map(async(id)=>{
   const browser=await chromium.launch(flags),page=await browser.newPage();
   await setupGuest(page,{roomId,actorId:id,hostId:names[0],token:issued(id)});
   totalBrowserProcesses++;
   return {browser,page,id};
  }));
  try{
   host.publish();await host.flush();
   await Promise.all(clients.map(c=>c.page.evaluate(()=>window.guard.poll())));
   for(let i=0;i<clients.length;i++){
    assert.equal(await clients[i].page.evaluate(()=>window.guard.snapshot()?.revision),0);
   }
   // A real HTTP socket can close AFTER commit. The client's retry must
   // retain its command identity; the relay must return the original seq.
   if(mode==='coop'&&count===2)dropToken='Bearer '+issued(names[1]);
   for(let i=0;i<clients.length;i++){
    await clients[i].page.evaluate(({id})=>window.guard.post({
     id,text:'Enfermera ceftriaxona',actorId:'untrusted',patientUid:'untrusted'
    }),{id:'rx-'+i});
   }
   if(dropToken){
    const failed=await clients[0].page.evaluate(async()=>{try{await window.guard.flush();return false;}catch{return true;}});
    assert(failed,'the dropped POST response must be ambiguous to client');
    assert.equal(await clients[0].page.evaluate(()=>window.guard.status().pending),1);
    assert.equal(dropCount,1);
   }
   await Promise.all(clients.map(c=>c.page.evaluate(()=>window.guard.flush())));
   await host.poll();host.publish();await host.flush();
   await Promise.all(clients.map(c=>c.page.evaluate(()=>window.guard.poll())));
   const executedActors=[];
   for(let i=0;i<clients.length;i++){
    const state=await clients[i].page.evaluate(({id})=>({
     ack:window.guard.acknowledgement(id),state:window.guard.snapshot()
    }),{id:'rx-'+i});
    assert(state.ack,'guest must receive actual host acknowledgement');
    assert.equal(state.ack.patientUid,'P1','the network request cannot select arbitrary patient');
    const result=state.ack.clinical[0];
    if(result.status==='executed')executedActors.push(clients[i].id);
    else{
     assert.equal(mode,'competitive');
     assert.equal(result.reason,'other-player-owns-patient');
    }
    assert.equal(state.state.transcript.length,count-1);
   }
   assert.equal(executedActors.length,mode==='coop'?count-1:1);
   assert.equal(clinicalCalls.length,mode==='coop'?count-1:1);
   if(mode==='competitive'){
    assert.equal(authority.snapshot().patients[0].ownerId,executedActors[0]);
    assert.equal(clinicalCalls[0].actorId,executedActors[0],
     'competitive ownership must follow first valid processed request, not browser array order');
   }
   // Guest snapshot forgery is rejected at the actual HTTP boundary.
   const rejected=await clients[0].page.evaluate(async(roomId)=>{
     return fetch('/api/rooms/'+roomId+'/messages',{method:'POST',headers:{
     'Content-Type':'application/json',Authorization:'Bearer '+window.__qaToken},
     body:JSON.stringify({message:{protocol:'atria.v5.room.1',roomId,
      kind:'room.snapshot',id:'forge',payload:{room:{revision:999}}}})}).then(r=>r.status);
   },roomId);
   // The negative case uses a token exposed only inside the isolated QA page.
   assert.equal(rejected,403,'authenticated rival cannot submit a host snapshot');
   const before=authority.snapshot().revision;
   await clients[0].page.evaluate(()=>window.guard.requestResync('cycle'));
   await clients[0].page.evaluate(()=>window.guard.flush());
   await host.poll();await host.flush();
   await clients[0].page.evaluate(()=>window.guard.poll());
   assert.equal(authority.snapshot().revision,before,'resync must not create clinical chat');
   assert.equal(clinicalCalls.length,mode==='coop'?count-1:1);
   suites++;
   console.log('ATRIA C21.c REAL HTTP CHROMIUM OK',JSON.stringify({mode,count,
    nativeEffects:clinicalCalls.length,transcript:authority.snapshot().transcript.length}));
  }finally{
   host.dispose();authority.dispose();
   await Promise.all(clients.map(c=>c.browser.close()));
  }
 }
 assert.equal(suites,6);assert.equal(totalBrowserProcesses,12);
 console.log('ATRIA C21.c COMPLETE',JSON.stringify({suites,browserProcesses:totalBrowserProcesses,
  realHttp:true,physicalAndroid:false,multiplayerUi:false}));
}finally{await new Promise(r=>server.close(r));}
