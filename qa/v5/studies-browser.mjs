import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';

const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
try{
 const context=await h.browser.newContext(h.devices['Pixel 5']),page=await context.newPage(),errors=[];
 page.on('pageerror',error=>errors.push(error.message));page.setDefaultTimeout(15000);
 await page.goto(h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#playerName').fill('Study doctor');await page.locator('#enterButton').click();
 await page.locator('#guardButton').click();await page.locator('#caseChoice').selectOption('CIRR-001');
 await page.locator('[data-action="start-guard"]').click();
 const send=async text=>{
  const before=await page.evaluate(()=>atriaV5.snapshot().clinical.room.transcript.length);
  await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
  await page.waitForFunction(before=>atriaV5.snapshot().clinical.room.transcript.length>before,before);
 };
 await send('Hola antes de hablar con enfermería');
 assert.equal((await page.evaluate(()=>atriaV5.snapshot().clinical)).room.transcript.length,1);
 await send('Enfermera hemograma');
 assert.equal((await page.evaluate(()=>atriaV5.snapshot().clinical)).patient.orders.length,0,'patient range is authoritative');
 await page.locator('#dieInput').blur();
 await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 async function walkTo(x,y){
  await page.waitForFunction(()=>{
   const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;
   return Math.abs(c.x-p.x)<1&&Math.abs(c.y-p.y)<1;
  });
  const state=await page.evaluate(()=>({s:atriaV5.snapshot(),r:atriaV5.diagnostics().renderer}));
  const px=(x-state.r.camera.x)*state.r.scale+state.r.anchorX,py=(y-state.r.camera.y)*state.r.scale+state.r.anchorY;
  assert(px>=0&&px<state.r.width&&py>65&&py<state.r.height-60,'waypoint is a real visible canvas point');
  await page.locator('#game').click({position:{x:px,y:py}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
  await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
 const approachPatient=async()=>{for(const point of [[496,1060],[496,800],[400,580],[250,470],[144,420]])await walkTo(...point);};
 await approachPatient();
 const patient=await page.evaluate(()=>atriaV5.snapshot().patients[0]),doctor=await page.evaluate(()=>atriaV5.snapshot().player);
 assert(Math.hypot(patient.x-doctor.x,patient.y-doctor.y)<=150);
 await send('Enfermera hemograma');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders.length===1);
 await send('Enfermera hemograma');
 await send('Enfermera no pidas albúmina');
 await send('Enfermera ceftriaxona y metronidazol');
 let state=await page.evaluate(()=>atriaV5.snapshot().clinical);
 assert.equal(state.patient.orders.length,1);assert.deepEqual(state.patient.treatments,[]);
 assert.equal(state.patient.orders[0].status,'pending');
 await page.locator('#peopleButton').click();await page.locator('[data-action="studies"]').click();
 assert.equal(await page.locator('[data-study="hemograma"]').getAttribute('data-status'),'pending');
 await page.screenshot({path:out+'/android-studies-pending.png'});
 // Actual elapsed game clock in real Chromium, no fixture completion or direct state mutation.
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders[0].status==='done',null,{timeout:60000});
 await page.waitForFunction(()=>document.querySelector('[data-study="hemograma"]')?.dataset.status==='done');
 assert.match(await page.locator('[data-study="hemograma"]').innerText(),/Anemia leve y trombocitopenia/);
 state=await page.evaluate(()=>atriaV5.snapshot().clinical);
 const completions=state.room.events.filter(e=>e.type==='clinical.completed'&&e.clinical[0]?.kind==='study.request');assert.equal(completions.length,2);
 assert.deepEqual(completions.map(e=>e.commandId),['message-3','message-4'],'both pending requests settle under their own message');
 assert(completions.every(e=>e.patientUid===patient.uid));
 assert.equal(new Set(completions.map(e=>e.clinical[0].receipt.sourceEventId)).size,1,'one physical result');
 assert.equal(state.messages.filter(m=>m.id.startsWith('completion:')&&/hemograma/i.test(m.text)).length,1,'one study result announcement');
 await page.screenshot({path:out+'/android-studies-result.png'});
 await page.locator('#modalClose').click();await send('Enfermera hemograma');
 assert.equal((await page.evaluate(()=>atriaV5.snapshot().clinical)).patient.orders.length,1);
 await page.locator('#guardButton').click();assert.equal((await page.evaluate(()=>atriaV5.snapshot())).clinical,null);
 // A second real guard checks that selecting a study retains its own ID even
 // when another case has an identically named study in the global catalog.
 await page.locator('#guardButton').click();await page.locator('#caseChoice').selectOption('APP-001');
 await page.locator('[data-action="start-guard"]').click();await approachPatient();
 await page.locator('#peopleButton').click();await page.locator('[data-action="studies"]').click();
 await page.locator('#studyChoice').selectOption('app_ct');await page.locator('[data-action="request-study"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders.length===1);
 const selected=await page.evaluate(()=>atriaV5.snapshot().clinical.patient.orders[0]);
 assert.equal(selected.id,'app_ct');assert.equal(selected.resultSource,'native');
 assert.match(selected.result,/Apéndice engrosado/);
 assert.match(await page.locator('#chatHistory').innerText(),/Enfermera, TC abdominopélvica/);
 await page.locator('#guardButton').click();assert.equal((await page.evaluate(()=>atriaV5.snapshot())).clinical,null);
 assert.deepEqual(errors,[]);
 const report={realBrowser:true,androidEmulated:true,physicalAndroid:false,realElapsedStudyClock:true,
  caseId:'CIRR-001',nativeHemogramResult:true,rangeValidation:true,medicationsAdministered:0,
  originalCompletionCommandId:completions[0].commandId,pendingDuplicateAcknowledgements:2,
  selectedStudyPreservesNativeCase:true,exactlyOnceResult:true,cleanReturnToLobby:true};
 await fs.writeFile(out+'/studies-summary.json',JSON.stringify(report,null,2));console.log('V5 REAL STUDY UI PASS',JSON.stringify(report));
 await context.close();
}finally{await h.close();}
