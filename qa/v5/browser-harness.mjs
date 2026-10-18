import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {createQaSocialServer} from '../../src/social/qa-social-server.js';

export async function browserHarness({apiLatency=0}={}){
 const require=createRequire(import.meta.url);
 const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||
  (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright'));
 const root=path.resolve('out-v5'),requests=[];
 const records=new Map(),social=createQaSocialServer({get:async k=>records.get(k),set:async(k,v)=>records.set(k,structuredClone(v)),delete:async k=>records.delete(k)});
 const types={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.webp':'image/webp','.png':'image/png'};
 const server=createServer(async(req,res)=>{
  try{
   const url=new URL(req.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
   if(pathname.startsWith('/api/')){
    let raw='';for await(const chunk of req)raw+=chunk;if(apiLatency)await new Promise(r=>setTimeout(r,apiLatency));
    const input={method:req.method,path:pathname,query:Object.fromEntries(url.searchParams),headers:req.headers,body:raw?JSON.parse(raw):{}};
    const response=await (pathname==='/api/lobby-sync'?social.signalRoute(input):social.route(input));
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
  close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
