import {clickHudAction} from './hud-actions.mjs';
// No clinical state mocks: three actual browsers, accepted HTTP invitations,
// durable SQLite authority, delayed bootstrap and RTC requests kept pending.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';

const h=await browserHarness({apiLatency:35,durable:true});
const browsers=[h.browser,await h.newBrowser(),await h.newBrowser()],contexts=[],pages=[],held=[];
const names=['Dra. Ana','Dr. Bruno','Dra. Celia'],blocked=new Set(),errors=[];
let releaseStart,guestMissing=false,releasedSignals=0;
const startGate=new Promise(resolve=>releaseStart=resolve);
async function until(condition){
 const deadline=Date.now()+15000;
 while(!condition()){
  assert(Date.now()<deadline,'admission precondition did not arrive');
  await new Promise(resolve=>setTimeout(resolve,30));
 }
}
try{
 for(const [actor,browser] of browsers.entries()){
  const context=await browser.newContext({viewport:{width:1280,height:960}});contexts.push(context);
  await context.route('**/api/clinical',async route=>{
   if(actor===0&&route.request().postDataJSON()?.action==='start')await startGate;
   return route.continue();
  });
  await context.route('**/api/lobby-sync**',route=>{
   const request=route.request(),url=new URL(request.url());
   const signaling=url.searchParams.has('signal')||request.method()==='POST'&&request.postDataJSON()?.signal;
   if(!signaling)return route.continue();
   if(actor===2||request.method()!=='GET')return route.abort();
   blocked.add(actor);
   return new Promise(resolve=>held.push(async()=>{
    releasedSignals++;await route.abort().catch(()=>{});resolve();
   }));
  });
  const page=await context.newPage();pages.push(page);page.setDefaultTimeout(45000);
  page.on('pageerror',error=>errors.push({actor,message:error.message}));
  page.on('response',response=>{
   if(actor===1&&new URL(response.url()).pathname==='/api/clinical'&&response.status()===404&&
    response.request().postDataJSON()?.action==='sync')guestMissing=true;
  });
  await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#playerName').fill(names[actor]);await page.locator('#enterButton').click();
  await clickHudAction(page,'peopleButton');await page.locator('#modalClose').click();
 }
 const [host,firstGuest,lastGuest]=pages;
 await host.waitForFunction(()=>atriaV5.snapshot().others.length===2);
 await host.locator('#guardButton').click();await host.locator('[data-mode="coop"]').click();
 await host.locator('input[name="guardScope"][value="specific"]').check();await host.locator('#caseChoice').selectOption('PERI-PBE-001');
 for(const name of names.slice(1))await host.locator('#coopDoctors label').filter({hasText:name}).locator('input').check();
 await host.locator('[data-action="start-guard"]').click();
 await clickHudAction(firstGuest,'peopleButton');await firstGuest.locator('[data-action="join-coop"]').click();
 // Neither this guest nor the host can receive another social room poll.
 // Their cached allAccepted flag still excludes the third doctor's consent.
 await until(()=>blocked.has(0)&&blocked.has(1)&&guestMissing);
 await clickHudAction(lastGuest,'peopleButton');await lastGuest.locator('[data-action="join-coop"]').click();
 releaseStart();
 await Promise.all(pages.map(page=>page.waitForFunction(()=>{
  const s=atriaV5.snapshot(),d=atriaV5.diagnostics();
  return s.clinical?.room.members.length===3&&d.cooperative.durable&&!d.cooperative.authority;
 },null,{timeout:45000})));
 const patients=await Promise.all(pages.map(page=>page.evaluate(()=>atriaV5.snapshot().clinical.patient.uid)));
 assert.equal(new Set(patients).size,1);
 assert.equal(releasedSignals,0,'admission must finish while RTC requests are still pending');
 assert.deepEqual(errors,[]);
 console.log('DURABLE ADMISSION PASS',JSON.stringify({doctors:3,delayedBootstrap:true,
  guestRetried404:true,staleHostAndGuestRoster:true,signalingStillPending:true,serverOnly:true}));
}finally{
 releaseStart();for(const release of held)await release();
 for(const context of contexts)await context.close().catch(()=>{});
 for(const browser of browsers.slice(1))await browser.close().catch(()=>{});await h.close();
}
