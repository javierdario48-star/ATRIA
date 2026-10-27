import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {accountGatewayFixture} from './account-fixture.mjs';
const fixture=accountGatewayFixture(),h=await browserHarness({accounts:fixture});
const output=process.env.V5_QA_OUTPUT||'/tmp/atria-welcome-browser';await fs.mkdir(output,{recursive:true});
const errors=[],results=[];
async function boot(page){page.on('pageerror',e=>errors.push(e.message));await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');}
async function lobby(page){await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);}
async function register(page,name){
 await page.locator('#doctorName').fill(name);await page.locator('#welcomeNameForm button').click();
 await page.locator('[data-avatar-sex=female]').click();await page.locator('#avatarNextColor').click();
 await page.locator('#enterButton').click();assert.equal(await page.locator('#welcomeTitle').textContent(),'Guarda tu progreso');
 await page.locator('#newDoctorPassword').fill('safe-test-password-123');await page.locator('#welcomePasswordForm button').click();await lobby(page);
}
try{
 const c=await h.browser.newContext({viewport:{width:1280,height:800}});await c.addInitScript(()=>localStorage.setItem('atria.v5.progress.v1',JSON.stringify({receipts:[{kind:'clinical.closure',eventId:'legacy-practice',patientUid:'legacy-practice',actorId:'legacy-device',xp:37,closed:true}],penalties:[]})));const p=await c.newPage();await boot(p);
 assert.equal(await p.locator('#welcomeTitle').textContent(),'¿Cómo quieres que te llamen?');assert(!await p.locator('#profileForm').isVisible());
 assert(await p.locator('.welcome-art').evaluate(x=>x.complete&&x.naturalWidth===1536));
 await p.screenshot({path:output+'/desktop-welcome.png'});await register(p,'Darío del Sur');
 const a=[...fixture.rows.values()][0];assert.equal(a.sex,'female');assert.equal(a.scrub_color,'green');assert.equal(a.legacy_progress?.data.xp,37);assert.equal(a.xp,0);
 a.xp=457;a.cases_resolved=3;const actor=a.actor_id;
 await p.reload();await p.waitForFunction(()=>document.body.dataset.boot==='ready');
 assert.equal(await p.locator('#welcomeContinue').textContent(),'Continuar como Darío del Sur');assert.equal(await p.evaluate(()=>atriaV5.snapshot().phase),'title');
 await p.screenshot({path:output+'/desktop-returning.png'});await p.locator('#welcomeContinue').click();await lobby(p);assert((await p.locator('#playerProgress').textContent()).includes('Nivel 3'));
 const state=await c.storageState(),second=await h.browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),q=await second.newPage();await boot(q);
 await q.locator('#accountLoginButton').click();await q.locator('#loginDoctorName').fill('DARIO DEL SUR');await q.locator('#loginDoctorPassword').fill('safe-test-password-123');await q.locator('#rememberLoginDoctor').uncheck();
 await q.screenshot({path:output+'/mobile-login.png'});await q.locator('#welcomeLoginForm button').click();await lobby(q);
 const cookies=await second.cookies();assert.equal(cookies.find(x=>x.name==='__Host-atria_v5').expires,-1);
 assert((await q.locator('#playerProgress').textContent()).includes('Nivel 3'));
 assert.equal(await q.evaluate(async()=>(await (await fetch('/api/account/session')).json()).account.xp),457);
 assert.equal((await q.evaluate(()=>atriaV5.snapshot().player)).sex,'female');
 // Reopen persistent storage: authenticated welcome must require a gesture.
 await c.close();const reopened=await h.browser.newContext({storageState:state}),r=await reopened.newPage();await boot(r);assert(await r.locator('#welcomeContinue').isVisible());
 await r.locator('#welcomeNew').click();await r.locator('#doctorName').fill('DÁRIO DEL SUR');await r.locator('#welcomeNameForm button').click();await r.locator('#welcomeError').waitFor({state:'visible'});assert((await r.locator('#welcomeError').textContent()).includes('ocupado'));
 await register(r,'Doctora Nueva');assert.equal(fixture.rows.size,2);assert.notEqual([...fixture.rows.values()][1].actor_id,actor);assert.equal([...fixture.rows.values()][1].xp,0);assert.equal([...fixture.rows.values()][1].legacy_progress,null);
 // A revoked session retains only the public hint; it cannot reveal protected stats.
 fixture.sessions.clear();await q.reload();await q.waitForFunction(()=>document.body.dataset.boot==='ready');assert(await q.locator('#welcomeNameForm').isVisible());
 // Real small viewport checks, including keyboard-sized height without hidden fields.
 await q.setViewportSize({width:390,height:400});await q.locator('#doctorName').fill('Médica Andina');await q.locator('#doctorName').focus();await q.locator('#welcomeNameForm button').click();await q.locator('#enterButton').click();await q.locator('#newDoctorPassword').focus();
 await q.locator('#newDoctorPassword').scrollIntoViewIfNeeded();const box=await q.locator('#newDoctorPassword').boundingBox();assert(box.y>=0&&box.y+box.height<=400);
 await q.screenshot({path:output+'/mobile-keyboard.png'});
 const landscape=await h.browser.newContext({viewport:{width:844,height:390},hasTouch:true}),wide=await landscape.newPage();await boot(wide);
 await wide.locator('#doctorName').fill('Médica del Río');await wide.locator('#welcomeNameForm button').click();await wide.locator('#enterButton').click();await wide.locator('#newDoctorPassword').focus();await wide.locator('#newDoctorPassword').scrollIntoViewIfNeeded();
 assert(await wide.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));const field=await wide.locator('#newDoctorPassword').boundingBox();assert(field.y>=0&&field.y+field.height<=390);await wide.screenshot({path:output+'/landscape-password.png'});await landscape.close();
 assert.deepEqual(errors,[]);results.push('register, canonical duplicate, avatar, returning gesture, reopened storage, second device, session cookie, XP/level projection, account isolation, revoked session, mobile keyboard');
 console.log(JSON.stringify({passed:results,requests:h.requests.length,errors}));
 await reopened.close();await second.close();
}finally{await h.close();}
