// Live Vercel acceptance. Two doctors and a second independent device for the
// same account. Credentials remain in memory; evidence contains no auth state.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {send,chooseDestination} from './cooperative-ui.mjs';
import {clinicalBotAssessmentActions} from '../../src/v5/clinical/clinical-bot-playbooks.js';

const origin=new URL(process.env.V5_BROWSER_URL).origin;
assert(origin.startsWith('https://night-shift-clinical-')&&origin.endsWith('.vercel.app'));
const output='qa/v5-authority-presence-results';await fs.mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH);
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
 args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling']});
const contexts=[],pages=[],errors=[],checks=[],failures=[];
const suffix=Date.now().toString(36),password=randomBytes(24).toString('base64url');
const names=['QA Control A '+suffix,'QA Control B '+suffix];let stage='boot';
const api=(p,path,body)=>p.evaluate(async({path,body})=>{
 const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},
  ...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};
},{path,body});
async function boot(mobile=false){
 const c=await browser.newContext(mobile?devices['Pixel 5']:{viewport:{width:1280,height:900}});contexts.push(c);
 await c.addInitScript(()=>{
  const original=CanvasRenderingContext2D.prototype.drawImage,frames=new WeakMap();
  window.avatarPaint={frames:[],invalid:[]};window.avatarSources=[];
  CanvasRenderingContext2D.prototype.drawImage=function(image,...args){
   if(image?.src?.endsWith('player-wardrobe.avif')&&args.length===8){
    const pixels=this.getImageData(0,0,this.canvas.width,this.canvas.height).data;
    frames.set(this.canvas,{atlas:[args[0],args[1]],width:this.canvas.width,height:this.canvas.height,alphaBefore:pixels.some((x,i)=>i%4===3&&x>0)});
    if(!window.avatarSources.includes(this.canvas))window.avatarSources.push(this.canvas);
   }
   if(this.canvas.id==='game'&&frames.has(image)){
    const frame=frames.get(image);
    if(!frame.seen){frame.seen=true;const pixels=image.getContext('2d').getImageData(0,0,image.width,image.height).data;
     frame.opaquePixels=pixels.filter((x,i)=>i%4===3&&x>0).length;window.avatarPaint.frames.push(frame);}
    if(!args.every(Number.isFinite)&&window.avatarPaint.invalid.length<10)window.avatarPaint.invalid.push({atlas:frame.atlas,args:args.map(x=>Number.isFinite(x)?x:String(x))});
   }
   return original.call(this,image,...args);
  };
 });
 const p=await c.newPage();pages.push(p);p.setDefaultTimeout(45000);p.on('pageerror',e=>errors.push(e.message));
 await p.goto(origin);await p.waitForFunction(()=>document.body.dataset.boot==='ready');return p;
}
async function register(p,i){
 await p.locator('#doctorName').fill(names[i]);await p.locator('#welcomeNameForm button').click();
 if(i)await p.locator('[data-avatar-sex="female"]').click();
 await p.locator('#enterButton').click();await p.locator('#newDoctorPassword').fill(password);
 await p.locator('#welcomePasswordForm button').click();
 await p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);
}
async function login(p){
 await p.locator('#accountLoginButton').click();await p.locator('#loginDoctorName').fill(names[0]);
 await p.locator('#loginDoctorPassword').fill(password);await p.locator('#welcomeLoginForm button').click();
 await p.locator('[data-action="account-recover"]').waitFor({state:'visible'});
}
async function continueLobby(p){
 await p.reload();await p.waitForFunction(()=>document.body.dataset.boot==='ready');await p.locator('#welcomeContinue').click();
 await p.locator('[data-action="account-recover"]').waitFor({state:'visible'});
}
async function check(label,run){stage=label;try{await run();checks.push(label);}catch(error){failures.push({stage:label,error:error.message});}}
async function moveAndObserve(p,other,name){
 const before=await p.evaluate(()=>atriaV5.snapshot().player);
 await p.keyboard.press('ArrowUp');
 await p.waitForFunction(before=>Math.hypot(atriaV5.snapshot().player.x-before.x,atriaV5.snapshot().player.y-before.y)>10,before);
 await p.waitForFunction(()=>!atriaV5.snapshot().player.moving&&!atriaV5.snapshot().player.target);
 const target=await p.evaluate(()=>atriaV5.snapshot().player);
 await other.waitForFunction(({name,target})=>{const a=atriaV5.snapshot().others.find(x=>x.name===name);
  return a&&Math.hypot(a.x-target.x,a.y-target.y)<4;},{name,target});
}
try{
 const expected=createHash('sha256').update(await fs.readFile(new URL('../../src/v5/app/application.js',import.meta.url))).digest('hex');
 const response=await fetch(origin+'/src/v5/app/application.js');
 assert.equal(createHash('sha256').update(await response.text()).digest('hex'),expected,'test the checked-out preview');
 const a=await boot(),b=await boot(true);await register(a,0);await register(b,1);
 await check('mutual lobby presence and movement',async()=>{
  await Promise.all([a,b].map((p,i)=>p.waitForFunction(name=>atriaV5.snapshot().others.some(x=>x.name===name),names[1-i])));
  await moveAndObserve(a,b,names[0]);await moveAndObserve(b,a,names[1]);
  for(const [i,p] of [a,b].entries()){
   await p.screenshot({path:output+'/lobby-'+i+'.png'});
   const paint=await p.evaluate(()=>window.avatarPaint);assert.deepEqual(paint.invalid,[],'remote sprite draw geometry must be finite');
   assert(paint.frames.length&&paint.frames.every(x=>x.opaquePixels>1000),'the female avatar must contain visible pixels');
  }
 });
 // A restored offscreen Canvas2D has lost its bitmap independently of the
 // main hospital canvas. Reproduce the name/shadow-without-body failure at
 // that browser boundary, without changing any world or presence state.
 await check('remote avatar redraws after its own Canvas2D restoration',async()=>{
  await a.evaluate(()=>{
   const source=window.avatarSources.find(x=>x.width===384&&x.height===576);
   if(!source)throw Error('the remote female avatar source was not drawn');
   window.restoredAvatarSource=source;source.getContext('2d').reset();
   source.dispatchEvent(new Event('contextrestored'));
  });
  await a.waitForFunction(()=>{
   const c=window.restoredAvatarSource,bytes=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   return bytes.some((x,i)=>i%4===3&&x>0);
  },null,{timeout:5000});
 });
 await a.screenshot({path:output+'/avatar-source-restored.png'});
 if(failures.length){
  await a.reload();await a.waitForFunction(()=>document.body.dataset.boot==='ready');await a.locator('#welcomeContinue').click();
  await a.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);
 }
 stage='start an account without a guard';await a.locator('#guardButton').click();await a.locator('[data-mode="solo"]').click();
 await a.locator('input[name="guardScope"][value="specific"]').check();await a.locator('#caseChoice').selectOption('FECAL-001');
 await a.locator('[data-action="start-guard"]').click();await a.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
 const opened=await a.evaluate(()=>atriaV5.snapshot()),roomId=opened.clinical.room.roomId,uid=opened.clinical.patient.uid;
 checks.push(stage);
 const sync=async p=>{
  for(let i=0;i<8;i++){
   const r=await api(p,'clinical',{action:'sync',roomId});
   if(r.status!==409||!['busy','fenced'].includes(r.body.code))return r;
   await new Promise(resolve=>setTimeout(resolve,300));
  }
  throw Error('clinical authority did not settle after bounded contention retries');
 };
 await check('another account cannot claim or control the guard',async()=>{
  assert.equal((await sync(b)).status,403);assert.equal((await api(b,'account/take-control',{})).status,409);
  assert.equal((await sync(a)).status,200);
 });
 const second=await boot(true);await login(second);
 await check('second login does not silently steal active authority',async()=>{
  assert.equal((await sync(second)).status,403);assert.equal((await api(second,'account/release-guard',{})).status,409);
  assert.equal((await sync(a)).status,200);
 });
 stage='explicit transfer to the same authenticated account';await second.locator('[data-action="account-recover"]').click();
 await second.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
 assert.equal(await second.evaluate(()=>atriaV5.snapshot().clinical.patient.uid),uid);
 assert.equal((await sync(a)).status,403);checks.push(stage);
 await second.screenshot({path:output+'/transferred-guard.png'});
 await second.context().close();
 stage='recover an abandoned guard';await continueLobby(a);await a.locator('[data-action="account-recover"]').click();
 await a.waitForFunction(()=>atriaV5.snapshot().phase==='guard');assert.equal(await a.evaluate(()=>atriaV5.snapshot().clinical.patient.uid),uid);checks.push(stage);
 stage='patient interaction and native case closure';
 if(await a.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')await a.locator('#keyboardToggleButton').click();
 await a.locator('#receptionButton').click();await a.locator('[data-action="reception-approach"][data-patient-uid="'+uid+'"]').click();
 await a.locator('#patientWheel').waitFor({state:'visible',timeout:60000});await a.locator('#patientWheel [data-patient-action="talk"]').click();
 for(const text of clinicalBotAssessmentActions({id:'FECAL-001'},'competent'))await send(a,text);
 // This documented procedure is a confirmed treatment receipt, rather than
 // a medication administrationLog row. Do not alter clinical rules for QA.
 await a.waitForFunction(()=>atriaV5.snapshot().clinical.patient.treatments?.some(x=>x.id==='disimpaction'),null,{timeout:90000});
 await send(a,'/reevaluar');await chooseDestination(a,'alta');
 await a.waitForFunction(()=>atriaV5.snapshot().clinical.patient.closure?.closed);
 const saved=(await api(a,'account/session')).body.account;assert(saved.xp>0);assert.equal(saved.casesResolved,1);checks.push(stage);
 await a.screenshot({path:output+'/case-closed.png'});
 const releaseDevice=await boot(true);await login(releaseDevice);
 await check('explicitly end retained participation from another authenticated device',async()=>{
  const response=releaseDevice.waitForResponse(r=>new URL(r.url()).pathname==='/api/account/release-guard');
  await releaseDevice.locator('[data-action="account-release"]').click();assert.equal((await response).status(),200);
  await releaseDevice.waitForFunction(()=>!document.getElementById('modal').open);
  const account=(await api(releaseDevice,'account/session')).body.account;
  assert.equal(account.activeGuardId,null);assert.equal(account.xp,saved.xp);assert.equal(account.casesResolved,1);
  assert.equal((await sync(a)).status,403,'the ended guard cannot reassert authority');
  await releaseDevice.locator('#guardButton').click();await releaseDevice.locator('[data-mode="solo"]').click();
  await releaseDevice.locator('input[name="guardScope"][value="specific"]').check();await releaseDevice.locator('#caseChoice').selectOption('CIRR-001');
  await releaseDevice.locator('[data-action="start-guard"]').click();
  await releaseDevice.waitForFunction(()=>atriaV5.snapshot().phase==='guard'&&atriaV5.snapshot().patients.length>0);
  const fresh=(await api(releaseDevice,'account/session')).body.account;
  assert(fresh.activeGuardId&&fresh.activeGuardId!==roomId);assert.equal(fresh.xp,saved.xp);
 });
 assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
 const report={passed:true,origin,checks,errors};await fs.writeFile(output+'/results.json',JSON.stringify(report,null,2));
 console.log('ATRIA LIVE AUTHORITY PRESENCE PASS '+JSON.stringify(report));
}catch(error){
 const diagnostics=await Promise.all(pages.map(async(p,i)=>{
  if(p.isClosed())return null;await p.screenshot({path:output+'/failure-'+i+'.png'}).catch(()=>{});
  return p.evaluate(()=>({phase:atriaV5.snapshot().phase,player:atriaV5.snapshot().player,others:atriaV5.snapshot().others,
   toast:document.getElementById('toast').textContent,modal:document.getElementById('modalContent').textContent,
   clinical:atriaV5.snapshot().clinical,paint:window.avatarPaint})).catch(()=>null);
 }));
 const report={passed:false,origin,stage,error:error.message,checks,failures,errors,diagnostics};
 await fs.writeFile(output+'/failure.json',JSON.stringify(report,null,2));console.error('ATRIA LIVE AUTHORITY PRESENCE FAIL '+JSON.stringify(report));throw error;
}finally{
 for(const p of pages)if(!p.isClosed()){await api(p,'account/release-guard',{}).catch(()=>{});await api(p,'account/logout',{}).catch(()=>{});}
 await browser.close();
}
