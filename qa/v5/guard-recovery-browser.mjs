// Real authenticated UI and native guard authority. Only stale account pointers
// and ephemeral social-cache loss are injected; valid clinical state is read-only.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {accountGatewayFixture} from './account-fixture.mjs';
import {clickHudAction} from './hud-actions.mjs';

const output=process.env.V5_QA_OUTPUT||'/tmp/atria-guard-recovery';await fs.mkdir(output,{recursive:true});
const fixture=accountGatewayFixture(),h=await browserHarness({accounts:fixture,durable:true,apiLatency:40}),
 browsers=[h.browser,await h.newBrowser(),await h.newBrowser()],contexts=[],pages=[],errors=[],actors=[],checks=[];
const names=['Doctora Recuperación Alba QA','Doctor Recuperación Bruno QA'],password='safe-test-password-123';
const api=(page,path,body)=>page.evaluate(async({path,body})=>{
 const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},
  ...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};
},{path,body});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const check=name=>{checks.push(name);console.log('RECOVERY CHECK',name);};
const fingerprint=guard=>({patients:guard.runtime.shift.records.map(row=>row.uid),
 sessions:[guard.runtime.session,...(guard.runtime.sessions||[]).map(([,session])=>session)].map(session=>({
  uid:session.patient.uid,orders:session.patient.orders,administrations:session.patient.administrationLog,
  transcript:session.authority.transcript,hints:session.hints}))});
async function boot(page){await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');}
async function lobby(page){await page.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);}
async function reopen(page){await page.reload();await page.locator('#welcomeContinue').click();await lobby(page);}
async function saved(page){await page.locator('[data-action=account-recover]').waitFor({state:'visible'});}
async function enter(page,roomId){await page.waitForFunction(id=>atriaV5.snapshot().phase==='guard'&&
 atriaV5.snapshot().clinical?.room.roomId===id&&atriaV5.snapshot().clinical.shift.turn.actor.participating,roomId);}
async function save(page){await clickHudAction(page,'guardButton');await lobby(page);}
async function release(page){
 await saved(page);await page.locator('[data-action=account-release]').click();
 await page.waitForFunction(()=>!document.getElementById('modal').open);
 assert.equal((await api(page,'account/session')).body.account.activeGuardId,null);
}
async function verifyFenced(page,roomId){
 const deadline=Date.now()+5000;
 while(true){
  const result=await api(page,'clinical',{action:'sync',roomId});
  if(result.status===409&&result.body.code==='busy'&&Date.now()<deadline){
   await new Promise(resolve=>setTimeout(resolve,100));continue;
  }
  assert(result.status===403||result.status===409&&result.body.code==='fenced',
   'explicit new device transfer must fence the previous device: '+JSON.stringify(result));return;
 }
}
try{
 for(const [index,browser] of browsers.entries()){
  const context=await browser.newContext(index?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});contexts.push(context);
  const page=await context.newPage();pages.push(page);page.setDefaultTimeout(20000);
  page.on('pageerror',error=>errors.push(error.message));await boot(page);
  if(index<2){
   await page.locator('#doctorName').fill(names[index]);await page.locator('#welcomeNameForm button').click();
   await page.locator('#enterButton').click();await page.locator('#newDoctorPassword').fill(password);
   await page.locator('#welcomePasswordForm button').click();await lobby(page);
   actors.push((await api(page,'account/session')).body.account.actorId);
  }
 }
 const [a,b,device]=pages;
 assert.notEqual(actors[0],actors[1]);
 for(const [index,page] of [a,b].entries()){
  const row=[...fixture.rows.values()].find(row=>row.actor_id===actors[index]),before=structuredClone(row);
  row.active_guard_id='missing-recovery-'+index;
  await reopen(page);assert.equal(await page.locator('[data-action=account-recover]').count(),0);
  assert.equal(row.active_guard_id,null);assert.equal(row.xp,before.xp);assert.equal(row.cases_resolved,before.cases_resolved);
 }
 check('two independent accounts reconcile missing guard references without a phantom modal');
 await device.locator('#accountLoginButton').click();await device.locator('#loginDoctorName').fill(names[0]);
 await device.locator('#loginDoctorPassword').fill(password);await device.locator('#welcomeLoginForm button').click();await lobby(device);
 for(const mode of ['solo','coop','competitive']){
  await a.locator('#guardButton').click();await a.locator('[data-mode='+mode+']').click();
  await a.locator('input[name=guardScope][value=specific]').check();await a.locator('#caseChoice').selectOption('FECAL-001');
  if(mode!=='solo'){
   await a.locator('#coopDoctors label').filter({hasText:names[1]}).locator('input').check();
  }
  await a.locator('[data-action=start-guard]').click();
  if(mode!=='solo'){await b.locator('#coopInviteNotice').waitFor({state:'visible'});await b.locator('#coopInviteAccept').click();}
  await a.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
  const initial=(await api(a,'account/session')).body.account,roomId=initial.activeGuardId;
  if(mode!=='solo')await enter(b,roomId);
  const before=fingerprint(await h.readGuard(roomId)),otherBefore=(await api(b,'account/session')).body.account;
  await reopen(device);await saved(device);
  if(mode!=='solo')fixture.data.delete('qa-v1:room:'+roomId);
  for(const action of ['account-recover','account-release']){
   const entered=deferred(),finish=deferred();
   await device.route('**/api/account/take-control',async route=>{
    assert.equal(route.request().postDataJSON().roomId,roomId,'a visible offer must bind control transfer to that exact guard');
    entered.resolve();await finish.promise;
    return route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Conexión interrumpida. Volvé a intentarlo.'})});
   });
   await device.locator('[data-action='+action+']').click();await entered.promise;
   await device.locator('#modalContent [role=status]').waitFor({state:'visible'});
   assert(await device.locator('[data-action=account-recover]').isDisabled());assert(await device.locator('[data-action=account-release]').isDisabled());
   await device.keyboard.press('Escape');assert(await device.locator('#modal').evaluate(dialog=>dialog.open));
   finish.resolve();await device.locator('#modalContent [role=alert]').waitFor({state:'visible'});
   assert.match(await device.locator('#modalContent [role=alert]').innerText(),/Conexión interrumpida/);
   assert(await device.locator('[data-action=account-recover]').isEnabled());
   await device.screenshot({path:output+'/'+mode+'-'+action+'-error-android.png'});
   await device.unroute('**/api/account/take-control');
  }
  await device.locator('[data-action=account-recover]').click();await enter(device,roomId);
  await verifyFenced(a,roomId);
  await save(device);assert.equal((await api(device,'account/session')).body.account.activeGuardId,roomId);
  await clickHudAction(device,'guardButton');await saved(device);await device.locator('[data-action=account-recover]').click();await enter(device,roomId);
  check(mode+': native recovery, saved leave and reconnection on Android preserve the same guard');
  await reopen(a);await saved(a);await release(a);await lobby(a);
  const after=await h.readGuard(roomId),otherAfter=(await api(b,'account/session')).body.account;
  assert.deepEqual(fingerprint(after),before,'recover/release cannot remove patients, doses, orders, conversations or hint history');
  assert.equal(otherAfter.activeGuardId,otherBefore.activeGuardId);assert.equal(otherAfter.xp,otherBefore.xp);
  assert(!after.runtime.turn.participantIds.includes(actors[0]));
  if(mode!=='solo'){
   assert(after.runtime.turn.participantIds.includes(actors[1]),'finalizing A never releases cooperative/competitive B');
   await enter(b,roomId);await save(b);await clickHudAction(b,'guardButton');await release(b);
  }
  const finalized=fingerprint(await h.readGuard(roomId));
  // A released tombstone remains authoritative even if an old pointer returns.
  for(const [index,page] of [a,b].entries()){
   if(mode==='solo'&&index===1)continue;
   const row=[...fixture.rows.values()].find(row=>row.actor_id===actors[index]);row.active_guard_id=roomId;
   await reopen(page);assert.equal(await page.locator('[data-action=account-recover]').count(),0);assert.equal(row.active_guard_id,null);
  }
  assert.deepEqual(fingerprint(await h.readGuard(roomId)),finalized);
  await reopen(device);assert.equal(await device.locator('[data-action=account-recover]').count(),0);
  check(mode+': finalization and stale released references preserve guard data, XP and the other account');
 }
 assert.deepEqual(errors,[]);
 const report={passed:true,checks,browserProcesses:3,authenticatedAccounts:2,independentDeviceSessions:3,
  modes:['solo','coop','competitive'],androidEmulation:'Pixel 5',physicalAndroid:false,liveSupabase:false};
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log('GUARD RECOVERY BROWSER PASS',JSON.stringify(report));
}finally{for(const context of contexts)await context.close().catch(()=>{});for(const browser of browsers.slice(1))await browser.close().catch(()=>{});await h.close();}
