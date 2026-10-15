// Read-only 4.8.7 control capture. Never imported by the V5 build or runtime.
// Run `npm run build` first; captures effective content after original initialization.
import fs from 'node:fs/promises';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import path from 'node:path';

const out=process.env.V5_REFERENCE_OUTPUT||'qa/v5-reference-results';await fs.mkdir(out,{recursive:true});
const require=createRequire(import.meta.url);
const {chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||
 (process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES?process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright':'playwright'));
const root=path.resolve('out'),errors=[];
const server=createServer(async(req,res)=>{
 try{
  const p=new URL(req.url,'http://localhost').pathname,file=path.resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+path.sep))throw Error('outside reference');
  res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':'text/html');res.end(await fs.readFile(file));
 }catch{res.writeHead(404);res.end('{}');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch({headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],
 ...(process.env.CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.CHROMIUM_EXECUTABLE_PATH}:{})});
try{
 const page=await browser.newPage(devices['Pixel 5']);page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('clinicalShift.profile.v1',JSON.stringify({name:'Javier',scrubColor:'navy',soundEnabled:false,deviceId:'v5-reference',xp:0})));
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#nsEnter').waitFor();
 await page.screenshot({path:out+'/reference-title.png'});await page.locator('#nsEnter').click();
 await page.waitForFunction(()=>nsLobby.active&&bg.complete&&playerImg.complete&&playerImg.naturalWidth>0);
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 await page.screenshot({path:out+'/reference-lobby.png'});
 const snapshot=await page.evaluate(()=>({map:MAP,states,doorOpen:[...doorOpen],
  cases:CASES,algorithms:CASE_ALGORITHMS,examSegments:EXAM_SEGMENTS,therapies:MONITOR_THERAPY_CATALOG,
  defaultDoses:DEFAULT_THERAPY_DOSES,bedRegistry:window.csBedRegistryV39,colorMeta:CS_COLOR_META,
  player:{x:player.x,y:player.y,r:player.r,speed:player.speed},scale,vw,vh,camX,camY,
  assets:{hospital:bg.src,player:playerImg.src,nurse:nurseImg.src,patient:patientImg.src,
   vega:csExpertImg.src,pavement:pavementImg.src,garden:gardenImg.src},variants:CS_PLAYER_VARIANTS,lobby:!!nsLobby.active}));
 if(errors.length)throw Error('reference browser errors: '+errors.join('; '));
 await fs.writeFile(out+'/reference-snapshot.json',JSON.stringify(snapshot));
 console.log('Read-only effective reference captured:',snapshot.cases.length,'cases; physicalAndroid=false.');
}finally{await browser.close();await new Promise(r=>server.close(r));}
