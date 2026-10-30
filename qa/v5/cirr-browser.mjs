import {clickHudAction} from './hud-actions.mjs';
// Real UI end-to-end. evaluate() only reads diagnostics; no fixture mutations,
// fast-forwarding, hidden clinical calls or direct awards/closures.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness(),out=process.env.V5_QA_OUTPUT||'qa/v5-browser-results';await fs.mkdir(out,{recursive:true});
let inspectedPage;
try{
 const context=await h.browser.newContext(h.devices['Pixel 5']),page=await context.newPage(),errors=[];
 inspectedPage=page;
 page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(12000);
 await page.goto(process.env.V5_BROWSER_URL||h.url);await page.waitForFunction(()=>document.body.dataset.boot==='ready');
 await page.locator('#playerName').fill('CIRR UI doctor');await page.locator('#enterButton').click();
 await page.locator('#guardButton').click();await page.locator('input[name="guardScope"][value="specific"]').check();await page.locator('#caseChoice').selectOption('CIRR-001');
 await page.locator('[data-action="start-guard"]').click();
 const state=()=>page.evaluate(()=>atriaV5.snapshot().clinical);
 const send=async text=>{
  const before=(await state()).room.transcript.length;await page.locator('#dieInput').fill(text);
  await page.locator('#chatForm [type="submit"]').click();
  await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,before);
 };
 await send('Hola antes de enfermería');await send('Enfermera espironolactona');
 assert.equal((await state()).patient.treatments.length,0,'range rejects treatment even though chat works');
 await page.locator('#dieInput').blur();
 await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
  await page.waitForFunction(()=>{
   const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;
   return Math.abs(c.x-p.x)<1&&Math.abs(c.y-p.y)<1;
  });
  const t=await page.evaluate(()=>({p:atriaV5.snapshot().player,r:atriaV5.diagnostics().renderer}));
  await page.locator('#game').click({position:{x:(x-t.r.camera.x)*t.r.scale+t.r.anchorX,y:(y-t.r.camera.y)*t.r.scale+t.r.anchorY}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
 await send('¿Desde cuándo empezó la hinchazón?');await send('¿Toma alcohol?');
 assert.match(await page.locator('#chatHistory').innerText(),/varias semanas/);
 assert.match(await page.locator('#chatHistory').innerText(),/muchos años|durante años/);
 await clickHudAction(page,'peopleButton');await page.locator('[data-action="examination"]').click();
 // A region card performs its actual constituent examination techniques.
 await page.locator('#examRegions [data-exam-region="general"]').click();
 await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings.general);
 await page.locator('#examRegions [data-exam-region="abdomen"]').click();
 await page.waitForFunction(()=>['inspection','auscultation','percussion','palpation'].every(
  method=>!!atriaV5.snapshot().clinical.patient.examFindings.abdomen?.[method]));
 await page.locator('#examRegions [data-exam-region="spleen"]').click();
 await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings.spleen?.palpation);
 assert((await state()).patient.examDone);
 await page.locator('.exam-advanced > summary').click();
 assert.match(await page.locator('#examResults').innerText(),/Esplenomegalia/);
 await page.locator('#modalClose').click();await clickHudAction(page,'peopleButton');
 await page.locator('[data-action="record-vitals"]').click();await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.lastVitalsKnown);
 assert.match(await page.locator('#clinicalVitals').innerText(),/108\/68/);await page.locator('#modalClose').click();
 for(const study of ['hepatograma','renal','eco','paracentesis']){
  await clickHudAction(page,'peopleButton');await page.locator('[data-action="studies"]').click();
  await page.locator('#studyChoice').selectOption(study);await page.locator('[data-action="request-study"]').click();
  await page.waitForFunction(id=>atriaV5.snapshot().clinical.patient.orders.some(o=>o.id===id),study);
 }
 // Android reproduction: native nurse IV must complete on CIRR and
 // unsupported Ringer cannot pretend to be an unconfirmed cannulation.
 await send('enfermera vias');
 assert.equal((await state()).patient.venousAccessCount,0,'no early venous access');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.venousAccessCount===2);
 assert.match(await page.locator('#chatHistory').innerText(),/Acceso venoso periférico confirmado/i);
 const trips=(await page.evaluate(()=>atriaV5.snapshot())).nurses.filter(n=>n.journeyId).length;
 await send('enfermera via');
 assert.equal((await state()).patient.venousAccessCount,2);
 assert.equal((await page.evaluate(()=>atriaV5.snapshot())).nurses.filter(n=>n.journeyId).length,trips,
  'documented access must not summon a new nurse');
 await send('Enfermera no administres albúmina');
 await send('Enfermera ceftriaxona 2 g'); // an unsupported dose cannot leak into CIRR care
 assert.equal((await state()).patient.treatments.some(t=>t.id==='ceftriaxone'),false);
 await clickHudAction(page,'peopleButton');await page.locator('[data-action="treatment"]').click();
 await page.locator('#therapyOrder').fill('espironolactona 50 mg');await page.locator('[data-action="order-therapy"]').click();
 assert.equal((await state()).patient.treatments.length,0,'uncertified dose has no hidden default administration');
 await clickHudAction(page,'peopleButton');await page.locator('[data-action="treatment"]').click();
 await page.locator('#therapyOrder').fill('espironolactona 100 mg oral');await page.locator('[data-action="order-therapy"]').click();
 const pending=await state();assert.equal(pending.patient.treatments.length,0);
 assert.equal(pending.patient.pendingTreatments.length,0,'preparation cannot start before nurse reaches B1');
 assert((await page.evaluate(()=>atriaV5.snapshot())).nurses.some(n=>n.journeyId),'nurse must physically take the medicine');
 await send('Enfermera espironolactona 100 mg oral');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.administrationLog.length===1);
 const administered=await state(),t=administered.patient.administrationLog[0];
 assert.equal(t.id,'espironolactona');assert.equal(t.dose.amount,100);assert.equal(t.patientUid,administered.patient.uid);
 assert(!administered.patient.treatments.some(t=>t.id==='albumin'||t.id==='ceftriaxone'));
 await page.screenshot({path:out+'/cirr-confirmed-administration.png'});
 await send('Enfermera dieta sin sal');await send('/disposicion sala');assert(!(await state()).patient.caseEnded);
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.orders.every(o=>o.status==='done'),null,{timeout:150000});
 const readyStudies=await state();assert.equal(readyStudies.patient.orders.length,4);
 assert.match(readyStudies.patient.orders.find(o=>o.id==='renal').result,/K 4,3/);
 await clickHudAction(page,'peopleButton');await page.locator('[data-action="reassess"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.reassessments>0);
 // Exact original CIRR behavior: spironolactone is delivered but has no acute
 // vital/ascites kinetics. A normal-looking textual improvement would be false.
 const reassessed=await state();assert.equal(reassessed.patient.liveVitals.hr,94);assert.equal(reassessed.patient.liveVitals.sys,108);
 assert(reassessed.patient.lastReassessment.administrationEvents.includes(t.sourceEventId));
 await page.locator('#diagnosisInput').fill('cirrosis descompensada');await page.locator('[data-action="save-diagnosis"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.diagnosis==='cirrosis descompensada');
 await page.locator('#modalClose').click();await send('/disposicion alta');assert(!(await state()).patient.caseEnded);
 await clickHudAction(page,'peopleButton');await page.locator('[data-destination="sala"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.caseEnded);
 const closed=await state();assert.equal(closed.patient.closure.quality.score,100);assert.equal(closed.progress.xp,133);
 assert.equal(closed.progress.receipts.length,1);assert.equal(closed.room.patients[0].closed,true);
 assert.match(await page.locator('#caseResult').innerText(),/100\/100/);assert.match(await page.locator('#caseResult').innerText(),/133 XP/);
 await page.screenshot({path:out+'/cirr-closed-xp.png'});await page.locator('#modalClose').click();
 await send('/disposicion sala');await send('Enfermera espironolactona');assert.equal((await state()).progress.xp,133);
 assert.equal((await state()).patient.administrationLog.length,1);await page.locator('#guardButton').click();
 assert.equal(await state(),null);assert.match(await page.locator('#playerProgress').innerText(),/133/);
 await page.reload();await page.waitForFunction(()=>document.body.dataset.boot==='ready');await page.locator('#enterButton').click();
 assert.match(await page.locator('#playerProgress').innerText(),/133/,'XP survives reload separately from production profile');
 // A separate explicitly requested native procedure verifies real physiological
 // changes too. It is not automatically added to the completed CIRR regimen.
 await page.locator('#guardButton').click();await page.locator('input[name="guardScope"][value="specific"]').check();await page.locator('#caseChoice').selectOption('CIRR-001');await page.locator('[data-action="start-guard"]').click();
 assert.notEqual((await state()).patient.uid,closed.patient.uid,'new guard after reload has a different persistent patient identity');
 await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
  await page.waitForFunction(()=>{
   const p=atriaV5.snapshot().player,c=atriaV5.diagnostics().renderer.camera;
   return Math.abs(c.x-p.x)<1&&Math.abs(c.y-p.y)<1;
  });
  const a=await page.evaluate(()=>({p:atriaV5.snapshot().player,r:atriaV5.diagnostics().renderer}));
  await page.locator('#game').click({position:{x:(x-a.p.x)*a.r.scale+a.r.width/2,y:(y-a.p.y)*a.r.scale+a.r.height/2}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
 await clickHudAction(page,'peopleButton');await page.locator('[data-action="treatment"]').click();
 await page.locator('#therapyOrder').fill('paracentesis terapéutica');await page.locator('[data-action="order-therapy"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.liveVitals.hr<93.9&&atriaV5.snapshot().clinical.patient.liveVitals.rr<19.9);
 const procedure=await state();assert.deepEqual(procedure.patient.treatments.map(t=>t.id),['paracentesis_ter']);assert.equal(procedure.progress.xp,133);
 // Separate second guard exercises user-reported IV + Ringer without changing
 // the canonical 100/100 CIRR closing treatment path above.
 await send('enfermera vias y ringer');
 assert.equal((await state()).patient.administrationLog.some(t=>t.id==='fluid'),false);
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.administrationLog.some(t=>t.id==='fluid'),null,{timeout:30000});
 const afterFluid=await state();
 assert.equal(afterFluid.patient.venousAccessCount,2);
 assert.equal(afterFluid.patient.administrationLog.find(t=>t.id==='fluid').dose.amount,500);
 assert.match(await page.locator('#chatHistory').innerText(),/Administración confirmada: Cristaloides/i);
 assert.equal(afterFluid.patient.treatments.some(t=>t.id==='ceftriaxone'),false);
 assert.equal(afterFluid.progress.xp,133);
 await clickHudAction(page,'peopleButton');await page.locator('[data-action="record-vitals"]').click();
 await page.screenshot({path:out+'/cirr-native-procedure-response.png'});await page.locator('#modalClose').click();await page.locator('#guardButton').click();
 assert.deepEqual(errors,[]);
 const report={realBrowser:true,androidEmulated:true,physicalAndroid:false,url:page.url(),caseId:'CIRR-001',
  authenticHistory:true,allFiveExamTechniques:true,actualNativeAdministration:t,realElapsedStudies:true,
  nativeSpironolactoneVitalEffects:'none (characterized original model)',closure:closed.patient.closure,
  nativeProcedureResponse:procedure.patient.liveVitals,explicitNativeProcedure:true,
  exactlyOnceXP:true,persistedAfterReload:true,cleanReturnToLobby:true,errors};
 await fs.writeFile(out+'/cirr-summary.json',JSON.stringify(report,null,2));
 console.log('CIRR COMPLETE REAL UI PASS',JSON.stringify({score:100,xp:133,administrations:1,physicalAndroid:false,url:report.url}));
 await context.close();
}catch(error){
 if(inspectedPage){
  await inspectedPage.screenshot({path:out+'/cirr-failure.png'}).catch(()=>{});
  const diagnostics=await inspectedPage.evaluate(()=>({clinical:globalThis.atriaV5?.snapshot().clinical,
   modal:document.querySelector('#modal')?.getBoundingClientRect().toJSON(),html:document.querySelector('#modalContent')?.innerText})).catch(()=>null);
  await fs.writeFile(out+'/cirr-failure.json',JSON.stringify({error:String(error),diagnostics},null,2));
 }
 throw error;
}finally{await h.close();}
