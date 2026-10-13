// True independent Chromium processes, real full ATRIA runtime and HTTP room API.
// No synthetic room bus or clinical state injection. Physical Android remains manual.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {apply487} from '../src/integration/apply-487.js';
import {createQaSocialServer} from '../src/social/qa-social-server.js';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const count=Number(process.env.ROOM_CHAT_PLAYERS||2);
assert([2,3,4].includes(count));
const root=await fs.mkdtemp(path.join(os.tmpdir(),'atria-chat-real-'));
const file=k=>path.join(root,createHash('sha256').update(k).digest('hex')+'.json');
const storage={
 async get(k){try{const v=JSON.parse(await fs.readFile(file(k),'utf8'));return v.until>Date.now()?v.value:null}catch{return null}},
 async set(k,value,{ttl=600}={}){const target=file(k),temp=target+'.'+Math.random().toString(36).slice(2);await fs.writeFile(temp,JSON.stringify({value,until:Date.now()+ttl*1000}));await fs.rename(temp,target)},
 async delete(k){await fs.rm(file(k),{force:true})}
};
const core=createQaSocialServer(storage);
const html=apply487(await fs.readFile('vendor/atria-4.8.6/index.html','utf8'));
let transaction=Promise.resolve();
const server=createServer(async(req,res)=>{
 try{
  const u=new URL(req.url,'http://localhost');
  res.setHeader('Cache-Control','no-store');
  if(u.pathname.startsWith('/api/')){
   let body='';for await(const chunk of req)body+=chunk;
   const args={method:req.method,path:u.pathname,query:Object.fromEntries(u.searchParams),headers:req.headers,body:body?JSON.parse(body):{}};
   const op=transaction.then(()=>u.pathname==='/api/lobby-sync'?core.signalRoute(args):core.route(args));
   transaction=op.catch(()=>{});const result=await op;
   res.writeHead(result.status,{'Content-Type':'application/json'});res.end(JSON.stringify(result.body));return;
  }
  if(u.pathname==='/'||u.pathname==='/index.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(html);return;}
  if(/^\/task\d+\.js$/.test(u.pathname)){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(await fs.readFile('vendor/atria-4.8.6'+u.pathname));return;}
  res.writeHead(404);res.end('Not found');
 }catch(e){res.writeHead(500);res.end(JSON.stringify({error:e.message}));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const baseUrl='http://127.0.0.1:'+server.address().port;
const clients=[],errors=[],sent=[],lost=[];
try{
 for(let i=0;i<count;i++){
  const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],
   ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  const context=await browser.newContext({viewport:{width:900,height:750}});
  const page=await context.newPage();
  page.setDefaultTimeout(25000);
  page.on('pageerror',err=>errors.push({client:i,error:err.message}));
  await context.addInitScript(name=>{
   localStorage.setItem('clinicalShift.profile.v1',JSON.stringify({name,deviceId:'chat-487-'+name,scrubColor:'navy',soundEnabled:false}));
   localStorage.setItem('nightShift.social.client.v2@'+name.toLowerCase(),'atria_chat_isolated_'+name);
   localStorage.setItem('nightShift.social.client.v2@medico','atria_chat_isolated_'+name);
  },'RoomChat_'+i);
  await page.goto(baseUrl);await page.locator('#nsEnter').click();
  await page.waitForFunction(()=>window.nsLobby?.active&&window.nsSocial?.state?.().user);
  const user=await page.evaluate(()=>nsSocial.state().user);
  clients.push({browser,context,page,user});
 }
 assert.equal(new Set(clients.map(c=>c.user.id)).size,count,'independent authenticated users');
 await clients[0].page.evaluate(ids=>nsLobby.openGuardia('coop',ids),clients.slice(1).map(c=>c.user.id));
 await clients[0].page.locator('[data-guard="go"]').click();
 await clients[0].page.waitForFunction(()=>nsSocial.room()?.id);
 const room=await clients[0].page.evaluate(()=>nsSocial.room());
 for(const c of clients.slice(1))await c.page.evaluate(id=>nsSocial.joinRoom(id),room.id);
 await Promise.all(clients.map(c=>c.page.waitForFunction(()=>csV41Challenge.active&&csCoop.dc?.readyState==='open',{},{timeout:35000})));
 assert.equal(new Set(await Promise.all(clients.map(c=>c.page.evaluate(()=>csV41Challenge.id)))).size,1,'same shared clinical room');
 for(const c of clients)await c.page.evaluate(()=>{
  window.__roomChatObserved487=[];
  const original=addGlobalChat;
  addGlobalChat=function(role,text,options){
   window.__roomChatObserved487.push({role,text:String(text)});
   return original.apply(this,arguments);
  };
 });
 // Drop precisely one genuine outgoing HTTP POST for chat, not another user's
 // packet or motion. Production HTTP queue and the same-id outbox must retry.
 let dropped=false;
 await clients[0].page.route('**/api/rooms/*/messages',async route=>{
  const req=route.request();
  if(!dropped&&req.method()==='POST'){
   let body={};try{body=req.postDataJSON()}catch{}
   if(body.message?.kind==='team_chat'){dropped=true;lost.push(body.message.messageId);await route.abort('failed');return;}
  }
  await route.continue();
 });
 for(let i=0;i<count;i++){
  const phrase='CHAT_REAL_487_'+count+'_'+i;
  const success=await clients[i].page.evaluate(text=>sendMessage('/equipo '+text),phrase);
  assert.notEqual(success,false,'native team chat must accept the draft');
  sent.push({client:i,phrase});
  await Promise.all(clients.filter((_c,j)=>j!==i).map(c=>c.page.waitForFunction(
   needle=>window.__roomChatObserved487?.filter(e=>e.text.includes(needle)&&e.text.includes('equipo:')).length===1,
   phrase,{timeout:22000})));
  // Let duplicate source packets/ACK retries settle before exact-once assertion.
  await new Promise(resolve=>setTimeout(resolve,1400));
  for(let j=0;j<count;j++)if(j!==i){
   const observed=await clients[j].page.evaluate(needle=>__roomChatObserved487.filter(e=>e.text.includes(needle)&&e.text.includes('equipo:')).length,phrase);
   assert.equal(observed,1,'exactly once per real remote client despite retry');
  }
 }
 assert.equal(dropped,true,'test actually injected one transient HTTP failure');
 await clients[0].page.waitForFunction(()=>window.__roomChatObserved487.some(e=>e.text.includes('Equipo: mensaje recibido.')),{},{timeout:22000});
 assert.equal(errors.length,0,'no runtime errors in full independent client app');
 console.log('ATRIA REAL ROOM CHAT PASS',JSON.stringify({players:count,roomId:room.id,
  independentBrowsers:count,realHTTP:true,abortedPosts:lost.length,
  messages:sent.length,duplicateRemoteEntries:0,mode:'coop',physicalAndroid:false}));
}finally{
 await Promise.allSettled(clients.map(c=>c.context.close()));
 await Promise.allSettled(clients.map(c=>c.browser.close()));
 await new Promise(resolve=>server.close(resolve));
 await fs.rm(root,{recursive:true,force:true});
}
