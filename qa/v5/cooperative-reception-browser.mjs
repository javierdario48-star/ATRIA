import {clickHudAction} from './hud-actions.mjs';
// True public-interface cooperative reception: two independent browsers and
// one durable server. A default patient snapshot is not a confirmed claim.
import assert from 'node:assert/strict';
import {browserHarness} from './browser-harness.mjs';

const h=await browserHarness({durable:true,apiLatency:30});
const other=await h.newBrowser(),contexts=[],pages=[],errors=[];
try{
 for(const [i,b] of [h.browser,other].entries()){
  const ctx=await b.newContext(i?h.devices['Pixel 5']:{viewport:{width:1280,height:960}});
  contexts.push(ctx);
  const page=await ctx.newPage();pages.push(page);
  page.setDefaultTimeout(70000);
  page.on('pageerror',e=>errors.push({doctor:i,message:e.message}));
  await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
  await page.locator('#playerName').fill(i?'Bruno':'Ana');
  await page.locator('#enterButton').click();
  await clickHudAction(page,'peopleButton');await page.locator('#modalClose').click();
 }
 const [host,guest]=pages;
 await host.waitForFunction(()=>atriaV5.snapshot().others.some(p=>p.name==='Bruno'));
 await host.locator('#guardButton').click();
 await host.locator('[data-mode="coop"]').click();
 await host.locator('input[name="guardScope"][value="specific"]').check();await host.locator('#caseChoice').selectOption('CIRR-001');
 await host.locator('#coopDoctors label').filter({hasText:'Bruno'}).locator('input').check();
 await host.locator('[data-action="start-guard"]').click();
 await clickHudAction(guest,'peopleButton');
 await guest.locator('[data-action="join-coop"]').click();
 await Promise.all(pages.map(p=>p.waitForFunction(()=>
  atriaV5.snapshot().mode==='coop'&&!!atriaV5.snapshot().clinical?.shift&&
  atriaV5.diagnostics().cooperative.durable,null,{timeout:90000})));
 const patientUid=(await host.evaluate(()=>atriaV5.snapshot())).clinical.shift.patients[0].uid;
 for(const page of pages){
  await page.waitForFunction(()=>document.querySelector('#receptionGuide')?.hidden===false);
  assert.equal((await page.evaluate(()=>atriaV5.snapshot())).clinical.shift.confirmedFocusPatientUid,null);
 }
 async function receive(page){
  await page.locator('#receptionButton').click();
  await page.locator('[data-action="reception-approach"][data-patient-uid="'+patientUid+'"]').click();
  await page.waitForFunction(uid=>{
   const s=atriaV5.snapshot(),c=s.clinical;
   return c?.shift.confirmedFocusPatientUid===uid&&
    c.messages.some(m=>m.role==='player'&&m.text==='Hola ¿Qué te pasó?')&&
    c.messages.some(m=>m.role==='patient')&&!s.player.moving;
  },patientUid,{timeout:90000});
  assert.equal(await page.locator('#receptionGuide').isHidden(),true);
  assert.equal(await page.locator('#patientWheel').isHidden(),false);
 }
 await receive(host);
 // One physician's verified claim must not steal the teammate's focus.
 assert.equal((await guest.evaluate(()=>atriaV5.snapshot())).clinical.shift.confirmedFocusPatientUid,null);
 await receive(guest);
 await host.waitForFunction(()=>atriaV5.snapshot().clinical.messages.filter(m=>
  m.role==='player'&&m.text==='Hola ¿Qué te pasó?').length===2);
 const transcript=(await host.evaluate(()=>atriaV5.snapshot())).clinical.messages;
 assert.equal(transcript.filter(x=>x.role==='player'&&x.text==='Hola ¿Qué te pasó?').length,2,
  'each doctor greets exactly once via the canonical clinical transcript');
 assert(transcript.filter(x=>x.role==='patient').length>=2);
 // Returning to the same shared bed must not trigger a third greeting.
 await guest.locator('#receptionButton').click();
 await guest.locator('[data-action="reception-approach"][data-patient-uid="'+patientUid+'"]').click();
 await guest.waitForFunction(uid=>{
  const s=atriaV5.snapshot();
  return s.clinical.shift.confirmedFocusPatientUid===uid&&!s.player.moving;
 },patientUid);
 const final=(await guest.evaluate(()=>atriaV5.snapshot())).clinical;
 assert.equal(final.messages.filter(m=>m.role==='player'&&m.text==='Hola ¿Qué te pasó?').length,2);
 assert.deepEqual(errors,[]);
 console.log('COOPERATIVE RECEPTION BROWSER PASS',JSON.stringify({
  doctors:2,patientUid,authenticatedGreetings:2,clinicalAnswers:final.messages.filter(m=>m.role==='patient').length,
  confirmedFocus:true,errors}));
}finally{
 for(const ctx of contexts)await ctx.close().catch(()=>{});
 await other.close();await h.close();
}
