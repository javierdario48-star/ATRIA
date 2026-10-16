// A stalled frame must not turn a real-second clinical deadline into a
// render-dependent deadline. This is a timing regression, not the CIRR journey.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {browserHarness} from './browser-harness.mjs';
const h=await browserHarness();
let inspectedPage,lastWaypoint;
try{
 const context=await h.browser.newContext(h.devices['Pixel 5']),page=await context.newPage();
 inspectedPage=page;
 await page.goto(h.url);await page.locator('#enterButton').click();
 await page.locator('#guardButton').click();await page.locator('[data-action="start-guard"]').click();
 await page.locator('#dieInput').blur();await page.locator('#game').focus();
 const sample=()=>page.evaluate(()=>({now:performance.now(),clock:atriaV5.snapshot().clinical.clock}));
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const before=await sample();
 // Block only presentation/main-thread work. Do not mutate the game or its clock.
 await page.evaluate(()=>{const start=performance.now();while(performance.now()-start<1200){/* simulated long frame */}});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const after=await sample(),wall=(after.now-before.now)/1000,clinical=after.clock.clinicalMinute-before.clock.clinicalMinute;
 assert(Math.abs(clinical-wall)<.15,'clinical clock lost elapsed time during a render stall: '+JSON.stringify({wall,clinical}));
 const native=after.clock.nativeMinute-before.clock.nativeMinute;
 assert(Math.abs(native-wall*.12)<.025,'native time must retain .12 min/real second outside text input');
 await page.locator('#dieInput').fill('Reflexionando sobre el caso');
 const typingBefore=await sample();
 await page.evaluate(()=>{const start=performance.now();while(performance.now()-start<1200){/* long frame while typing */}});
 await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 const typingAfter=await sample(),typingWall=(typingAfter.now-typingBefore.now)/1000,
  typingClinical=typingAfter.clock.clinicalMinute-typingBefore.clock.clinicalMinute,
  typingNative=typingAfter.clock.nativeMinute-typingBefore.clock.nativeMinute;
 assert(Math.abs(typingClinical-typingWall)<.15,'typing cannot slow study deadlines');
 assert(Math.abs(typingNative-typingWall*.03)<.01,'typing keeps original .03 native min/real second');
 // Reach the patient through normal movement; a command submitted before the
 // first post-stall RAF must not inherit time elapsed BEFORE its request.
 await page.locator('#dieInput').fill('');await page.locator('#dieInput').blur();
 // Typing opened the custom keyboard. Use the public toggle and the actual
 // camera projection, as in the complete clinical journeys. A screen-center
 // formula with the keyboard open can hit a nurse instead of this waypoint.
 if(await page.evaluate(()=>atriaV5.diagnostics().keyboard.open))await page.locator('#keyboardToggleButton').click();
 await page.waitForFunction(()=>atriaV5.diagnostics().renderer.playableBounds===null);
 for(const [x,y] of [[496,1060],[496,800],[400,580],[250,470],[144,420]]){
  const t=await page.evaluate(()=>({p:atriaV5.snapshot().player,r:atriaV5.diagnostics().renderer}));
  lastWaypoint={x,y,...t};
  await page.locator('#game').click({position:{x:(x-t.r.camera.x)*t.r.scale+t.r.anchorX,y:(y-t.r.camera.y)*t.r.scale+t.r.anchorY}});
  await page.waitForFunction(()=>atriaV5.snapshot().player.moving);await page.waitForFunction(()=>!atriaV5.snapshot().player.moving);
 }
 await page.locator('#dieInput').fill('Enfermera espironolactona 100 mg oral');
 const boundary=await page.evaluate(async()=>{
  const start=performance.now();while(performance.now()-start<1200){/* stall before submitting the actual UI form */}
  const submittedAt=performance.now();document.querySelector('#chatForm').requestSubmit();
  await new Promise(resolve=>setTimeout(resolve,50));
  const p=atriaV5.snapshot().clinical.patient;
  return {elapsedAfterSubmission:performance.now()-submittedAt,administered:p.administrationLog.length,pending:p.pendingTreatments.length};
 });
 assert.equal(boundary.administered,0,'pre-request elapsed time cannot satisfy medication preparation');
 assert.equal(boundary.pending,1,'the actual order must be preparing, not silently rejected');
 await page.waitForFunction(()=>atriaV5.snapshot().clinical.patient.administrationLog.length===1);
 const report={wallSeconds:wall,clinicalMinutes:clinical,nativeMinutes:native,
  typing:{wallSeconds:typingWall,clinicalMinutes:typingClinical,nativeMinutes:typingNative},commandBoundary:boundary,physicalAndroid:false};
 await fs.mkdir('qa/v5-browser-results',{recursive:true});await fs.writeFile('qa/v5-browser-results/clock-stall-summary.json',JSON.stringify(report,null,2));
 console.log('CLINICAL CLOCK REAL STALL PASS',JSON.stringify(report));
}catch(error){
 if(inspectedPage){await fs.mkdir('qa/v5-browser-results',{recursive:true});
  await inspectedPage.screenshot({path:'qa/v5-browser-results/clinical-clock-failure.png'}).catch(()=>{});
  await fs.writeFile('qa/v5-browser-results/clinical-clock-failure.json',JSON.stringify({error:String(error),lastWaypoint,
   snapshot:await inspectedPage.evaluate(()=>({world:atriaV5.snapshot(),renderer:atriaV5.diagnostics().renderer,modal:document.querySelector('#modalContent')?.innerText})).catch(()=>null)},null,2));}
 throw error;
}finally{await h.close();}
