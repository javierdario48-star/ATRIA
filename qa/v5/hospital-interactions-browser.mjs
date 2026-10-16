// Real UI only. Diagnostics are read-only: no movement/clinical state injection.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
let page;
try{
 const context=await h.browser.newContext(h.devices['Pixel 5']);page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.V5_BROWSER_URL||h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#playerName').fill('Exploración anatómica');await page.locator('#enterButton').click();
 await page.locator('#guardButton').click();await page.locator('#caseChoice').selectOption('CIRR-001');await page.locator('[data-action="start-guard"]').click();
 const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
 const send=async text=>{const n=(await state()).room.transcript.length;await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
  await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,n);};
 // The chart is readable from the HUD; recording an exam still requires actual range.
 await page.locator('#peopleButton').click();await page.locator('[data-action="examination"]').click();
 await page.locator('[data-exam-section="general"]').focus();await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.examSection),'general','periodic refresh must preserve keyboard focus');
 let beforePress=(await state()).room.transcript.length;
 await page.keyboard.press('Enter');await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,beforePress);
 const buttonBox=await page.locator('[data-exam-section="general"]').boundingBox();
 beforePress=(await state()).room.transcript.length;
 await page.mouse.move(buttonBox.x+buttonBox.width/2,buttonBox.y+buttonBox.height/2);await page.mouse.down();
 await page.waitForTimeout(1200);await page.mouse.up();
 await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,beforePress);
 await page.locator('[data-exam-section="general"]').click();
 assert.deepEqual((await state()).patient.examFindings,{});assert(!(await state()).patient.lastVitalsKnown);
 await page.locator('#modalClose').click();await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
  const r=await page.evaluate(()=>atriaV5.diagnostics().renderer);
  await page.locator('#game').click({position:{x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
 const uid=(await state()).patient.uid;
 const tapEntity=async kind=>{
  await page.waitForFunction(()=>{const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;return Math.abs(c.x-p.x)<1&&Math.abs(c.y-p.y)<1;});
  const point=await page.evaluate(kind=>{const e=atriaV5.snapshot().entities.find(e=>e.kind===kind),r=atriaV5.diagnostics().renderer;
   return {x:(e.x-r.camera.x)*r.scale+r.anchorX,y:(e.y-r.camera.y)*r.scale+r.anchorY};},kind);
  await page.locator('#game').click({position:point});await page.waitForFunction(()=>document.querySelector('#modal').open);
  assert.equal(await page.locator('#modalContent').getAttribute('data-patient-uid'),uid);
 };
 await tapEntity('monitor');assert.match(await page.locator('#modalContent').innerText(),/Monitor · B1/);
 assert.match(await page.locator('#bedsideMonitor').innerText(),/desconectado/);assert(!(await state()).patient.lastVitalsKnown);
 await page.locator('[data-action="toggle-monitor"]').click();await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.procedures.monitor.connected);
 assert.match(await page.locator('#bedsideMonitor').innerText(),/108\/68/);
 await page.locator('[data-action="toggle-monitor"]').click();await page.waitForFunction(()=>!atriaV5.snapshot().clinical.patient.procedures.monitor.connected);
 const measured=(await state()).patient.lastVitalsKnown;
 await page.locator('#modalClose').click();await tapEntity('patient');await page.locator('[data-action="examination"]').click();
 const choose=async region=>page.locator('#examRegions [data-exam-region="'+region+'"]').click();
 await page.locator('svg [data-exam-region="abdomen"]').click();assert.deepEqual((await state()).patient.examFindings,{});
 await page.locator('[data-exam-section="palpation"]').click();await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings.abdomen?.palpation);
 assert.match(await page.locator('#examResults').innerText(),/Ascitis/);assert.doesNotMatch(await page.locator('#examResults').innerText(),/Esplenomegalia/);
 assert(!(await state()).patient.examDone);assert.deepEqual((await state()).patient.lastVitalsKnown,measured);
 await choose('thorax');await page.locator('[data-exam-section="auscultation"]').click();
 await choose('general');await page.locator('[data-exam-section="general"]').click();
 await choose('abdomen');
 for(const tech of ['inspection','percussion'])await page.locator('[data-exam-section="'+tech+'"]').click();
 assert(!(await state()).patient.examDone,'thorax auscultation cannot count as abdominal auscultation');
 await page.locator('[data-exam-section="auscultation"]').click();await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.examDone);
 await choose('spleen');await page.locator('[data-exam-section="palpation"]').click();assert.match(await page.locator('#examResults').innerText(),/Esplenomegalia/);
 await choose('neurological');await page.locator('[data-glasgow="eye"]').click();
 assert.equal((await state()).patient.glasgow.total,null);await page.locator('[data-glasgow="verbal"]').click();await page.locator('[data-glasgow="motor"]').click();
 assert.equal((await state()).patient.glasgow.total,15);
 await page.screenshot({path:out+'/regional-examination.png'});
 await page.locator('[data-action="patient-chart"]').click();await page.locator('[data-action="clinical-history"]').click();
 assert.match(await page.locator('#fullClinicalHistory').innerText(),/Esplenomegalia/);assert.match(await page.locator('#fullClinicalHistory').innerText(),/15/);
 await page.locator('#modalClose').click();await send('Enfermera paracentesis terapéutica');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.liveVitals.hr<93.8);
 assert.deepEqual((await state()).patient.lastVitalsKnown,measured,'disconnected monitor does not update a prior measurement');
 // Reproject after opening the approved keyboard; do not change hitboxes or world coordinates.
 await page.locator('#keyboardToggleButton').click();await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds!==null);
 await page.waitForTimeout(400);await tapEntity('monitor');
 await page.locator('[data-action="toggle-monitor"]').click();await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.procedures.monitor.connected);
 await page.waitForFunction(()=>{const p=atriaV5.snapshot().clinical.patient;return p.lastVitalsKnown.vitals.hr===p.liveVitals.hr;});
 await page.screenshot({path:out+'/bedside-monitor.png'});await page.locator('#modalClose').click();
 await page.setViewportSize({width:851,height:393});await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);await tapEntity('patient');
 assert.match(await page.locator('#modalContent').innerText(),/B1/);await page.locator('#modalClose').click();
 await page.locator('#guardButton').click();assert.equal(await state(),null);
 const report={test:'hospital-interactions',realBrowser:true,physicalAndroid:false,androidEmulated:true,
  url:page.url(),worldHitboxes:true,explicitPatientUid:true,unknownMonitorNoLeak:true,spotAndContinuousMeasurement:true,
  anatomyAndTechniques:true,partialExamDoesNotComplete:true,glasgowByComponents:true,historyAcquiredEvidence:true,
  keyboardOpenAndClosed:true,periodicRefreshPreservesFocusAndPress:true,rotated:true,cleanLobbyReturn:true,errors};
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/hospital-interactions-summary.json',JSON.stringify(report,null,2));
 console.log('HOSPITAL INTERACTIONS REAL UI PASS',JSON.stringify(report));await context.close();
}catch(error){if(page){await page.screenshot({path:out+'/hospital-interactions-failure.png'}).catch(()=>{});
 await fs.writeFile(out+'/hospital-interactions-failure.json',JSON.stringify({error:String(error),snapshot:await page.evaluate(()=>({state:globalThis.atriaV5?.snapshot(),modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null)},null,2));}throw error;
}finally{await h.close();}
