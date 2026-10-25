// Browser acceptance of the preview-gated C5.b.3 route. Unlike the legacy
// cooperative tests, this mounts the real durable HTTP authority over SQLite.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';
import {clinical,send,walk} from './cooperative-ui.mjs';

const h=await browserHarness({apiLatency:35,durable:true});
const guestBrowser=await h.newBrowser(),contexts=[],errors=[],pages=[];
let stage='boot';
try{
 for(const [i,browser] of [h.browser,guestBrowser].entries()){
  const context=await browser.newContext(i===1?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});
  contexts.push(context);
  // Clinical admission and recovery must work even on a network where no
  // WebRTC data channel can open. Preserve actual HTTP presence/invitations.
  await context.route('**/api/lobby-sync**',route=>{
   const request=route.request(),url=new URL(request.url());
   const signaling=url.searchParams.has('signal')||request.method()==='POST'&&request.postDataJSON()?.signal;
   return signaling?route.abort():route.continue();
  });
  const page=await context.newPage();pages.push(page);
  page.setDefaultTimeout(45000);
  page.on('pageerror',e=>errors.push({doctor:i,message:e.message}));
  await page.goto(h.url);
  await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#playerName').fill(i===0?'Dra. Ana':'Dr. Bruno');
  await page.locator('#enterButton').click();
  await page.locator('#peopleButton').click();await page.locator('#modalClose').click();
 }
 const [host,guest]=pages;
 stage='lobby roster and accepted invitation';
 await host.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dr. Bruno'));
 await host.locator('#guardButton').click();
 await host.locator('[data-mode="coop"]').click();
 await host.locator('#caseChoice').selectOption('PERI-PBE-001');
 await host.locator('#coopDoctors label').filter({hasText:'Dr. Bruno'}).locator('input').check();
 await host.locator('[data-action="start-guard"]').click();
 await guest.locator('#peopleButton').click();
 await guest.locator('[data-action="join-coop"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>{
  const snapshot=atriaV5.snapshot(),debug=atriaV5.diagnostics();
  return snapshot.mode==='coop'&&!!snapshot.clinical&&debug.cooperative.durable===true;
 },null,{timeout:90000})));
 const initial=await Promise.all(pages.map(clinical));
 assert.equal(initial[0].patient.uid,initial[1].patient.uid);
 assert.equal(initial[0].room.roomId,initial[1].room.roomId);
 // Shared care has no exclusive bed ownership. Reception and patient
 // highlights must still onboard both independent clinicians.
 await Promise.all(pages.map(p=>p.waitForFunction(()=>
  document.querySelector('#receptionGuide')?.hidden===false&&
  document.querySelectorAll('.unassigned-patient-marker').length>0,
  null,{timeout:20000})));
 for(const page of pages){
  assert.equal(await page.locator('#receptionButton').evaluate(el=>el.classList.contains('reception-highlight')),true);
  assert(await page.locator('.unassigned-patient-marker').count()>0);
 }
 assert.equal((await host.evaluate(()=>atriaV5.diagnostics())).cooperative.authority,false,
  'even host has no independent browser clinical authority');
 stage='remote navigation and shared transcript';
 for(const p of pages)if(await p.locator('#keyboardToggleButton').getAttribute('aria-pressed')==='true')
  await p.locator('#keyboardToggleButton').click();
 await Promise.all([walk(host),walk(guest,176)]);
 await send(host,'Hola desde anfitriona');
 await host.waitForFunction(()=>atriaV5.snapshot().player.speechBubble?.text==='Hola desde anfitriona');
 await guest.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dra. Ana'&&
  x.speechBubble?.text==='Hola desde anfitriona'),null,{timeout:18000});
 await send(guest,'Hola desde invitado');
 await guest.waitForFunction(()=>atriaV5.snapshot().player.speechBubble?.text==='Hola desde invitado');
 await host.waitForFunction(()=>atriaV5.snapshot().others.some(x=>x.name==='Dr. Bruno'&&
  x.speechBubble?.text==='Hola desde invitado'),null,{timeout:18000});
 const before=await clinical(guest);
 assert.equal(before.room.transcript.length,2);
 // The fast room preview is display-only. Once PostgreSQL confirms the
 // clinical chat, the preview must not leave a duplicate line in either UI.
 await Promise.all(pages.map(p=>p.waitForFunction(()=>
  atriaV5.snapshot().clinical?.room?.transcript?.length>=2)));
 for(const [page,text] of [[host,'Hola desde invitado'],[guest,'Hola desde anfitriona']]){
  const rows=page.locator('#chatHistory .line').filter({hasText:text});
  assert.equal(await rows.count(),1,'one physician speech line after clinical confirmation');
 }
 stage='close host and continue guest';
 await host.close();
 await send(guest,'La guardia sigue sin anfitriona');
 const live=await clinical(guest);
 assert.equal(live.patient.uid,initial[0].patient.uid);
 assert.equal(live.room.transcript.length,3);
 stage='host tab recovery from durable checkpoint';
 const returning=await contexts[0].newPage();
 returning.setDefaultTimeout(45000);
 returning.on('pageerror',e=>errors.push({doctor:'host-return',message:e.message}));
 await returning.goto(h.url);
 await returning.waitForFunction(()=>document.body.dataset.boot==='ready');
 await returning.locator('#enterButton').click();
 await returning.waitForFunction(()=>atriaV5.diagnostics().cooperative.durable&&
  atriaV5.snapshot().clinical?.room?.transcript?.length>=3,null,{timeout:90000});
 const resumed=await clinical(returning);
 assert.equal(resumed.patient.uid,initial[0].patient.uid);
 assert.equal(resumed.room.transcript.length,3);
 assert.deepEqual(resumed.room.transcript.map(x=>x.id),live.room.transcript.map(x=>x.id));
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({passed:true,caseId:'PERI-PBE-001',twoBrowsers:true,
  recoveredHost:true,guestContinued:true,serverOnly:true,rtcUnavailable:true,transcript:resumed.room.transcript.length}));
}catch(error){console.error(JSON.stringify({passed:false,stage,message:error.message,pageErrors:errors}));throw error;}
finally{
 for(const context of contexts)await context.close().catch(()=>{});
 await guestBrowser.close().catch(()=>{});await h.close();
}
