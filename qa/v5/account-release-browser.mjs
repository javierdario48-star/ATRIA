// Explicit same-account transfer/finalization from an independent device.
// A single real transport conflict must not leave an unmaintained replica
// waiting forever. No patient, clock, outcome or account balance is injected.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
import {accountGatewayFixture} from './account-fixture.mjs';

const fixture=accountGatewayFixture(),h=await browserHarness({accounts:fixture,durable:true,apiLatency:40});
const other=await h.newBrowser(),browsers=[h.browser,other],contexts=[],pages=[],errors=[],requests=[];
const name='Doctora Finalización QA',password='safe-test-password-123';
const api=(page,path,body)=>page.evaluate(async({path,body})=>{
 const response=await fetch('/api/'+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},
  ...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,body:await response.json()};
},{path,body});
try{
 for(const [index,browser] of browsers.entries()){
  const context=await browser.newContext(index?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});contexts.push(context);
  const page=await context.newPage();pages.push(page);page.setDefaultTimeout(15000);
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 }
 const [first,second]=pages;
 await first.locator('#doctorName').fill(name);await first.locator('#welcomeNameForm button').click();
 await first.locator('#enterButton').click();await first.locator('#newDoctorPassword').fill(password);
 await first.locator('#welcomePasswordForm button').click();
 await first.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&document.getElementById('splash').hidden);
 await first.locator('#guardButton').click();await first.locator('[data-mode=solo]').click();
 await first.locator('input[name=guardScope][value=specific]').check();await first.locator('#caseChoice').selectOption('FECAL-001');
 await first.locator('[data-action=start-guard]').click();await first.waitForFunction(()=>atriaV5.snapshot().phase==='guard');
 const initial=(await api(first,'account/session')).body.account,roomId=initial.activeGuardId;
 assert(roomId);const patientIds=(await h.readGuard(roomId)).runtime.shift.records.map(row=>row.uid);
 await second.locator('#accountLoginButton').click();await second.locator('#loginDoctorName').fill(name);
 await second.locator('#loginDoctorPassword').fill(password);await second.locator('#welcomeLoginForm button').click();
 await second.locator('[data-action=account-release]').waitFor({state:'visible'});
 let conflicted=false;
 await second.route('**/api/clinical',async route=>{
  const body=route.request().postDataJSON();
  if(body.shiftRequest?.op==='leave'){
   requests.push(body.shiftRequest);
   if(!conflicted){conflicted=true;return route.fulfill({status:409,contentType:'application/json',
    body:JSON.stringify({code:'busy',error:'clinical authority busy; retry the same event'})});}
  }
  return route.continue();
 });
 const response=second.waitForResponse(row=>new URL(row.url()).pathname==='/api/account/release-guard');
 await second.locator('[data-action=account-release]').click();assert.equal((await response).status(),200);
 await second.waitForFunction(()=>!document.getElementById('modal').open);
 assert(conflicted&&requests.length>=2,'the busy clinical lane must be retried without another player action');
 assert.equal(new Set(requests.map(row=>row.requestId)).size,1,'retry the original persistent leave decision');
 const finished=(await api(second,'account/session')).body.account,guard=await h.readGuard(roomId);
 assert.equal(finished.activeGuardId,null);assert.equal(finished.xp,initial.xp);assert.equal(finished.casesResolved,initial.casesResolved);
 assert.equal(guard.runtime.turn.participantIds.length,0);assert.deepEqual(guard.runtime.shift.records.map(row=>row.uid),patientIds);
 assert.equal((await api(first,'clinical',{action:'sync',roomId})).status,403,'the old device remains fenced');
 assert.deepEqual(errors,[]);
 console.log('ACCOUNT FINALIZATION BROWSER PASS',JSON.stringify({browserProcesses:2,authenticated:true,
  isolatedDevices:true,androidEmulation:'Pixel 5',physicalAndroid:false,liveSupabase:false,
  conflictRetries:requests.length-1,uniqueDecisions:1,progressPreserved:true}));
}finally{
 for(const context of contexts)await context.close().catch(()=>{});
 await other.close().catch(()=>{});await h.close();
}
