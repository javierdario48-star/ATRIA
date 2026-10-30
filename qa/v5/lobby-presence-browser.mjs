import {clickHudAction} from './hud-actions.mjs';
// Lobby discovery must be automatic after entering the hospital. Opening
// Personas / choosing Cooperative is NOT allowed to start presence as a side effect.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';

// Exercise the actual Vercel catch-all fallback, not just a direct QA route.
const h=await browserHarness({vercelRewriteFallback:true}),guestBrowser=await h.newBrowser(),contexts=[],pages=[],errors=[];
try{
 for(const [i,browser] of [h.browser,guestBrowser].entries()){
  const context=await browser.newContext(i?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});
  contexts.push(context);
  const page=await context.newPage();pages.push(page);page.setDefaultTimeout(30000);
  page.on('pageerror',e=>errors.push({doctor:i,message:e.message}));
  await page.goto(h.url);
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#playerName').fill(i?'Dr. Bruno':'Dra. Ana');
  await page.locator('#enterButton').click();
  assert.equal(await page.locator('#coopDoctors').count(),0,
   'this test must not open Personas or the Cooperative selector first');
 }
 const [first,second]=pages;
 await Promise.all([
  first.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&
    atriaV5.snapshot().others.some(p=>p.name==='Dr. Bruno'&&p.kind==='doctor')),
  second.waitForFunction(()=>atriaV5.snapshot().phase==='lobby'&&
    atriaV5.snapshot().others.some(p=>p.name==='Dra. Ana'&&p.kind==='doctor'))
 ]);
 // Both clients have genuinely sent presence and fetched the same roster.
 const writes=h.requests.filter(x=>x.path==='/api/lobby-sync'&&x.status===200);
 const reads=h.requests.filter(x=>x.path==='/api/lobby'&&x.status===200);
 assert(writes.length>=2,'both clients should publish server presence');
 assert(reads.length>=2,'both clients should read lobby online roster');
 await Promise.all(pages.map(p=>clickHudAction(p,'peopleButton')));
 assert.match(await first.locator('#coopDoctors').innerText(),/Dr\. Bruno/);
 assert.match(await second.locator('#coopDoctors').innerText(),/Dra\. Ana/);
 assert.deepEqual(errors,[],'auto-updating lobby must not introduce browser errors');
 console.log('ATRIA V5 LOBBY AUTO-PRESENCE PASS',JSON.stringify({
  realBrowserProcesses:2,devices:['desktop','Pixel 5 emulation'],
  visibleBeforeOpeningPeople:true,discoveredInBothDirections:true,
  presencePosts:writes.length,lobbyGets:reads.length
 }));
}finally{
 for(const context of contexts)await context.close().catch(()=>{});
 await guestBrowser.close().catch(()=>{});
 await h.close();
}
