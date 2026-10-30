import {clickHudAction} from './hud-actions.mjs';
// Opt-in acceptance using disposable QA accounts in a private scratch file.
// The file, passwords, cookies and tokens are never included in evidence.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs/promises';
const cfg=JSON.parse(await fs.readFile(process.env.ATRIA_QA_CREDENTIALS_FILE,'utf8'));
const origin=new URL(cfg.origin).origin;assert(origin.startsWith('https://')&&origin.endsWith('.vercel.app'));
assert(cfg.users.length===2&&cfg.users.every(x=>/^qa_[ab]_/.test(x.username)));
const {chromium}=createRequire(import.meta.url)(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const proxy=process.env.V5_USE_ENV_PROXY==='1'?new URL(process.env.HTTPS_PROXY||process.env.HTTP_PROXY):null;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],
 ...(proxy?{proxy:{server:proxy.origin,...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{})});
const contexts=[],pages=[],errors=[],accounts=[];let stage='login';
const api=(p,path,body)=>p.evaluate(async({path,body})=>{const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};},{path,body});
const summary={preview:origin,passed:false,checks:[],physicalDevice:false};
try{
 for(const [i,user] of cfg.users.entries()){
  const ctx=await browser.newContext({viewport:i?{width:393,height:851}:{width:1280,height:960},ignoreHTTPSErrors:!!proxy});contexts.push(ctx);
  const p=await ctx.newPage();pages.push(p);p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));
  await p.goto(origin);await p.waitForFunction(()=>document.body.dataset.boot==='ready');
  await p.locator('#accountLoginButton').click();await p.locator('#accountUsername').fill(user.username);await p.locator('#accountPassword').fill(user.password);
  const response=p.waitForResponse(r=>new URL(r.url()).pathname==='/api/account/login');await p.locator('#accountForm button[type="submit"]').click();
  const result=await response;assert.equal(result.status(),200);accounts.push((await result.json()).account);
  await p.waitForFunction(()=>atriaV5.snapshot().phase==='lobby');
  if(accounts[i].activeGuardId){await p.locator('[data-action="account-release"]').click();await p.waitForFunction(()=>!document.getElementById('modal').open);}
 }
 const [host,guest]=pages;
 await Promise.all(pages.map((p,i)=>p.waitForFunction(id=>atriaV5.snapshot().others.some(x=>x.id===id),accounts[1-i].actorId)));
 stage='profiles';
 await clickHudAction(guest,'peopleButton');await guest.locator('[data-action="inspect-player"][data-user="'+accounts[0].actorId+'"]').click();
 await guest.locator('.doctor-profile').waitFor();assert((await guest.locator('.doctor-profile').innerText()).includes('133 XP'));
 await guest.screenshot({path:'/tmp/atria-profile-portrait.png'});await guest.setViewportSize({width:851,height:393});
 await guest.screenshot({path:'/tmp/atria-profile-landscape.png'});assert(await guest.locator('.doctor-profile').evaluate(el=>el.getBoundingClientRect().width<=innerWidth));
 await guest.locator('#modalClose').click();summary.checks.push('persisted XP and compact profile in portrait/landscape');
 stage='cooperative invite';await clickHudAction(host,'peopleButton');await host.locator('[data-action="inspect-player"][data-user="'+accounts[1].actorId+'"]').click();
 await host.locator('#friendCase').selectOption('PUD-001');await host.locator('[data-action="invite-friend"]').click();
 await guest.locator('#coopInviteNotice').waitFor({state:'visible'});await guest.locator('#coopInviteAccept').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().phase==='guard'&&atriaV5.snapshot().mode==='coop'&&atriaV5.diagnostics().cooperative.durable)));
 const state=await host.evaluate(()=>atriaV5.snapshot()),other=await guest.evaluate(()=>atriaV5.snapshot());
 assert.equal(state.clinical.patient.uid,other.clinical.patient.uid);assert.equal(other.player.color,accounts[1].scrubColor);
 summary.cooperativeRoom=state.clinical.room.roomId;summary.checks.push('two real accounts accept one durable cooperative guard');
 stage='movement';
 const track=guest.evaluate(async id=>{const points=[];const start=performance.now();while(performance.now()-start<3500){await new Promise(requestAnimationFrame);const p=atriaV5.snapshot().others.find(x=>x.id===id);if(p)points.push({x:p.x,y:p.y});}return points;},accounts[0].actorId);
 const tap=await host.evaluate(()=>{const r=atriaV5.diagnostics().renderer,b=document.getElementById('game').getBoundingClientRect();return {x:b.x+(496-r.camera.x)*r.scale+r.anchorX,y:b.y+(1200-r.camera.y)*r.scale+r.anchorY};});
 await host.mouse.click(tap.x,tap.y);const points=await track;assert(points.length>30);
 const jumps=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y));
 assert(jumps.reduce((x,y)=>x+y,0)>40);assert(Math.max(...jumps)<45);summary.maxRemoteJump=Math.max(...jumps);summary.checks.push('account motion reaches remote continuously');
 stage='release';for(const p of pages)if(await p.evaluate(()=>atriaV5.snapshot().phase==='guard'))await p.locator('#guardButton').click();
 await Promise.all(pages.map(p=>p.waitForFunction(async()=>atriaV5.snapshot().phase==='lobby'&&!(await (await fetch('/api/account/session')).json()).account.activeGuardId)));
 for(const p of pages)await p.reload();await Promise.all(pages.map(p=>p.waitForFunction(()=>document.body.dataset.boot==='ready'&&atriaV5.snapshot().phase==='lobby')));
 stage='competitive invite';await host.locator('#guardButton').click();await host.locator('[data-mode="competitive"]').click();await host.locator('input[name="guardScope"][value="specific"]').check();await host.locator('#caseChoice').selectOption('PUD-001');
 await host.locator('#coopDoctors input[value="'+accounts[1].actorId+'"]').check();await host.locator('[data-action="start-guard"]').click();
 await guest.locator('#coopInviteNotice').waitFor({state:'visible'});await guest.locator('#coopInviteAccept').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>atriaV5.snapshot().mode==='competitive'&&atriaV5.diagnostics().cooperative.durable)));
 const comp=await host.evaluate(()=>atriaV5.snapshot());assert.equal(comp.clinical.shift.patients.length,2);summary.competitiveRoom=comp.clinical.room.roomId;
 summary.checks.push('two account competitive guard starts with two distinct patients');
 for(const p of pages){await api(p,'account/release-guard',{});await api(p,'account/logout',{});}
 assert.deepEqual(errors,[]);summary.passed=true;await fs.writeFile('/tmp/atria-accounts-shared-summary.json',JSON.stringify(summary,null,2));
 console.log('ACCOUNT SHARED PREVIEW PASS',JSON.stringify(summary));
}catch(e){summary.stage=stage;summary.error=e.message;summary.errors=errors;await fs.writeFile('/tmp/atria-accounts-shared-summary.json',JSON.stringify(summary,null,2));console.error('ACCOUNT SHARED PREVIEW FAIL',JSON.stringify(summary));throw e;}
finally{for(const c of contexts)await c.close().catch(()=>{});await browser.close();}
