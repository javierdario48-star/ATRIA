import {createServer} from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';

export async function browserHarness(){
 const require=createRequire(import.meta.url);
 const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||
  (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright'));
 const root=path.resolve('out-v5'),requests=[];
 const types={'.js':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.webp':'image/webp','.png':'image/png'};
 const server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
   const file=path.resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
   if(!file.startsWith(root+path.sep))throw Error('outside root');
   const bytes=await fs.readFile(file);requests.push({path:pathname,status:200});
   res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(bytes);
  }catch{requests.push({path:req.url,status:404});res.writeHead(404);res.end('not found');}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],
  ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
 return {browser,devices,requests,url:'http://127.0.0.1:'+server.address().port,
  close:async()=>{await browser.close();await new Promise(r=>server.close(r));}};
}
