// Real UI interactions; snapshots only observe authoritative records.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';

const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';
await fs.mkdir(out,{recursive:true});
let page;
try{
 const context=await h.browser.newContext(h.devices['Pixel 5']);
 page=await context.newPage();page.setDefaultTimeout(15000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(process.env.V5_BROWSER_URL||h.url);
 await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#playerName').fill('Examen médico');await page.locator('#enterButton').click();
 await page.locator('#guardButton').click();await page.locator('input[name="guardScope"][value="specific"]').check();await page.locator('#caseChoice').selectOption('CIRR-001');
 await page.locator('[data-action="start-guard"]').click();
 const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
 const openExam=async()=>{await page.locator('#peopleButton').click();await page.locator('[data-action="examination"]').click();};
 const choose=async region=>{
  await page.locator('#examRegions [data-exam-region="'+region+'"]').click();
  await page.waitForFunction(()=>['executed','rejected','unconfirmed'].includes(document.getElementById('examFeedback')?.dataset.status));
 };
 // Reading a chart at a distance never authorizes a physical examination.
 await openExam();await choose('general');
 assert.equal(await page.locator('#examFeedback').getAttribute('data-status'),'rejected');
 assert.match(await page.locator('#examFeedback').innerText(),/Acercate al paciente/);
 assert(!(await state()).messages.some(m=>m.role==='player'&&/^\/examen/i.test(m.text)),
  'a refused panel action cannot be replayed as speech');
 assert(!/^\/examen/i.test(await page.evaluate(()=>atriaV5.snapshot().player.speechBubble?.text||'')));
 assert.deepEqual((await state()).patient.examFindings,{});
 assert.equal(await page.locator('#examRegions [data-exam-region="general"]').evaluate(e=>e.classList.contains('is-flipped')),false);
 await page.locator('#modalClose').click();
 if(await page.evaluate(()=>atriaV5.diagnostics().renderer.playableBounds!==null))await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 // Walk the existing navigable route into B1; no coordinate/state injection.
 for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
  const r=await page.evaluate(()=>atriaV5.diagnostics().renderer);
  await page.locator('#game').click({position:{x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);
  await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
 await openExam();
 const priorMessages=(await state()).messages.map(m=>m.id);
 await choose('general');
 assert.equal(await page.locator('#examFeedback').getAttribute('data-status'),'executed');
 assert.match(await page.locator('#examRegions [data-exam-region="general"] .exam-flip-back').innerText(),/Adelgazado/);
 assert.doesNotMatch(await page.evaluate(()=>atriaV5.snapshot().player.speechBubble?.text||''),/^\/(?:examen|glasgow)\b/i,
  'an examination panel action must not become an avatar speech preview');
 await choose('abdomen');
 await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings.abdomen?.palpation);
 assert.match(await page.locator('#examProgressiveSummary').innerText(),/Abdomen/);
 assert.match(await page.locator('#examRegions [data-exam-region="abdomen"] .exam-flip-back').innerText(),/Ascitis moderada/);
 assert.deepEqual((await state()).messages.map(m=>m.id),priorMessages,
  'physician findings and maneuver commands must not add conversation rows');
 assert.doesNotMatch(await page.locator('#chatHistory').innerText(),/Ascitis moderada|Palpación · Abdomen/);
 // Individual maneuvers deliberately repeat observations using new receipts.
 await page.locator('.exam-advanced > summary').click();
 const before=(await state()).patient.examLog.length;
 await page.locator('[data-exam-section="palpation"]').click();
 await page.waitForFunction(n=>atriaV5.snapshot().clinical.patient.examLog.length===n+1,before);
 assert.match(await page.locator('#examResults').innerText(),/Ascitis moderada/);
 const record=(await state()).patient.examFindings.abdomen.palpation;
 assert.equal(record.patientUid,(await state()).patient.uid);
 assert(record.eventId);
 await page.screenshot({path:out+'/examination-mobile-portrait.png'});
 await page.locator('#modalClose').click();await openExam();
 assert.equal((await state()).patient.examLog.length,before+1,'reopening the panel cannot execute another examination');
 assert.match(await page.locator('#examProgressiveSummary').innerText(),/Abdomen/);
 await page.setViewportSize({width:851,height:393});
 await choose('neurological');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.glasgow?.total===15);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true,'rotation must not overflow horizontally');
 assert.deepEqual((await state()).messages.map(m=>m.id),priorMessages,'Glasgow also stays in the examination panel');
 await page.screenshot({path:out+'/examination-mobile-landscape.png'});
 await page.locator('#modalClose').click();
 const send=async text=>{
  const before=(await state()).room.transcript.length;
  await page.locator('#dieInput').fill(text);await page.locator('#chatForm [type="submit"]').click();
  await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,before);
 };
 await send('Enfermera hemograma');
 assert((await state()).messages.some(m=>m.role==='nurse'&&/hemograma/i.test(m.text)));
 await send('Enfermera una vía');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.venousAccessCount===1,null,{timeout:30000});
 await send('Enfermera ceftriaxona 1 g');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.administrationLog.some(a=>a.id==='ceftriaxone'),null,{timeout:30000});
 assert((await state()).messages.some(m=>m.role==='nurse'&&/ceftriaxona/i.test(m.text)));
 assert.deepEqual(errors,[]);
 const report={realBrowser:true,mobileEmulated:'Pixel 5',physicalDevice:false,portrait:true,landscape:true,
  bedsideProximity:true,regionAndIndividualManeuver:true,authoritativeRecordsRetained:true,
  noExamChatOrAvatarPreview:true,nurseStudyAndMedicationPreserved:true,errors};
 await fs.writeFile(out+'/examination-panel-summary.json',JSON.stringify(report,null,2)+'\n');
 console.log('EXAMINATION PANEL BROWSER PASS',JSON.stringify(report));
 await context.close();
}catch(error){
 if(page){await page.screenshot({path:out+'/examination-panel-failure.png'}).catch(()=>{});
  await fs.writeFile(out+'/examination-panel-failure.json',JSON.stringify({error:String(error),
   state:await page.evaluate(()=>atriaV5?.snapshot()).catch(()=>null),
   panel:await page.locator('#modalContent').innerText().catch(()=>null)},null,2));}
 throw error;
}finally{await h.close();}
