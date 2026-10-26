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
 await page.locator('#examRegions [data-exam-region="general"]').focus();
 await page.waitForTimeout(1200);
 assert.equal(await page.evaluate(()=>document.activeElement?.dataset.examRegion),'general',
  'periodic refresh must preserve focus on the selected region card');
 let beforePress=(await state()).room.transcript.length;
 await page.keyboard.press('Enter');await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,beforePress);
 const buttonBox=await page.locator('#examRegions [data-exam-region="general"]').boundingBox();
 beforePress=(await state()).room.transcript.length;
 await page.mouse.move(buttonBox.x+buttonBox.width/2,buttonBox.y+buttonBox.height/2);await page.mouse.down();
 await page.waitForTimeout(1200);await page.mouse.up();
 // A refused examination never flips into a fictitious result. Releasing
 // this second press retries exactly one real request; it is still refused
 // at a distance. Successful cards retain the later flip-to-review behavior.
 await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length===n+1,beforePress);
 assert.equal((await state()).room.transcript.length,beforePress+1);
 assert.equal(await page.locator('#examFeedback').getAttribute('data-status'),'rejected');
 assert(!/is-flipped/.test(await page.locator('#examRegions [data-exam-region="general"]').getAttribute('class')||''));
 beforePress=(await state()).room.transcript.length;
 await page.locator('#examRegions [data-exam-region="general"]').click();
 await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,beforePress);
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
   // B1's visible screen is independently characterized against the last native
   // scene. Do not click a position derived from the very hitbox under test.
   const [x,y]=kind==='monitor'?[48,361]:[e.x,e.y];
   return {x:(x-r.camera.x)*r.scale+r.anchorX,y:(y-r.camera.y)*r.scale+r.anchorY};},kind);
  await page.locator('#game').click({position:point});
  if(kind==='monitor'){
   await page.waitForFunction(()=>document.querySelector('#modal').open);
   assert.equal(await page.locator('#modalContent').getAttribute('data-patient-uid'),uid);
  }else{
   await page.locator('#patientWheel').waitFor({state:'visible'});
   assert.equal(await page.locator('#patientWheel').getAttribute('data-patient-uid'),uid);
   assert.equal(await page.locator('#modal').evaluate(x=>x.open),false,'touch shows world menu, not a blocking panel');
  }
 };
 await tapEntity('monitor');assert.match(await page.locator('#modalContent').innerText(),/Monitor · B1/);
 assert.match(await page.locator('#bedsideMonitor').innerText(),/desconectado/);assert(!(await state()).patient.lastVitalsKnown);
 await page.locator('[data-action="toggle-monitor"]').click();
 assert.equal((await state()).patient.procedures.monitor?.connected??false,false,'nurse has not yet connected the monitor');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.procedures.monitor?.connected===true);
 const initialVitals=(await state()).patient;
 assert(Math.abs(initialVitals.lastVitalsKnown.vitals.sys-108)<=2);
 assert(Math.abs(initialVitals.lastVitalsKnown.vitals.dia-68)<=1.2);
 assert.match(await page.locator('#bedsideMonitor').innerText(),/Monitorización continua/i);
 await page.waitForFunction(()=>document.querySelector('#monitorEcgPath')?.getAttribute('d')?.length>500);
 const initialEcg=await page.locator('#monitorEcgPath').getAttribute('d');
 const observedBefore=(await state()).patient.lastVitalsKnown.vitals;
 const nativeBefore=(await state()).patient.liveVitals;
 await page.waitForFunction(before=>{
  const now=atriaV5.snapshot().clinical.patient.lastVitalsKnown?.vitals;
  return now&&Math.abs(now.hr-before.hr)>.02&&Math.abs(now.sys-before.sys)>.02;
 },observedBefore,{timeout:15000});
 const after=(await state()).patient;
 assert.deepEqual(after.liveVitals,nativeBefore,
  'monitor measurement variation must not alter native case physiology');
 assert(Math.abs(after.lastVitalsKnown.vitals.hr-after.liveVitals.hr)<=1.4);

 await page.waitForTimeout(225);
 assert.notEqual(await page.locator('#monitorEcgPath').getAttribute('d'),initialEcg,
  'ECG must sweep with the authoritative measured heart rate');
 await page.locator('[data-action="toggle-monitor"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.procedures.monitor?.connected===false);
 assert.equal(await page.locator('#monitorEcgPath').count(),0,'disconnect must remove continuous ECG');
 await page.locator('[data-action="toggle-monitor"]').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.procedures.monitor?.connected===true);
 await page.waitForFunction(()=>document.querySelector('#monitorEcgPath')?.getAttribute('d')?.length>10);

 await page.locator('#monitorOrderInput').fill('espiron');
 const candidates=page.locator('#monitorOrderSuggestions [data-action="monitor-suggestion"]');
 // The selector must match the actual button, not its ancestor.
 const spironolactone=page.locator('#monitorOrderSuggestions [data-action="monitor-suggestion"][data-order="espironolactona 100 mg oral"]');
 assert.equal(await spironolactone.count(),1,'canonical 100 mg dose is offered exactly once');
 assert.equal((await state()).patient.treatments.length,0,'autocomplete selection never executes a prescription');
 await spironolactone.click();
 assert.equal(await page.locator('#monitorOrderInput').inputValue(),'espironolactona 100 mg oral');
 await page.locator('#monitorOrderInput').fill('');
 await page.locator('[data-action="monitor-hint"]').click();
 assert(await page.locator('#monitorOrderSuggestions button').count()>1,'hints accessible on demand');
 await page.locator('[data-action="toggle-monitor"]').click();await page.waitForFunction(()=>!atriaV5.snapshot().clinical.patient.procedures.monitor?.connected);
 const measured=(await state()).patient.lastVitalsKnown;
 await page.locator('#modalClose').click();await tapEntity('patient');
 const wheel=page.locator('#patientWheel');
 assert.equal(await wheel.locator('button').count(),7);
 assert.equal(await wheel.locator('[data-patient-action="diagnosis"]').count(),1);
 const checklist=page.locator('#bedsideChecklist');
 assert.equal(await checklist.isVisible(),true,'patient tap reveals the floating checklist');
 assert.equal(await checklist.locator('.bedside-checklist-steps li').count(),7);
 assert.match(await checklist.innerText(),/Anamnesis.*Examen físico.*Estudios/s);
 await checklist.locator('[data-action="toggle-clinical-checklist"]').click();
 assert.equal(await checklist.locator('.bedside-checklist-steps li').count(),0,'checklist can collapse');
 await checklist.locator('[data-action="toggle-clinical-checklist"]').click();
 assert.equal(await checklist.locator('.bedside-checklist-steps li').count(),7);
 await wheel.locator('[data-patient-action="patient"]').click();
 assert.equal(await page.locator('#modal').getAttribute('data-panel'),'case-close');
 assert.match(await page.locator('#modalContent').innerText(),/Cierre de atención/);
 assert.equal(await page.locator('#caseDestinations button').count(),0,
  'the server has not approved disposition yet, and the new panel cannot invent it');
 assert.equal(await checklist.isVisible(),true,'guidance remains available beside the case close decision');
 await page.locator('[data-action="close"]').click();
 await tapEntity('patient');
 await page.screenshot({path:out+'/contextual-patient-wheel.png'});
 await wheel.locator('[data-patient-action="examination"]').click();
 assert.match(await page.locator('#examProgressiveSummary').innerText(),/Pendiente de exploración/);
 assert.equal(await page.locator('#examBodyMarkers .exam-map-pin').count(),0,
  'unexplored patient must not show any visual clinical clue');
 const choose=async region=>page.locator('#examRegions [data-exam-region="'+region+'"]').click();
 await choose('abdomen');
 await page.waitForFunction(()=>['inspection','auscultation','palpation','percussion'].every(
  m=>!!atriaV5.snapshot().clinical.patient.examFindings.abdomen?.[m]),null,{timeout:30000});
 assert.match(await page.locator('#examProgressiveSummary').innerText(),/Abdomen.*(?:ascitis|distensión por líquido)/i);
 assert.match(await page.locator('#examBodyFindings').innerText(),/(?:distensión por líquido|matidez compatible con líquido abdominal)/i);
 assert.match((await state()).patient.examFindings.abdomen.palpation.rows.map(row=>row.text).join(' '),/ascitis moderada/i,
  'native abdominal palpation must still record the ascitic finding');
 assert.equal(await page.locator('#examBodyMarkers .exam-map-pin').count(),1);
 assert.equal(await page.locator('#examRegions [data-exam-region="abdomen"]').getAttribute('aria-pressed'),'true');
 const abdomenCard=page.locator('#examRegions [data-exam-region="abdomen"] .exam-flip-back');
 for(const technique of ['Inspección','Auscultación','Percusión','Palpación'])
  assert.match(await abdomenCard.innerText(),new RegExp(technique));
 assert.doesNotMatch(await abdomenCard.innerText(),/Esplenomegalia/);
 assert(!(await state()).patient.examDone,'general impression is still required');
 assert.deepEqual((await state()).patient.lastVitalsKnown,measured);
 await choose('abdomen');
 assert.equal(await page.locator('#examRegions [data-exam-region="abdomen"]').getAttribute('aria-pressed'),'true');
 await choose('general');
 await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examDone);
 assert.match(await page.locator('#examRegions [data-exam-region="general"] .exam-flip-back').innerText(),/Adelgazado/);
 await choose('spleen');
 await page.waitForFunction(()=>!!atriaV5.snapshot().clinical.patient.examFindings.spleen?.palpation);
 assert.match(await page.locator('#examRegions [data-exam-region="spleen"] .exam-flip-back').innerText(),/Esplenomegalia/);
 assert.match(await page.locator('#examProgressiveSummary').innerText(),/Esplenomegalia/);
 await choose('neurological');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.glasgow?.total===15);
 assert.match(await page.locator('#examRegions [data-exam-region="neurological"] .exam-flip-back').innerText(),/15|Abre los ojos/);
 await page.screenshot({path:out+'/regional-examination.png'});
 await page.locator('[data-action="patient-chart"]').click();await page.locator('[data-action="clinical-history"]').click();
 assert.match(await page.locator('#fullClinicalHistory').innerText(),/Esplenomegalia/);assert.match(await page.locator('#fullClinicalHistory').innerText(),/15/);
 await page.locator('#modalClose').click();await tapEntity('monitor');
 await page.locator('#monitorOrderInput').fill('paracentesis');
 await page.locator('#monitorOrderSuggestions [data-action="monitor-suggestion"]').filter({hasText:/Paracentesis terapéutica/}).first().click();
 await page.locator('[data-action="monitor-order-submit"]').click();
 assert.equal(await page.locator('#monitorOrderFeedback').getAttribute('data-status'),'pending',
  'monitor cannot announce administration before actual nurse preparation');
 assert.match(await page.locator('#monitorOrderHistory').innerText(),/Paracentesis terapéutica/i);
 await page.waitForFunction(()=>document.querySelector('#monitorOrderFeedback')?.dataset.status==='executed',null,{timeout:30000});
 assert.match(await page.locator('#monitorOrderFeedback').innerText(),/Intervención confirmada/i);
 assert.match(await page.locator('#monitorMedicationHistory').innerText(),/Paracentesis terapéutica/i);
 assert.match(await page.locator('#monitorMedicationHistory').innerText(),/Administrado y confirmado/i);
 await page.locator('#monitorOrderInput').fill('oxigeno 4 L/min y una via');
 const beforeCombo=(await state()).room.transcript.length;
 await page.locator('[data-action="monitor-order-submit"]').click();
 await page.waitForFunction(n=>atriaV5.snapshot().clinical.room.transcript.length>n,beforeCombo);
 const orderEvent=(await state()).room.events.filter(e=>e.type==='chat.posted').at(-1);
 assert.deepEqual(orderEvent.clinical.map(x=>[x.id,x.status]),
  [['oxygen','pending'],['iv','pending']],
  'both oxygen and IV have distinct real pending nurse jobs');
 await page.waitForFunction(()=>document.querySelector('#monitorOrderFeedback')?.dataset.status==='pending',null,{timeout:10000});
 const initialOxygen=await state();
 if(initialOxygen.patient.procedures.oxygen?.active){
  // Spatial NPC movement may finish during Playwright's async DOM inspection.
  // Confirm native authorization, not a particular wall-clock snapshot instant.
  await page.waitForFunction(uid=>{
   const c=atriaV5.snapshot().clinical;
   return c.room.events.some(e=>e.type==='clinical.completed'&&e.clinical.some(x=>
    x.id==='oxygen'&&x.status==='executed'&&x.receipt?.patientUid===uid&&
    x.receipt?.eventId===e.eventId));
  },uid,{timeout:10000});
 }
 const afterSubmit=await state();
 if(afterSubmit.patient.venousAccessCount){
  // Other bedside nurses can confirm access before this browser read.
  // Never conflate an already authentic IV receipt with premature placement.
  assert.equal(afterSubmit.patient.venousAccessCount,1);
  assert(afterSubmit.room.events.some(e=>e.type==='clinical.completed'&&
   e.clinical.some(a=>a.id==='iv'&&a.status==='executed'&&
     a.receipt?.patientUid===uid&&a.receipt?.eventId===e.eventId)),
   'visible access is only valid with matching authorized native receipt');
 }
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.procedures.oxygen?.active===true,null,{timeout:30000});
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.venousAccessCount===1,null,{timeout:30000});
 await page.waitForFunction(()=>document.querySelector('#monitorOrderFeedback')?.dataset.status==='executed',null,{timeout:15000});
 assert.equal((await state()).patient.procedures.oxygen.flowLpm,4);
 assert.match(await page.locator('#monitorMedicationHistory').innerText(),/Oxígeno suplementario/i);
 await page.locator('#modalClose').click();
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.liveVitals.hr<93.8);
 assert.deepEqual((await state()).patient.lastVitalsKnown,measured,'disconnected monitor does not update a prior measurement');
 // Reproject after opening the approved keyboard; do not change hitboxes or world coordinates.
 await page.locator('#keyboardToggleButton').click();await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds!==null);
 await page.waitForTimeout(400);await tapEntity('monitor');
 await page.locator('[data-action="toggle-monitor"]').click();await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.procedures.monitor?.connected);
 await page.waitForFunction(()=>{
   const p=atriaV5.snapshot().clinical.patient;
   return Math.abs(p.lastVitalsKnown.vitals.hr-p.liveVitals.hr)<=1.4 &&
    Math.abs(p.lastVitalsKnown.vitals.sys-p.liveVitals.sys)<=2;
  });
 await page.screenshot({path:out+'/bedside-monitor.png'});await page.locator('#modalClose').click();
 await page.setViewportSize({width:851,height:393});await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);await tapEntity('patient');
 assert.match(await page.locator('#patientWheel').getAttribute('data-patient-uid'),new RegExp(uid));
 await page.locator('#patientWheel [data-patient-action="history"]').click();
 await page.locator('#fullClinicalHistory').waitFor();await page.locator('#modalClose').click();
 await page.locator('#guardButton').click();assert.equal(await state(),null);
 const report={test:'hospital-interactions',realBrowser:true,physicalAndroid:false,androidEmulated:true,
  url:page.url(),worldHitboxes:true,visibleNativeMonitorScreen:true,explicitPatientUid:true,unknownMonitorNoLeak:true,spotAndContinuousMeasurement:true,
  anatomyAndTechniques:true,partialExamDoesNotComplete:true,glasgowByComponents:true,historyAcquiredEvidence:true,
  keyboardOpenAndClosed:true,worldAnchoredPatientActions:true,deviceMonitorReadout:true,periodicRefreshPreservesFocusAndPress:true,rejectedExamDoesNotFlip:true,rotated:true,cleanLobbyReturn:true,errors};
 assert.deepEqual(errors,[]);await fs.writeFile(out+'/hospital-interactions-summary.json',JSON.stringify(report,null,2));
 console.log('HOSPITAL INTERACTIONS REAL UI PASS',JSON.stringify(report));await context.close();
}catch(error){if(page){await page.screenshot({path:out+'/hospital-interactions-failure.png'}).catch(()=>{});
 await fs.writeFile(out+'/hospital-interactions-failure.json',JSON.stringify({error:String(error),snapshot:await page.evaluate(()=>({state:globalThis.atriaV5?.snapshot(),modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null)},null,2));}throw error;
}finally{await h.close();}
