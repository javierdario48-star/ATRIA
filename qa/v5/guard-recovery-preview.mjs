// Live Supabase/Vercel acceptance. Credentials stay in memory/HttpOnly cookies;
// no Auth state, passwords or clinical checkpoint writes enter the evidence.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import {clickHudAction} from './hud-actions.mjs';
import {waitForPreviewBuild} from './preview-build.mjs';

const origin=new URL(process.env.V5_BROWSER_URL).origin;
assert(origin.startsWith('https://night-shift-clinical-')&&origin.endsWith('.vercel.app'));
const output=process.env.V5_QA_OUTPUT||'/tmp/atria-recovery-preview';await fs.mkdir(output,{recursive:true});
const require=createRequire(import.meta.url),{chromium,devices}=require(process.env.PLAYWRIGHT_MODULE_PATH||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const browsers=[],contexts=[],pages=[],errors=[],checks=[],guards=[],requests=[];
const modes=(process.env.V5_QA_RECOVERY_MODES||'solo,coop,competitive').split(',');
assert(modes.every(mode=>['solo','coop','competitive'].includes(mode)));
const shared=modes.some(mode=>mode!=='solo');
const suffix=Date.now().toString(36),names=['QA Recovery A '+suffix,'QA Recovery B '+suffix],password=randomBytes(24).toString('base64url');
let stage='verify deployed source';
const api=(page,path,body)=>page.evaluate(async({path,body})=>{
 const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},
  ...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};
},{path,body});
async function lobby(page){await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);}
async function recoverOffer(page){await page.locator('[data-action=account-recover]').waitFor({state:'visible'});}
async function reopen(page){await page.reload();await page.locator('#welcomeContinue').click();await lobby(page);}
async function guard(page,id){await page.waitForFunction(id=>atriaV5.snapshot().phase==='guard'&&
 atriaV5.snapshot().clinical?.room.roomId===id&&atriaV5.snapshot().clinical.shift.turn.actor.participating,id);}
async function finalize(page){
 await recoverOffer(page);await page.locator('[data-action=account-release]').click();
 await page.waitForFunction(()=>!document.getElementById('modal').open);
 assert.equal((await api(page,'account/session')).body.account.activeGuardId,null);
}
try{
 const files=await waitForPreviewBuild(origin);
 for(const i of shared?[0,1,2]:[0,2]){
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
   args:['--no-sandbox','--disable-dev-shm-usage','--disable-background-timer-throttling']});browsers.push(browser);
  const context=await browser.newContext(i?devices['Pixel 5']:{viewport:{width:1280,height:960}});contexts.push(context);
  const page=await context.newPage();pages[i]=page;page.setDefaultTimeout(45000);page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{const path=new URL(r.url()).pathname;if(path.startsWith('/api/')){
   requests.push({page:i,path,status:r.status()});if(requests.length>100)requests.shift();
  }});
  await page.goto(origin);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  if(i<2){
   stage='register account '+i;await page.locator('#doctorName').fill(names[i]);await page.locator('#welcomeNameForm button').click();
   await page.locator('#enterButton').click();await page.locator('#newDoctorPassword').fill(password);
   const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/account/register');
   await page.locator('#welcomePasswordForm button').click();const result=await response;
   assert.equal(result.status(),200,'live QA registration must succeed');await lobby(page);
  }
 }
 const [a,b,device]=pages;
 if(shared)assert.notEqual((await api(a,'account/session')).body.account.actorId,(await api(b,'account/session')).body.account.actorId);
 let signedIn=false;
 for(const mode of modes){
  stage=mode+' admission';await a.locator('#guardButton').click();await a.locator('[data-mode='+mode+']').click();
  await a.locator('input[name=guardScope][value=specific]').check();await a.locator('#caseChoice').selectOption('FECAL-001');
  if(mode!=='solo')await a.locator('#coopDoctors label').filter({hasText:names[1]}).locator('input').check();
  await a.locator('[data-action=start-guard]').click();
  if(mode!=='solo'){await b.locator('#coopInviteNotice').waitFor({state:'visible'});await b.locator('#coopInviteAccept').click();}
  await a.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
  const initial=(await api(a,'account/session')).body.account,id=initial.activeGuardId,
   uid=await a.evaluate(()=>atriaV5.snapshot().clinical.patient.uid);
  assert(id);if(mode!=='solo')await guard(b,id);
  if(!signedIn){
   stage='independent device login';await device.locator('#accountLoginButton').click();await device.locator('#loginDoctorName').fill(names[0]);
   await device.locator('#loginDoctorPassword').fill(password);await device.locator('#welcomeLoginForm button').click();await lobby(device);signedIn=true;
  }else await reopen(device);
  stage=mode+' recovery offer';await recoverOffer(device);
  const inspected=(await api(device,'account/session')).body.account;
  assert.equal(inspected.guardRecovery.status,'available');assert.equal(inspected.activeGuardId,id);
  if(mode==='solo')for(const action of ['account-recover','account-release']){
   await device.route('**/api/account/take-control',route=>route.fulfill({status:503,contentType:'application/json',
    body:JSON.stringify({error:'Conexión interrumpida. Volvé a intentarlo.'})}));
   await device.locator('[data-action='+action+']').click();await device.locator('#modalContent [role=alert]').waitFor({state:'visible'});
   assert.match(await device.locator('#modalContent [role=alert]').innerText(),/Conexión interrumpida/);
   assert(await device.locator('[data-action='+action+']').isEnabled());await device.unroute('**/api/account/take-control');
  }
  stage=mode+' native resume';await device.locator('[data-action=account-recover]').click();await guard(device,id);
  assert.equal(await device.evaluate(()=>atriaV5.snapshot().clinical.patient.uid),uid);
  await device.screenshot({path:output+'/'+mode+'-recovered-android.png'});
  stage=mode+' saved leave';await clickHudAction(device,'guardButton');await lobby(device);
  assert.equal((await api(device,'account/session')).body.account.activeGuardId,id);
  await clickHudAction(device,'guardButton');await recoverOffer(device);await device.locator('[data-action=account-recover]').click();await guard(device,id);
  stage=mode+' permanent release';await reopen(a);await finalize(a);
  const finished=(await api(a,'account/session')).body.account;
  assert.equal(finished.xp,initial.xp);assert.equal(finished.casesResolved,initial.casesResolved);
  if(mode!=='solo'){
   assert.equal((await api(b,'account/session')).body.account.activeGuardId,id);await guard(b,id);
   await clickHudAction(b,'guardButton');await lobby(b);await clickHudAction(b,'guardButton');await finalize(b);
  }
  await reopen(device);assert.equal(await device.locator('[data-action=account-recover]').count(),0);
  guards.push({mode,roomId:id,patientUid:uid});checks.push(mode+': verified offer, independent-device resume, saved leave, release and colleague isolation');
  console.log('RECOVERY PREVIEW CHECK',checks.at(-1));
 }
 assert.deepEqual(errors,[]);
 const report={passed:true,preview:origin,checks,guards,verifiedFiles:Object.keys(files).length,
  browserProcesses:browsers.length,authenticatedAccounts:shared?2:1,liveSupabase:true,androidEmulation:'Pixel 5',physicalAndroid:false};
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log('GUARD RECOVERY PREVIEW PASS',JSON.stringify(report));
 for(const page of pages.filter(Boolean))await api(page,'account/logout',{});
}catch(error){
 const screens=[];
 for(const [index,page] of pages.entries()){
  if(!page)continue;
  screens.push(await page.evaluate(()=>({phase:window.atriaV5?.snapshot().phase,
   welcome:document.getElementById('splash')?.dataset.step,
   welcomeError:document.getElementById('welcomeError')?.textContent,
   modal:document.getElementById('modal')?.open?document.getElementById('modalContent')?.textContent:null})).catch(()=>null));
  await page.screenshot({path:output+'/failure-'+index+'.png'}).catch(()=>{});
 }
 await fs.writeFile(output+'/failure.json',JSON.stringify({stage,error:error.message,errors,guards,screens,requests},null,2));throw error;
}
finally{for(const context of contexts)await context.close().catch(()=>{});for(const browser of browsers)await browser.close().catch(()=>{});}
