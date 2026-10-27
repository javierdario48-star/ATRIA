// Real Preview acceptance. Passwords/tokens stay in memory and browser cookies;
// no HAR, credentials, sessions or secrets are written to evidence artifacts.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
const origin=new URL(process.env.V5_BROWSER_URL).origin;
assert(origin.startsWith('https://')&&origin.endsWith('.vercel.app'));
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const proxy=process.env.V5_USE_ENV_PROXY==='1'?new URL(process.env.HTTPS_PROXY||process.env.HTTP_PROXY):null;
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,
 args:['--no-sandbox','--disable-dev-shm-usage'],...(proxy?{proxy:{server:proxy.origin,
  ...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{})});
const suffix=Date.now().toString(36),password=randomBytes(24).toString('base64url'),contexts=[],pages=[],errors=[];
const summary={preview:origin,accounts:[],checks:[],physicalDevice:false};
let stage='boot';
const api=(page,path,body)=>page.evaluate(async({path,body})=>{
 const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
 return {status:r.status,body:await r.json()};
},{path,body});
async function openPage(mobile=false){
 const context=await browser.newContext({viewport:mobile?{width:393,height:851}:{width:1100,height:850},ignoreHTTPSErrors:!!proxy});
 contexts.push(context);const page=await context.newPage();pages.push(page);page.setDefaultTimeout(45000);
 page.on('pageerror',e=>errors.push(e.message));await page.goto(origin);await page.waitForFunction(()=>document.body.dataset.boot==='ready');return page;
}
async function credentialForm(page,kind,username){
 const button=kind==='register'?'[data-action="account-register"]':'#accountLoginButton';
 if(kind==='register')await page.locator('#profileButton').click();await page.locator(button).click();
 await page.locator('#accountUsername').fill(username);await page.locator('#accountPassword').fill(password);
 const response=page.waitForResponse(r=>new URL(r.url()).pathname==='/api/account/'+kind&&r.request().method()==='POST');
 await page.locator('#accountForm button[type="submit"]').click();const result=await response;const data=await result.json();
 assert.equal(result.status(),200,'account '+kind+' response: '+JSON.stringify(data));
 await page.waitForFunction(()=>document.getElementById('splash').hidden);
 return data.account;
}
try{
 const a=await openPage(),b=await openPage(true);
 for(const [page,name] of [[a,'QA Ana '+suffix],[b,'QA Bruno '+suffix]]){
  await page.locator('#playerName').fill(name);await page.locator('#enterButton').click();
 }
 await a.waitForFunction(()=>atriaV5.snapshot().others.length===1);
 const oldA=(await api(a,'me')).body.user,oldB=(await api(b,'me')).body.user;
 stage='legacy friendship';assert.equal((await api(a,'friends',{userId:oldB.id})).status,200);
 assert.equal((await api(b,'friends/accept',{userId:oldA.id})).status,200);
 stage='register';const aa=await credentialForm(a,'register','qa_a_'+suffix),bb=await credentialForm(b,'register','qa_b_'+suffix);
 summary.accounts=[{actorId:aa.actorId,username:aa.username},{actorId:bb.actorId,username:bb.username}];
 assert.equal(aa.actorId,oldA.id);assert.equal(bb.actorId,oldB.id);assert.equal(aa.xp,0);
 assert((await api(a,'me')).body.friends.some(x=>x.id===bb.actorId));summary.checks.push('legacy identity and friendship retained');
 const cookies=await contexts[0].cookies();assert(cookies.some(x=>x.name==='__Host-atria_v5'&&x.httpOnly&&x.secure));
 assert(!await a.evaluate(()=>document.cookie.includes('__Host-atria_v5')));summary.checks.push('secure HttpOnly cookie');
 const oldKey=await a.evaluate(()=>localStorage.getItem('atria.v5.social.client'));
 const outsider=await openPage();assert.equal((await api(outsider,'resume',{clientKey:oldKey,name:'Impostor'})).status,401);
 assert.equal((await api(outsider,'clinical',{action:'sync',clientKey:oldKey,roomId:'personal-not-a-room'})).status,401);
 summary.checks.push('claimed device key rejected');
 stage='second device';const second=await credentialForm(outsider,'login',aa.username);assert.equal(second.actorId,aa.actorId);
 await outsider.locator('#profileButton').click();await outsider.locator('#colorChoice').selectOption('pink');await outsider.locator('#sexChoice').selectOption('female');
 await outsider.locator('[data-action="save-profile"]').click();
 const back=await api(a,'account/session');assert.equal(back.body.account.scrubColor,'pink');assert.equal(back.body.account.sex,'female');
 summary.checks.push('second-device account appearance and friends');
 stage='server stats permissions';const tampered=await api(outsider,'account/profile',{name:aa.name,sex:'female',scrubColor:'pink',xp:999999,level:999,casesResolved:999});
 assert.equal(tampered.body.account.xp,0);assert.equal(tampered.body.account.level,1);summary.checks.push('client cannot award XP or levels');
 stage='profile card';await outsider.locator('#profileButton').click();await outsider.locator('[data-action="own-social-profile"]').click();
 await outsider.locator('.doctor-stats').waitFor();assert((await outsider.locator('.doctor-profile').innerText()).includes('Casos resueltos'));
 await outsider.screenshot({path:'/tmp/atria-account-profile.png'});await outsider.locator('#modalClose').click();summary.checks.push('real profile card');
 stage='personal guard';await outsider.locator('#guardButton').click();await outsider.locator('#caseChoice').selectOption('CIRR-001');
 await outsider.locator('[data-action="start-guard"]').click();await outsider.waitForFunction(()=>atriaV5.diagnostics().cooperative.durable&&atriaV5.snapshot().mode==='solo');
 const opened=await outsider.evaluate(()=>atriaV5.snapshot());const guardId=opened.clinical.room.roomId;
 assert.equal(opened.player.color,'pink');assert.equal(opened.player.sex,'female');
 const denied=await api(a,'clinical',{action:'sync',roomId:guardId,clientKey:oldKey});assert.equal(denied.status,403);
 summary.checks.push('second clinical controller fenced');
 assert.equal((await api(a,'account/take-control',{})).status,200);
 const revoked=await api(outsider,'clinical',{action:'sync',roomId:guardId,clientKey:oldKey});assert.equal(revoked.status,403);
 const recovered=await api(a,'clinical',{action:'sync',roomId:guardId,clientKey:oldKey});assert.equal(recovered.status,200);
 assert.equal(recovered.body.clinical.patient.uid,opened.clinical.patient.uid);summary.checks.push('explicit takeover and same patient recovery');
 await api(a,'account/release-guard',{});
 stage='logout';assert.equal((await api(a,'account/logout',{})).status,200);
 assert.equal((await api(a,'account/session')).body.account,null);
 assert.equal((await api(outsider,'account/session')).status,200);summary.checks.push('logout isolated to current device');
 assert.deepEqual(errors,[]);summary.passed=true;
 await fs.writeFile('/tmp/atria-accounts-preview-summary.json',JSON.stringify(summary,null,2));
 console.log('ACCOUNTS PREVIEW PASS',JSON.stringify(summary));
}catch(error){summary.passed=false;summary.stage=stage;summary.error=error.message;summary.errors=errors;
 await fs.writeFile('/tmp/atria-accounts-preview-summary.json',JSON.stringify(summary,null,2));console.error('ACCOUNTS PREVIEW FAIL',JSON.stringify(summary));throw error;
}finally{for(const context of contexts)await context.close().catch(()=>{});await browser.close();}
