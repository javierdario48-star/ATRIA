// Real authenticated UI and native guard authority. Inject stale references,
// advisory cache loss and transport faults without modifying clinical checkpoints.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
import {accountGatewayFixture} from './account-fixture.mjs';
import {clickHudAction} from './hud-actions.mjs';

const output=process.env.V5_QA_OUTPUT||'/tmp/atria-guard-recovery';await fs.mkdir(output,{recursive:true});
const fixture=accountGatewayFixture(),h=await browserHarness({accounts:fixture,durable:true,apiLatency:40}),
 browsers=[h.browser,await h.newBrowser(),await h.newBrowser()],contexts=[],pages=[],errors=[],actors=[],checks=[],casContention=[];
const names=['Doctora Recuperación Alba QA','Doctor Recuperación Bruno QA'],password='safe-test-password-123';
const api=(page,path,body)=>page.evaluate(async({path,body})=>{
 const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},
  ...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};
},{path,body});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
async function waitForGate(gate,message){
 let timer;
 try{return await Promise.race([gate.promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),15000);})]);}
 finally{clearTimeout(timer);}
}
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
async function dismiss(page,method){
 if(method==='Escape')await page.keyboard.press('Escape');
 else await page.locator(method).click();
 await page.waitForFunction(()=>!document.getElementById('modal').open&&atriaV5.snapshot().phase==='lobby');
}
async function dismissPending(page,action,method,roomId){
 const account=(await api(page,'account/session')).body.account,before=await h.readGuard(roomId),
  entered=deferred(),finish=deferred(),replied=deferred(),
  pattern='**/api/account/take-control',nativeRequests=[];
 const observe=request=>{const path=new URL(request.url()).pathname;
  if(['/api/clinical','/api/account/release-guard'].includes(path))nativeRequests.push(path);};
 page.on('request',observe);
 await page.route(pattern,async route=>{
  entered.resolve();await finish.promise;
  try{await route.fulfill({status:200,json:{ok:true,account}});}catch{/* the browser may have aborted */}
  finally{replied.resolve();}
 });
 try{
  await saved(page);await page.locator('[data-action='+action+']').click();await waitForGate(entered,'take-control request did not arrive');
  await dismiss(page,method);finish.resolve();await replied.promise;
  assert.equal((await api(page,'account/session')).body.account.activeGuardId,roomId);
  assert.deepEqual(nativeRequests,[],'a cancelled recovery cannot dispatch a native decision or account release');
  const after=await h.readGuard(roomId);
  assert.deepEqual(after.runtime.turn.participantIds,before.runtime.turn.participantIds);
  assert.deepEqual(fingerprint(after),fingerprint(before));
  assert.equal(await page.locator('#modal').evaluate(dialog=>dialog.open),false);await lobby(page);
 }finally{finish.resolve();page.off('request',observe);await page.unroute(pattern);}
}
async function dismissCommittedLeave(page,roomId,actorId){
 const before=await h.readGuard(roomId),initial=(await api(page,'account/session')).body.account,
  committed=deferred(),finish=deferred(),replied=deferred(),pattern='**/api/clinical',releaseRequests=[];
 const observe=request=>{if(new URL(request.url()).pathname==='/api/account/release-guard')releaseRequests.push(request);};
 page.on('request',observe);
 await page.route(pattern,async route=>{
  const body=route.request().postDataJSON();
  if(body?.roomId!==roomId||body.shiftRequest?.op!=='leave')return route.continue();
  const response=await route.fetch(),receipt=(await response.json()).shiftAcknowledgement;
  if(response.status()!==200||receipt?.status!=='accepted')return route.fulfill({response});
  committed.resolve(receipt);await finish.promise;
  try{await route.fulfill({response});}catch{/* the browser may have aborted */}
  finally{replied.resolve();}
 });
 try{
  await saved(page);await page.locator('[data-action=account-release]').click();
  const receipt=await waitForGate(committed,'native leave did not commit');
  await dismiss(page,'[data-action=close]');finish.resolve();await replied.promise;
  const after=await h.readGuard(roomId),account=(await api(page,'account/session')).body.account;
  assert.equal(account.activeGuardId,roomId);assert.equal(account.xp,initial.xp);assert.equal(account.casesResolved,initial.casesResolved);
  assert.deepEqual(releaseRequests,[],'a late native receipt cannot dispatch permanent account release');
  assert.deepEqual(fingerprint(after),fingerprint(before));
  assert.deepEqual(after.runtime.turn.receipts.filter(row=>row.actorId===actorId&&row.requestId===receipt.requestId)
   .map(row=>row.result),[receipt]);
  assert(!after.runtime.turn.participantIds.includes(actorId));
  assert.equal(await page.locator('#modal').evaluate(dialog=>dialog.open),false);await lobby(page);
 }finally{finish.resolve();page.off('request',observe);await page.unroute(pattern);}
}
async function release(page){
 await saved(page);await page.locator('[data-action=account-release]').click();
 await page.waitForFunction(()=>!document.getElementById('modal').open||!!document.querySelector('#modalContent [role=alert]'));
 assert.equal(await page.locator('#modal').evaluate(dialog=>dialog.open),false,
  await page.locator('#modalContent [role=alert]').allTextContents());
 assert.equal((await api(page,'account/session')).body.account.activeGuardId,null);
}
async function releaseThroughContention(page,roomId){
 const attempts={inspect:[],leave:[]},pattern='**/api/clinical',startedAt=performance.now();
 await page.route(pattern,async route=>{
  const body=route.request().postDataJSON();
  if(body?.roomId===roomId&&body.action==='sync'){
   const lane=body.shiftRequest?.op==='leave'?'leave':'inspect';
   attempts[lane].push(body);
   if(attempts[lane].length===1)return route.fulfill({status:409,json:{
    code:'busy',error:'clinical authority changed; retry the same event'}});
  }
  return route.continue();
 });
 try{
  await release(page);
  for(const lane of ['inspect','leave']){
   assert(attempts[lane].length>=2,lane+' retries its first CAS conflict');
   assert.deepEqual(attempts[lane][1],attempts[lane][0],lane+' retries the same request');
  }
  const requestId=attempts.leave[0].shiftRequest.requestId;assert(requestId);
  return {requestId,initialSyncAttempts:attempts.inspect.length,leaveAttempts:attempts.leave.length,
   elapsedMs:Math.round(performance.now()-startedAt)};
 }finally{await page.unroute(pattern);}
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
  // Start the following guard with pre-existing account progress.
  row.xp=(index+1)*233;row.cases_resolved=index+1;
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
  const accountRow=[...fixture.rows.values()].find(row=>row.actor_id===actors[0]),controller=accountRow.controller_session_id;
  await dismiss(device,'[data-action=close]');
  assert.equal(accountRow.active_guard_id,roomId);assert.equal(accountRow.controller_session_id,controller);
  await clickHudAction(device,'guardButton');await saved(device);
  if(mode==='solo'){
   for(const [action,method] of [['account-release','[data-action=close]'],['account-recover','#modalClose'],['account-release','Escape']]){
    await dismissPending(device,action,method,roomId);
    await clickHudAction(device,'guardButton');await saved(device);
   }
   check('Android Después, close and Escape cancel held actions and return to lobby');
   await dismissCommittedLeave(device,roomId,actors[0]);
   await clickHudAction(device,'guardButton');await saved(device);
   check('Android dismissal after native leave commit preserves its receipt, patients, XP and the saved guard');
  }
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
  await reopen(a);await saved(a);
  const {requestId,...contention}=await releaseThroughContention(a,roomId);casContention.push({mode,...contention});await lobby(a);
  const after=await h.readGuard(roomId),selfAfter=(await api(a,'account/session')).body.account,
   otherAfter=(await api(b,'account/session')).body.account;
  assert.deepEqual(fingerprint(after),before,'recover/release cannot remove patients, doses, orders, conversations or hint history');
  assert.equal(selfAfter.xp,initial.xp);assert.equal(selfAfter.casesResolved,initial.casesResolved);
  assert.equal(otherAfter.activeGuardId,otherBefore.activeGuardId);assert.equal(otherAfter.xp,otherBefore.xp);
  assert(!after.runtime.turn.participantIds.includes(actors[0]));
  assert.equal(after.runtime.turn.receipts.filter(row=>row.actorId===actors[0]&&row.requestId===requestId).length,1);
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
 const report={passed:true,checks,casContention,browserProcesses:3,authenticatedAccounts:2,independentDeviceSessions:3,
  modes:['solo','coop','competitive'],androidEmulation:'Pixel 5',physicalAndroid:false,liveSupabase:false};
 await fs.writeFile(output+'/report.json',JSON.stringify(report,null,2));console.log('GUARD RECOVERY BROWSER PASS',JSON.stringify(report));
}finally{for(const context of contexts)await context.close().catch(()=>{});for(const browser of browsers.slice(1))await browser.close().catch(()=>{});await h.close();}
