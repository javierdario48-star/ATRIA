// Live preview acceptance. Never persist passwords, cookies, Auth state or HAR.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {randomBytes} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
const origin=new URL(process.env.V5_BROWSER_URL).origin;
assert(origin.startsWith('https://')&&origin.endsWith('.vercel.app'));
const require=createRequire(import.meta.url),{chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const proxy=process.env.V5_USE_ENV_PROXY==='1'?new URL(process.env.HTTPS_PROXY||process.env.HTTP_PROXY):null;
const launch={headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,args:['--no-sandbox','--disable-dev-shm-usage'],...(proxy?{proxy:{server:proxy.origin,...(proxy.username?{username:decodeURIComponent(proxy.username),password:decodeURIComponent(proxy.password)}:{})}}:{})};
const options={viewport:{width:1200,height:820},ignoreHTTPSErrors:!!proxy};
const suffix=Date.now().toString(36),name='Darío QA '+suffix,raceName='Médica QA '+suffix,password=randomBytes(24).toString('base64url');
const dir=await fs.mkdtemp(os.tmpdir()+'/atria-welcome-'),out=process.env.V5_QA_OUTPUT||'/tmp/atria-welcome-live';await fs.mkdir(out,{recursive:true});
let persistent=await chromium.launchPersistentContext(dir,{...launch,...options}),browser=await chromium.launch(launch),stage='boot';
const contexts=[],errors=[],summary={preview:origin,checks:[],accounts:[],physicalDevice:false};
const api=(page,path,body)=>page.evaluate(async({path,body})=>{const r=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};},{path,body});
async function boot(context){const p=await context.newPage();p.setDefaultTimeout(60000);p.on('pageerror',e=>errors.push(e.message));await p.goto(origin);await p.waitForFunction(()=>document.body.dataset.boot==='ready');return p;}
async function independent(mobile=false){const c=await browser.newContext({...options,...(mobile?{viewport:{width:393,height:851},isMobile:true,hasTouch:true}:{})});contexts.push(c);return boot(c);}
async function lobby(page){await page.waitForFunction(()=>document.getElementById('splash').hidden&&atriaV5.snapshot().phase==='lobby');}
async function login(page,doctor,remember=true){await page.locator('#accountLoginButton').click();await page.locator('#loginDoctorName').fill(doctor);await page.locator('#loginDoctorPassword').fill(password);await page.locator('#rememberLoginDoctor').setChecked(remember);await page.locator('#welcomeLoginForm button').click();await lobby(page);return (await api(page,'account/session')).body.account;}
try{
 let a=await boot(persistent);assert(await a.locator('#welcomeNameForm').isVisible());assert(await a.locator('.welcome-art').evaluate(x=>x.complete&&x.naturalWidth===1536));
 await a.screenshot({path:out+'/desktop-welcome.png'});stage='new doctor';
 await a.locator('#doctorName').fill(name);await a.locator('#welcomeNameForm button').click();await a.locator('[data-avatar-sex=female]').click();await a.locator('#avatarNextColor').click();await a.locator('#enterButton').click();
 await a.locator('#newDoctorPassword').fill(password);const registered=a.waitForResponse(r=>new URL(r.url()).pathname==='/api/account/register');await a.locator('#welcomePasswordForm button').click();const rr=await registered;assert.equal(rr.status(),200);const aa=(await rr.json()).account;await lobby(a);summary.accounts.push({actorId:aa.actorId,name:aa.name});
 assert.equal(aa.sex,'female');assert.equal(aa.scrubColor,'green');assert.equal(aa.xp,0);summary.checks.push('real UI registration with doctor name only, password, original avatar and hospital');
 const cookie=(await persistent.cookies()).find(x=>x.name==='__Host-atria_v5');assert(cookie.httpOnly&&cookie.secure&&cookie.expires>0);assert(!await a.evaluate(()=>document.cookie.includes('__Host-atria_v5')));summary.checks.push('secure HttpOnly persistent cookie');
 stage='actual browser reopen';await persistent.close();persistent=await chromium.launchPersistentContext(dir,{...launch,...options});a=await boot(persistent);assert(await a.locator('#welcomeContinue').isVisible());assert.equal(await a.evaluate(()=>atriaV5.snapshot().phase),'title');await a.locator('#welcomeContinue').click();await lobby(a);summary.checks.push('actual browser process close/reopen retains account, requires Continue');
 stage='other device';const mobile=await independent(true);const second=await login(mobile,name.normalize('NFD').replace(/\p{M}/gu,'').toUpperCase(),false);assert.equal(second.actorId,aa.actorId);assert.equal(second.sex,'female');assert.equal(second.scrubColor,'green');assert.equal(second.xp,aa.xp);
 assert.equal((await mobile.context().cookies()).find(x=>x.name==='__Host-atria_v5').expires,-1);await mobile.screenshot({path:out+'/mobile-lobby.png'});summary.checks.push('second device canonical name login, avatar/XP and session-only cookie');
 stage='atomic name race';const r1=await independent(),r2=await independent();
 const status=await Promise.all([api(r1,'account/name-status',{name:raceName}),api(r2,'account/name-status',{name:raceName.toUpperCase()})]);assert(status.every(x=>x.status===200&&x.body.available));
 const registration=async(page,n)=>api(page,'account/register',{name:n,password,remember:true,sex:'male',scrubColor:'navy',clientKey:await page.evaluate(()=>localStorage.getItem('atria.v5.social.client')),newCharacter:true});
 const raced=await Promise.all([registration(r1,raceName),registration(r2,raceName.normalize('NFD').replace(/\p{M}/gu,'').toUpperCase())]);assert.deepEqual(raced.map(x=>x.status).sort(),[200,409]);const winner=raced[0].status===200?r1:r2,wa=raced.find(x=>x.status===200).body.account;summary.accounts.push({actorId:wa.actorId,name:wa.name});
 await winner.reload();await winner.waitForFunction(()=>document.body.dataset.boot==='ready');await winner.locator('#welcomeContinue').click();await lobby(winner);summary.checks.push('concurrent equivalent registrations: exactly one 200, one 409');
 stage='friends';assert.equal((await api(a,'friends',{userId:wa.actorId})).status,200);assert.equal((await api(winner,'friends/accept',{userId:aa.actorId})).status,200);assert((await api(mobile,'me')).body.friends.some(x=>x.id===wa.actorId));summary.checks.push('friendship persisted and visible on second device');
 stage='guard recovery';await a.locator('#guardButton').click();await a.locator('input[name=guardScope][value=specific]').check();await a.locator('#caseChoice').selectOption('CIRR-001');await a.locator('[data-action=start-guard]').click();await a.waitForFunction(()=>atriaV5.diagnostics().cooperative.durable&&atriaV5.snapshot().phase==='guard');const opened=await a.evaluate(()=>atriaV5.snapshot()),guard=opened.clinical.room.roomId,patient=opened.clinical.patient.uid;
 const oldCookies=await persistent.cookies();assert.equal((await api(a,'account/logout',{})).status,200);await a.reload();await a.waitForFunction(()=>document.body.dataset.boot==='ready');assert((await a.locator('#welcomeTitle').textContent()).includes('Vuelve a entrar'));assert.equal(await a.evaluate(()=>atriaV5.snapshot().phase),'title');
 const stale=await browser.newContext(options);contexts.push(stale);await stale.addCookies(oldCookies);const stalePage=await boot(stale);const denied=await api(stalePage,'account/session');assert([200,401].includes(denied.status)&&!denied.body.account);
 const restored=await login(a,name);assert.equal(restored.activeGuardId,guard);await a.locator('[data-action=account-recover]').click();await a.waitForFunction(()=>atriaV5.snapshot().phase==='guard');assert.equal(await a.evaluate(()=>atriaV5.snapshot().clinical.patient.uid),patient);summary.checks.push('logout revokes old session; reauthentication offers and recovers same real guard/patient');
 // Release only the QA guard after verifying recovery; do not manufacture a clinical outcome.
 assert.equal((await api(a,'account/release-guard',{})).status,200);await a.reload();await a.waitForFunction(()=>document.body.dataset.boot==='ready');await a.locator('#welcomeContinue').click();await lobby(a);
 stage='switch/create';await a.locator('#profileButton').click();await a.locator('[data-action=account-logout]').click();assert(await a.locator('#welcomeNameForm').isVisible());await login(a,raceName);assert.equal((await api(a,'account/session')).body.account.actorId,wa.actorId);
 await a.reload();await a.waitForFunction(()=>document.body.dataset.boot==='ready');await a.locator('#welcomeNew').click();await a.locator('#doctorName').fill('Médico Nuevo '+suffix);await a.locator('#welcomeNameForm button').click();await a.locator('#enterButton').click();await a.locator('#newDoctorPassword').fill(password);await a.locator('#welcomePasswordForm button').click();await lobby(a);const bb=(await api(a,'account/session')).body.account;assert.notEqual(bb.actorId,wa.actorId);assert.notEqual(bb.actorId,aa.actorId);assert.equal(bb.xp,0);assert.equal((await api(a,'me')).body.friends.length,0);summary.accounts.push({actorId:bb.actorId,name:bb.name});summary.checks.push('switch account and create new doctor keep XP/friends/guard isolated');
 assert.equal((await api(mobile,'account/session')).body.account.actorId,aa.actorId);assert((await api(mobile,'me')).body.friends.some(x=>x.id===wa.actorId));
 assert.deepEqual(errors,[]);summary.errors=errors;summary.passed=true;
 await fs.writeFile(out+'/result.json',JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify(summary));
 for(const page of [a,mobile,winner])await api(page,'account/logout',{});
} catch(error){await fs.writeFile(out+'/partial.json',JSON.stringify({...summary,stage,error:error.message},null,2)+'\n');console.error(JSON.stringify({stage,error:error.message}));throw error;}
finally{for(const c of contexts)await c.close();await browser.close();await persistent.close();await fs.rm(dir,{recursive:true,force:true});}
