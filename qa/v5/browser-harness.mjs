import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createV5QaSocialServer} from '../../src/v5/social/room-membership-store.js';
import {isSignalingEndpoint} from '../../src/v5/social/social-route-policy.js';
import {createSqliteGuardStore} from './sqlite-guard-store.mjs';
import {createDurableGuardAuthority} from '../../src/v5/server/durable-guard-authority.js';
import {createClinicalHttp} from '../../src/v5/server/clinical-http.js';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';

export async function browserHarness({apiLatency=0,durable=false,vercelRewriteFallback=false}={}){
 const require=createRequire(import.meta.url);
 const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||
  (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright'));
 const root=path.resolve('out-v5'),requests=[];
 const records=new Map(),social=createV5QaSocialServer({get:async k=>records.get(k),set:async(k,v)=>records.set(k,structuredClone(v)),delete:async k=>records.delete(k)});
 const durableDir=durable?mkdtempSync(path.join(tmpdir(),'atria-durable-browser-')):null;
 const store=durable?createSqliteGuardStore(path.join(durableDir,'guards.sqlite')):null;
 const readContent=name=>JSON.parse(readFileSync(new URL('../../src/v5/content/'+name+'.json',import.meta.url),'utf8'));
 const content=durable?{map:readContent('hospital'),beds:readContent('beds'),cases:readContent('cases'),
  therapies:readContent('therapies'),defaultDoses:readContent('default-doses')}:null;
 const authority=durable?createDurableGuardAuthority({store,content}):null;
 const clinicalRoute=durable?createClinicalHttp({authority,enabled:true,probe:async()=>({durable:true,kind:'qa-sqlite-cas',schemaVersion:1}),
  async verifiedRoom(headers,roomId,actorId){
   const me=await social.route({method:'GET',path:'/api/me',headers});
   if(me.status!==200||me.body.user.id!==actorId)return null;
   const result=await social.route({method:'GET',path:'/api/rooms/'+roomId+'/messages',headers,query:{after:0}});
   return result.status===200?result.body.room:null;
  }}):null;
 const types={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.webp':'image/webp','.png':'image/png'};
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
     (isSignalingEndpoint(input)?await social.signalRoute(input):await social.route(input));
    requests.push({path:pathname,status:response.status});res.writeHead(response.status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(response.body));return;
   }
   const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+path.sep))throw Error('outside root');
   const bytes=await fs.readFile(file);requests.push({path:pathname,status:200});
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{requests.push({path:req.url,status:404});res.writeHead(404);res.end('not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const launch=()=>chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling'],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
 const browser=await launch();
 return {browser,devices,requests,newBrowser:launch,url:'http://127.0.0.1:'+server.address().port,
  close:async()=>{await browser.close();await new Promise(r=>server.close(r));store?.close();if(durableDir)rmSync(durableDir,{recursive:true,force:true});}};
}
