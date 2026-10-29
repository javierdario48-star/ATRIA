import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createV5QaSocialServer} from '../../src/v5/social/room-membership-store.js';
import {isSignalingEndpoint} from '../../src/v5/social/social-route-policy.js';
import {createSqliteGuardStore} from './sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from '../../src/v5/server/durable-guard-authority.js';
import {clinicalContent} from '../../src/v5/server/content.js';
import {createClinicalHttp} from '../../src/v5/server/clinical-http.js';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {observeRtcBrowser} from './rtc-diagnostics.mjs';
import {COLLIDING_BROWSER_CLIENTS} from './presence-collision-fixture.mjs';

export async function browserHarness({apiLatency=0,durable=false,vercelRewriteFallback=false,accounts=null}={}){
 const rtcDiagnostics=process.env.V5_QA_RTC_TRACE==='1',signalTrace=new Map();
 const collisionKeys=process.env.V5_QA_COLLIDING_CLIENTS==='1'?COLLIDING_BROWSER_CLIENTS:null;
 let contextIndex=0;
 const require=createRequire(import.meta.url);
 const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||
  (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright'));
 const root=path.resolve('out-v5'),requests=[];
 const records=new Map(),social=accounts?.legacy||createV5QaSocialServer({get:async k=>records.get(k),set:async(k,v)=>records.set(k,structuredClone(v)),delete:async k=>records.delete(k)});
 const durableDir=durable?mkdtempSync(path.join(tmpdir(),'atria-durable-browser-')):null;
 const store=durable?createSqliteGuardStore(path.join(durableDir,'guards.sqlite')):null;
 const readContent=name=>JSON.parse(readFileSync(new URL('../../src/v5/content/'+name+'.json',import.meta.url),'utf8'));
 const content=durable?clinicalContent:null;
 const authority=durable?createDurableGuardAuthority({store,content}):null;
 const clinicalRoute=durable?createClinicalHttp({authority,enabled:true,probe:async()=>({durable:true,kind:'qa-sqlite-cas',schemaVersion:1}),
  async verifiedRoom(headers,roomId,actorId){
   const me=await social.route({method:'GET',path:'/api/me',headers});
   if(me.status!==200||me.body.user.id!==actorId)return null;
   const result=await social.route({method:'GET',path:'/api/rooms/'+roomId+'/messages',headers,query:{after:0}});
   return result.status===200?result.body.room:null;
  }}):null;
 const types={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.webp':'image/webp','.png':'image/png','.avif':'image/avif'};
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
   if(pathname.startsWith('/api/')){
    let raw='';for await(const chunk of req)raw+=chunk;if(apiLatency)await new Promise(r=>setTimeout(r,apiLatency));
    const fallback=vercelRewriteFallback&&pathname==='/api/lobby-sync';
    const input={method:req.method,path:fallback?'/api/social':pathname,
     query:{...Object.fromEntries(url.searchParams),...(fallback?{route:'lobby-sync'}:{})},
     headers:req.headers,body:raw?JSON.parse(raw):{}};
    // C5.a baseline tests keep the new server authority disabled; C5.b
    // acceptance has a separate durable backend, never this ephemeral fixture.
    const response=pathname==='/api/clinical'&&durable?await clinicalRoute(input):pathname==='/api/clinical'?
     (input.method==='POST'&&input.body.action==='capability'
      ?{status:200,body:{durable:false,kind:'qa-legacy-only',schemaVersion:1,clinicalEnabled:false}}
      :{status:503,body:{code:'recovery-client-not-enabled'}}):
     pathname.startsWith('/api/account/')&&accounts?await accounts.gate.route(input):
     pathname==='/api/account/session'?{status:200,body:{account:null,enabled:false}}:
     (isSignalingEndpoint({path:input.path,route:input.query.route})?await (accounts?.gate||social).signalRoute(input):await (accounts?.gate||social).route(input));
    requests.push({path:pathname,status:response.status});
    if(rtcDiagnostics&&(input.body.signal||input.query.signal)){
     const value=input.body.signal||response.body.signal,description=value?.description,
      trace={method:input.method,status:response.status,type:value?.type||input.query.signal,
       from:value?.fromPeerId||input.query.fromPeer,to:value?.toPeerId||input.query.toPeer,
       negotiationId:description?.negotiationId,sdpLength:description?.sdp?.length,
       candidates:description?.candidates?.length,error:response.body.error},
      key=[trace.method,trace.type,trace.from,trace.to].join(':'),encoded=JSON.stringify(trace);
     if(signalTrace.get(key)!==encoded){signalTrace.set(key,encoded);console.log('ATRIA_SIGNAL '+encoded);}
    }
    if(response.cookies?.length)res.setHeader('Set-Cookie',response.cookies);res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(response.body));return;
   }
   const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+path.sep))throw Error('outside root');
   const bytes=await fs.readFile(file);requests.push({path:pathname,status:200});
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{requests.push({path:req.url,status:404});res.writeHead(404);res.end('not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const launch=async()=>{const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling'],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
  if(collisionKeys){const create=browser.newContext.bind(browser);browser.newContext=async(...args)=>{
   const context=await create(...args),key=collisionKeys[contextIndex++];
   if(key)await context.addInitScript(value=>{
    if(!localStorage.getItem('atria.v5.social.client'))localStorage.setItem('atria.v5.social.client',value);
   },key);return context;
  };}
  return rtcDiagnostics?observeRtcBrowser(browser):browser;};
 const browser=await launch();
 return {browser,devices,requests,newBrowser:launch,url:'http://127.0.0.1:'+server.address().port,
  close:async()=>{await browser.close();await new Promise(r=>server.close(r));store?.close();if(durableDir)rmSync(durableDir,{recursive:true,force:true});}};
}
